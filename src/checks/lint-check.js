'use strict';

const { execSync } = require('child_process');
const { createResult, safeEnv } = require('./base-check');

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
      env: safeEnv(),
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
      errors.push(`  Command: ${command}`);
      // Check for common "not found" patterns
      if (/not found|ENOENT|could not determine executable/i.test(output)) {
        errors.push('  Hint: The lint tool may not be installed. Try: npm install --save-dev eslint');
      }
    }
  }

  // Parse warning count from linter summary line
  // ESLint: "✖ 3 problems (1 error, 2 warnings)" or "(0 errors, 1 warning)"
  // Biome: similar summary format
  // Use the parenthesized summary to avoid matching detail lines like "1:7  warning  ..."
  let warningCount = 0;
  const summaryMatch = output.match(/(\d+)\s+warnings?\)/);
  if (summaryMatch) {
    warningCount = parseInt(summaryMatch[1], 10);
  }
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
