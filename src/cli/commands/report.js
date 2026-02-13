'use strict';

const configLoader = require('../../core/config-loader');
const runner = require('../../core/runner');
const scorer = require('../../core/scorer');
const reporter = require('../../core/reporter');
const { parseFlags, createColors } = require('../helpers');

const flags = parseFlags();
const c = createColors(flags);

const projectRoot = process.cwd();
const startTime = Date.now();

const config = configLoader.load(projectRoot);
const results = runner.run(config);
const scoreResult = scorer.calculate(results, config);
const totalDuration = Date.now() - startTime;

const report = reporter.generateReport(results, scoreResult, config, totalDuration);

// JSON-only mode: output JSON and exit
if (flags.isJSON) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.exit(scoreResult.deployReady ? 0 : 1);
}

// Console output
console.log(`\n${c.bold}${c.blue}Fortress Report${c.reset}`);
console.log(`${c.gray}Running all enabled checks...${c.reset}\n`);

// Per-check results with scoring breakdown
let allPassed = true;
for (const result of results) {
  const checkConfig = config.checks[result.key];
  const isEnabled = checkConfig && checkConfig.enabled;

  if (!isEnabled) {
    console.log(`  ${c.gray}[SKIP]${c.reset} ${result.name} ${c.gray}(disabled)${c.reset}`);
    continue;
  }

  const icon = result.passed ? `${c.green}[PASS]` : `${c.red}[FAIL]`;
  const weight = checkConfig.weight || 0;
  const scoreStr = `${c.gray}(${result.score}/${weight} pts)${c.reset}`;
  const duration = result.duration > 0 ? ` ${c.gray}${(result.duration / 1000).toFixed(1)}s${c.reset}` : '';

  console.log(`  ${icon}${c.reset} ${result.name} ${scoreStr}${duration}`);

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

// Score summary
console.log('\n' + '\u2500'.repeat(50));

const scoreColor = scoreResult.score >= 95 ? c.green : scoreResult.score >= 80 ? c.yellow : c.red;
console.log(`${c.bold}  Score: ${scoreColor}${scoreResult.score}/100${c.reset}  ${c.gray}(${(totalDuration / 1000).toFixed(1)}s)${c.reset}`);

// Check if no checks were enabled
const enabledCount = results.filter(r => {
  const cfg = config.checks[r.key];
  return cfg && cfg.enabled;
}).length;

if (enabledCount === 0) {
  console.log(`  ${c.yellow}${c.bold}No checks are enabled.${c.reset}`);
  console.log(`  ${c.gray}Fortress doesn't have anything to validate yet.${c.reset}\n`);
  console.log(`  ${c.bold}What to do next:${c.reset}`);
  console.log(`  ${c.gray}•${c.reset} Run ${c.bold}fortress init --force${c.reset} to configure checks for your project`);
  console.log(`  ${c.gray}•${c.reset} Or edit ${c.bold}fortress.config.js${c.reset} and set ${c.bold}enabled: true${c.reset} on the checks you want\n`);
  process.exit(0);
}

// Deploy readiness
if (scoreResult.deployReady) {
  console.log(`  ${c.green}${c.bold}Deploy ready${c.reset} ${c.gray}(threshold: ${config.scoring.deployThreshold})${c.reset}`);
} else {
  console.log(`  ${c.red}${c.bold}Not deploy ready${c.reset} ${c.gray}(need ${config.scoring.deployThreshold}, got ${scoreResult.score})${c.reset}`);
}

// Save JSON report
const outputDir = config.report?.outputDir || './fortress-reports/';
const savedPath = reporter.saveReport(report, outputDir);
console.log(`\n  ${c.gray}Report saved: ${savedPath}${c.reset}\n`);

process.exit(allPassed ? 0 : 1);
