#!/usr/bin/env node
// Handoff helper: local store for session handoffs + the hooks that surface them.
//
//   node handoff.js dir                      print this project's handoff folder
//   node handoff.js save <file> --title T --trigger X --session S [--notion URL]
//                                            store a handoff, make it the open one
//   node handoff.js set key=value ...        update the latest handoff's meta
//   node handoff.js show                     print latest meta + markdown
//   node handoff.js hook-start               SessionStart hook: mention an open handoff
//   node handoff.js hook-watch               PostToolUse / UserPromptSubmit hook:
//                                            nudge for a handoff when usage runs low
//
// Files: ~/.claude/handoffs/<project-slug>/{<stamp>.md, latest.md, latest.json, history.jsonl}
// Usage figures come from ~/.claude/state/usage-<session>.json (written by statusline.js).
const fs = require('fs');
const os = require('os');
const path = require('path');

const HOME = os.homedir();
const ROOT = path.join(HOME, '.claude', 'handoffs');
const STATE = path.join(HOME, '.claude', 'state');
const PROJECTS = path.join(HOME, '.claude', 'projects');

// Nudge thresholds (percent used). Each fires once per session (per reset window).
const LIMITS = [
  { key: 'five_hour', label: '5-hour usage limit', levels: [85, 95] },
  { key: 'seven_day', label: '7-day usage limit', levels: [90, 97] },
  { key: 'spend_limit', label: 'spend limit', levels: [90] },
];
const CTX_LEVELS = [80];
const STALE_MS = 15 * 60 * 1000;

const slug = (p) => p.replace(/[^A-Za-z0-9]/g, '-');

// The project root is the nearest folder (cwd or a parent) that already has a
// handoff folder or a Claude project folder; else cwd itself.
function projectDir(cwd) {
  let dir = path.resolve(cwd || process.cwd());
  for (;;) {
    const s = slug(dir);
    if (fs.existsSync(path.join(ROOT, s)) || fs.existsSync(path.join(PROJECTS, s))) {
      return { root: dir, dir: path.join(ROOT, s) };
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  const root = path.resolve(cwd || process.cwd());
  return { root, dir: path.join(ROOT, slug(root)) };
}

const readJson = (f, d = null) => {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; }
};
const writeJson = (f, v) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(v, null, 2));
};
const readStdin = () => {
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch (e) { return {}; }
};
const args = (list) => {
  const out = { _: [] };
  for (let i = 0; i < list.length; i++) {
    if (list[i].startsWith('--')) out[list[i].slice(2)] = list[++i];
    else out._.push(list[i]);
  }
  return out;
};
const stamp = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};
const until = (resetsAt) => {
  if (typeof resetsAt !== 'number') return '';
  let m = Math.max(0, Math.round((resetsAt * 1000 - Date.now()) / 60000));
  const h = Math.floor(m / 60); m -= h * 60;
  return h ? `${h}h${m}m` : `${m}m`;
};
// "## Next steps" (or similar) section of a handoff, for the session-start note.
function section(md, names) {
  const lines = md.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s/.test(l) && names.some((n) => l.toLowerCase().includes(n)));
  if (start < 0) return '';
  const end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n').trim();
}
const emit = (event, context, systemMessage) => {
  const out = { hookSpecificOutput: { hookEventName: event, additionalContext: context } };
  if (systemMessage) out.systemMessage = systemMessage;
  process.stdout.write(JSON.stringify(out));
};

const cmd = process.argv[2];
const a = args(process.argv.slice(3));

