#!/usr/bin/env node
// Claude Code status line: model | dir | git branch | context | rate limits
const { execFileSync } = require('child_process');
const path = require('path');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let d = {};
  try { d = JSON.parse(raw || '{}'); } catch (e) {}
  const c = (n, s) => `\x1b[${n}m${s}\x1b[0m`;
  const sep = c(90, ' | ');
  const parts = [];

  const model = d.model && d.model.display_name;
  if (model) parts.push(c(36, model));

  const cwd = (d.workspace && d.workspace.current_dir) || d.cwd || process.cwd();
  const segs = cwd.replace(/\\/g, '/').split('/').filter(Boolean);
  parts.push(c(34, segs.slice(-2).join('/') || cwd));

  try {
    const opts = { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 1500 };
    const git = (...a) => execFileSync('git', ['--no-optional-locks', ...a], opts).trim();
    let branch = git('rev-parse', '--abbrev-ref', 'HEAD');
    if (branch === 'HEAD') branch = git('rev-parse', '--short', 'HEAD');
    const dirty = git('status', '--porcelain') ? '*' : '';
    parts.push(c(35, `⎇ ${branch}`) + (dirty ? c(31, dirty) : ''));
  } catch (e) {}

  const cw = d.context_window || {};
  if (typeof cw.used_percentage === 'number') {
    const p = Math.round(cw.used_percentage);
    parts.push(c(p >= 80 ? 31 : p >= 50 ? 33 : 32, `ctx ${p}%`));
  }

  // Usage limits: percentage used (coloured like ctx) and time until reset.
  const until = (resetsAt) => {
    if (typeof resetsAt !== 'number') return '';
    let m = Math.max(0, Math.round((resetsAt * 1000 - Date.now()) / 60000));
    const dd = Math.floor(m / 1440); m -= dd * 1440;
    const hh = Math.floor(m / 60); m -= hh * 60;
    const t = dd ? `${dd}d${hh}h` : hh ? `${hh}h${m}m` : `${m}m`;
    return c(90, ` ↻${t}`);
  };
  const rl = d.rate_limits || {};
  const lim = [];
  for (const [key, label] of [['five_hour', '5h'], ['seven_day', '7d'], ['spend_limit', 'spend']]) {
    const l = rl[key];
    if (!l || typeof l.used_percentage !== 'number') continue;
    const p = Math.round(l.used_percentage);
    lim.push(c(p >= 80 ? 31 : p >= 50 ? 33 : 32, `${label}:${p}%`) + until(l.resets_at));
  }
  if (lim.length) parts.push(lim.join(' '));

  // Save the figures for the handoff hook (~/.claude/scripts/handoff.js hook-watch).
  try {
    if (d.session_id) {
      const fs = require('fs');
      const os = require('os');
      const dir = path.join(os.homedir(), '.claude', 'state');
      const file = path.join(dir, `usage-${d.session_id}.json`);
      let prev = {};
      try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {}
      const ctx = typeof cw.used_percentage === 'number' ? cw.used_percentage : null;
      // A big drop in context means it compacted: lets the context nudge fire again.
      let compactions = prev.compactions || 0;
      if (ctx != null && typeof prev.ctx === 'number' && prev.ctx >= 60 && ctx < 40) compactions++;
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify({ ts: Date.now(), cwd, ctx, compactions, rate_limits: rl }));
    }
  } catch (e) {}

  process.stdout.write(parts.join(sep));
});
