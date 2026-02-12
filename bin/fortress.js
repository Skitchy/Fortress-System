#!/usr/bin/env node

'use strict';

const args = process.argv.slice(2);
const command = args[0];

const COMMANDS = {
  setup: '../src/cli/commands/setup.js',
  init: '../src/cli/commands/init.js',
  quick: '../src/cli/commands/quick.js',
  report: '../src/cli/commands/report.js',
  validate: '../src/cli/commands/validate.js',
};

// deploy is an alias for: validate + report
if (command === 'deploy') {
  // Run validate first, then report if it passes
  const validatePath = require.resolve('../src/cli/commands/validate.js');
  const { execFileSync } = require('child_process');
  try {
    execFileSync(process.execPath, [validatePath, ...args.slice(1)], {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
  } catch {
    process.exit(1);
  }
  // Validation passed - now generate report
  require('../src/cli/commands/report.js');
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
  console.log(`  quick      Run quick checks (type-check, lint, test, content)`);
  console.log(`  report     Run all checks and generate scored JSON report`);
  console.log(`  validate   Run full validation pipeline (all checks, pass/fail)`);
  console.log(`  deploy     Validate + generate report (deploy readiness gate)\n`);
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

require(COMMANDS[command]);
