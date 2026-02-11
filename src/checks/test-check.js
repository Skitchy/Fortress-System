'use strict';

const { execSync } = require('child_process');
const { createResult } = require('./base-check');

function run(config, checkConfig) {
  const start = Date.now();
  const command = checkConfig.command;
  const errors = [];
  const warnings = [];
  let output = '';
  let exitedClean = true;

  try {
    output = execSync(command, {
      cwd: config.root,
      stdio: 'pipe',
      timeout: 300000,
      env: { ...process.env, FORCE_COLOR: '0' },
    }).toString();
  } catch (err) {
    exitedClean = false;
    output = ((err.stdout || '') + '' + (err.stderr || '')).toString();
  }

  // Parse test results - try Jest format first, then generic
  const testCounts = parseTestOutput(output);

  if (!exitedClean && testCounts.total === 0) {
    errors.push('Test suite failed to run');
  } else if (testCounts.failed > 0) {
    errors.push(`${testCounts.failed} test(s) failed`);
  }

  const passed = errors.length === 0;
  const duration = Date.now() - start;

  // Proportional scoring based on pass rate
  const passRate = testCounts.total > 0
    ? testCounts.passed / testCounts.total
    : (exitedClean ? 1 : 0);
  const score = Math.round(checkConfig.weight * passRate);

  if (testCounts.total > 0) {
    warnings.push(`${testCounts.passed}/${testCounts.total} tests passed`);
  }

  return createResult('Tests', {
    key: 'test',
    passed,
    errors,
    warnings,
    duration,
    score,
  });
}

function parseTestOutput(output) {
  // Jest format: Tests: X passed, Y total
  const jestPass = output.match(/Tests:\s+(\d+)\s+passed/);
  const jestFail = output.match(/(\d+)\s+failed/);
  const jestTotal = output.match(/(\d+)\s+total/);

  if (jestPass || jestTotal) {
    const passed = jestPass ? parseInt(jestPass[1], 10) : 0;
    const failed = jestFail ? parseInt(jestFail[1], 10) : 0;
    const total = jestTotal ? parseInt(jestTotal[1], 10) : passed + failed;
    return { passed, failed, total };
  }

  // Vitest format: Tests  X passed (Y)
  const vitestMatch = output.match(/Tests\s+(\d+)\s+passed\s+\((\d+)\)/);
  if (vitestMatch) {
    const passed = parseInt(vitestMatch[1], 10);
    const total = parseInt(vitestMatch[2], 10);
    return { passed, failed: total - passed, total };
  }

  // Node test runner: # pass X, # fail Y
  const nodePass = output.match(/# pass\s+(\d+)/);
  const nodeFail = output.match(/# fail\s+(\d+)/);
  if (nodePass) {
    const passed = parseInt(nodePass[1], 10);
    const failed = nodeFail ? parseInt(nodeFail[1], 10) : 0;
    return { passed, failed, total: passed + failed };
  }

  // Mocha: X passing, Y failing
  const mochaPass = output.match(/(\d+)\s+passing/);
  const mochaFail = output.match(/(\d+)\s+failing/);
  if (mochaPass) {
    const passed = parseInt(mochaPass[1], 10);
    const failed = mochaFail ? parseInt(mochaFail[1], 10) : 0;
    return { passed, failed, total: passed + failed };
  }

  return { passed: 0, failed: 0, total: 0 };
}

module.exports = { run };
