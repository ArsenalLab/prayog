# Agent 01 — Understand the platform and codebase, produce a porting plan

You are an expert systems programmer. You have been given a C++ codebase
(DiskANN) and a machine. Your job is to figure out what changes are needed
to make the codebase build and pass all unit tests on this machine.

You have been told nothing about the platform. Discover everything yourself.

- Repo : `/home/khushiid/DiskANN`
- Fork : `git@github.ibm.com:Khushi-Tyagi463/DiskANN.git`

---

## Phase 1 — Understand the machine

Before reading a single line of source code, understand the platform you are
building on. Every limitation you discover here is a potential porting problem.

```bash
# Identity
uname -a
uname -m
cat /etc/os-release | grep -E "^NAME|^VERSION="

# Compiler
gcc --version
g++ --version
cmake --version

# What instruction sets does this CPU actually support?
# On x86 this lists SSE/AVX. On other architectures it lists something else entirely.
cat /proc/cpuinfo | grep -E "^flags|^Features|^facilities" | head -3

# Byte order
python3 -c "import sys; print('byte order:', sys.byteorder)" 2>/dev/null \
  || python3 -c "import struct; print('byte order:', 'big' if struct.pack('H',1)==b'\x00\x01' else 'little')" 2>/dev/null \
  || echo "ibase=16; $(dd if=/dev/urandom bs=2 count=1 2>/dev/null | xxd -p | tr -d ' ')" | bc 2>/dev/null \
  || echo "checking endianness via compiler:" \
  && echo 'int main(){union{int i;char c[4];}u={1};return u.c[0];}' \
     | gcc -x c - -o /tmp/endian_check && /tmp/endian_check; echo "exit $?: 0=little-endian 1=big-endian"

# What C++ headers exist for SIMD / intrinsics?
find /usr/lib/gcc /usr/include -name "immintrin.h" 2>/dev/null | head -5
find /usr/lib/gcc /usr/include -name "vecintrin.h" -o -name "s390intrin.h" \
  -o -name "arm_neon.h" -o -name "altivec.h" 2>/dev/null | head -5

# What compiler builtins are available for CPU feature detection?
echo '#include <stdio.h>
int main() {
#ifdef __x86_64__
  printf("x86_64: __builtin_cpu_supports available\n");
#elif defined(__s390x__)
  printf("s390x: no __builtin_cpu_supports\n");
#elif defined(__aarch64__)
  printf("aarch64: __builtin_cpu_supports may be available\n");
#elif defined(__powerpc__)
  printf("ppc: no __builtin_cpu_supports\n");
#else
  printf("unknown arch\n");
#endif
  return 0;
}' | gcc -x c - -o /tmp/arch_check && /tmp/arch_check

# Is tcmalloc (gperftools) available?
ldconfig -p 2>/dev/null | grep tcmalloc || echo "tcmalloc: not found in ldconfig"
find /usr /lib -name "*tcmalloc*" 2>/dev/null | head -5 || echo "tcmalloc: not found"

# Is the system OpenBLAS available? Any BLAS?
ldconfig -p 2>/dev/null | grep -i "blas\|openblas" | head -5
find /usr -name "cblas.h" 2>/dev/null | head -5
```

From this output, answer:
- What architecture is this? What endianness?
- Does `immintrin.h` (x86 Intel intrinsics) exist here?
- Are there architecture-native SIMD headers (s390 vector, ARM NEON, etc.)?
- Does `__builtin_cpu_supports` work on this arch?
- Is tcmalloc available?
- What platform-specific constraints does this impose on any C++ codebase?

---

## Phase 2 — Understand the codebase build system

Now read the build system to understand how DiskANN currently handles
different platforms.

```bash
cd /home/khushiid/DiskANN
cat CMakeLists.txt
cat src/CMakeLists.txt
```

From this, answer:
- What platforms does DiskANN already know about? How are they detected?
- What pattern does it use to handle them (look for any existing non-x86 port)?
- What variable controls the BLAS library path? How does it choose per platform?
- What controls tcmalloc?
- What controls compiler flags per platform?
- Is there an endian-swap option? What does it do?
- Does this machine match any known platform? If not, what falls through?

---

## Phase 3 — Try to build as-is and observe failures

Create the working branch and attempt a build. Let the toolchain tell you
exactly what it cannot do on this platform.

```bash
cd /home/khushiid/DiskANN
git fetch origin
git checkout -B diskann-zlinux-gcc15 origin/main

# Confirm the correct compiler is present
/opt/rh/gcc-toolset-15/root/usr/bin/g++ --version

# cmake configure — this may fail or warn
rm -rf build_probe
cmake -S . -B build_probe \
  -DCMAKE_C_COMPILER=/opt/rh/gcc-toolset-15/root/usr/bin/gcc \
  -DCMAKE_CXX_COMPILER=/opt/rh/gcc-toolset-15/root/usr/bin/g++ \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_CXX_STANDARD=20 \
  -DUSE_OPEN_BLAS=ON \
  -DUNIT_TEST=ON \
  -DWITH_TCMALLOC=OFF 2>&1
echo "--- cmake exit: $? ---"
```

