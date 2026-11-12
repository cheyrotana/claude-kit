#!/usr/bin/env node
// One-time setup of the Claude kit on a machine (safe to run again after a pull).
//
//   node setup.js [--root PY=D:\path\to\PY] [--nextask-url <url>] [--dry-run]
//
// It links ~/.claude/skills/<name>, ~/.claude/scripts and each workspace's memory folder to this
// repo (Windows junctions: no admin needed), merges the kit hooks + status line into
// ~/.claude/settings.json, and can add the NexTask connection. Anything it replaces is moved to
// ~/.claude/kit-backup-<time>/ first.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const KIT = __dirname;
const CLAUDE = path.join(os.homedir(), '.claude');
const d = new Date(), pad = (n) => String(n).padStart(2, '0');
const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
const BACKUP = path.join(CLAUDE, `kit-backup-${stamp}`);
const DRY = process.argv.includes('--dry-run');
const log = (...a) => console.log(...a);
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const exists = (p) => { try { fs.lstatSync(p); return true; } catch { return false; } };

// ---- args
const args = process.argv.slice(2);
const rootArgs = {}; let nextaskUrl = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--root') { const [k, ...v] = args[++i].split('='); rootArgs[k] = path.resolve(v.join('=')); }
  else if (args[i] === '--nextask-url') nextaskUrl = args[++i];
}

// ---- checks
for (const [cmd, a] of [['git', ['--version']], ['powershell.exe', ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.Major']]]) {
  const r = spawnSync(cmd, a, { encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) log(`! ${cmd} not found: ${cmd === 'git' ? 'install Git for Windows' : 'toasts will not show'}`);
}

// ---- machine.json (per-machine folders, not in git)
const MACHINE = path.join(KIT, 'machine.json');
const machine = readJson(MACHINE, {}); machine.roots = machine.roots || {};
Object.assign(machine.roots, rootArgs);
const DEFAULT_PY = 'D:\\Projects\\Intern-Project\\PY';
if (!machine.roots.PY && fs.existsSync(DEFAULT_PY)) machine.roots.PY = DEFAULT_PY;
if (!DRY) fs.writeFileSync(MACHINE, JSON.stringify(machine, null, 2) + '\n');

// ---- links
function backup(p) {
  const dest = path.join(BACKUP, path.relative(CLAUDE, p));
  log(`  moved old ${path.relative(CLAUDE, p)} to ${path.relative(CLAUDE, dest)}`);
  if (DRY) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try { fs.renameSync(p, dest); }
  catch (e) {
    // Windows refuses to move a folder something has open (a running script, an editor):
    // copy it, then delete the original.
    if (e.code !== 'EPERM' && e.code !== 'EBUSY') throw e;
    fs.cpSync(p, dest, { recursive: true });
    try { fs.rmSync(p, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); }
    catch { throw new Error(`${p} is in use (an editor or a running script?). Close it and run setup again; a copy is in ${dest}.`); }
  }
}
function link(linkPath, target) {
  if (exists(linkPath)) {
    const st = fs.lstatSync(linkPath);
    if (st.isSymbolicLink()) {
      if (fs.realpathSync(linkPath) === fs.realpathSync(target)) return log(`= ${path.relative(CLAUDE, linkPath)}`);
      if (!DRY) fs.unlinkSync(linkPath);
    } else backup(linkPath);
  }
  if (!DRY) { fs.mkdirSync(path.dirname(linkPath), { recursive: true }); fs.symlinkSync(target, linkPath, 'junction'); }
  log(`+ ${path.relative(CLAUDE, linkPath)} -> ${path.relative(KIT, target) || '.'}`);
}

log(`Kit: ${KIT}\n\nLinks:`);
for (const s of fs.readdirSync(path.join(KIT, 'skills'))) link(path.join(CLAUDE, 'skills', s), path.join(KIT, 'skills', s));
link(path.join(CLAUDE, 'scripts'), path.join(KIT, 'scripts'));

const cfg = readJson(path.join(KIT, 'config', 'projects.json'), { workspaces: {} });
const missingRoots = [];
for (const [key, ws] of Object.entries(cfg.workspaces || {})) {
  if (!ws.memory) continue;
  const root = machine.roots[key];
  if (!root) { missingRoots.push(key); continue; }
  const memDir = path.join(CLAUDE, 'projects', root.replace(/[^a-zA-Z0-9]/g, '-'), 'memory');
  const kitMem = path.join(KIT, 'memory', ws.memory);
  fs.mkdirSync(kitMem, { recursive: true });
  // Keep notes this machine wrote before the kit: copy the ones the kit doesn't have yet.
  if (exists(memDir) && !fs.lstatSync(memDir).isSymbolicLink()) {
    for (const f of fs.readdirSync(memDir)) {
      if (f === 'MEMORY.md' || exists(path.join(kitMem, f))) continue;
      log(`  kept this machine's memory note ${f} (add it to MEMORY.md)`);
      if (!DRY) fs.copyFileSync(path.join(memDir, f), path.join(kitMem, f));
    }
  }
  link(memDir, kitMem);
}

// ---- settings.json: kit hooks + status line
const SETTINGS = path.join(CLAUDE, 'settings.json');
const settings = readJson(SETTINGS, {});
const kitCfg = readJson(path.join(KIT, 'config', 'hooks.json'), {});
const isKit = (h) => /~\/\.claude\/(scripts\/|statusline\.js)/.test(h.command || '');
settings.hooks = settings.hooks || {};
for (const [event, groups] of Object.entries(kitCfg.hooks || {})) {
  const kept = (settings.hooks[event] || [])
    .map((g) => ({ ...g, hooks: (g.hooks || []).filter((h) => !isKit(h)) }))
    .filter((g) => g.hooks.length);
  settings.hooks[event] = [...kept, ...groups];
}
if (!settings.statusLine || isKit(settings.statusLine)) settings.statusLine = kitCfg.statusLine;
else log(`! Kept your own status line (${settings.statusLine.command}); usage nudges need the kit one.`);
if (!DRY) {
  if (exists(SETTINGS)) { fs.mkdirSync(BACKUP, { recursive: true }); fs.copyFileSync(SETTINGS, path.join(BACKUP, 'settings.json')); }
  fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n');
}
log('\nSettings: kit hooks and status line merged into ~/.claude/settings.json');

// Old single files the kit replaced.
for (const f of ['statusline.js', 'triage-projects.json']) if (exists(path.join(CLAUDE, f))) backup(path.join(CLAUDE, f));

// ---- NexTask
if (nextaskUrl) {
  const r = spawnSync(`claude mcp add --transport http --scope user nextask "${nextaskUrl}"`, { shell: true, encoding: 'utf8' });
  log(r.status === 0 ? '\nNexTask: added. Open /mcp in Claude Code to sign in.'
                     : `\nNexTask: not added (${(r.stderr || r.stdout).trim()})`);
}

// ---- next steps
log('\nDone.' + (DRY ? ' (dry run: nothing changed)' : ''));
if (missingRoots.length) log(`! Set the code folder for: ${missingRoots.join(', ')}  ->  node setup.js --root ${missingRoots[0]}=<path>`);
if (!nextaskUrl) log('- NexTask: if Claude Code has no nextask tools on this machine, run setup again with --nextask-url <your NexTask MCP url>.');
log('- Restart Claude Code (or open /hooks once) so the hooks load.');
