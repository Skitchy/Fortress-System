# Fortress System

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

Fortress runs up to 6 quality checks and gives your project a score out of 100:

| Check | What it does | Weight |
|-------|-------------|--------|
| **TypeScript** | Runs `tsc --noEmit` to catch type errors | 20 |
| **Lint** | Runs your linter (ESLint, Biome, or Next.js lint) | 15 |
| **Tests** | Runs your test suite with proportional scoring | 25 |
| **Content** | Scans for forbidden patterns (TODOs, FIXMEs, etc.) | 20 |
| **Security** | Runs `npm audit` for vulnerable dependencies | 10 |
| **Build** | Verifies your project builds successfully | 10 |

Checks that aren't relevant to your project are disabled automatically. Scoring adapts — if you only use 3 of 6 checks, those 3 can still reach a perfect 100.

## Commands

### `fortress setup`

One-command project bootstrap. Creates `package.json`, initializes git, creates `.gitignore`, installs Fortress, and launches the setup wizard. Safe to run multiple times — skips steps that are already done.

### `fortress init`

Interactive wizard to configure your quality checks. Auto-detects your framework, language, test runner, and linter. Run `fortress init --force` to reconfigure.

### `fortress quick`

Fast validation — runs TypeScript, lint, test, and content checks. Skips slower checks (security audit, build). Use this before every commit.

```
$ npx fortress quick

Fortress Quick Validation
Running enabled checks...

  [SKIP] typescript (disabled)
  [PASS] Lint (0.3s)
  [PASS] Tests (0.1s)
         4/4 tests passed
  [SKIP] content (disabled)
  [SKIP] security (disabled)
  [SKIP] build (disabled)

──────────────────────────────────────────────────
  Score: 100/100  (0.4s)
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
  [PASS] Security (10/10 pts) 0.3s

  Score: 100/100  (0.7s)
  Deploy ready (threshold: 95)

  Report saved: ./fortress-reports/fortress-report-2026-02-13.json
```

### `fortress deploy`

Deploy readiness gate. Runs `validate`, then generates a report if it passes. Score must be 95+ to be deploy-ready.

### Flags

| Flag | Description |
|------|-------------|
| `--json` | JSON-only output, no colors (for CI piping) |
| `--ci` | CI mode — no colors, non-interactive |
| `--yes` / `-y` | Skip the interactive wizard, accept auto-detected values |
| `--force` | Overwrite existing `fortress.config.js` |

## Pre-Commit Hook

Fortress automatically installs a git pre-commit hook during setup. Every time you `git commit`, it runs `fortress quick` first:

```
Fortress: running pre-commit checks...

  [PASS] Lint (0.3s)
  [PASS] Tests (0.1s)
         4/4 tests passed

  Score: 100/100  (0.4s)
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

**Auto-permissions** — Configures `.claude/settings.local.json` so Claude can run fortress commands without prompting you each time.

**Statusline** — Shows your current Fortress score right in the Claude Code terminal:
```
Fortress: 95/100 | DEPLOY READY | 5m ago
```

**Specialized Agents** — Installs two parallel agents in `.claude/agents/`:

| Agent | Purpose |
|-------|---------|
| **code-reviewer** | Structured code review with MUST FIX / SHOULD FIX verdicts |
| **security-auditor** | Red team security analysis — finds exploitable vulnerabilities with evidence |

Use them before deploying or merging significant changes. They run as parallel subagents, each producing a focused report.

None of this requires Claude Code to work. Fortress runs the same in any terminal.

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
- **TypeScript, Content, Build** are pass/fail — full points or zero

Disabled checks are excluded from the total, so your score always reflects only what you've enabled.

## Security

Fortress takes security seriously, even as a dev tool:

- **Zero runtime dependencies** — nothing in your supply chain to compromise
- **Command validation** — config commands are checked for shell injection (`;`, `&&`, `|`, `$()`, newlines, etc.) before execution
- **Environment sandboxing** — child processes receive only essential env vars (`PATH`, `HOME`, `CI`), not your API keys or tokens
- **Symlink protection** — content scanning skips symlinks to prevent traversal outside your project
- **Path traversal guards** — report output is validated to stay within your project directory

Note: `fortress.config.js` is a JavaScript file loaded via `require()`. Like any JS config file (webpack, eslint, jest), it can execute arbitrary code. Only use config files you trust — the same as any other tool in the Node.js ecosystem.

## Requirements

- Node.js 18 or later
- Git (for pre-commit hooks)
- Zero runtime dependencies

## License

MIT
