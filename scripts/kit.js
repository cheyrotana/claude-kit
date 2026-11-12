#!/usr/bin/env node
// Claude kit helper. The kit repo holds skills, scripts, hooks and memory; ~/.claude links to it.
//
//   node ~/.claude/scripts/kit.js dir                 kit folder
//   node ~/.claude/scripts/kit.js root [PY]           a workspace's code folder on this machine
//   node ~/.claude/scripts/kit.js projects            NexTask project -> code map, roots resolved
//   node ~/.claude/scripts/kit.js set-root KEY PATH   set a workspace folder for this machine
//   node ~/.claude/scripts/kit.js status              unsaved / unpushed / incoming changes
//   node ~/.claude/scripts/kit.js save ["message"]    commit everything and push
//   node ~/.claude/scripts/kit.js hook-start          SessionStart hook: pull updates, warn on unsaved
//
// Per-machine settings live in <kit>/machine.json (not in git): {"roots": {"PY": "D:\\..."}}.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const KIT = path.dirname(fs.realpathSync(__dirname));
const MACHINE = path.join(KIT, 'machine.json');
const PROJECTS = path.join(KIT, 'config', 'projects.json');

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const git = (args, timeout = 15000) => {
  const r = spawnSync('git', ['-C', KIT, ...args], { encoding: 'utf8', timeout, windowsHide: true });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
};
const roots = () => (readJson(MACHINE, {}).roots || {});

function resolvedProjects() {
  const cfg = readJson(PROJECTS, { workspaces: {}, projects: {} });
  const r = roots();
  for (const p of Object.values(cfg.projects || {})) {
    p.root = r[p.workspace] || null;
    if (!p.root) p.root_missing = `no folder set for workspace "${p.workspace}" on this machine: node ~/.claude/scripts/kit.js set-root ${p.workspace} <path>`;
  }
  return cfg;
}

function state(fetch) {
  const hasUpstream = git(['rev-parse', '--abbrev-ref', '@{u}']).ok;
  if (fetch && hasUpstream) git(['fetch', '--quiet'], 8000);
  const dirty = git(['status', '--porcelain']).out.split('\n').filter(Boolean);
  let ahead = 0, behind = 0;
  if (hasUpstream) {
    const c = git(['rev-list', '--left-right', '--count', 'HEAD...@{u}']).out.split(/\s+/);
    ahead = +c[0] || 0; behind = +c[1] || 0;
  }
  return { hasUpstream, dirty, ahead, behind };
}

function save(msg) {
  const s = state(true);
  if (s.behind && !s.dirty.length) git(['merge', '--ff-only', '@{u}']);
  if (s.dirty.length) {
    git(['add', '-A']);
    const c = git(['commit', '-q', '-m', msg || `kit: update ${s.dirty.length} file(s)`]);
    if (!c.ok) { console.log('commit failed: ' + (c.err || c.out)); process.exit(1); }
  }
  if (!s.hasUpstream) { console.log('Committed. No remote set yet, so nothing was pushed.'); return; }
  let p = git(['push', '--quiet'], 60000);
  if (!p.ok && /rejected|fetch first|non-fast-forward/i.test(p.err)) {
    const m = git(['pull', '--rebase', '--quiet'], 60000);
    if (!m.ok) { console.log('Pull before push hit a conflict: resolve it in ' + KIT + '\n' + m.err); process.exit(1); }
    p = git(['push', '--quiet'], 60000);
  }
  console.log(p.ok ? 'Kit saved and pushed.' : 'push failed: ' + p.err);
  if (!p.ok) process.exit(1);
}

function hookStart() {
  const s = state(true);
  const notes = [];
  if (s.behind && !s.dirty.length && !s.ahead) {
    const m = git(['merge', '--ff-only', '--quiet', '@{u}']);
    notes.push(m.ok ? `Claude kit updated from your other machine (${s.behind} change${s.behind > 1 ? 's' : ''}).`
                    : 'Claude kit has updates but could not pull them: run `git pull` in ' + KIT);
  } else if (s.behind) {
    notes.push(`Claude kit: ${s.behind} update(s) from your other machine are waiting, and this machine has its own changes. Say "save the kit" to merge and push.`);
  }
  if (s.dirty.length && !s.behind) notes.push(`Claude kit has ${s.dirty.length} unsaved change(s). Say "save the kit" to push them to your other machine.`);
  else if (s.ahead && !s.behind) notes.push(`Claude kit has ${s.ahead} commit(s) not pushed yet. Say "save the kit".`);
  if (!notes.length) return;
  const ctx = notes.join(' ') + ` (Kit folder: ${KIT}. When the user asks to save the kit, run \`node ~/.claude/scripts/kit.js save "<short message>"\`.)`;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: ctx },
    systemMessage: notes.join(' '),
  }));
}

const [cmd, ...args] = process.argv.slice(2);
try {
  switch (cmd) {
    case 'dir': console.log(KIT); break;
    case 'root': {
      const r = roots()[args[0] || 'PY'];
      if (!r) { console.error(`no folder set for "${args[0] || 'PY'}": node ~/.claude/scripts/kit.js set-root ${args[0] || 'PY'} <path>`); process.exit(1); }
      console.log(r); break;
    }
    case 'projects': console.log(JSON.stringify(resolvedProjects(), null, 2)); break;
    case 'set-root': {
      if (args.length < 2) { console.error('usage: set-root KEY PATH'); process.exit(2); }
      const m = readJson(MACHINE, {}); m.roots = m.roots || {}; m.roots[args[0]] = path.resolve(args[1]);
      fs.writeFileSync(MACHINE, JSON.stringify(m, null, 2) + '\n');
      console.log(`${args[0]} = ${m.roots[args[0]]}`); break;
    }
    case 'status': {
      const s = state(true);
      console.log(`kit: ${KIT}\nunsaved files: ${s.dirty.length}\nnot pushed: ${s.ahead}\nincoming: ${s.behind}\nremote: ${s.hasUpstream ? 'yes' : 'not set'}`);
      if (s.dirty.length) console.log(s.dirty.join('\n'));
      break;
    }
    case 'save': save(args.join(' ')); break;
    case 'hook-start': hookStart(); break;
    default: console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 12).join('\n'));
  }
} catch (e) {
  if (cmd === 'hook-start') process.exit(0); // never block a session start
  throw e;
}
