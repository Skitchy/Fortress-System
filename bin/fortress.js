#!/usr/bin/env node

'use strict';

const args = process.argv.slice(2);
const command = args[0];

const COMMANDS = {
  setup: {
    path: '../src/cli/commands/setup.js',
    desc: 'Set up a new project (init + install + wizard)',
    usage: 'fortress setup [--local [path]]',
    flags: ['--local [path]  Use a local fortress-system directory instead of npm'],
  },
  init: {
    path: '../src/cli/commands/init.js',
    desc: 'Auto-detect project stack and generate fortress.config.js',
    usage: 'fortress init [--yes] [--force]',
    flags: ['--yes, -y   Skip interactive wizard, use auto-detected values', '--force     Overwrite existing fortress.config.js'],
  },
  quick: {
    path: '../src/cli/commands/quick.js',
    desc: 'Run quick checks (skips security audit and build)',
    usage: 'fortress quick [--json] [--ci]',
    flags: ['--json   Output JSON only (for CI piping)', '--ci     Disable colors, non-interactive mode'],
  },
  report: {
    path: '../src/cli/commands/report.js',
    desc: 'Run all checks and generate scored JSON report',
    usage: 'fortress report [--json] [--ci]',
    flags: ['--json   Output JSON only (for CI piping)', '--ci     Disable colors, non-interactive mode'],
  },
  validate: {
    path: '../src/cli/commands/validate.js',
    desc: 'Run full validation pipeline (all checks, pass/fail)',
    usage: 'fortress validate [--json] [--ci]',
    flags: ['--json   Output JSON only (for CI piping)', '--ci     Disable colors, non-interactive mode'],
  },
  trend: {
    path: '../src/cli/commands/trend.js',
    desc: 'Show score history and quality trends',
    usage: 'fortress trend [--limit N] [--json]',
    flags: ['--limit N   Show last N reports (default: 10)', '--json      Output JSON only'],
  },
  review: {
    path: '../src/cli/commands/review.js',
    desc: 'Run AI-powered security audit and code review (requires Claude Code)',
    usage: 'fortress review [--json]',
    flags: ['--json   Output JSON only'],
  },
};

// Per-command help
if (command && command !== '--help' && command !== '-h' && (args.includes('--help') || args.includes('-h'))) {
  const isCI = process.env.CI === 'true' || args.includes('--ci');
  const ENABLE_COLORS = !isCI && process.stdout.isTTY;
  const bold = ENABLE_COLORS ? '\x1b[1m' : '';
  const reset = ENABLE_COLORS ? '\x1b[0m' : '';
  const gray = ENABLE_COLORS ? '\x1b[90m' : '';

  const cmd = command === 'deploy'
    ? { desc: 'Validate + generate report (deploy readiness gate)', usage: 'fortress deploy [--json] [--ci]', flags: ['--json   Output JSON only (for CI piping)', '--ci     Disable colors, non-interactive mode'] }
    : COMMANDS[command];

  if (cmd) {
    console.log(`\n${bold}fortress ${command}${reset} - ${cmd.desc}\n`);
    console.log(`${bold}Usage:${reset}`);
    console.log(`  ${cmd.usage}\n`);
    if (cmd.flags && cmd.flags.length > 0) {
      console.log(`${bold}Flags:${reset}`);
      for (const flag of cmd.flags) {
        console.log(`  ${gray}${flag}${reset}`);
      }
      console.log('');
    }
  } else {
    console.error(`Unknown command: "${command}". Run "fortress --help" for available commands.`);
    process.exit(1);
  }
  process.exit(0);
}

// deploy is an alias for: validate + report
if (command === 'deploy') {
  // Run validate first, then report if it passes
  const validatePath = require.resolve(COMMANDS.validate.path);
  const reportPath = require.resolve(COMMANDS.report.path);
  const { execFileSync } = require('child_process');
  try {
    execFileSync(process.execPath, [validatePath, ...args.slice(1)], {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
  } catch {
    process.exit(1);
  }
  // Validation passed — run report as subprocess so its exit code propagates
  try {
    execFileSync(process.execPath, [reportPath, ...args.slice(1)], {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
  } catch {
    // report.js exits non-zero when not deploy-ready (score < threshold)
    process.exit(1);
  }
  process.exit(0);
}

if (!command || command === '--help' || command === '-h') {
  const isCI = process.env.CI === 'true' || args.includes('--ci');
  const ENABLE_COLORS = !isCI && process.stdout.isTTY;
  const bold = ENABLE_COLORS ? '\x1b[1m' : '';
  const reset = ENABLE_COLORS ? '\x1b[0m' : '';
  const gray = ENABLE_COLORS ? '\x1b[90m' : '';

  console.log(`\n${bold}fortress${reset} - Zero-dependency quality validation system\n`);
  console.log(`${bold}Usage:${reset}`);
  console.log(`  fortress <command> [options]\n`);
  console.log(`${bold}Commands:${reset}`);
  console.log(`  setup      Set up a new project (init + install + wizard)`);
  console.log(`  init       Auto-detect project stack and generate fortress.config.js`);
  console.log(`  quick      Run quick checks (skips security audit and build)`);
  console.log(`  report     Run all checks and generate scored JSON report`);
  console.log(`  validate   Run full validation pipeline (all checks, pass/fail)`);
  console.log(`  deploy     Validate + generate report (deploy readiness gate)`);
  console.log(`  trend      Show score history and quality trends`);
  console.log(`  review     Run AI-powered security audit and code review\n`);
  console.log(`${bold}Flags:${reset}`);
  console.log(`  --json     Output JSON only (for CI piping)`);
  console.log(`  --ci       CI mode (no colors, non-interactive)\n`);
  console.log(`${gray}Run "fortress <command> --help" for command-specific options.${reset}\n`);
  process.exit(0);
}

if (!COMMANDS[command]) {
  console.error(`Unknown command: "${command}". Run "fortress --help" for available commands.`);
  process.exit(1);
}

require(COMMANDS[command].path);
