'use strict';

/**
 * Parse CLI flags and detect CI environment.
 */
function parseFlags(argv) {
  const args = argv || process.argv.slice(2);
  const isCI = args.includes('--ci') || process.env.CI === 'true';
  const isJSON = args.includes('--json');
  return { isCI, isJSON };
}

/**
 * Create color helpers that respect CI/JSON mode.
 */
function createColors(flags) {
  const enabled = !flags.isCI && !flags.isJSON && process.stdout.isTTY;
  return {
    reset: enabled ? '\x1b[0m' : '',
    red: enabled ? '\x1b[31m' : '',
    green: enabled ? '\x1b[32m' : '',
    yellow: enabled ? '\x1b[33m' : '',
    blue: enabled ? '\x1b[34m' : '',
    bold: enabled ? '\x1b[1m' : '',
    gray: enabled ? '\x1b[90m' : '',
  };
}

module.exports = { parseFlags, createColors };
