#!/usr/bin/env node
/**
 * Custom MCP server for Tempo Timesheets on Jira Data Center (inpost.pl)
 * Handles legacy Tempo API v4 format with numeric issueId
 */

const JIRA_BASE_URL = process.env.JIRA_BASE_URL || "https://jira.inpost.pl";
const JIRA_PAT = process.env.JIRA_PAT;
const DEFAULT_HOURS = parseFloat(process.env.DEFAULT_HOURS || "8");
const USERNAME = process.env.JIRA_USERNAME; // e.g. "mborecki"

if (!JIRA_PAT) { console.error("JIRA_PAT env var required"); process.exit(1); }

const headers = {
  "Authorization": `Bearer ${JIRA_PAT}`,
  "Content-Type": "application/json",
  "Accept": "application/json"
};

// ── Jira API helpers ────────────────────────────────────────────────────────

async function getIssue(issueKey) {
  const r = await fetch(`${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}`, { headers });
  if (!r.ok) throw new Error(`Jira ${r.status}: ${await r.text()}`);
  return r.json();
}

async function getMyIssues() {
  const jql = encodeURIComponent(`assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC`);
  const r = await fetch(`${JIRA_BASE_URL}/rest/api/2/search?jql=${jql}&maxResults=50&fields=summary,status,priority,issuetype`, { headers });
  if (!r.ok) throw new Error(`Jira ${r.status}: ${await r.text()}`);
  return r.json();
}

async function transitionIssue(issueKey, targetStatus) {
  // Get available transitions
  const r = await fetch(`${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}/transitions`, { headers });
  if (!r.ok) throw new Error(`Jira ${r.status}: ${await r.text()}`);
  const { transitions } = await r.json();

  const match = transitions.find(t =>
    t.name.toLowerCase().includes(targetStatus.toLowerCase()) ||
    t.to.name.toLowerCase().includes(targetStatus.toLowerCase())
  );
  if (!match) {
    const names = transitions.map(t => `"${t.name}"`).join(", ");
    throw new Error(`No transition matching "${targetStatus}". Available: ${names}`);
  }

  const r2 = await fetch(`${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}/transitions`, {
    method: "POST", headers,
    body: JSON.stringify({ transition: { id: match.id } })
  });
  if (!r2.ok) throw new Error(`Transition failed ${r2.status}: ${await r2.text()}`);
  return { transitioned: issueKey, to: match.to.name };
}

// ── Tempo API helpers ───────────────────────────────────────────────────────

async function postWorklog(issueKey, date, hours, comment = "work") {
  const issue = await getIssue(issueKey);

  // Exact format reverse-engineered from existing worklogs on this instance:
  // - dateStarted: "YYYY-MM-DDT00:00:00.000" (no timezone, local midnight)
  // - issue is nested object with numeric id
  // - NO top-level issueKey or issueId fields
  const tempoBody = {
    timeSpentSeconds: Math.round(hours * 3600),
    dateStarted: `${date}T00:00:00.000`,
    comment,
    author: { name: USERNAME },
    issue: { id: parseInt(issue.id) }
  };

  const r = await fetch(`${JIRA_BASE_URL}/rest/tempo-timesheets/3/worklogs`, {
    method: "POST", headers, body: JSON.stringify(tempoBody)
  });

  if (r.ok) {
    return JSON.parse(await r.text());
  }

  const tempoError = await r.text();

  // Tempo rejected the issue (common for subtasks or issues not synced in Tempo).
  // Fallback 1: if this is a subtask, try logging on the parent issue via Tempo.
  if (r.status === 400 && tempoError.includes("issueId")) {
    const parent = issue.fields?.parent;
    if (parent) {
      process.stderr.write(`Tempo rejected ${issueKey} (subtask), retrying on parent ${parent.key}\n`);
      const parentBody = {
        timeSpentSeconds: Math.round(hours * 3600),
        dateStarted: `${date}T00:00:00.000`,
        comment: `[${issueKey}] ${comment}`,
        author: { name: USERNAME },
        issue: { id: parseInt(parent.id) }
      };
      const r2 = await fetch(`${JIRA_BASE_URL}/rest/tempo-timesheets/3/worklogs`, {
        method: "POST", headers, body: JSON.stringify(parentBody)
      });
      if (r2.ok) {
        const result = JSON.parse(await r2.text());
        return { ...result, _via: "tempo-parent", _parent: parent.key };
      }
      process.stderr.write(`Tempo parent ${parent.key} also failed: ${await r2.text()}\n`);
    }

    // Fallback 2: Jira native worklog API (visible in Jira, may sync to Tempo).
    process.stderr.write(`Falling back to Jira native worklog for ${issueKey}\n`);
    const jiraBody = {
      timeSpentSeconds: Math.round(hours * 3600),
      started: `${date}T00:00:00.000+0000`,
      comment
    };
    const r3 = await fetch(`${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}/worklog`, {
      method: "POST", headers, body: JSON.stringify(jiraBody)
    });
    const text3 = await r3.text();
    if (!r3.ok) throw new Error(`Tempo failed (${tempoError}) and Jira native also failed: ${text3}`);
    return { ...JSON.parse(text3), _via: "jira-native" };
  }

  throw new Error(`Tempo ${r.status}: ${tempoError}`);
}

async function bulkPostWorklogs(entries) {
  // entries: [{ issueKey, date, hours, comment }]
  const results = [];
  for (const e of entries) {
    try {
      const res = await postWorklog(e.issueKey, e.date, e.hours, e.comment || "work");
      results.push({ success: true, issueKey: e.issueKey, date: e.date, id: res.id });
    } catch (err) {
      results.push({ success: false, issueKey: e.issueKey, date: e.date, error: err.message });
    }
  }
  return results;
}

