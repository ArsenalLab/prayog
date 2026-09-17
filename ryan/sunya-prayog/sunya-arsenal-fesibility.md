# You are a senior software engineering advisor and tooling architect. The user is asking whether an AI coding agent system called "Arsenal" can be used to orchestrate and execute the PSLITE_CODE_ENABLED guard introduction work tracked across 25 DB2 issues (Epic #92482, G3–G16), and what capabilities Arsenal would need — with an explicit requirement for human-gated control over PRs and builds (no autonomous PR/BLD submissions without approval).

Analyze the full context below and provide a thorough, actionable response covering:

1. **Arsenal's Current Fitness Assessment**: Evaluate whether Arsenal, as an AI coding agent or orchestration framework, is currently equipped to handle this class of work — specifically: multi-file `#ifdef`/`#if defined` guard classification and transformation (Categories A, B, C, D), large-scale C/C++ source modification across 16 component groups, header-before-source dependency ordering, and DB2/tracker issue lifecycle management.

2. **Orchestration Architecture Recommendation**: Design a concrete orchestration model where Arsenal operates as the execution engine but all PR submissions and BLD (build) triggers require explicit human approval before proceeding. The model must support:
   - Per-story or per-group human review checkpoints before any PR is raised
   - Human evaluation of generated code changes (diff review) before BLD is triggered
   - Async or time-delayed BLD cycles that humans can defer or skip
   - A clear handoff protocol between Arsenal-generated work and the human reviewer gate
   - Optional reviewer tagging (@pperez @swalkty @cmgarcia @finlay) as part of the gated PR template, not automatic submission

