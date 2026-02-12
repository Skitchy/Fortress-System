# Fortress System

Zero-dependency quality validation for JavaScript and TypeScript projects. One command to set up, one command to check your code.

Built for developers using [Claude Code](https://claude.ai/claude-code) — but works with any workflow.

## Quick Start

```bash
npx fortress-system setup
```

That's it. This single command will:
1. Initialize your project (creates `package.json` if needed)
2. Install `fortress-system`
3. Walk you through an interactive setup wizard

The wizard auto-detects your stack and generates a `fortress.config.js` tailored to your project.

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
One-command project bootstrap. Creates `package.json`, installs Fortress, and launches the setup wizard. Safe to run multiple times — skips steps that are already done.

### `fortress init`
Interactive wizard to configure your quality checks. Auto-detects your framework, language, test runner, and linter. Run `fortress init --force` to reconfigure.

### `fortress quick`
Fast validation — runs TypeScript, lint, test, and content checks. Skips slower checks (security audit, build). Use this before every commit.

```
$ npx fortress quick

  Fortress Quick Check

  [typescript]  passed   1.2s
  [lint]        passed   0.8s
  [test]        passed   3.1s
  [content]     passed   0.1s

  Score: 100/100
  All checks passed.
```

### `fortress validate`
Full validation pipeline — runs all enabled checks. Returns exit code 0 (pass) or 1 (fail).

### `fortress report`
Full validation with a detailed scoring breakdown. Saves a timestamped JSON report to `./fortress-reports/` for tracking quality over time.

### `fortress deploy`
Deploy readiness gate. Runs `validate`, then generates a report if it passes. Score must be 95+ to be deploy-ready.

### Flags

| Flag | Description |
|------|-------------|
| `--json` | JSON-only output, no colors (for CI piping) |
| `--ci` | CI mode — no colors, non-interactive |
| `--yes` / `-y` | Skip the interactive wizard, accept auto-detected values |
| `--force` | Overwrite existing `fortress.config.js` |

## Claude Code Integration

When you run `fortress init`, it automatically sets up three things for Claude Code:

**CLAUDE.md** — Tells Claude about your project stack and quality standards. Claude will know to run `fortress quick` before committing and `fortress report` before deploying.

**Auto-permissions** — Configures `.claude/settings.local.json` so Claude can run fortress commands without prompting you each time.

**Statusline** — Shows your current Fortress score right in the Claude Code terminal:
```
Fortress: 95/100 | DEPLOY READY | 5m ago
```

None of this requires Claude Code to work. Fortress runs the same in any terminal.

## Supported Stacks

Fortress auto-detects and supports:

- **Frameworks**: Next.js, React, Vue, Nuxt, Svelte/SvelteKit, Angular, Node.js (Express/Fastify/Koa)
- **Languages**: TypeScript, JavaScript
- **Test runners**: Vitest, Jest, Mocha, Node.js built-in test runner
- **Linters**: ESLint, Biome
- **Package managers**: npm, yarn, pnpm, bun

## Configuration

The setup wizard generates `fortress.config.js` in your project root. You can edit it directly:

```js
module.exports = {
  checks: {
    typescript: {
      enabled: true,
      command: 'npx tsc --noEmit',
    },
    lint: {
      enabled: true,
      command: 'npx eslint .',
    },
    test: {
      enabled: true,
      command: 'npx vitest run',
    },
    content: {
      enabled: false, // enable and add patterns to scan for
      patterns: [],
    },
    security: {
      enabled: true,
      command: 'npm audit --production',
    },
    build: {
      enabled: true,
      command: 'npm run build',
    },
  },
  scoring: {
    deployThreshold: 95,
  },
};
```

## CI / CD

Add Fortress to your pipeline:

```yaml
# GitHub Actions example
- name: Quality gate
  run: npx fortress validate --ci
```

The `--ci` flag disables colors and interactive prompts. The process exits with code 1 if any check fails, so your pipeline will fail on quality issues.

For deploy gates:

```yaml
- name: Deploy readiness
  run: npx fortress deploy --ci --json
```

## How Scoring Works

Each check has a weight (points). Your score is calculated as:

```
score = (points earned / total possible points) x 100
```

- **Tests** use proportional scoring — 8 of 10 tests passing = 80% of the test weight
- **Lint** uses penalty scoring — each warning costs 5 points
- **Security** uses penalty scoring — each critical/high vulnerability costs 5 points
- **TypeScript, Content, Build** are pass/fail — full points or zero

Disabled checks are excluded from the total, so your score always reflects only what you've enabled.

## Requirements

- Node.js 18 or later
- Zero runtime dependencies

## License

MIT
