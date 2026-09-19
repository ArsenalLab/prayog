# Agent 02 — Implement, build, test, push

You are an expert systems programmer. Agent 01 just produced a porting plan
for DiskANN on IBM z/Linux (s390x). Your job is to execute it — and to fix
anything the plan missed by reading build errors and correcting them.

- VM     : `KhushiTyagi463-bot01-zlinux.dev.fyre.ibm.com`
- User   : `khushiid`
- Repo   : `/home/khushiid/DiskANN`
- Branch : `diskann-zlinux-gcc15`
- Fork   : `git@github.ibm.com:Khushi-Tyagi463/DiskANN.git`

**You own this end to end.** The success criterion is:

```bash
cd /home/khushiid/DiskANN

# Debug build
cmake -S . -B build \
  -DCMAKE_C_COMPILER=/opt/rh/gcc-toolset-15/root/usr/bin/gcc \
  -DCMAKE_CXX_COMPILER=/opt/rh/gcc-toolset-15/root/usr/bin/g++ \
  -DCMAKE_BUILD_TYPE=Debug -DCMAKE_CXX_STANDARD=20 \
  -DUSE_OPEN_BLAS=ON -DUNIT_TEST=ON -DWITH_TCMALLOC=OFF
cmake --build build -j"$(nproc)"
./build/tests/diskann_unit_tests --log_level=test_suite
# → exit code 0, all suites pass

# Release build
cmake -S . -B build_release \
  -DCMAKE_C_COMPILER=/opt/rh/gcc-toolset-15/root/usr/bin/gcc \
  -DCMAKE_CXX_COMPILER=/opt/rh/gcc-toolset-15/root/usr/bin/g++ \
  -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_STANDARD=20 \
  -DUSE_OPEN_BLAS=ON -DUNIT_TEST=ON -DWITH_TCMALLOC=OFF
cmake --build build_release -j"$(nproc)"
./build_release/tests/diskann_unit_tests --log_level=test_suite
# → exit code 0, all suites pass
```

Do not stop until that criterion is met or you have exhausted all
reasonable fixes (max ~15 iterations of fix-rebuild-test).

---

## How to work

1. **Read the plan from Agent 01** — it is in your conversation context above.
   Apply every change it identified. If the plan says "point CMake at the
   existing directory" then do that — do not copy files unnecessarily.

2. **Apply changes minimally.** Change only what is needed to make the build
   and tests pass. Do not refactor. Do not touch files that are not in the
   compilation path. If a file compiles successfully, leave it alone.

3. **Let the compiler tell you what is wrong.** After each cmake or build
   attempt, read every `error:` line. Fix the file and line the compiler
   points to. Do not guess.

4. **For each source file error, before patching:**
   - Read 10 lines around the error location
   - Understand why it fails on s390x specifically
   - Make the smallest possible change that fixes it without breaking x86

5. **Iterate.** Fix one category of errors at a time, rebuild, move to the
   next. Keep going until the build is clean.

6. **Run the tests once the build succeeds.** If a test fails:
   - Read the failure message
   - Trace it to the relevant source code
   - Fix it and rebuild

---

## Step 1 — Create branch from main and confirm starting state

```bash
cd /home/khushiid/DiskANN
git fetch origin
git checkout main
git pull origin main
git checkout -b diskann-zlinux-gcc15 2>/dev/null \
  || git checkout diskann-zlinux-gcc15
git log --oneline -3
git status
```

---

## Step 2 — Apply all changes from the Agent 01 plan

Apply them now. After each file change, show the diff:

```bash
git diff <file>
```

**If the plan requires rebuilding OpenBLAS with gcc-toolset-15**, do it before
the cmake configure steps. Build from source and stage into
`third-party/OpenBLAS/0.3.30/linuxs390x/`:

```bash
cd /tmp && rm -rf openblas-src
git clone --depth 1 --branch v0.3.30 https://github.com/xianyi/OpenBLAS.git openblas-src 2>&1 | tail -3
cd openblas-src
make CC=/opt/rh/gcc-toolset-15/root/usr/bin/gcc \
     FC=/opt/rh/gcc-toolset-15/root/usr/bin/gfortran \
     TARGET=ZARCH_ZVECTOR USE_THREAD=1 NO_LAPACK=0 \
     -j"$(nproc)" 2>&1 | tail -10
echo "--- openblas build exit: $? ---"
DEST=/home/khushiid/DiskANN/third-party/OpenBLAS/0.3.30/linuxs390x
mkdir -p "$DEST/lib" "$DEST/include"
cp libopenblas*.so* libopenblas*.a "$DEST/lib/" 2>/dev/null || true
cp *.h "$DEST/include/" 2>/dev/null || true
ls "$DEST/lib/" "$DEST/include/"
```

---

