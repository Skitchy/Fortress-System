'use strict';

const configLoader = require('../../core/config-loader');
const runner = require('../../core/runner');
const scorer = require('../../core/scorer');
const { parseFlags, createColors } = require('../helpers');

const flags = parseFlags();
const c = createColors(flags);

const projectRoot = process.cwd();
const startTime = Date.now();

const config = configLoader.load(projectRoot);

// Quick mode: skip security and build checks (they're slow)
if (config.checks.security) config.checks.security.enabled = false;
if (config.checks.build) config.checks.build.enabled = false;

const results = runner.run(config);
const scoreResult = scorer.calculate(results, config);
const totalDuration = Date.now() - startTime;

// JSON-only mode
if (flags.isJSON) {
  const output = {
    passed: results.every(r => {
      const cfg = config.checks[r.key];
      return !cfg || !cfg.enabled || r.passed;
    }),
    score: scoreResult.score,
    duration: totalDuration,
    checks: results.map(r => ({ key: r.key, passed: r.passed, score: r.score })),
  };
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  process.exit(output.passed ? 0 : 1);
}

// Console output
console.log(`\n${c.bold}${c.blue}Fortress Quick Validation${c.reset}`);
console.log(`${c.gray}Running enabled checks...${c.reset}\n`);

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

  console.log(`  ${icon}${c.reset} ${result.name}${duration}`);

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

const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

console.log('\n' + '\u2500'.repeat(50));

const scoreColor = scoreResult.score >= 95 ? c.green : scoreResult.score >= 80 ? c.yellow : c.red;
console.log(`${c.bold}  Score: ${scoreColor}${scoreResult.score}/100${c.reset}  ${c.gray}(${totalSeconds}s)${c.reset}`);

if (allPassed) {
  console.log(`  ${c.green}${c.bold}All checks passed.${c.reset}\n`);
} else {
  // Check if failures look like missing tooling rather than real code issues
  const setupErrors = ['TypeScript compilation failed', 'Lint check failed'];
  const failedResults = results.filter(r => {
    const cfg = config.checks[r.key];
    return cfg && cfg.enabled && !r.passed;
  });
  const allSetupIssues = failedResults.length > 0 && failedResults.every(r =>
    r.errors.every(e => setupErrors.includes(e))
  );

  if (allSetupIssues) {
    console.log(`  ${c.yellow}${c.bold}Some checks failed — but that's expected.${c.reset}`);
    console.log(`  ${c.gray}You selected tools that aren't set up in this project yet.${c.reset}`);
    console.log(`  ${c.gray}This is totally normal for a new project.${c.reset}\n`);
    console.log(`  ${c.bold}What to do next:${c.reset}`);
    console.log(`  ${c.gray}•${c.reset} Open Claude Code and ask it to set up the tools for you`);
    console.log(`  ${c.gray}•${c.reset} Or re-run ${c.bold}fortress init --force${c.reset} and pick only what's installed`);
    console.log(`  ${c.gray}•${c.reset} Or edit ${c.bold}fortress.config.js${c.reset} to disable checks you're not ready for\n`);
  } else {
    console.log(`  ${c.red}${c.bold}Some checks failed.${c.reset}\n`);
  }
}

process.exit(allPassed ? 0 : 1);
