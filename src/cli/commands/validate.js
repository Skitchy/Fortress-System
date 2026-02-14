'use strict';

const configLoader = require('../../core/config-loader');
const runner = require('../../core/runner');
const scorer = require('../../core/scorer');
const { parseFlags, createColors, renderCheckResults, renderNoChecksEnabled } = require('../helpers');

const flags = parseFlags();
const c = createColors(flags);

const projectRoot = process.cwd();
const startTime = Date.now();

const config = configLoader.load(projectRoot);
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
console.log(`\n${c.bold}${c.blue}Fortress Validate${c.reset}`);
console.log(`${c.gray}Running full validation pipeline...${c.reset}\n`);

const { allPassed, enabledCount } = renderCheckResults(results, config, c);

const totalSeconds = (totalDuration / 1000).toFixed(1);

console.log('\n' + '\u2500'.repeat(50));

if (enabledCount === 0) {
  renderNoChecksEnabled(c);
} else {
  const scoreColor = scoreResult.score >= 95 ? c.green : scoreResult.score >= 80 ? c.yellow : c.red;
  console.log(`${c.bold}  Score: ${scoreColor}${scoreResult.score}/100${c.reset}  ${c.gray}(${totalSeconds}s)${c.reset}`);

  if (allPassed) {
    console.log(`  ${c.green}${c.bold}All checks passed.${c.reset}\n`);
  } else {
    console.log(`  ${c.red}${c.bold}Validation failed.${c.reset}\n`);
  }
}

process.exit(allPassed ? 0 : 1);