3. **Required Capability Development**: Identify and specify what new features or capabilities must be built in Arsenal or around it to support this workflow safely and at scale. Address at minimum:
   - Guard classification engine (static analysis of `#ifdef SD_ENABLED` sites into Cat A/B/C/D)
   - Story-aware context loading (per-issue file lists, site counts, category breakdown)
   - Diff preview and human sign-off interface before any repo write action
   - Dependency-aware task sequencing (G3 → G4 → G5–G16, complexity tiers within G5–G16)
   - Human-in-the-loop (HITL) gate mechanism integrated into the build pipeline
   - Category B confirmation tracker integration (#94270) for senior developer review workflow
   - Warm-up PR support for pure read-and-confirm stories (#94273, #94216, #94214, #94212) as pipeline validation runs

4. **Risk and Control Analysis**: Identify the top risks of running Arsenal autonomously on this codebase without human gates, particularly for Category B sites (no-change confirmations that still require senior review), Category D runtime branches, and the complex single-file stories (e.g., #94279 with 82 sites, #94282 with sqle_pd.C). Explain why human evaluation at code review time is non-negotiable for this work.

5. **Recommended Rollout Sequence**: Propose a phased onboarding plan where Arsenal starts on the lowest-risk warm-up stories, with gates tightened or relaxed based on demonstrated accuracy, before progressing to the most complex stories.

The 25 tracked issues, their dependency order, category breakdowns, and complexity tiers are as follows — use this data precisely in your analysis:

Foundation (pre-existing):
- #93024: G1+G2 PSLITE_CODE_ENABLED infrastructure — Merged
- #93929: USE-DEMO worked example — Exists

Dependency chain (strict order):
- G3 (#94207) must complete before G4 headers
- All G4 headers must complete before G5–G16 sources
- G5–G16 are independent of each other once G4 is done

G3:
- #94207: sqe/ startup (3 files, ~40 sites)

G4 headers (ordered simplest to hardest):
- #94212: G4-sqp (2 files, 3 sites, all Cat B)
- #94214: G4-ha (6 files, 6 sites, all Cat B)
- #94216: G4-misc-B (8 files, 27 sites, all Cat B)
- #94213: G4-sqf (1 file, 1 site, Cat A)
- #94209: G4-sqo (5 files, 9 sites, Cat A)
- #94210: G4-sqb (10 files, 16 sites, Cat A)
- #94215: G4-misc-A (16 files, 28 sites, Cat A)
- #94208: G4-sqe (20 files, 144 sites, Cat A, largest header story)

G5–G16 sources (ordered simplest to hardest):
- #94273: G5-catB (4 files, 319 sites, all Cat B, read-confirm only)
- #94309: G15 (8 files, 8 sites, all Cat A, 0 Cat D)
- #94307: G13 (2 files, 10 sites, all Cat A, 1 Cat D)
- #94283: G6 (60 sites, 8A/52B)
- #94306: G12 (3 files, 15 sites, all Cat A, 9 Cat D)
- #94310: G16 (12 files, 20 sites, 16A/2B, 3 Cat D)
- #94298: G10 (6 files, 23 sites, all Cat A, 15 Cat D)
- #94285: G7 (58 sites, 52A/5B, 4 Cat D)
- #94300: G11 (21 sites, 16A/5B)
- #94290: G9 (26 sites, 20A/7B, 1 Cat D, AIX site)
- #94308: G14 (12 sites, 10A/2B, 7 Cat D)
- #94278: G5-catA-1 (18 files, 66 sites)
- #94280: G5-catA-2b (15 files, mixed)
- #94289: G8 (63 sites, 52A/11B, 3 Cat D, inverted guard)
- #94282: G5-catA-2c (sqle_pd.C, 31 sites, 8A/23B, 3 Cat D)
- #94279: G5-catA-2a (pdSDCATypesFmt.C, 82 sites, 72A/10B, most complex single file)

Category B master tracker: #94270 (senior developer review, all groups, post-delivery)

PR optional reviewers on every story: @pperez @swalkty @cmgarcia @finlay

Guard category classification rules:
- Cat A (Broaden): `#if defined SD_ENABLED` → `#if defined SD_ENABLED || defined PSLITE_CODE_ENABLED` — body unchanged
- Cat B (Leave): `#ifdef SD_ENABLED` — full pureScale only, review and confirm no change needed
- Cat C (New compile): `#if defined PSLITE_CODE_ENABLED` — net-new pS Lite code, no existing SD block
- Cat D (Runtime): `if ( SQLPSLITE_RT )` — runtime branch inside a broadened Cat A block

Produce a structured, technically precise, and immediately actionable response. Include specific Arsenal feature names, interface designs, or pipeline stage names where relevant. Do not produce vague or generic AI tooling advice — ground every recommendation in the actual issue data, category rules, file counts, and dependency constraints provided above.

---

**Status:** active  **Date:** 2026-09-17

---

### 👤 User

You are a senior software engineering advisor and tooling architect. The user is asking whether an AI coding agent system called "Arsenal" can be used to orchestrate and execute the PSLITE_CODE_ENABLED guard introduction work tracked across 25 DB2 issues (Epic #92482, G3–G16), and what capabilities Arsenal would need — with an explicit requirement for human-gated control over PRs and builds (no autonomous PR/BLD submissions without approval).

Analyze the full context below and provide a thorough, actionable response covering:

1. **Arsenal's Current Fitness Assessment**: Evaluate whether Arsenal, as an AI coding agent or orchestration framework, is currently equipped to handle this class of work — specifically: multi-file `#ifdef`/`#if defined` guard classification and transformation (Categories A, B, C, D), large-scale C/C++ source modification across 16 component groups, header-before-source dependency ordering, and DB2/tracker issue lifecycle management.

2. **Orchestration Architecture Recommendation**: Design a concrete orchestration model where Arsenal operates as the execution engine but all PR submissions and BLD (build) triggers require explicit human approval before proceeding. The model must support:
   - Per-story or per-group human review checkpoints before any PR is raised
   - Human evaluation of generated code changes (diff review) before BLD is triggered
   - Async or time-delayed BLD cycles that humans can defer or skip
   - A clear handoff protocol between Arsenal-generated work and the human reviewer gate
   - Optional reviewer tagging (@pperez @swalkty @cmgarcia @finlay) as part of the gated PR template, not automatic submission

3. **Required Capability Development**: Identify and specify what new features or capabilities must be built in Arsenal or around it to support this workflow safely and at scale. Address at minimum:
   - Guard classification engine (static analysis of `#ifdef SD_ENABLED` sites into Cat A/B/C/D)
   - Story-aware context loading (per-issue file lists, site counts, category breakdown)
   - Diff preview and human sign-off interface before any repo write action
   - Dependency-aware task sequencing (G3 → G4 → G5–G16, complexity tiers within G5–G16)
   - Human-in-the-loop (HITL) gate mechanism integrated into the build pipeline
   - Category B confirmation tracker integration (#94270) for senior developer review workflow
   - Warm-up PR support for pure read-and-confirm stories (#94273, #94216, #94214, #94212) as pipeline validation runs

4. **Risk and Control Analysis**: Identify the top risks of running Arsenal autonomously on this codebase without human gates, particularly for Category B sites (no-change confirmations that still require senior review), Category D runtime branches, and the complex single-file stories (e.g., #94279 with 82 sites, #94282 with sqle_pd.C). Explain why human evaluation at code review time is non-negotiable for this work.

5. **Recommended Rollout Sequence**: Propose a phased onboarding plan where Arsenal starts on the lowest-risk warm-up stories, with gates tightened or relaxed based on demonstrated accuracy, before progressing to the most complex stories.

The 25 tracked issues, their dependency order, category breakdowns, and complexity tiers are as follows — use this data precisely in your analysis:

Foundation (pre-existing):
- #93024: G1+G2 PSLITE_CODE_ENABLED infrastructure — Merged
- #93929: USE-DEMO worked example — Exists

Dependency chain (strict order):
- G3 (#94207) must complete before G4 headers
- All G4 headers must complete before G5–G16 sources
- G5–G16 are independent of each other once G4 is done

G3:
- #94207: sqe/ startup (3 files, ~40 sites)

G4 headers (ordered simplest to hardest):
- #94212: G4-sqp (2 files, 3 sites, all Cat B)
- #94214: G4-ha (6 files, 6 sites, all Cat B)
- #94216: G4-misc-B (8 files, 27 sites, all Cat B)
- #94213: G4-sqf (1 file, 1 site, Cat A)
- #94209: G4-sqo (5 files, 9 sites, Cat A)
- #94210: G4-sqb (10 files, 16 sites, Cat A)
- #94215: G4-misc-A (16 files, 28 sites, Cat A)
- #94208: G4-sqe (20 files, 144 sites, Cat A, largest header story)

G5–G16 sources (ordered simplest to hardest):
- #94273: G5-catB (4 files, 319 sites, all Cat B, read-confirm only)
- #94309: G15 (8 files, 8 sites, all Cat A, 0 Cat D)
- #94307: G13 (2 files, 10 sites, all Cat A, 1 Cat D)
- #94283: G6 (60 sites, 8A/52B)
- #94306: G12 (3 files, 15 sites, all Cat A, 9 Cat D)
- #94310: G16 (12 files, 20 sites, 16A/2B, 3 Cat D)
- #94298: G10 (6 files, 23 sites, all Cat A, 15 Cat D)
- #94285: G7 (58 sites, 52A/5B, 4 Cat D)
- #94300: G11 (21 sites, 16A/5B)
- #94290: G9 (26 sites, 20A/7B, 1 Cat D, AIX site)
- #94308: G14 (12 sites, 10A/2B, 7 Cat D)
- #94278: G5-catA-1 (18 files, 66 sites)
- #94280: G5-catA-2b (15 files, mixed)
- #94289: G8 (63 sites, 52A/11B, 3 Cat D, inverted guard)
- #94282: G5-catA-2c (sqle_pd.C, 31 sites, 8A/23B, 3 Cat D)
- #94279: G5-catA-2a (pdSDCATypesFmt.C, 82 sites, 72A/10B, most complex single file)

Category B master tracker: #94270 (senior developer review, all groups, post-delivery)

PR optional reviewers on every story: @pperez @swalkty @cmgarcia @finlay

Guard category classification rules:
- Cat A (Broaden): `#if defined SD_ENABLED` → `#if defined SD_ENABLED || defined PSLITE_CODE_ENABLED` — body unchanged
- Cat B (Leave): `#ifdef SD_ENABLED` — full pureScale only, review and confirm no change needed
- Cat C (New compile): `#if defined PSLITE_CODE_ENABLED` — net-new pS Lite code, no existing SD block
- Cat D (Runtime): `if ( SQLPSLITE_RT )` — runtime branch inside a broadened Cat A block

Produce a structured, technically precise, and immediately actionable response. Include specific Arsenal feature names, interface designs, or pipeline stage names where relevant. Do not produce vague or generic AI tooling advice — ground every recommendation in the actual issue data, category rules, file counts, and dependency constraints provided above.

---

### 🤖 Assistant

> 🔧 called: read_file



> 🔧 **read_file** — mozi/vinasak/.arsenal/run.mjs

### 🤖 Assistant

> 🔧 called: list_files



> 🔧 **list_files** — mozi/vinasak/.arsenal

### 🤖 Assistant

> 🔧 called: read_file, read_file



> 🔧 **read_file** — mozi/vinasak/.arsenal/config.mjs

> 🔧 **read_file** — mozi/vinasak/.arsenal/prompts/error_agent.mjs

### 🤖 Assistant

> 🔧 called: read_file, read_file



> 🔧 **read_file** — mozi/vinasak/.arsenal/prompts/component_agent.mjs

> 🔧 **read_file** — mozi/vinasak/.arsenal/prompts/pr_agent.mjs

### 🤖 Assistant

> 🔧 called: read_file, read_file



> 🔧 **read_file** — mozi/vinasak/.arsenal/utils/logger.mjs

> 🔧 **read_file** — mozi/vinasak/.arsenal/prompts/rca_agent.mjs

### 🤖 Assistant

Now I have a thorough understanding of Arsenal's actual architecture. Let me provide a comprehensive, grounded response.

---

# Arsenal for PSLITE_CODE_ENABLED Guard Introduction: Fitness Assessment & Orchestration Design

## 1. Arsenal's Current Fitness Assessment

### What Arsenal Actually Is Today

Based on the actual [`run.mjs`](mozi/vinasak/.arsenal/run.mjs:1), [`config.mjs`](mozi/vinasak/.arsenal/config.mjs:1), and prompt files, Arsenal is a **linear, single-iteration, read-only analysis pipeline** with these concrete characteristics:

| Dimension | Current State | Required for Guard Work |
|---|---|---|
| **Execution model** | Sequential 4-stage chain, `maxIterations: 1` | Multi-story parallel dispatch with dependency ordering |
| **Agent autonomy** | `autoApprove: true` — fully autonomous, no gates | Gated at PR and BLD stages |
| **Repo writes** | None — all agents use `noSandbox()` in read-only mode | File mutations for Cat A `#if defined` → `#if defined SD_ENABLED \|\| defined PSLITE_CODE_ENABLED` |
| **Output format** | Zod-validated JSON handoff state + Markdown artifacts | Structured diff packages + PR templates + HITL checkpoint records |
| **State persistence** | Run-scoped `archive/runs/run-[id]/` folder with stage artifacts | Story-scoped persistent state with resumable checkpoint status |
| **Prompt design** | `{{KEY}}` template substitution in-memory | Story-scoped context injection (issue #, file list, site inventory, category breakdown) |
| **C/C++ awareness** | Zero — designed for JS/DB2 log analysis | Requires `#ifdef`/`#if defined` static analysis, macro semantics, conditional compilation |
| **Issue lifecycle** | No tracker integration | DB2 issue status transitions, comment posting, #94270 Cat B tracker updates |

**Verdict:** Arsenal is **not currently fit** for autonomous guard transformation work. It is a read-and-summarize pipeline, not a code-mutation engine. The gap is structural, not cosmetic — every layer (execution model, sandbox, agent design, output schema, HITL) must be extended.

### What Is Transferable

Three things carry over directly:

1. **The `run()` + `Output.object()` pattern** — structured Zod schema validation and handoff state chain works cleanly for guard classification output. The same pattern used in [`error_agent.mjs`](mozi/vinasak/.arsenal/prompts/error_agent.mjs:4) can be repurposed for `GuardSiteSchema`.
2. **The stage-per-folder archive layout** in [`logger.mjs`](mozi/vinasak/.arsenal/utils/logger.mjs:33) — the `initializeRunDirectory` / `saveStageResult` pattern is directly reusable per story run.
3. **The `compilePrompt()` inline template engine** in [`run.mjs`](mozi/vinasak/.arsenal/run.mjs:22) — story-scoped context injection follows the exact same `{{KEY}}` substitution model.

---

## 2. Orchestration Architecture: Human-Gated Model

The design separates Arsenal's role strictly: **Arsenal generates; humans approve; Arsenal does not push.**

### Pipeline Stages per Story

```
┌─────────────────────────────────────────────────────────────────┐
│  ARSENAL EXECUTION ENGINE                 HUMAN GATE CHECKPOINTS │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [STAGE 1] CLASSIFY                                              │
│  GuardClassifierAgent                                            │
│  → reads all files in story scope                                │
│  → emits GuardSiteInventory JSON                                 │
│  → writes: 01_classify/handoff_state.json                        │
│                                  ↓                               │
│  [STAGE 2] TRANSFORM                                             │
│  GuardTransformAgent                                             │
│  → applies Cat A broadening only (no Cat B/D writes)             │
│  → emits diff package (unified diff per file)                    │
│  → writes: 02_transform/diff_package/                            │
│                                  ↓                               │
│  [STAGE 3] PR TEMPLATE ASSEMBLY                                  │
│  PRTemplateAgent                                                 │
│  → assembles PR title, description, reviewer mentions            │
│  → does NOT submit — writes: 03_pr_template/pr_ready.md          │
│  → sets checkpoint_status: "AWAITING_HUMAN_DIFF_REVIEW"          │
│                                                                  │
│  ══════════════════════════════════════════════════════════════  │
│  ⛔ GATE 1: DIFF REVIEW CHECKPOINT  (human must sign off)        │
│  ══════════════════════════════════════════════════════════════  │
│                                                                  │
│  Human reviews: 03_pr_template/diff_review_request.md            │
│  Human action: writes APPROVE / REJECT / AMEND to               │
│                03_pr_template/human_decision.json                │
│                                                                  │
│  [STAGE 4] PR SUBMISSION (conditional on GATE 1 = APPROVE)       │
│  PRSubmitAgent                                                   │
│  → reads human_decision.json, aborts if not APPROVE             │
│  → raises PR with optional reviewers @pperez @swalkty            │
│     @cmgarcia @finlay tagged but NOT auto-assigned               │
│  → writes: 04_pr_submit/pr_url.txt                               │
│                                                                  │
│  ══════════════════════════════════════════════════════════════  │
│  ⛔ GATE 2: BLD TRIGGER CHECKPOINT  (human must sign off)        │
│  ══════════════════════════════════════════════════════════════  │
│                                                                  │
│  Human action: writes APPROVE / DEFER / SKIP to                  │
│                05_bld_gate/human_decision.json                   │
│                                                                  │
│  [STAGE 5] BLD COORDINATION (conditional on GATE 2 = APPROVE)   │
│  BLDCoordinatorAgent                                             │
│  → posts BLD request comment on PR                               │
│  → monitors BLD result and updates issue status                  │
│  → writes: 05_bld_gate/bld_result.json                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Gate Mechanism Implementation

Each gate is a **filesystem sentinel** + a **blocking `await gatePoll()`** call in the orchestrator:

```js
// New: src/gates/hitl_gate.mjs
export async function waitForHumanDecision(gatePath, { pollIntervalMs = 5000, timeoutMs = 86_400_000 } = {}) {
    const decisionFile = path.join(gatePath, 'human_decision.json');
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        try {
            const raw = await fs.readFile(decisionFile, 'utf8');
            const decision = JSON.parse(raw);
            if (['APPROVE', 'REJECT', 'AMEND', 'DEFER', 'SKIP'].includes(decision.action)) {
                return decision; // { action, reviewer, timestamp, notes }
            }
        } catch { /* file not yet written */ }
        await sleep(pollIntervalMs);
    }
    throw new Error(`HITL gate timed out after ${timeoutMs}ms at ${gatePath}`);
}
```

**Human review experience:** Arsenal writes a `diff_review_request.md` in the stage folder. The reviewer opens it (or a web UI reads it), inspects the diff, writes a `human_decision.json` with `{ "action": "APPROVE", "reviewer": "pperez", "timestamp": "..." }`, and Arsenal resumes. No custom tooling is required beyond a shared filesystem or object storage.

### PR Template (GATE 1 output, not auto-submitted)

```markdown
## PR: [G5-catA-1] Introduce PSLITE_CODE_ENABLED guards — #94278

**Story:** #94278 | **Group:** G5 | **Files:** 18 | **Sites:** 66 (all Cat A)

### Guard Sites Modified
| File | Sites | Category |
|------|-------|----------|
| sqle_somecomponent.C | 12 | A (broaden) |
...

### Diff Summary
- All 66 sites: `#if defined SD_ENABLED` → `#if defined SD_ENABLED || defined PSLITE_CODE_ENABLED`
- No Cat B, C, or D sites in scope for this story

### Optional Reviewers (NOT auto-requested — add if desired)
@pperez @swalkty @cmgarcia @finlay

---
> ⚠️ This PR was Arsenal-generated. Human diff review was completed by: [reviewer] at [timestamp].
> BLD trigger requires separate GATE 2 approval.
```

---

## 3. Required Capability Development

### 3.1 Guard Classification Engine — `GuardClassifierAgent`

This is the most critical new capability. It must statically parse C/C++ source files and classify every preprocessor site.

**New module:** `src/agents/guard_classifier_agent.mjs`

```js
export const GuardSiteSchema = z.object({
    file: z.string(),
    lineNumber: z.number(),
    rawText: z.string().describe("Exact macro text as it appears in source"),
    category: z.enum(['A', 'B', 'C', 'D']),
    categoryRationale: z.string(),
    requiresSeniorReview: z.boolean().describe("True for all Cat B and Cat D sites"),
    proposedTransformation: z.string().nullable().describe("New macro text for Cat A; null for B/D")
});

export const GuardSiteInventorySchema = z.object({
    issueId: z.string(),
    storyGroup: z.string(),
    files: z.array(z.object({
        filePath: z.string(),
        sites: z.array(GuardSiteSchema)
    })),
    summary: z.object({
        totalSites: z.number(),
        catA: z.number(), catB: z.number(), catC: z.number(), catD: z.number()
    }),
    classificationConfidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    flaggedForHumanReview: z.array(z.string()).describe("Site IDs requiring manual inspection")
});
```

**Classification rules encoded in the prompt:**

| Pattern | Category | Action |
|---|---|---|
| `#if defined SD_ENABLED` | A | Broaden to `#if defined SD_ENABLED \|\| defined PSLITE_CODE_ENABLED` |
| `#ifdef SD_ENABLED` | B | No-change — read and confirm only, flag for senior review |
| `#if defined PSLITE_CODE_ENABLED` (no existing SD block) | C | New compile — flag for separate story |
| `if ( SQLPSLITE_RT )` inside a broadened Cat A block | D | Runtime branch — flag, no transformation by Arsenal |

**The classifier runs in read-only mode** (`noSandbox()`). It produces the inventory but does not write to source files. The inventory becomes `01_classify/handoff_state.json` and is the authoritative record for all downstream stages.

### 3.2 Story-Aware Context Loader — `StoryContextLoader`

**New module:** `src/context/story_context_loader.mjs`

Replaces the ad-hoc `config.mockEnv` pattern in [`config.mjs`](mozi/vinasak/.arsenal/config.mjs:18) with a structured per-story context manifest:

```js
// story_registry.json (committed alongside Arsenal)
{
  "94278": {
    "issueId": "94278",
    "group": "G5-catA-1",
    "epicId": "92482",
    "dependsOn": ["94208", "94215", "94210", "94209", "94213", "94216", "94214", "94212"],
    "tier": "sources",
    "filesInScope": ["sqle/foo.C", "sqle/bar.C", ...], // 18 files
    "expectedSiteCounts": { "total": 66, "A": 66, "B": 0, "C": 0, "D": 0 },
    "complexityTier": 3,
    "warmUpOnly": false,
    "requiresCatBTracker": false
  },
  "94273": {
    "issueId": "94273",
    "group": "G5-catB",
    "warmUpOnly": true,  // read-confirm only, no transformation
    "expectedSiteCounts": { "total": 319, "A": 0, "B": 319, "C": 0, "D": 0 }
  },
  ...
}
```

`StoryContextLoader.load(issueId)` resolves the manifest, verifies all `dependsOn` stories have `status: "MERGED"` in a local state ledger, and returns the full context object passed to each agent stage.

### 3.3 Guard Transform Agent — `GuardTransformAgent`

**New module:** `src/agents/guard_transform_agent.mjs`

Only operates on Cat A sites from the inventory. Critically, it must:

1. **Never touch Cat B lines** — even in stories with mixed categories (e.g., #94283 G6: 8A/52B)
2. **Never touch Cat D lines** — even inside blocks being broadened (e.g., #94298 G10: 15 Cat D sites)
3. **Handle header-before-source ordering** — the transform agent for a G5–G16 story must fail-fast if it detects that any `#if defined SD_ENABLED` in a `.h` file in its scope was not already handled by the corresponding G4 story

**Output:** A per-file unified diff package in `02_transform/diff_package/`, one `.patch` file per modified source file. Arsenal writes diffs, not modified files — the actual `git apply` is a human-triggered step after GATE 1.

```js
export const TransformResultSchema = z.object({
    issueId: z.string(),
    transformedFiles: z.array(z.object({
        filePath: z.string(),
        patchContent: z.string().describe("Unified diff format"),
        sitesModified: z.number(),
        catAOnly: z.boolean()
    })),
    skippedSites: z.array(z.object({
        filePath: z.string(),
        lineNumber: z.number(),
        category: z.enum(['B', 'C', 'D']),
        reason: z.string()
    })),
    safetyChecksPassed: z.boolean(),
    abortReasons: z.array(z.string())
});
```

### 3.4 Dependency-Aware Task Sequencer — `DependencyScheduler`

**New module:** `src/scheduler/dependency_scheduler.mjs`

Enforces the strict three-tier dependency chain:

```
Tier 0 (Pre-condition): #93024 status = MERGED  ← check only, never dispatch
Tier 1 (Foundation):    #94207 (G3, sqe/ startup, 3 files, ~40 sites)
Tier 2 (Headers):       #94212, #94214, #94216 (pure Cat B, warmup first)
                        #94213, #94209, #94210, #94215, #94208 (Cat A, ordered by site count)
Tier 3 (Sources):       All G5–G16 — only dispatched after ALL Tier 2 stories = MERGED
                        Within Tier 3, ordered by complexity tier (warmup → simple → complex)
```

The scheduler maintains a `ledger.json` with per-story status: `PENDING | IN_PROGRESS | AWAITING_GATE_1 | AWAITING_GATE_2 | PR_RAISED | BLD_TRIGGERED | MERGED | BLOCKED`. It refuses to dispatch any story whose `dependsOn` entries are not all `MERGED`.

**Critical check for #94208 (G4-sqe, 20 files, 144 sites):** This is the largest header story and the final G4 dependency. The scheduler must treat it as a blocking gate — no G5–G16 story can be dispatched until #94208 transitions to `MERGED`.

### 3.5 HITL Gate Module — `HITLGate`

Already partially specified in §2 above. Full interface:

```js
// src/gates/hitl_gate.mjs
export class HITLGate {
    constructor(gatePath, storyId, gateType) { ... }

    // Writes the review request document for the human
    async writeReviewRequest(content) { ... }

    // Blocks until human_decision.json is written
    async wait(opts) { ... }

    // Records the decision in the story ledger
    async recordDecision(decision) { ... }
}

// Gate types
export const GateType = {
    DIFF_REVIEW:  'DIFF_REVIEW',   // Before PR is raised
    BLD_TRIGGER:  'BLD_TRIGGER',   // Before BLD is requested
    CAT_B_CONFIRM: 'CAT_B_CONFIRM' // Before #94270 tracker update
};
```

### 3.6 Category B Confirmation Tracker — `CatBTrackerAgent`

**New module:** `src/agents/catb_tracker_agent.mjs`

Driven by issue #94270. For every story that contains Cat B sites, after the story's PR is merged, this agent:

1. Extracts the list of Cat B sites from the story's `01_classify/handoff_state.json`
2. Formats a structured confirmation record: file, line, original `#ifdef SD_ENABLED` text, confirmation that no transformation was applied, senior reviewer required
3. Posts the record as a comment on #94270
4. Sets `requiresSeniorReview: true` in the story ledger

**This always goes through a dedicated `CAT_B_CONFIRM` gate** — no comment is posted to #94270 without human review of the confirmation record.

Stories with Cat B sites requiring #94270 updates: #94212 (3 sites), #94214 (6 sites), #94216 (27 sites), #94273 (319 sites — entire story), #94283 (52B), #94285 (5B), #94289 (11B), #94290 (7B), #94282 (23B), #94279 (10B), and others.

### 3.7 Warm-Up PR Support

Four stories require **zero transformations** and serve as pipeline validation runs:
- **#94273** (G5-catB): 4 files, 319 sites, all Cat B — read-and-confirm only
- **#94212** (G4-sqp): 2 files, 3 sites, all Cat B
- **#94214** (G4-ha): 6 files, 6 sites, all Cat B
- **#94216** (G4-misc-B): 8 files, 27 sites, all Cat B

For these stories, the `GuardTransformAgent` is **skipped entirely**. The pipeline runs: Classify → Confirm No Changes → PR Template (description-only PR documenting the Cat B review) → GATE 1 → PR Submission. The PR body serves as the formal record that Arsenal inspected these files, found only Cat B sites, and confirmed no transformation was applied.

---

## 4. Risk and Control Analysis

### Risk 1: `autoApprove: true` is catastrophically unsafe for this work

The current [`config.mjs:14`](mozi/vinasak/.arsenal/config.mjs:14) sets `autoApprove: true`. On the RCA pipeline this is benign — the agents only read files. On a guard transformation pipeline with file write access, `autoApprove: true` would allow Arsenal to write incorrect `#if defined` expansions to C++ source files without any checkpoint. A misclassification of a Cat B site as Cat A would change semantics: `#ifdef SD_ENABLED` covers full pureScale; broadening it to include `PSLITE_CODE_ENABLED` without confirming the body is safe is a correctness defect, not a style issue.

**Mandatory fix:** `autoApprove` must be `false` for all stages that write files or interact with the tracker/repo system. Only the read-only `GuardClassifierAgent` may run with `autoApprove: true`.

### Risk 2: Category B misclassification is silent and harmful

`#ifdef SD_ENABLED` (Cat B) and `#if defined SD_ENABLED` (Cat A) differ by one character. An LLM classifier operating without explicit pattern-matching rules will occasionally misclassify Cat B as Cat A. The consequences:

- **#94273 (319 Cat B sites):** A classifier with 99% accuracy would misclassify ~3 sites. At 319 sites, those 3 misses would silently broaden pureScale-only code to also compile for pS Lite.
- **#94282 (sqle_pd.C, 23 Cat B / 8 Cat A):** This file has the worst B/A ratio among the complex sources. A classifier that over-patterns on `SD_ENABLED` would produce a diff that looks correct at a glance but misbroadens the 23 Cat B guards.

**Control:** The `GuardClassifierAgent` must use exact string matching (not semantic understanding) for the Cat A vs Cat B distinction. The prompt must include the rule verbatim and require the agent to output the `rawText` field so the human reviewer can verify the classification against the literal source text in the diff.

### Risk 3: Cat D runtime branches inside broadened Cat A blocks

Cat D sites (`if ( SQLPSLITE_RT )`) appear **inside** Cat A blocks that Arsenal is broadening. Stories with high Cat D counts:
- **#94308 (G14): 7 Cat D sites across 12 source lines**
- **#94298 (G10): 15 Cat D sites**
- **#94306 (G12): 9 Cat D sites**

If Arsenal broadens the outer `#if defined SD_ENABLED` to include `PSLITE_CODE_ENABLED` but also touches the inner `if ( SQLPSLITE_RT )` line (even formatting it), it corrupts semantics at runtime. The inner runtime branch is not a preprocessor guard — it is a runtime conditional. Mixing it with a preprocessor transformation in the same diff makes human review significantly harder.

**Control:** The transform agent must detect Cat D sites within blocks it is broadening and emit them as `skippedSites` with `category: 'D'`. The diff must show the outer guard transformed but the inner `if ( SQLPSLITE_RT )` line unchanged, with a comment in the PR template explicitly listing each Cat D site and its line number for human verification.

### Risk 4: #94289 (G8) — inverted guard

G8 contains an **inverted guard** pattern. This is not described in the standard Cat A rule and likely means something like `#if !defined SD_ENABLED` or a guard where the absence of the flag is the enabling condition. Arsenal must not apply the standard Cat A broadening to an inverted guard. The classifier must detect inversion patterns and emit `category: 'INVERTED'` (a fifth category) or `requiresSeniorReview: true` unconditionally, blocking any transformation and requiring a human decision before Arsenal proceeds.

### Risk 5: #94279 (pdSDCATypesFmt.C, 82 sites, 72A/10B) — highest per-file complexity

82 guard sites in a single file is the highest per-file density in the entire epic. At this density:
- The classifier's per-site accuracy compounds: at 99% accuracy, expect ~0.8 misclassified sites
- The human diff review will be 200–400 lines long; reviewers will fatigue and miss issues in the middle
- The 10 Cat B sites are interleaved with the 72 Cat A sites — a reviewer must track two parallel mental models simultaneously

**Control:** For #94279 specifically, the diff review document must be **sorted by category** (all Cat A transformations first, then all Cat B no-change confirmations), not by line number. This is a specific formatting requirement in the `PRTemplateAgent` for files with >50 sites. Additionally, the human gate for this story should explicitly require **two reviewer sign-offs**, not one, before GATE 1 is passed.

### Why Human Evaluation is Non-Negotiable

The core issue is that this is **semantic-preserving refactoring in a safety-critical codebase**. Unlike formatting or import reordering, every Cat A transformation changes which code paths compile. Every Cat B non-change is an assertion that the pureScale-only semantics are intentional and must be preserved. Neither of these can be validated by Arsenal alone because:

1. Arsenal has no access to the runtime semantics of `SQLPSLITE_RT` or the pureScale execution model
2. Arsenal cannot run the DB2 build system to verify that broadened guards produce correct object code
3. Arsenal cannot assess whether a Cat B site in a shared header will be correctly excluded at link time for a pS Lite build

Human review at code review time is the only mechanism that catches classification errors before they reach the build.

---

## 5. Recommended Rollout Sequence

### Phase 0 — Pipeline Validation (Zero transformation risk)
**Target stories:** #94212, #94214, #94216, #94273 (all pure Cat B)
**Arsenal behaviour:** Classify only → confirm no transformation → read-only PR
**Gate configuration:** GATE 1 required; GATE 2 optional (no code change to build-test)
**Goal:** Validate that the `GuardClassifierAgent` correctly identifies all Cat B patterns, that the `StoryContextLoader` correctly loads file lists, and that the archive structure is consistent. Also produces the first four #94270 Cat B tracker entries.
**Exit criterion:** Classifier output matches expected `{ B: N, A: 0, C: 0, D: 0 }` for each story with zero discrepancies on human diff review.

### Phase 1 — Foundation (Minimal file count, all headers)
**Target stories:** #94213 (1 file, 1 site, Cat A) → #94209 (5 files, 9 sites) → #94207 (G3, ~40 sites)
**Arsenal behaviour:** Full pipeline including GATE 1 (diff review) + GATE 2 (BLD)
**Gate configuration:** Both gates required; single reviewer sign-off sufficient
**Goal:** Validate end-to-end pipeline including `git apply`, PR submission, and BLD coordination on the smallest possible Cat A stories before touching the 20-file #94208.
**Exit criterion:** All three PRs merged; BLD results clean; no classification errors.

### Phase 2 — G4 Headers Escalation (Mid-complexity)
**Target stories:** #94210 (10 files, 16 sites) → #94215 (16 files, 28 sites) → #94208 (20 files, 144 sites — hold for last)
**Arsenal behaviour:** Full pipeline; #94208 requires two reviewer sign-offs at GATE 1 due to site count
**Gate configuration:** GATE 1 mandatory with two-reviewer requirement for #94208; GATE 2 mandatory for all
**Goal:** Complete all G4 headers before any G5–G16 dispatch. The scheduler enforces this via the dependency ledger.
**Exit criterion:** All eight G4 stories in `MERGED` state; #94208 specifically confirmed by a senior developer.

### Phase 3 — G5–G16 Sources (Tier 1: Simple, zero Cat D)
**Target stories:** #94309 (G15, 8 files, 8 sites, 0 Cat D) → #94307 (G13, 10 sites, 1 Cat D) → #94310 (G16, 3 Cat D) → #94306 (G12, 9 Cat D)
**Arsenal behaviour:** Cat D sites emitted as `skippedSites` in the diff package; reviewer must explicitly confirm each Cat D line is unchanged
**Gate configuration:** Full gates; GATE 1 diff must include explicit Cat D inventory section
**Goal:** Validate Cat D handling before stories with ≥15 Cat D sites.

### Phase 4 — G5–G16 Sources (Tier 2: Mixed, moderate Cat D)
**Target stories:** #94283 (G6), #94285 (G7), #94300 (G11), #94290 (G9, AIX site), #94298 (G10, 15 Cat D), #94308 (G14, 7 Cat D)
**Arsenal behaviour:** #94290 gets a special `AIX_PLATFORM` flag in the context loader — the AIX site may have platform-conditional guard semantics that differ from the standard classification
**Gate configuration:** Two-reviewer GATE 1 for #94298 and #94308 due to Cat D density

### Phase 5 — G5–G16 Sources (Tier 3: Highest complexity)
**Target stories:** #94278 (G5-catA-1, 18 files, 66 sites) → #94280 (G5-catA-2b, mixed) → #94289 (G8, inverted guard) → #94282 (sqle_pd.C, 31 sites, 23B/8A/3D) → #94279 (pdSDCATypesFmt.C, 82 sites, 72A/10B)
**Special handling for #94289:** Arsenal must fail-fast and output `abortReasons: ["INVERTED_GUARD_DETECTED"]` until the inversion pattern is explicitly classified by a human and encoded as a new rule in the classifier prompt.
**Special handling for #94279:** Diff review document sorted by category; two reviewer sign-offs required at GATE 1; Cat B sites presented as a separate table from Cat A transformations.

### Phase 6 — #94270 Cat B Master Tracker Completion
After all stories are merged, the `CatBTrackerAgent` consolidates all Cat B confirmation records across all stories and posts a final completion summary to #94270. This is the final gated action — it requires senior developer sign-off before Arsenal posts.

---

## Summary: What Must Be Built

| Capability | New Module | Blocking For |
|---|---|---|
| Guard classification engine | `guard_classifier_agent.mjs` + `GuardSiteInventorySchema` | Every story |
| Story context loader + registry | `story_context_loader.mjs` + `story_registry.json` | Every story |
| Guard transform agent (diffs only) | `guard_transform_agent.mjs` + `TransformResultSchema` | Phase 1+ |
| HITL gate (filesystem sentinel + poll) | `hitl_gate.mjs` + `HITLGate` class | Every story |
| Dependency scheduler + ledger | `dependency_scheduler.mjs` + `ledger.json` | Tier ordering |
| PR template agent (no auto-submit) | `pr_template_agent.mjs` | Phase 1+ |
| PR submit agent (gate-conditional) | `pr_submit_agent.mjs` | Phase 1+ |
| Cat B tracker agent | `catb_tracker_agent.mjs` | Phase 0 Cat B |
| `autoApprove: false` for write stages | [`config.mjs`](mozi/vinasak/.arsenal/config.mjs:14) change | All phases |
| Inverted guard classifier rule | Classifier prompt + `INVERTED` category | #94289 (Phase 5) |
| Two-reviewer gate enforcement | `HITLGate` + `minReviewers` param | #94208, #94279, #94298 |

The existing [`run.mjs`](mozi/vinasak/.arsenal/run.mjs:30) pipeline structure, Zod schema validation pattern, `compilePrompt()` template engine, and `saveStageResult()` archive logger all carry forward unchanged — the new modules slot into this foundation rather than replacing it.