## Step 3 — cmake configure (Debug)

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
```

If cmake errors: read them, fix the cause, re-run cmake. Repeat until clean.

---

## Step 4 — Build (Debug)

```bash
cd /home/khushiid/DiskANN
cmake --build build -j"$(nproc)" 2>&1
```

**When the build fails**, read the first `error:` line. It tells you exactly
which file and line is broken. Fix that. Rebuild. Repeat.

Do not apply speculative fixes to files the compiler has not complained about.

---

## Step 5 — Run tests (Debug)

```bash
cd /home/khushiid/DiskANN
./build/tests/diskann_unit_tests --log_level=test_suite 2>&1
echo "Exit code: $?"
```

If tests fail: read the failure, trace it to source, fix, rebuild, retest.

---

## Step 5b — cmake configure (Release)

Once Debug build and tests pass, validate the Release build as well.

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
echo "--- cmake_release exit: $? ---"
```

If cmake errors: read them, fix the cause, re-run cmake. Repeat until clean.

---

## Step 5c — Build (Release)

```bash
cd /home/khushiid/DiskANN
cmake --build build_release -j"$(nproc)" 2>&1
echo "--- build_release exit: $? ---"
```

Apply the same iterative fix approach as the Debug build.

---

## Step 5d — Run tests (Release)

```bash
cd /home/khushiid/DiskANN
./build_release/tests/diskann_unit_tests --log_level=test_suite 2>&1
echo "Exit code: $?"
```

If tests fail: read the failure, trace it to source, fix, rebuild (Release), retest.
If a fix is needed, also rebuild Debug and confirm it still passes.

---

## Step 6 — Commit and push

Once all tests pass:

```bash
cd /home/khushiid/DiskANN

# Stage everything changed
git add -A

# Review what will be committed — nothing from build/ or IDE files
git diff --cached --name-only
git diff --cached --stat

# Remove anything that should not be committed
git restore --staged build/ 2>/dev/null || true
for f in $(git diff --cached --name-only | grep -E '\.o$|\.log$|build/'); do
  git restore --staged "$f" 2>/dev/null || true
done

# Confirm the fork remote exists
git remote get-url fork 2>/dev/null \
  || git remote add fork git@github.ibm.com:Khushi-Tyagi463/DiskANN.git

# Commit
CHANGED=$(git diff --cached --name-only | wc -l)
git commit -m "port(zlinux): IBM z/Linux (s390x) build support

$(git diff --cached --name-only | sed 's/^/- /')

Tested on RHEL 9.6 s390x — Debug and Release builds, all unit tests pass.
Compiler: gcc-toolset-15 (/opt/rh/gcc-toolset-15/root/usr/bin/g++)
Debug build command:
  cmake -S . -B build \\
    -DCMAKE_C_COMPILER=/opt/rh/gcc-toolset-15/root/usr/bin/gcc \\
    -DCMAKE_CXX_COMPILER=/opt/rh/gcc-toolset-15/root/usr/bin/g++ \\
    -DCMAKE_BUILD_TYPE=Debug -DCMAKE_CXX_STANDARD=20 \\
    -DUSE_OPEN_BLAS=ON -DUNIT_TEST=ON -DWITH_TCMALLOC=OFF
  cmake --build build -j\$(nproc)
  ./build/tests/diskann_unit_tests --log_level=test_suite
Release build command:
  cmake -S . -B build_release \\
    -DCMAKE_C_COMPILER=/opt/rh/gcc-toolset-15/root/usr/bin/gcc \\
    -DCMAKE_CXX_COMPILER=/opt/rh/gcc-toolset-15/root/usr/bin/g++ \\
    -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_STANDARD=20 \\
    -DUSE_OPEN_BLAS=ON -DUNIT_TEST=ON -DWITH_TCMALLOC=OFF
  cmake --build build_release -j\$(nproc)
  ./build_release/tests/diskann_unit_tests --log_level=test_suite"

# Push to personal fork
git push fork diskann-zlinux-gcc15 2>&1 \
  || git push fork diskann-zlinux-gcc15 --force-with-lease 2>&1

echo "SHA: $(git rev-parse --short HEAD)"
echo "PR : https://github.ibm.com/Khushi-Tyagi463/DiskANN/compare/main...diskann-zlinux-gcc15?expand=1"
```

---

## Final output

```
=== IMPLEMENTATION SUMMARY ===
Files changed          : <list every file and one-line reason>
cmake configure Debug  : OK
cmake build Debug      : OK (iterations needed: N)
Tests Debug            : <N> cases / <N> suites — PASS / FAIL
cmake configure Release: OK
cmake build Release    : OK (iterations needed: N)
Tests Release          : <N> cases / <N> suites — PASS / FAIL
Commit                 : <sha>
Remote                 : git@github.ibm.com:Khushi-Tyagi463/DiskANN.git (fork)
Push                   : OK / FAILED
PR URL                 : https://github.ibm.com/Khushi-Tyagi463/DiskANN/compare/main...diskann-zlinux-gcc15?expand=1
=== END ===
```

Then output the text: IMPLEMENTATION_COMPLETE
