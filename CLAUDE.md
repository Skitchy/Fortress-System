<!-- FORTRESS:START -->
# Fortress System - Quality Mandate

This project uses **Fortress System** for automated quality validation.

## Project Stack
- **Framework:** run `fortress init` to detect
- **Language:** run `fortress init` to detect
- **Test Framework:** run `fortress init` to detect
- **Linter:** run `fortress init` to detect

## Available Commands
- `fortress init` - Auto-detect project and generate config
- `fortress quick` - Fast validation (skips slow checks)
- `fortress validate` - Full validation pipeline
- `fortress report` - Full validation with scoring and JSON report
- `fortress deploy` - Validate then generate deploy report

## Quality Philosophy

You care about shipping correct, secure, maintainable code. This is not aspirational — it's how you work.

**Before writing code:**
- Understand what you're changing and why. Read the existing code, its tests, and its callers before modifying it.
- If there are no tests for the code you're about to change, write them first. You need to know what "working" looks like before you change anything.

**While writing code:**
- Every function you write gets error handling. Empty catch blocks are bugs. `any` types are bugs. Missing `await` is a bug.
- Don't commit secrets, don't log passwords, don't trust user input, don't concatenate strings into queries.
- Run `fortress quick` as you work — don't wait until you're "done" to find out you broke something.

**Before committing:**
- Run `fortress quick`. If it fails, fix the failures. Do not skip checks or weaken assertions to make them pass.
- If you changed an API, check that callers are updated. If you added an env var, add it to `.env.example`. If you changed a schema, write a migration.

## Quality Mandate
- **Run `fortress quick` before every commit** to catch issues early
- **Run `fortress report` before every deploy** for full scoring
- **Score >= 95 = deploy ready** — do not deploy below this threshold
- Fix all failing checks before committing or deploying
- If a check fails, address the root cause — do not skip or disable checks

## Parallel Agents

This project ships with specialized agents that provide deep, focused analysis. They run as parallel subagents — each gets its own context window and produces a structured report.

### Available Agents

| Agent | Purpose | Invoke with |
|-------|---------|-------------|
| **security-auditor** | Red team security analysis — finds exploitable vulnerabilities with evidence | `Task(subagent_type="security-auditor")` |
| **code-reviewer** | Structured code review with MUST FIX / SHOULD FIX verdicts | `Task(subagent_type="code-reviewer")` |

### When to Use Them

- **Before deploying or merging significant changes:** invoke both `security-auditor` and `code-reviewer` in parallel. Review their structured reports. Act on all MUST FIX items before proceeding.
- **After completing a feature:** run `code-reviewer` to verify correctness, test coverage, and maintainability.
- **For security-sensitive changes** (auth, payments, user data, API keys): run `security-auditor` to get an adversarial review.

### How They Work

Both agents run simultaneously and independently. Each produces a self-contained report — no cross-referencing needed. The orchestrator (you or the user) reviews the finished reports and acts on findings:

1. Launch both agents in parallel with a prompt describing what to review
2. Wait for both to complete
3. Read the security audit report — address any CRITICAL or HIGH findings immediately
4. Read the code review verdict — address all MUST FIX items before committing
5. Run `fortress quick` to verify fixes pass validation

## Setup
If the project stack above shows placeholder values, run `fortress init` to detect your project and configure Fortress with accurate settings.

<!-- FORTRESS:END -->