async function getWorklogs(startDate, endDate, username) {
  const user = username || USERNAME;
  if (!user) throw new Error("JIRA_USERNAME env var required for getWorklogs");
  const url = `${JIRA_BASE_URL}/rest/tempo-timesheets/3/worklogs?dateFrom=${startDate}&dateTo=${endDate}&username=${user}`;
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`Tempo ${r.status}: ${await r.text()}`);
  return r.json();
}

// Generate weekdays between two dates (skip Sat/Sun)
function getWeekdays(startDate, endDate) {
  const days = [];
  const d = new Date(startDate + "T12:00:00Z");
  const end = new Date(endDate + "T12:00:00Z");
  while (d <= end) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      days.push(d.toISOString().slice(0, 10));
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

// ── MCP stdio transport ─────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "get_my_issues",
    description: "List all Jira issues assigned to me that are unresolved",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "close_issue",
    description: "Transition a Jira issue to Done/Closed/Resolved",
    inputSchema: {
      type: "object",
      properties: {
        issueKey: { type: "string", description: "e.g. DE-1440" },
        status: { type: "string", description: "Target status name, e.g. 'Done', 'Closed', 'Resolved'", default: "Done" }
      },
      required: ["issueKey"]
    }
  },
  {
    name: "log_time",
    description: "Log time on a Jira issue via Tempo for a single day",
    inputSchema: {
      type: "object",
      properties: {
        issueKey: { type: "string", description: "e.g. DE-1440" },
        date: { type: "string", description: "YYYY-MM-DD" },
        hours: { type: "number", description: "Hours worked (e.g. 8)" },
        comment: { type: "string", description: "Work description" }
      },
      required: ["issueKey", "date", "hours"]
    }
  },
  {
    name: "fill_tempo_range",
    description: "Fill Tempo for a date range (weekdays only) across one or more issues",
    inputSchema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "YYYY-MM-DD" },
        endDate: { type: "string", description: "YYYY-MM-DD" },
        entries: {
          type: "array",
          description: "Issues and hours per day to log",
          items: {
            type: "object",
            properties: {
              issueKey: { type: "string" },
              hours: { type: "number", description: "Hours per day for this issue" },
              comment: { type: "string" }
            },
            required: ["issueKey", "hours"]
          }
        }
      },
      required: ["startDate", "endDate", "entries"]
    }
  },
  {
    name: "get_worklogs",
    description: "Get my Tempo worklogs for a date range",
    inputSchema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "YYYY-MM-DD" },
        endDate: { type: "string", description: "YYYY-MM-DD" }
      },
      required: ["startDate", "endDate"]
    }
  }
];

async function callTool(name, args) {
  switch (name) {
    case "get_my_issues": {
      const data = await getMyIssues();
      const issues = data.issues.map(i => ({
        key: i.key,
        summary: i.fields.summary,
        status: i.fields.status.name,
        type: i.fields.issuetype.name,
        priority: i.fields.priority?.name
      }));
      return { issues, total: data.total };
    }

    case "close_issue": {
      const result = await transitionIssue(args.issueKey, args.status || "Done");
      return result;
    }

    case "log_time": {
      const result = await postWorklog(args.issueKey, args.date, args.hours, args.comment || "work");
      return { success: true, worklogId: result.id, issueKey: args.issueKey, date: args.date, hours: args.hours };
    }

    case "fill_tempo_range": {
      const weekdays = getWeekdays(args.startDate, args.endDate);
      const toPost = [];
      for (const day of weekdays) {
        for (const entry of args.entries) {
          toPost.push({ issueKey: entry.issueKey, date: day, hours: entry.hours, comment: entry.comment || "work" });
        }
      }
      const results = await bulkPostWorklogs(toPost);
      const ok = results.filter(r => r.success).length;
      const fail = results.filter(r => !r.success);
      return { total: results.length, succeeded: ok, failed: fail.length, failures: fail };
    }

    case "get_worklogs": {
      const logs = await getWorklogs(args.startDate, args.endDate);
      const summary = logs.map(l => ({
        id: l.id,
        issueKey: l.issue?.key,
        date: l.dateStarted?.slice(0, 10),
        hours: (l.timeSpentSeconds / 3600).toFixed(1),
        comment: l.comment
      }));
      const totalHours = logs.reduce((s, l) => s + (l.timeSpentSeconds || 0), 0) / 3600;
      return { worklogs: summary, totalHours: totalHours.toFixed(1) };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── JSON-RPC stdio loop ─────────────────────────────────────────────────────

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  buf += chunk;
  const lines = buf.split("\n");
  buf = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    handleMessage(line.trim());
  }
});

async function handleMessage(raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }

  const { id, method, params } = msg;

  const reply = (result) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
  const error = (code, message) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n");

  try {
    if (method === "initialize") {
      reply({
        protocolVersion: params.protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { name: "inpost-tempo-jira", version: "1.0.0" }
      });
    } else if (method === "notifications/initialized") {
      // no reply needed
    } else if (method === "tools/list") {
      reply({ tools: TOOLS });
    } else if (method === "tools/call") {
      const result = await callTool(params.name, params.arguments || {});
      reply({ content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
    } else {
      error(-32601, `Method not found: ${method}`);
    }
  } catch (err) {
    error(-32000, err.message);
  }
}

process.stderr.write("inpost-tempo-jira MCP server started\n");