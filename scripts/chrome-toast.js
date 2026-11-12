#!/usr/bin/env node
// PreToolUse hook on Claude in Chrome tools: show a Windows toast when Chrome testing
// starts, so the user can watch. Fires again only after 30 min without Chrome activity.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const COOLDOWN_MS = 30 * 60 * 1000;
let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch (e) {}
const sid = input.session_id || 'unknown';
const stateDir = path.join(os.homedir(), '.claude', 'state');
const file = path.join(stateDir, `chrome-last-${sid}.txt`);

let last = 0;
try { last = Number(fs.readFileSync(file, 'utf8')) || 0; } catch (e) {}
const now = Date.now();
try { fs.mkdirSync(stateDir, { recursive: true }); fs.writeFileSync(file, String(now)); } catch (e) {}
if (now - last < COOLDOWN_MS) process.exit(0);

// Say what is being opened when the call carries a URL.
const url = input.tool_input && (input.tool_input.url || '');
const msg = url ? `Testing now: ${String(url).slice(0, 80)}` : 'Testing now. Look for the "Claude" tab group.';
const script = path.join(os.homedir(), '.claude', 'scripts', 'toast.ps1');
// Wait for it: a detached PowerShell never shows the toast (tested 2026-11-12).
try {
  spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, 'Claude: testing in Chrome', msg], {
    stdio: 'ignore', windowsHide: true, timeout: 8000,
  });
} catch (e) {}
process.exit(0);