If cmake succeeds, attempt a compile of just the core library to surface
source-level errors:

```bash
cd /home/khushiid/DiskANN
cmake --build build_probe --target diskann_s 2>&1 | head -60
echo "--- build exit: $? ---"
rm -rf build_probe
```

Record every `CMake Error` and every compiler `error:` line. These are the
ground truth of what needs fixing.

---

## Phase 4 — For each error, trace it to its root cause

For every error the toolchain produced in Phase 3, read the relevant source
and explain:

- What is the file and line that fails?
- What does that code assume about the platform (x86? little-endian? specific header?)?
- Does the codebase already have a guard pattern for this? (look at how other
  platforms handle the same thing — the existing non-x86 port is the reference)
- What is the minimal change that fixes it without breaking other platforms?

Do not speculate about files that did not produce errors. Only fix what broke.

---

## Phase 5 — Check BLAS availability and compiler compatibility

```bash
cd /home/khushiid/DiskANN
# What does the repo already have staged for this platform?
find third-party/OpenBLAS -maxdepth 5 | sort

# Does the directory CMake expects actually exist and contain the right files?
# (You discovered the variable name and path pattern in Phase 2)

# What compiler was used to build any existing staged library?
# A library built with GCC 12 is NOT compatible with GCC 15 toolset — check:
objdump -p third-party/OpenBLAS/0.3.30/linuxs390x/lib/*.a 2>/dev/null \
  | grep -i "GCC\|compiler\|DW_AT_producer" | head -5 || true
file third-party/OpenBLAS/0.3.30/linuxs390x/lib/*.so* 2>/dev/null | head -5 || true

# Where is a system OpenBLAS or the supp-path library?
ls /supp/oemtools/linux390x64/OpenBLAS/0.3.30/lib/ 2>/dev/null || echo "supp path not found"
```

Answer:
- Does the expected BLAS directory exist?
- Does it contain the library file and headers CMake validates?
- **Was the existing library compiled with the same compiler (gcc-toolset-15)?**
  If not, it must be rebuilt. The correct approach is to build OpenBLAS from
  source using gcc-toolset-15 and stage it into `third-party/OpenBLAS/0.3.30/linuxs390x/`.
- If a pre-built library is available at `/supp/oemtools/linux390x64/OpenBLAS/0.3.30/`,
  check whether it was built with gcc-toolset-15. If yes, copy it. If no, build from source.

### Building OpenBLAS from source (if needed)

If the staged library is incompatible, build it:

```bash
# Check if OpenBLAS source is available
ls /supp/oemtools/linux390x64/OpenBLAS/ 2>/dev/null || \
  find /home/khushiid /opt /supp -name "OpenBLAS" -maxdepth 5 -type d 2>/dev/null | head -5

# If no pre-built gcc-15 library exists, build from source:
cd /tmp
git clone --depth 1 --branch v0.3.30 https://github.com/xianyi/OpenBLAS.git openblas-src 2>&1 | tail -5
cd openblas-src
make CC=/opt/rh/gcc-toolset-15/root/usr/bin/gcc \
     FC=/opt/rh/gcc-toolset-15/root/usr/bin/gfortran \
     TARGET=ZARCH_ZVECTOR \
     USE_THREAD=1 \
     NO_LAPACK=0 \
     -j"$(nproc)" 2>&1 | tail -20
echo "--- openblas build exit: $? ---"

# Stage the result
DEST=/home/khushiid/DiskANN/third-party/OpenBLAS/0.3.30/linuxs390x
mkdir -p "$DEST/lib" "$DEST/include"
cp libopenblas*.so* libopenblas*.a "$DEST/lib/" 2>/dev/null || true
cp *.h "$DEST/include/" 2>/dev/null || true
ls "$DEST/lib/" "$DEST/include/"
```

Include in the plan whether OpenBLAS needs to be rebuilt, and if so, record
it as a required step in the plan before the DiskANN cmake configure.

---

## Phase 6 — Produce the porting plan

Write a precise plan based only on what Phase 3-5 revealed:

```
=== PORTING PLAN ===

Platform discovered:
  Architecture : <from Phase 1>
  Endianness   : <from Phase 1>
  SIMD headers : <what exists / what does not>
  tcmalloc     : <available / not available>
  Compiler     : <version>

Build system gaps (what this machine falls through):
  <list what the current CMakeLists.txt does not handle for this platform>

Compile errors before any patches:
  <list every error: file:line — reason>

Required changes (minimum set to fix those errors):
  CHANGE 1 — file:line
    Problem : <compiler error text>
    Root cause: <why this breaks on this platform>
    Fix     : <exact minimal change>

  [repeat for every error]

BLAS:
  Expected path : <from Phase 2>
  Current state : <exists/missing — from Phase 5>
  Action        : <none needed / copy from X / build from source>

Endian swap:
  Does the codebase already activate byte-swap for this platform? <yes/no>
  Evidence: <file:line>
  Action needed: <none / add guard>

Files to change: <count>
=== END PLAN ===
```

Then output the text: PLAN_COMPLETE
