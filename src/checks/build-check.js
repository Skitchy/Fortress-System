'use strict';

const { execSync } = require('child_process');
const { createResult } = require('./base-check');

function run(config, checkConfig) {
  const start = Date.now();
  const command = checkConfig.command;
  const errors = [];

  try {
    execSync(command, {
      cwd: config.root,
      stdio: 'pipe',
      timeout: 300000, // 5 minutes for builds
      env: { ...process.env, FORCE_COLOR: '0' },
    });
  } catch (err) {
    const output = ((err.stdout || '') + '' + (err.stderr || '')).toString();
    // Extract meaningful error lines
    const lines = output.split('\n').filter(l => l.trim().length > 0);
    const errorLines = lines.filter(l =>
      /error|failed|Error:|FATAL/i.test(l) && !/warn/i.test(l)
    );

    if (errorLines.length > 0) {
      for (const line of errorLines.slice(0, 10)) {
        errors.push(line.trim());
      }
      if (errorLines.length > 10) {
        errors.push(`... and ${errorLines.length - 10} more errors`);
      }
    } else {
      errors.push('Build failed');
    }
  }

  const passed = errors.length === 0;
  const duration = Date.now() - start;

  return createResult('Build', {
    key: 'build',
    passed,
    errors,
    duration,
    score: passed ? checkConfig.weight : 0,
  });
}

module.exports = { run };