if (cmd === 'dir') {
  const { dir } = projectDir(a.cwd);
  fs.mkdirSync(dir, { recursive: true });
  console.log(dir);
} else if (cmd === 'save') {
  const src = a._[0];
  if (!src || !fs.existsSync(src)) { console.error('save: handoff markdown file not found'); process.exit(1); }
  const { root, dir } = projectDir(a.cwd);
  fs.mkdirSync(dir, { recursive: true });
  const md = fs.readFileSync(src, 'utf8');
  const file = path.join(dir, `${stamp()}.md`);
  fs.writeFileSync(file, md);
  fs.writeFileSync(path.join(dir, 'latest.md'), md);
  const prev = readJson(path.join(dir, 'latest.json'));
  const meta = {
    title: a.title || 'Handoff',
    trigger: a.trigger || 'Manual',
    session: a.session || null,
    project_root: root,
    created: new Date().toISOString(),
    status: 'open',
    file,
    notion: a.notion || null,
    picked_up_by: null,
  };
  writeJson(path.join(dir, 'latest.json'), meta);
  fs.appendFileSync(path.join(dir, 'history.jsonl'), JSON.stringify(meta) + '\n');
  console.log(JSON.stringify({ saved: meta, superseded: prev && prev.status === 'open' ? prev : null }, null, 2));
} else if (cmd === 'set') {
  const { dir } = projectDir(a.cwd);
  const f = path.join(dir, 'latest.json');
  const meta = readJson(f);
  if (!meta) { console.error('set: no handoff saved for this project yet'); process.exit(1); }
  for (const kv of a._) {
    const i = kv.indexOf('=');
    if (i > 0) meta[kv.slice(0, i)] = kv.slice(i + 1) === 'null' ? null : kv.slice(i + 1);
  }
  writeJson(f, meta);
  console.log(JSON.stringify(meta, null, 2));
} else if (cmd === 'show') {
  const { dir } = projectDir(a.cwd);
  const meta = readJson(path.join(dir, 'latest.json'));
  if (!meta) { console.log('No handoff saved for this project.'); process.exit(0); }
  console.log(JSON.stringify(meta, null, 2));
  console.log('\n' + fs.readFileSync(path.join(dir, 'latest.md'), 'utf8'));
} else if (cmd === 'hook-start') {
  const input = readStdin();
  const { dir } = projectDir(input.cwd);
  const meta = readJson(path.join(dir, 'latest.json'));
  if (!meta || meta.status !== 'open') process.exit(0);
  // Same session resuming (not after a compaction): it already knows.
  if (meta.session && meta.session === input.session_id && input.source !== 'compact') process.exit(0);
  let md = '';
  try { md = fs.readFileSync(path.join(dir, 'latest.md'), 'utf8'); } catch (e) {}
  const next = section(md, ['next step']).slice(0, 1500);
  const when = new Date(meta.created).toLocaleString();
  const ctx = [
    `An open session handoff exists for this project: "${meta.title}" (${meta.trigger}, ${when}${meta.session === input.session_id ? ', written by this session before compaction' : ''}).`,
    meta.notion ? `Notion: ${meta.notion}` : null,
    `Local copy: ${path.join(dir, 'latest.md')}`,
    next ? `Its next steps:\n${next}` : null,
    'If the user continues that work (or asks what is pending), run the `pickup` skill to load it in full and mark it picked up. Do not act on it unprompted.',
  ].filter(Boolean).join('\n');
  emit('SessionStart', ctx, `Open handoff: "${meta.title}". Type /pickup to continue it.`);
} else if (cmd === 'hook-watch') {
  const input = readStdin();
  const sid = input.session_id;
  if (!sid) process.exit(0);
  const usage = readJson(path.join(STATE, `usage-${sid}.json`));
  if (!usage || Date.now() - (usage.ts || 0) > STALE_MS) process.exit(0);
  const warnedFile = path.join(STATE, `handoff-warned-${sid}.json`);
  const warned = readJson(warnedFile, {});
  const hits = [];
  for (const l of LIMITS) {
    const u = usage.rate_limits && usage.rate_limits[l.key];
    if (!u || typeof u.used_percentage !== 'number') continue;
    for (const lv of l.levels) {
      const id = `${l.key}:${lv}:${u.resets_at || ''}`;
      if (u.used_percentage >= lv && !warned[id]) {
        warned[id] = Date.now();
        const reset = until(u.resets_at);
        hits.push({ trigger: 'Usage low', text: `${l.label} is ${Math.round(u.used_percentage)}% used${reset ? ` (resets in ${reset})` : ''}` });
      }
    }
  }
  if (typeof usage.ctx === 'number') {
    for (const lv of CTX_LEVELS) {
      const id = `ctx:${lv}:${usage.compactions || 0}`;
      if (usage.ctx >= lv && !warned[id]) {
        warned[id] = Date.now();
        hits.push({ trigger: 'Context full', text: `context is ${Math.round(usage.ctx)}% full (auto-compaction is near)` });
      }
    }
  }
  if (!hits.length) process.exit(0);
  writeJson(warnedFile, warned);
  const trigger = hits[0].trigger;
  const what = hits.map((h) => h.text).join('; ');
  const ctx = `HANDOFF NUDGE: ${what}. Finish the step you are on (don't start a new large one), then run the \`handoff\` skill with trigger "${trigger}" so another session or agent can continue without this context. After that, carry on if there is room.`;
  emit(input.hook_event_name || 'PostToolUse', ctx, `Handoff nudge: ${what}.`);
} else {
  console.error('usage: handoff.js dir|save|set|show|hook-start|hook-watch');
  process.exit(1);
}
