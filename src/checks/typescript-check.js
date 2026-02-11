'use strict';

const { execSync } = require('child_process');
const { createResult } = require('./base-check');

function run(config, checkConfig) {
  const start = Date.now();
  const command = checkConfig.command || 'npx tsc --noEmit';
  const errors = [];

  try {
    execSync(command, {
      cwd: config.root,
      stdio: 'pipe',
      timeout: 120000,
      env: { ...process.env, FORCE_COLOR: '0' },
    });
  } catch (err) {
    const output = ((err.stdout || '') + '' + (err.stderr || '')).toString();
    // Extract error lines (format: file(line,col): error TSxxxx: message)
    const lines = output.split('\n').filter(l => l.includes('error TS'));
    for (const line of lines.slice(0, 20)) {
      errors.push(line.trim());
    }
    if (lines.length > 20) {
      errors.push(`... and ${lines.length - 20} more errors`);
    }
    if (errors.length === 0) {
      errors.push('TypeScript compilation failed');
    }
  }

  const passed = errors.length === 0;
  const duration = Date.now() - start;

  return createResult('TypeScript', {
    passed,
    errors,
    duration,
    score: passed ? checkConfig.weight : 0,
  });
}

module.exports = { run };
