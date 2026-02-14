# Fortress System

[![npm version](https://img.shields.io/npm/v/fortress-system?color=22d3ee&label=npm)](https://www.npmjs.com/package/fortress-system)
[![npm downloads](https://img.shields.io/npm/dt/fortress-system?color=4ade80&label=downloads)](https://www.npmjs.com/package/fortress-system)
[![GitHub stars](https://img.shields.io/github/stars/Skitchy/Fortress-System?color=a78bfa&label=stars)](https://github.com/Skitchy/Fortress-System)
[![license](https://img.shields.io/badge/license-MIT-a78bfa)](https://github.com/Skitchy/Fortress-System/blob/main/LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-4ade80)](https://nodejs.org)
[![zero deps](https://img.shields.io/badge/dependencies-0-22d3ee)](https://www.npmjs.com/package/fortress-system)
[![fortress](https://img.shields.io/badge/fortress-100%2F100-4ade80)](https://www.fortress-system.com)

Zero-dependency quality validation for JavaScript and TypeScript projects. One command to set up, one command to check your code.

Built for developers using [Claude Code](https://claude.ai/claude-code) — but works with any workflow.

## Prerequisites

Before you start, make sure you have:

- **Node.js 18 or later** — check with `node --version`
- **npm** — comes with Node.js, check with `npm --version`
- **Git** — check with `git --version`

Don't have them? Install Node.js from [nodejs.org](https://nodejs.org) (LTS recommended) and Git from [git-scm.com](https://git-scm.com).

## Quick Start

```bash
npx fortress-system setup
```

That's it. This single command will:

1. Create `package.json` if needed
2. Initialize a git repository if needed
3. Create a `.gitignore` with sensible defaults
4. Install `fortress-system`
5. Walk you through an interactive setup wizard
6. Install a pre-commit hook that runs checks before every commit

The wizard auto-detects your stack and generates a `fortress.config.js` tailored to your project.

> **Note:** The first time you run it, use `npx fortress-system` (the package name). Once installed, you can use the shorter `npx fortress` for all commands.

### Starting from an empty project?

That's totally fine. The wizard will detect that you don't have tooling set up yet and suggest next steps:

```
  Looks like a fresh project!
  That's totally normal — most checks are disabled until you add tooling.

  Suggested next steps:
  • Add a test framework: npm install --save-dev vitest (or jest, mocha)
  • Add a linter:         npm install --save-dev eslint (or biome)
  • Add TypeScript:       npm install --save-dev typescript
  • Then re-run:          fortress init --force --yes to pick up the new tools
```

Install the tools you want, then run `npx fortress init --force --yes` to re-detect your project.

## What It Does

Fortress runs up to 7 quality checks and gives your project a score out of 100:

| Check | What it does | Weight |
|-------|-------------|--------|
| **TypeScript** | Runs `tsc --noEmit` to catch type errors | 20 |
| **Lint** | Runs your linter (ESLint, Biome, or Next.js lint) | 15 |
| **Tests** | Runs your test suite with proportional scoring | 25 |
| **Content** | Scans for forbidden patterns (TODOs, FIXMEs, etc.) | 20 |
| **Secrets** | Scans source for hardcoded credentials (19 built-in patterns) | 10 |
| **Security** | Runs `npm audit` for vulnerable dependencies | 10 |
| **Build** | Verifies your project builds successfully | 10 |

Checks that aren't relevant to your project are disabled automatically. Scoring adapts — if you only use 3 of 7 checks, those 3 can still reach a perfect 100.

### Secrets Detection

The secrets check is enabled by default and scans your source files for hardcoded credentials. It ships with 19 built-in patterns covering:

- **Cloud providers** — AWS access keys, secret keys
- **API tokens** — GitHub (PAT, OAuth, fine-grained), Stripe (secret, restricted), OpenAI (legacy and project keys)
- **Chat platforms** — Slack bot, user, and session tokens
- **Auth tokens** — JWTs, private keys (RSA, EC, DSA, OpenSSH)
- **Generic secrets** — hardcoded passwords, API keys, tokens, database connection strings with credentials

Secrets are masked in output (e.g., `AKIA***LE`) so they're never displayed in full. Any secret found fails the check entirely — there's no partial credit for "only a few" leaked credentials.

You can add custom patterns and allowlist paths in your config:

```js
secrets: {
  enabled: true,
  patterns: [
    { regex: 'MYAPP_KEY_[A-Za-z0-9]{32}', label: 'MyApp API Key' },
  ],
  allowlist: { 'tests/fixtures/': '*' },
  weight: 10,
},
```

## Commands

### `fortress setup`

One-command project bootstrap. Creates `package.json`, initializes git, creates `.gitignore`, installs Fortress, and launches the setup wizard. Safe to run multiple times — skips steps that are already done.

### `fortress init`

Interactive wizard to configure your quality checks. Auto-detects your framework, language, test runner, and linter. Run `fortress init --force` to reconfigure.

### `fortress quick`

Fast validation — skips slower checks (security audit, build) and runs everything else. Use this before every commit.

```
$ npx fortress quick

Fortress Quick Validation
Running enabled checks...

  [SKIP] typescript (disabled)
  [PASS] Lint (0.3s)
  [PASS] Tests (0.1s)
         4/4 tests passed
  [SKIP] content (disabled)
  [PASS] Secrets Detection (0.1s)
  [SKIP] security (disabled)
  [SKIP] build (disabled)

──────────────────────────────────────────────────
  Score: 100/100  (0.5s)
  All checks passed.
```

When something fails, Fortress tells you exactly what broke:

```
  [FAIL] Tests (0.1s)
         2 test(s) failed
           FAIL: adds two numbers
           FAIL: handles negative numbers
         2/4 tests passed
```

### `fortress validate`

Full validation pipeline — runs all enabled checks including security audit. Returns exit code 0 (pass) or 1 (fail).

### `fortress report`

Full validation with a detailed scoring breakdown. Saves a timestamped JSON report to `./fortress-reports/` for tracking quality over time.

```
  [PASS] Lint (15/15 pts) 0.3s
  [PASS] Tests (25/25 pts) 0.1s
  [PASS] Secrets Detection (10/10 pts) 0.1s
  [PASS] Security (10/10 pts) 0.3s

  Score: 100/100  (0.8s)
  Deploy ready (threshold: 95)

  Report saved: ./fortress-reports/fortress-report-2026-02-13.json
```

### `fortress deploy`

Deploy readiness gate. Runs `validate`, then generates a report if it passes. Score must be 95+ to be deploy-ready.

### `fortress trend`

Visualize your quality score over time. Reads past report JSON files and displays an ASCII sparkline, tabular history, and trend direction.

```
$ npx fortress trend

Fortress Trend
Score history across 5 reports

  Sparkline: ▃▅▆▇█

  Date              Score  Status
  ─────────────────────────────────────
  2026-02-10 09:15  82     not ready
  2026-02-11 14:30  88     not ready
  2026-02-12 10:00  92     not ready
  2026-02-13 16:45  96     deploy ready
  2026-02-14 11:00  100    deploy ready

  Trend: ↑ Improving
```

Use `--limit N` to control how many reports to show (default: 10). Supports `--json` for CI integration.

### `fortress review`

Run AI-powered security audit and code review using Claude Code agents. Requires [Claude Code](https://claude.ai/claude-code) to be installed — gracefully skips with a helpful message if it's not available.

```
$ npx fortress review

Fortress Review
Running AI-powered code analysis...

  [DONE] Security Auditor — 3 findings
  [DONE] Code Reviewer — verdict: APPROVE

──────────────────────────────────────────────────

  Security Findings:
    MEDIUM: 1
    LOW: 2

  Code Review:
    No issues found

  Duration: 45.2s

  Review saved: ./fortress-reports/fortress-review-2026-02-14.json
```

The review command invokes two agents sequentially:
- **security-auditor** — red team analysis, findings categorized by severity (CRITICAL/HIGH/MEDIUM/LOW)
- **code-reviewer** — structured review with MUST FIX / SHOULD FIX verdicts

Results are saved as JSON for tracking. Supports `--json` for programmatic use.

### Flags

| Flag | Description |
|------|-------------|
| `--json` | JSON-only output, no colors (for CI piping) |
| `--ci` | CI mode — no colors, non-interactive |
| `--yes` / `-y` | Skip the interactive wizard, accept auto-detected values |
| `--force` | Overwrite existing `fortress.config.js` |
| `--limit N` | Show last N reports in `fortress trend` (default: 10) |

Run `fortress <command> --help` for command-specific usage and flags.

## Pre-Commit Hook

Fortress automatically installs a git pre-commit hook during setup. Every time you `git commit`, it runs `fortress quick` first:

```
Fortress: running pre-commit checks...

  [PASS] Lint (0.3s)
  [PASS] Tests (0.1s)
         4/4 tests passed
  [PASS] Secrets Detection (0.1s)

  Score: 100/100  (0.5s)
  All checks passed.

Fortress: all checks passed.
```

If checks fail, the commit is blocked with a clear message telling you what to fix. No bad code gets through.

The hook lives at `.git/hooks/pre-commit`. You can edit or remove it at any time.

## When Things Go Wrong

Fortress tries to give you actionable feedback, not cryptic errors.

**No checks enabled?** You'll see what to do:
```
  No checks are enabled.
  Fortress doesn't have anything to validate yet.

  What to do next:
  • Run fortress init --force to configure checks for your project
  • Or edit fortress.config.js and set enabled: true on the checks you want
```

**Command typo in your config?** Fortress shows you the failing command and a hint:
```
  [FAIL] Tests (0.3s)
         Test suite failed to run
           Hint: The test tool may not be installed. Check the command in fortress.config.js
           Command: npx jestt
```

**Syntax error in config file?** You get a recovery path:
```
Error loading fortress.config.js: Unexpected token ','

This usually means there's a syntax error in your config file.
To regenerate it, run: npx fortress init --force
```

## Configuration

The setup wizard generates `fortress.config.js` in your project root. Each check is documented inline:

```js
/**
 * Fortress System Configuration
 *
 * Each check below can be toggled with `enabled: true/false`.
 * To re-detect your project and regenerate this file:
 *   npx fortress init --force
 */
module.exports = {
  checks: {
    // Type checking — requires TypeScript (npm install --save-dev typescript)
    typescript: {
      enabled: true,
      command: 'npx tsc --noEmit',
      weight: 20,
    },
    // Linting — requires ESLint or Biome (npm install --save-dev eslint)
    lint: {
      enabled: true,
      command: 'npx eslint .',
      weight: 15,
    },
    // Tests — requires a test runner (npm install --save-dev vitest)
    test: {
      enabled: true,
      command: 'npx vitest run',
      weight: 25,
    },
    // Content scanning — searches for forbidden patterns (TODOs, FIXMEs, etc.)
    content: {
      enabled: false,
      patterns: [
        { regex: 'TODO\\s*:', label: 'TODO comment' },
        { regex: 'FIXME', label: 'FIXME comment' },
      ],
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      skipDirs: ['node_modules', '.next', '.git', 'dist', 'coverage', '.vercel'],
      weight: 20,
    },
    // Secrets detection — scans source for hardcoded credentials (19 built-in patterns)
    secrets: {
      enabled: true,
      // Add custom patterns alongside the built-in ones:
      // patterns: [
      //   { regex: 'MYAPP_KEY_[A-Za-z0-9]{32}', label: 'MyApp API Key' },
      // ],
      // allowlist: { 'tests/fixtures/': '*' },
      weight: 10,
    },
    // Security audit — runs npm/yarn/pnpm audit
    security: {
      enabled: true,
      command: 'npm audit --production',
      weight: 10,
    },
    // Build verification — checks that the project compiles
    build: {
      enabled: true,
      command: 'npm run build',
      weight: 10,
    },
  },
  scoring: {
    deployThreshold: 95,
  },
  report: {
    outputDir: './fortress-reports/',
  },
};
```

## Claude Code Integration

When you run `fortress init`, it automatically sets up several things for Claude Code:

**CLAUDE.md** — Tells Claude about your project stack and quality standards. Claude will know to run `fortress quick` before committing and `fortress report` before deploying.

**Auto-permissions** — Configures `.claude/settings.local.json` so Claude can run fortress commands (including `fortress trend` and `fortress review`) without prompting you each time.

**Statusline** — Shows your current Fortress score right in the Claude Code terminal:
```
Fortress: 95/100 | DEPLOY READY | 5m ago
```

**Specialized Agents** — Installs two parallel agents in `.claude/agents/`:

| Agent | Purpose |
|-------|---------|
| **code-reviewer** | Structured code review with MUST FIX / SHOULD FIX verdicts |
| **security-auditor** | Red team security analysis — finds exploitable vulnerabilities with evidence |

Use them before deploying or merging significant changes. They run as parallel subagents, each producing a focused report. You can invoke them directly from the CLI with `fortress review`, or use them within Claude Code as subagents.

None of this requires Claude Code to work. Fortress runs the same in any terminal — the `review` command simply skips gracefully when Claude Code isn't installed.

## Supported Stacks

Fortress auto-detects and supports:

- **Frameworks**: Next.js, React, Vue, Nuxt, Svelte/SvelteKit, Angular, Node.js (Express/Fastify/Koa)
- **Languages**: TypeScript, JavaScript
- **Test runners**: Vitest, Jest, Mocha, Node.js built-in test runner
- **Linters**: ESLint, Biome
- **Package managers**: npm, yarn, pnpm, bun

## CI / CD

Fortress is installed as a project dependency during setup, so `npx fortress` works in CI after `npm ci`:

```yaml
# GitHub Actions example
- name: Install dependencies
  run: npm ci

- name: Quality gate
  run: npx fortress validate --ci
```

The `--ci` flag disables colors and interactive prompts. The process exits with code 1 if any check fails, so your pipeline will fail on quality issues.

For deploy gates:

```yaml
- name: Deploy readiness
  run: npx fortress deploy --ci --json
```

For JSON output in CI scripts:

```yaml
- name: Quality check
  run: |
    npx fortress validate --json > fortress-result.json
```

## How Scoring Works

Each check has a weight (points). Your score is calculated as:

```
score = (points earned / total possible points) × 100
```

- **Tests** use proportional scoring — 8 of 10 tests passing = 80% of the test weight
- **Lint** uses penalty scoring — each warning costs 5 points
- **Security** uses penalty scoring — each critical/high vulnerability costs 5 points
- **TypeScript, Content, Secrets, Build** are pass/fail — full points or zero

Disabled checks are excluded from the total, so your score always reflects only what you've enabled.

## Security

Fortress takes security seriously, even as a dev tool:

- **Zero runtime dependencies** — nothing in your supply chain to compromise
- **Source-code secret detection** — 19 built-in patterns catch hardcoded credentials before they reach version control
- **Command validation** — config commands are checked for shell injection (`;`, `&&`, `|`, `$()`, newlines, etc.) before execution
- **Environment sandboxing** — child processes receive only essential env vars (`PATH`, `HOME`, `CI`), not your API keys or tokens
- **Symlink protection** — content and secrets scanning skip symlinks to prevent traversal outside your project
- **Path traversal guards** — report output is validated to stay within your project directory
- **ReDoS protection** — user-supplied regex patterns are checked for catastrophic backtracking before compilation

Note: `fortress.config.js` is a JavaScript file loaded via `require()`. Like any JS config file (webpack, eslint, jest), it can execute arbitrary code. Only use config files you trust — the same as any other tool in the Node.js ecosystem.

## Requirements

- Node.js 18 or later
- Git (for pre-commit hooks)
- Claude Code (optional, for `fortress review`)
- Zero runtime dependencies

## License

MIT
