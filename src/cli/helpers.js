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

/**
 * Render check results to the console.
 * Returns { allPassed, enabledCount }.
 */
function renderCheckResults(results, config, c, { showScore = false } = {}) {
  let allPassed = true;

  for (const result of results) {
    const checkConfig = config.checks[result.key];
    const isEnabled = checkConfig && checkConfig.enabled;

    if (!isEnabled) {
      console.log(`  ${c.gray}[SKIP]${c.reset} ${result.name} ${c.gray}(disabled)${c.reset}`);
      continue;
    }

    const icon = result.passed ? `${c.green}[PASS]` : `${c.red}[FAIL]`;
    const duration = result.duration > 0 ? ` ${c.gray}(${(result.duration / 1000).toFixed(1)}s)${c.reset}` : '';

    if (showScore) {
      const weight = checkConfig.weight || 0;
      const scoreStr = `${c.gray}(${result.score}/${weight} pts)${c.reset}`;
      console.log(`  ${icon}${c.reset} ${result.name} ${scoreStr}${duration}`);
    } else {
      console.log(`  ${icon}${c.reset} ${result.name}${duration}`);
    }

    if (!result.passed) {
      allPassed = false;
      for (const err of result.errors.slice(0, 5)) {
        console.log(`         ${c.red}${err}${c.reset}`);
      }
      if (result.errors.length > 5) {
        console.log(`         ${c.gray}... and ${result.errors.length - 5} more${c.reset}`);
      }
    }

    for (const warn of result.warnings) {
      console.log(`         ${c.yellow}${warn}${c.reset}`);
    }
  }

  const enabledCount = results.filter(r => {
    const cfg = config.checks[r.key];
    return cfg && cfg.enabled;
  }).length;

  return { allPassed, enabledCount };
}

/**
 * Render the "no checks enabled" guidance block.
 */
function renderNoChecksEnabled(c) {
  console.log(`${c.bold}  Score: ${c.yellow}N/A${c.reset}  ${c.gray}(no checks enabled)${c.reset}`);
  console.log(`  ${c.yellow}${c.bold}No checks are enabled.${c.reset}`);
  console.log(`  ${c.gray}Fortress doesn't have anything to validate yet.${c.reset}\n`);
  console.log(`  ${c.bold}What to do next:${c.reset}`);
  console.log(`  ${c.gray}•${c.reset} Run ${c.bold}fortress init --force${c.reset} to configure checks for your project`);
  console.log(`  ${c.gray}•${c.reset} Or edit ${c.bold}fortress.config.js${c.reset} and set ${c.bold}enabled: true${c.reset} on the checks you want\n`);
}

module.exports = { parseFlags, createColors, renderCheckResults, renderNoChecksEnabled };
