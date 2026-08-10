---
name: software-reliability-engineering
description: Guidelines and instructions for elite software reliability engineering, debugging, root cause analysis, performance optimization, security audits, and regression prevention. Triggers on "reliability", "debugging", "root cause", "performance profiling", "security audit", "break everything", "SRE", "reliability engineering".
---

# Elite Software Reliability Engineering (SRE)

Use this skill when tasked with identifying code defects, conducting post-mortems, performing root cause analyses, auditing security/performance, or establishing regression testing patterns in the COMPr codebase.

---

## 1. Core Mission

Your mission is to continuously push every application to its breaking point. 
Never assume something works; prove that it works. If it breaks:
1. Discover why.
2. Understand why.
3. Learn from it.
4. Permanently fix it.
5. Prevent similar bugs forever.

---

## 2. Engineering Philosophy

* **Never patch:** Always solve.
* **Never guess:** Always investigate.
* **Never fix symptoms:** Fix the root cause.
* **Never repeat mistakes:** Learn from every failure.

---

## 3. Continuous Failure Hunting

Actively look for and identify the following issues across the COMPr codebase:
- **Logic Bugs:** Edge cases, boolean condition issues, validation gaps.
- **Race Conditions:** BullMQ queue job collisions, Postgres connection timing issues, concurrent Redis key increments.
- **Memory Leaks:** Open connections, lingering child processes (FFmpeg/ffprobe), massive file buffers in RAM.
- **Infinite Loops & Deadlocks:** Iterators without base cases, cyclic awaits, resource locks.
- **Performance Bottlenecks:** Heavy filtergraphs, synchronous FS operations, lack of DB indexing.
- **Security Vulnerabilities:** Command injection via FFmpeg argument shell parsing, XSS, SSRF, rate limit bypass.
- **State Inconsistencies:** Out-of-sync progress bars, jobs stuck in `QUEUED` or `ANALYZING`.
- **Database Bottlenecks:** Missing index on query keys, N+1 query patterns.
- **Concurrency & Scaling Limits:** Redis throughput issues under high job volumes.
- **Hydration & SSR Problems:** Layout shifts, empty states rendering before hydration.
- **Resource Exhaustion:** Disk space fill-ups from temp files, CPU saturation from SVT-AV1 encoding.

---

## 4. "Break Everything" Checkpoints (Stress Testing)

Proactively stress the application by testing and simulating:
- **Edge Cases & Random Inputs:** Negative duration, 0-byte media, corrupted codecs, invalid magic bytes.
- **Huge Payloads:** File uploads approaching and exceeding the 100MB/500MB ceilings.
- **Network Disruptions:** Slow network simulation (3G/4G), packet loss, timeout triggers mid-upload or mid-encode.
- **Concurrency Pressure:** Duplicate job submissions, rapid double-clicking, multiple concurrent status queries.
- **Resource Constraints:** Disk write failures in `/temp`, database connection dropping mid-transaction.
- **Malformed Inputs:** Broken JSON payloads, international text, emojis in file keys, zero-width characters in paths.

---

## 5. Performance Engineering & Profiling

Target the following performance benchmarks:
- **CPU & Memory:** Minimize memory footprints of Fastify request handlers and BullMQ queue instances.
- **Bundle Size & Hydration:** Keep first load JS within budget, prevent client-side layout shifts (CLS).
- **Network Latency:** Ensure direct R2 presigned uploads remain performant.
- **Queue Wait Times:** p95 queue wait time (queued ➔ analyzing) must remain under 30 seconds.
- **Perceived Response Latency:** Local UI interactions < 100ms; network round trips show optimistic updates < 300ms.

---

## 6. Automatic Root Cause Analysis (RCA)

Whenever a failure is detected, follow this step-by-step investigation protocol before modifying any code:
1. **Observe:** Inspect the failure behavior directly.
2. **Collect Evidence:** Copy exact logs, HTTP responses, database records, or error states.
3. **Read Stack Traces:** Walk the source map line numbers.
4. **Inspect Logs:** Review Fastify server console and worker logs.
5. **Trace Execution:** Follow data flow from the client, through Fastify router, to R2, Redis, and workers.
6. **Identify Origin:** Pinpoint the exact line of code producing the fault.
7. **Find Contributing Factors:** Check environment config, DB connections, or Redis status.
8. **Determine True Root Cause:** Isolate the core design or code flaw.
9. **Evaluate Architecture:** Consider if this requires a broader architectural shift.
10. **Implement:** Write the definitive fix.

---

## 7. Self-Learning Knowledge Base

Document every resolved issue in the project's internal SRE documentation/logs using the structured report template. Learn from each failure to avoid repeating past architectural mistakes.

---

## 8. Automatic Regression Prevention

- No bug is considered fixed until a test is written that validates the fix.
- Every SRE fix must generate appropriate tests (Unit, Integration, and/or Regression tests).
- All tests must run successfully using the native runner (`npm test`), and type safety checks (`tsc --noEmit`) must remain clean.

---

## 9. Refactoring & Security Standards

- **Readability & Modularity:** Keep functions small and single-purpose. Never write "pipeline god files".
- **Zero Technical Debt:** Avoid quick hacks. Improve code aesthetics and naming rules.
- **Input Sanitization:** Never shell-interpolate user-derived arguments into child processes (FFmpeg).
- **Rate-Limiting Protection:** Ensure API endpoints are properly rate-limited and proxy IP headers cannot be spoofed.
- **Secrets:** Never commit secrets, credentials, or `.env` configurations.

---

## 10. SRE Decision Framework

Before modifying any source code, ask yourself:
1. *Is this the true root cause, or am I treating a symptom?*
2. *Can this logic fail in other components or helper functions?*
3. *Will this fix scale under high user concurrency?*
4. *Can the implementation be simplified while remaining secure?*
5. *Is it easily testable, and how will I write a regression test for it?*

---

## 11. Structured SRE Output Format

When presenting SRE analyses or bug resolutions to the user, strictly use the following layout:

```markdown
## Issue
[Description of the bug, severity, and files affected]

**Severity:** [Critical / High / Medium / Low]
**Affected Files:** [List of files, using markdown links]

### Reproduction Steps
1. [Step 1]
2. [Step 2]

### Expected Behavior
[What the system should do]

### Actual Behavior
[What the system actually does]

### Root Cause & Evidence
[The deep-dive analysis of why it fails, quoting code lines or log snippets]

### Recommended Fix
[Proposed architectural solution]

### Implemented Fix
[Detailed description of changes made]

### Verification & Regression Prevention
[List of tests added, test runner outputs, and typecheck results]

### Performance & Security Impact
[Analysis of memory/CPU impact, and security posture improvement]
```

---

## 12. Quality Gate

Before declaring an SRE task done, confirm:
- [ ] `tsc --noEmit` compiles with zero errors.
- [ ] All unit and regression tests pass successfully (`npm test`).
- [ ] No unhandled promise rejections or console logs exist.
- [ ] Rate limits are secure and no proxy headers can be spoofed.
- [ ] Performance metrics meet the raising-the-bar targets.
