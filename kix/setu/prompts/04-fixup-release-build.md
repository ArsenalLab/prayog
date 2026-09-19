# Agent 04 — Fix Release-mode build on z/Linux

You are an expert systems programmer. The DiskANN codebase has already been
ported to IBM z/Linux (s390x) on branch `diskann-zlinux-gcc15`. The Debug
build passes all unit tests. The Release build is failing.

Your job is to fix whatever is breaking the Release build, verify both Debug
and Release still pass, then amend the existing commit and force-push.

- VM     : `KhushiTyagi463-bot01-zlinux.dev.fyre.ibm.com`
- User   : `khushiid`
- Repo   : `/home/khushiid/DiskANN`
- Branch : `diskann-zlinux-gcc15`
- Fork   : `git@github.ibm.com:Khushi-Tyagi463/DiskANN.git`

**Do not stop until both builds pass**, or you have exhausted all reasonable
fixes (max ~15 iterations of fix-rebuild-test per build type).

---

## Step 1 — Confirm branch and current state

```bash
cd /home/khushiid/DiskANN
git branch
git log --oneline -3
git status
```

---

## Step 2 — Confirm Debug still passes (sanity check)

If a `build/` directory already exists and is up to date you can skip the
cmake configure, otherwise:

```bash
cd /home/khushiid/DiskANN
rm -rf build
cmake -S . -B build \
  -DCMAKE_C_COMPILER=/opt/rh/gcc-toolset-15/root/usr/bin/gcc \
  -DCMAKE_CXX_COMPILER=/opt/rh/gcc-toolset-15/root/usr/bin/g++ \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_CXX_STANDARD=20 \
  -DUSE_OPEN_BLAS=ON \
  -DUNIT_TEST=ON \
  -DWITH_TCMALLOC=OFF 2>&1
cmake --build build -j"$(nproc)" 2>&1 | tail -5
./build/tests/diskann_unit_tests --log_level=test_suite 2>&1 | tail -10
echo "--- debug-test exit: $? ---"
```

Both must exit 0 before proceeding.

---

## Step 3 — Attempt Release build and capture errors

```bash
cd /home/khushiid/DiskANN
rm -rf build_release
cmake -S . -B build_release \
  -DCMAKE_C_COMPILER=/opt/rh/gcc-toolset-15/root/usr/bin/gcc \
  -DCMAKE_CXX_COMPILER=/opt/rh/gcc-toolset-15/root/usr/bin/g++ \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_CXX_STANDARD=20 \
  -DUSE_OPEN_BLAS=ON \
  -DUNIT_TEST=ON \
  -DWITH_TCMALLOC=OFF 2>&1
echo "--- cmake-release exit: $? ---"
```

If cmake itself errors: read the output, fix the cause, re-run cmake.

Then build:

```bash
cd /home/khushiid/DiskANN
cmake --build build_release -j"$(nproc)" 2>&1
echo "--- build_release exit: $? ---"
```

---

## Step 4 — Fix Release errors iteratively

**When the build fails**, read the first `error:` line. It tells you exactly
which file and line is broken. Fix that file. Rebuild. Repeat.

### Common Release-vs-Debug differences to watch for on s390x

- **Inlining / LTO**: Release enables `-O2`/`-O3` and inlining. Functions that
  were never instantiated in Debug may now be instantiated and expose template
  or `constexpr` errors.

- **`-DNDEBUG`**: Release defines `NDEBUG`, which disables `assert()`. Code
  that relies on assert side-effects (e.g. `assert(ptr = something)`) will
  break silently or fail to compile.

- **Strict aliasing**: Release enables `-fstrict-aliasing`. Type-punning
  through raw pointer casts that compiles in Debug may be UB-flagged in Release.

- **Missing `inline` / ODR violations**: Functions defined in headers without
  `inline` that compile fine in Debug (single TU) may trigger ODR errors when
  full inlining happens in Release.

- **s390x-specific intrinsic guards**: Any `#ifdef __x86_64__` or
  `#ifdef __SSE__` blocks that were previously dead code may now be reached
  under Release optimisation paths. Verify they are properly guarded.

For each error:
1. Read 10 lines around the error location.
2. Understand why it only fails in Release (or on s390x + Release).
3. Make the smallest possible fix that does not break Debug or x86.

---

## Step 5 — Run Release tests

```bash
cd /home/khushiid/DiskANN
./build_release/tests/diskann_unit_tests --log_level=test_suite 2>&1
echo "--- release-test exit: $? ---"
```

If tests fail: read the failure, trace it to source, fix, rebuild Release,
retest. If a fix touches shared source, also rebuild Debug and confirm it
still passes.

---

## Step 6 — Final Debug sanity check

After all Release fixes are applied:

```bash
cd /home/khushiid/DiskANN
cmake --build build -j"$(nproc)" 2>&1 | tail -5
./build/tests/diskann_unit_tests --log_level=test_suite 2>&1 | tail -5
echo "--- debug-final exit: $? ---"
```

Exit 0 required.

---

## Step 7 — Commit and push

```bash
cd /home/khushiid/DiskANN

# Stage all source/cmake changes (exclude build artefacts)
git add -A
for f in $(git diff --cached --name-only | grep -E '\.o$|\.log$|^build'); do
  git restore --staged "$f" 2>/dev/null || true
done

# Show exactly what is staged
git diff --cached --name-only
git diff --cached --stat

# Confirm fork remote
git remote get-url fork 2>/dev/null \
  || git remote add fork git@github.ibm.com:Khushi-Tyagi463/DiskANN.git

# Amend the existing port commit
git commit --amend --no-edit

# Force-push
git push fork diskann-zlinux-gcc15 --force-with-lease 2>&1

echo "SHA: $(git rev-parse --short HEAD)"
echo "PR : https://github.ibm.com/Khushi-Tyagi463/DiskANN/compare/main...diskann-zlinux-gcc15?expand=1"
```

---

## Final output

```
=== RELEASE FIXUP SUMMARY ===
Files changed          : <list every file and one-line reason>
cmake configure Debug  : OK
cmake build Debug      : OK
Tests Debug            : <N> cases — PASS
cmake configure Release: OK
cmake build Release    : OK (iterations needed: N)
Tests Release          : <N> cases — PASS
Commit                 : <sha> (amended)
Push                   : OK / FAILED
PR URL                 : https://github.ibm.com/Khushi-Tyagi463/DiskANN/compare/main...diskann-zlinux-gcc15?expand=1
=== END ===
```

Then output the text: RFC_DONE
