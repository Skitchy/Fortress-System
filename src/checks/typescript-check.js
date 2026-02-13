'use strict';

const { execSync } = require('child_process');
const { createResult, safeEnv } = require('./base-check');

function run(config, checkConfig) {
  const start = Date.now();
  const command = checkConfig.command || 'npx tsc --noEmit';
  const errors = [];

  try {
    execSync(command, {
      cwd: config.root,
      stdio: 'pipe',
      timeout: 120000,
      env: safeEnv(),
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
      errors.push(`  Command: ${command}`);
      if (/not found|ENOENT|could not determine executable/i.test(output)) {
        errors.push('  Hint: TypeScript may not be installed. Try: npm install --save-dev typescript');
      }
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
