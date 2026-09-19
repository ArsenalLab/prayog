/// <reference types="node" />
import { run, bob } from "@ai-hero/sandcastle";
import { fyreNative } from "@ai-hero/sandcastle/sandboxes/fyre";
import {
  readFileSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

// =============================================================================
// DiskANN z/Linux — Agent 04: Fix Release-mode build
//
// Debug build already passes. This agent focuses exclusively on finding and
// fixing whatever breaks the Release build on s390x, then amends the existing
// commit and force-pushes.
//
// Run:
//   npx tsx diskann_zlinux_v2/main-fixup-release.mts
// =============================================================================

// ---------------------------------------------------------------------------
// Load .env
// ---------------------------------------------------------------------------
const dotenvPath = join(process.cwd(), "diskann_zlinux_v2", ".env");
try {
  for (const line of readFileSync(dotenvPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch {
  // rely on shell export
}

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error(
    "[fixup-release] ERROR: ANTHROPIC_API_KEY not set.\n" +
      "  Add it to diskann_zlinux_v2/.env or export it in your shell.",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Machine config
// ---------------------------------------------------------------------------
const machine = {
  host: "KhushiTyagi463-bot01-zlinux.dev.fyre.ibm.com",
  user: "khushiid",
  repoPath: "/home/khushiid/DiskANN",
  identityFile: "~/.ssh/id_ed25519",
};

const sshArgs = [
  "-o", "ConnectTimeout=15",
  "-o", "ServerAliveInterval=30",
  "-o", "ServerAliveCountMax=20",
  "-o", "StrictHostKeyChecking=no",
];

const setupScript = `
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh" 2>/dev/null || true
if ! command -v bob >/dev/null 2>&1; then
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash >&2
  fi
  . "$NVM_DIR/nvm.sh"
  nvm install --lts >&2
fi
nvm use --lts >/dev/null 2>&1 || true
`.trim();

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------
const logsDir = join(process.cwd(), "diskann_zlinux_v2", "logs");
mkdirSync(logsDir, { recursive: true });

const runTs = new Date().toISOString().replace(/[:.]/g, "-");
const agentLogPath = join(logsDir, `04-fixup-release-build-${runTs}.log`);
const summaryFile  = join(logsDir, `summary-fixup-release-${runTs}.json`);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log(`\n${"▓".repeat(72)}`);
console.log(`  DiskANN z/Linux — Agent 04: Fix Release Build`);
console.log(`  Host  : ${machine.host}`);
console.log(`  Repo  : ${machine.repoPath}`);
console.log(`  Goal  : Release build + tests passing, amend commit`);
console.log(`${"▓".repeat(72)}\n`);

const t0 = Date.now();
let ok = true;

try {
  await run({
    name: "04-fixup-release-build",
    agent: bob("default", {
      setupScript,
      // The .env stores the Bob API key as ANTHROPIC_API_KEY.
      // Bob on the remote VM requires BOB_API_KEY — pass it under both names.
      env: {
        ANTHROPIC_API_KEY: apiKey!,
        BOB_API_KEY: apiKey!,
      },
    }),
    sandbox: fyreNative({
      host: machine.host,
      user: machine.user,
      repoPath: machine.repoPath,
      identityFile: machine.identityFile,
      sshArgs,
    }),
    cwd: process.cwd(),
    promptFile: "./diskann_zlinux_v2/prompts/04-fixup-release-build.md",
    maxIterations: 60,
    logging: { type: "file", path: agentLogPath },
  });
} catch (err) {
  ok = false;
  console.error(`  ✗ ERROR: ${err instanceof Error ? err.message : String(err)}`);
}

const durationMs = Date.now() - t0;
const summary = {
  agent: "04-fixup-release-build",
  status: ok ? "PASS" : "FAIL",
  durationMs,
  log: agentLogPath,
};

writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

console.log(`\n${"▓".repeat(72)}`);
console.log(`  RELEASE FIXUP AGENT COMPLETE`);
console.log(`  Result  : ${summary.status}`);
console.log(`  Duration: ${(durationMs / 1000).toFixed(1)}s`);
console.log(`  Log     : ${agentLogPath}`);
console.log(`${"▓".repeat(72)}\n`);
