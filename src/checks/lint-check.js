'use strict';

const { execSync } = require('child_process');
const { createResult } = require('./base-check');

function run(config, checkConfig) {
  const start = Date.now();
  const command = checkConfig.command;
  const errors = [];
  const warnings = [];
  let output = '';

  try {
    output = execSync(command, {
      cwd: config.root,
      stdio: 'pipe',
      timeout: 120000,
      env: { ...process.env, FORCE_COLOR: '0' },
    }).toString();
  } catch (err) {
    output = ((err.stdout || '') + '' + (err.stderr || '')).toString();
    // Extract error/warning lines
    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/error/i.test(trimmed) && !trimmed.startsWith('✖') && !trimmed.startsWith('×')) {
        errors.push(trimmed);
      }
    }
    if (errors.length === 0) {
      errors.push('Lint check failed');
    }
  }

  // Parse warning count from output
  const warningMatch = output.match(/(\d+)\s+warning/);
  const warningCount = warningMatch ? parseInt(warningMatch[1], 10) : 0;
  if (warningCount > 0) {
    warnings.push(`${warningCount} lint warning(s)`);
  }

  const passed = errors.length === 0;
  const duration = Date.now() - start;

  // Deduct for warnings: -5 per warning, up to full weight
  const warningPenalty = Math.min(warningCount * 5, checkConfig.weight);
  const score = passed ? checkConfig.weight - warningPenalty : 0;

  return createResult('Lint', {
    passed,
    errors: errors.slice(0, 20),
    warnings,
    duration,
    score: Math.max(0, score),
  });
}

module.exports = { run };
