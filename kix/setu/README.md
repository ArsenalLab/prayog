# diskann_zlinux_v2

A sandcastle orchestrator that ports the DiskANN C++ library to IBM z/Linux (s390x) using AI agents running on a Fyre VM.

- **Target machine:** `KhushiTyagi463-bot01-zlinux.dev.fyre.ibm.com` (RHEL 9 s390x)
- **Target repo:** `/home/khushiid/DiskANN` on the VM
- **Branch produced:** `diskann-zlinux-gcc15`
- **Fork:** `git@github.ibm.com:Khushi-Tyagi463/DiskANN.git`

---

## What it does

Two AI agents connect to the z/Linux VM over SSH, read the DiskANN codebase, figure out what is needed to build it on s390x, apply the necessary changes, and verify the result by running all unit tests in both Debug and Release configurations. When everything passes the agents commit the changes and push the branch to the personal fork.

**Agent 01 — Understand and Plan**  
Connects to the VM, discovers the platform (architecture, endianness, compiler, available headers), reads the DiskANN build system, attempts a probe build to collect real compiler errors, and produces a concrete porting plan backed by exact file and line numbers. Makes no changes to the repo.

**Agent 02 — Implement, Build, Push**  
Takes the plan from Agent 01 and executes it. Applies the source and CMake changes, runs `cmake` and `cmake --build` for both Debug and Release, iterates on any remaining compiler errors until the build is clean, runs `diskann_unit_tests` for both configurations, then commits and pushes to the fork.

---

## Running

```bash
# 1. Copy the env file and paste your Bob API key
cp diskann_zlinux_v2/.env.example diskann_zlinux_v2/.env

# 2. Run the full pipeline (both agents)
npx tsx diskann_zlinux_v2/main.mts
```

The pipeline prints progress to stdout as it runs. All detailed output is written to `logs/`.

---

## Files

### `main.mts`
The entry point for the full porting pipeline. Starts Agent 01 then Agent 02 in sequence. If Agent 01 fails the pipeline aborts. Writes run logs and a JSON summary to `logs/`.

### `main-fixup-release.mts`
A standalone single-agent runner for fixing the Release build when the Debug build already passes. Runs Agent 04 in isolation — no pipeline, no Agent 01/02. Use this if the Release build broke after a successful `main.mts` run. Amends the existing commit and force-pushes.

### `.env.example`
Template for the API key file. Copy to `.env` and fill in your Bob API key (`bob_prod_bob-user_...`).

### `DESIGN.md`
Internal design notes covering agent responsibilities, iteration budgets, and decisions made during development.

---

## Prompts

Each prompt is the instruction set given to one agent. The agent reads it, executes the described steps on the VM, and stops when done.

### `prompts/01-understand-and-plan.md`
Instructs Agent 01 to discover the platform from scratch, read the DiskANN build system, run a probe build, trace every compiler error to its root cause, check BLAS availability and compiler compatibility, and write a structured porting plan. The agent makes no repo changes.

### `prompts/02-implement-build-push.md`
Instructs Agent 02 to apply the plan from Agent 01, configure and build DiskANN in Debug and Release modes using `gcc-toolset-15`, run all unit tests, iterate on any failures, then commit and push the branch to the fork. The success criterion is both `./build/tests/diskann_unit_tests` and `./build_release/tests/diskann_unit_tests` exiting with code 0.

### `prompts/04-fixup-release-build.md`
Instructs Agent 04 to confirm the Debug build still passes, attempt the Release build, fix any Release-specific errors (inlining, `-DNDEBUG`, strict aliasing, s390x intrinsic guards), run Release tests, do a final Debug sanity check, then amend the existing commit and force-push.

---

## Logs

All log files are written to `logs/` and named by run timestamp.

| File pattern | Contents |
|---|---|
| `run-<ts>.log` | Human-readable orchestrator log — pipeline start/end and per-agent timing |
| `run-<ts>.ndjson` | Same events as newline-delimited JSON — one record per line |
| `summary-<ts>.json` | Final verdict: overall PASS/FAIL, per-agent status and duration, branch, host |
| `01-understand-and-plan-<ts>.log` | Full Agent 01 conversation — every command run, output read, and the porting plan produced |
| `02-implement-build-push-<ts>.log` | Full Agent 02 conversation — every code change, build attempt, error fix, test result, and git push |
| `04-fixup-release-build-<ts>.log` | Full Agent 04 conversation — Release-specific fixes and final push |
| `summary-fixup-release-<ts>.json` | Verdict for a fixup run |
