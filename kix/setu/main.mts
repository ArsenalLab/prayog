/// <reference types="node" />
import { run, bob } from "@ai-hero/sandcastle";
import { fyreNative } from "@ai-hero/sandcastle/sandboxes/fyre";
import {
  readFileSync,
  mkdirSync,
  appendFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

// =============================================================================
// DiskANN z/Linux port v2 — 2-agent goal-driven orchestrator
//
// Design philosophy (vs the 8-agent v1 in diskann_zlinux_support/):
//
//   v1 problem: prompts encoded all porting knowledge explicitly — variable
//   names, file lists, patch sequences, AIX details. The agent was a script
//   executor, not a reasoner. This caused unnecessary changes, wrong remote
//   pushes, and AIX-specific noise polluting the s390x port.
//
//   v2 design: 2 agents, goal-driven.
//
//   Agent 01 — UNDERSTAND AND PLAN
//     Reads the codebase from scratch. Answers: what is the build system
//     pattern, what already exists for non-x86, what does s390x need?
//     Produces a concrete change plan backed by line numbers. No changes made.
//
//   Agent 02 — IMPLEMENT, BUILD, TEST, PUSH
//     Executes the plan. Lets the compiler report errors and fixes them.
//     Iterates until cmake + build + all unit tests pass. Then commits and
//     pushes to the personal fork. The only success criterion is tests passing.
//
// Target VM  : KhushiTyagi463-bot01-zlinux.dev.fyre.ibm.com
// Target repo: /home/khushiid/DiskANN
// Fork       : git@github.ibm.com:Khushi-Tyagi463/DiskANN.git
// Branch     : diskann-zlinux-gcc15
//
// Run
// ---
//   cp diskann_zlinux_v2/.env.example diskann_zlinux_v2/.env
//   # fill in ANTHROPIC_API_KEY
//   npx tsx diskann_zlinux_v2/main.mts
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
    const val = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch {
  // rely on shell export
}

// Bob uses ANTHROPIC_API_KEY as the env var name, but the value is a Bob API key
// (format: bob_prod_bob-user_...). Copy it from .env.example to .env and paste your key.
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error(
    "[zlinux-v2] ERROR: ANTHROPIC_API_KEY (Bob key) not set.\n" +
      "  Copy diskann_zlinux_v2/.env.example to diskann_zlinux_v2/.env and fill in your Bob API key.",
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

const TARGET_BRANCH = "diskann-zlinux-gcc15";
const FORK = "git@github.ibm.com:Khushi-Tyagi463/DiskANN.git";

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
const ndjsonLog = join(logsDir, `run-${runTs}.ndjson`);
const textLog   = join(logsDir, `run-${runTs}.log`);
const summaryFile = join(logsDir, `summary-${runTs}.json`);

function logEvent(record: Record<string, unknown>): void {
  const ts = new Date().toISOString();
  appendFileSync(ndjsonLog, JSON.stringify({ ts, ...record }) + "\n");
  const tag = String(record.event ?? record.type ?? "info").toUpperCase().padEnd(14);
  const msg = record.message ?? record.output ?? record.error ?? JSON.stringify(record);
  appendFileSync(textLog, `[${ts}] ${tag} ${msg}\n`);
}

function logSection(title: string): void {
  const bar = "─".repeat(72);
  appendFileSync(textLog, `\n${bar}\n  ${title}\n${bar}\n`);
  logEvent({ event: "section", message: title });
}

// ---------------------------------------------------------------------------
// Agent result tracking
// ---------------------------------------------------------------------------
type AgentResult = {
  agent: string;
  status: "pass" | "fail" | "skip";
  durationMs: number;
  note?: string;
};
const results: AgentResult[] = [];

// ---------------------------------------------------------------------------
// Sandbox factory
// ---------------------------------------------------------------------------
const makeSandbox = () =>
  fyreNative({
    host: machine.host,
    user: machine.user,
    repoPath: machine.repoPath,
    identityFile: machine.identityFile,
    sshArgs,
  });

// ---------------------------------------------------------------------------
// runAgent
// ---------------------------------------------------------------------------
async function runAgent(opts: {
  agentName: string;
  promptFile: string;
  completionSignal: string;
  maxIterations: number;
  description: string;
  required: boolean;
}): Promise<boolean> {
  const { agentName, promptFile, completionSignal, maxIterations, description, required } = opts;
  const agentLogPath = join(logsDir, `${agentName}-${runTs}.log`);

  logSection(`AGENT: ${agentName} — ${description}`);
  logEvent({ event: "agent_start", agent: agentName, promptFile });

  console.log(`\n${"═".repeat(72)}`);
  console.log(`  [${agentName}]  ${description}`);
  console.log(`${"═".repeat(72)}`);

  const t0 = Date.now();
  let ok = true;

  try {
    await run({
      name: agentName,
      agent: bob("default", {
        setupScript,
        env: { ANTHROPIC_API_KEY: apiKey! },
      }),
      sandbox: makeSandbox(),
      cwd: process.cwd(),
      promptFile,
      completionSignal,
      maxIterations,
      logging: { type: "file", path: agentLogPath },
    });
  } catch (err) {
    ok = false;
    const msg = err instanceof Error ? err.message : String(err);
    logEvent({ event: "agent_error", agent: agentName, error: msg });
    console.error(`  [${agentName}] ✗ ERROR: ${msg}`);
  }

  const durationMs = Date.now() - t0;
  logEvent({ event: "agent_end", agent: agentName, status: ok ? "pass" : "fail", durationMs });
  console.log(`  [${agentName}] ${ok ? "✓ done" : "✗ failed"}  (${(durationMs / 1000).toFixed(1)}s)`);

  results.push({ agent: agentName, status: ok ? "pass" : "fail", durationMs });
  return ok;
}

// ---------------------------------------------------------------------------
// Pipeline — 2 agents
// ---------------------------------------------------------------------------
// NOTE: completionSignal is intentionally omitted from both agents.
// The signal strings appear in the prompt text itself, so sandcastle matches
// them in the accumulated output buffer the moment the prompt is echoed —
// causing a false 1-iteration completion before any tools are called.
// Without completionSignal the agents run until maxIterations or natural idle.
const pipeline = [
  {
    agentName: "01-understand-and-plan",
    promptFile: "./diskann_zlinux_v2/prompts/01-understand-and-plan.md",
    maxIterations: 15,
    description: "Discover platform, read codebase, produce porting plan (no changes)",
    required: true,
  },
  {
    agentName: "02-implement-build-push",
    promptFile: "./diskann_zlinux_v2/prompts/02-implement-build-push.md",
    // Each fix+rebuild cycle is ~3 tool calls. Build itself takes ~3 min.
    // Allow up to 15 fix cycles + cmake + build + test + commit + push = ~80 iterations.
    maxIterations: 80,
    description: "Apply plan, iterate build+test until passing, commit, push to fork",
    required: true,
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const pipelineStart = Date.now();
logSection("DISKANN z/Linux v2 — PIPELINE START");
logEvent({
  event: "pipeline_start",
  host: machine.host,
  repo: machine.repoPath,
  branch: TARGET_BRANCH,
  fork: FORK,
  agents: pipeline.map((p) => p.agentName),
  design: "2-agent goal-driven (v2)",
});

console.log(`\n${"▓".repeat(72)}`);
console.log(`  DiskANN z/Linux Port v2`);
console.log(`  Host  : ${machine.host}`);
console.log(`  Repo  : ${machine.repoPath}`);
console.log(`  Branch: ${TARGET_BRANCH}`);
console.log(`  Design: 2 goal-driven agents (no explicit patch lists)`);
console.log(`${"▓".repeat(72)}\n`);

let aborted = false;

for (const step of pipeline) {
  if (aborted) {
    results.push({ agent: step.agentName, status: "skip", durationMs: 0, note: "aborted" });
    logEvent({ event: "agent_skip", agent: step.agentName, reason: "pipeline aborted" });
    continue;
  }

  const ok = await runAgent(step);

  if (!ok && step.required) {
    aborted = true;
    logEvent({ event: "pipeline_abort", reason: `required agent ${step.agentName} failed` });
    console.error(`\n  ✗ Required agent '${step.agentName}' failed — aborting.\n`);
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
const totalMs = Date.now() - pipelineStart;
const passed  = results.filter((r) => r.status === "pass").length;
const failed  = results.filter((r) => r.status === "fail").length;
const skipped = results.filter((r) => r.status === "skip").length;

const summary = {
  version: "v2",
  runTimestamp: runTs,
  host: machine.host,
  repo: machine.repoPath,
  branch: TARGET_BRANCH,
  fork: FORK,
  totalDurationMs: totalMs,
  passed,
  failed,
  skipped,
  overallStatus: failed > 0 ? "FAIL" : "PASS",
  agents: results,
  logs: {
    ndjson: ndjsonLog,
    text: textLog,
    perAgent: pipeline.map((p) => ({
      agent: p.agentName,
      file: join(logsDir, `${p.agentName}-${runTs}.log`),
    })),
  },
};

writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
logSection("PIPELINE COMPLETE");
logEvent({ event: "pipeline_complete", ...summary });

console.log(`\n${"▓".repeat(72)}`);
console.log(`  PIPELINE COMPLETE`);
console.log(`  Result  : ${summary.overallStatus}`);
console.log(`  Passed  : ${passed}  Failed: ${failed}  Skipped: ${skipped}`);
console.log(`  Duration: ${(totalMs / 1000).toFixed(1)}s`);
console.log(`\n  Logs`);
console.log(`    NDJSON  : ${ndjsonLog}`);
console.log(`    Text    : ${textLog}`);
console.log(`    Summary : ${summaryFile}`);
console.log(`${"▓".repeat(72)}\n`);
