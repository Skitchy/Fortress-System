'use strict';

const configLoader = require('../../core/config-loader');
const runner = require('../../core/runner');
const scorer = require('../../core/scorer');
const reporter = require('../../core/reporter');
const { parseFlags, createColors, renderCheckResults, renderNoChecksEnabled } = require('../helpers');

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
const { allPassed, enabledCount } = renderCheckResults(results, config, c, { showScore: true });

// Score summary
console.log('\n' + '\u2500'.repeat(50));

if (enabledCount === 0) {
  renderNoChecksEnabled(c);
  process.exit(1);
}

const scoreColor = scoreResult.score >= 95 ? c.green : scoreResult.score >= 80 ? c.yellow : c.red;
console.log(`${c.bold}  Score: ${scoreColor}${scoreResult.score}/100${c.reset}  ${c.gray}(${(totalDuration / 1000).toFixed(1)}s)${c.reset}`);

// Deploy readiness
if (scoreResult.deployReady) {
  console.log(`  ${c.green}${c.bold}Deploy ready${c.reset} ${c.gray}(threshold: ${config.scoring.deployThreshold})${c.reset}`);
} else {
  console.log(`  ${c.red}${c.bold}Not deploy ready${c.reset} ${c.gray}(need ${config.scoring.deployThreshold}, got ${scoreResult.score})${c.reset}`);
}

// Save JSON report
const outputDir = config.report?.outputDir || './fortress-reports/';
let saveFailed = false;
try {
  const savedPath = reporter.saveReport(report, outputDir);
  console.log(`\n  ${c.gray}Report saved: ${savedPath}${c.reset}\n`);
} catch (err) {
  saveFailed = true;
  console.error(`\n  ${c.red}${c.bold}Failed to save report:${c.reset} ${err.message}\n`);
}

process.exit(scoreResult.deployReady && allPassed && !saveFailed ? 0 : 1);
