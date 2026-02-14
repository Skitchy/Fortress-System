'use strict';

const { execSync } = require('child_process');
const { createResult, safeEnv } = require('./base-check');

function run(config, checkConfig) {
  const start = Date.now();
  const command = checkConfig.command || 'npm audit --production';
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
    // npm audit exits non-zero when vulnerabilities found - that's expected
    output = ((err.stdout || '') + '' + (err.stderr || '')).toString();
  }

  const vulns = parseAuditOutput(output);
  const critical = vulns.critical || 0;
  const high = vulns.high || 0;
  const moderate = vulns.moderate || 0;

  if (critical > 0) errors.push(`${critical} critical vulnerability(ies)`);
  if (high > 0) errors.push(`${high} high vulnerability(ies)`);
  if (moderate > 0) warnings.push(`${moderate} moderate vulnerability(ies)`);

  const penaltyCount = critical + high;
  const deduction = penaltyCount * 5;
  const score = Math.max(0, checkConfig.weight - deduction);
  const passed = critical === 0 && high === 0;
  const duration = Date.now() - start;

  return createResult('Security', {
    key: 'security',
    passed,
    errors,
    warnings,
    duration,
    score,
  });
}

function parseAuditOutput(output) {
  const result = { critical: 0, high: 0, moderate: 0, low: 0 };

  // npm audit JSON format (npm audit --json)
  // Try structured parsing first
  try {
    const json = JSON.parse(output);
    if (json.metadata && json.metadata.vulnerabilities) {
      return json.metadata.vulnerabilities;
    }
  } catch {
    // Not JSON, parse text output
  }

  // npm audit text: "X critical", "X high", "X moderate"
  const critMatch = output.match(/(\d+)\s+critical/i);
  const highMatch = output.match(/(\d+)\s+high/i);
  const modMatch = output.match(/(\d+)\s+moderate/i);
  const lowMatch = output.match(/(\d+)\s+low/i);

  if (critMatch) result.critical = parseInt(critMatch[1], 10);
  if (highMatch) result.high = parseInt(highMatch[1], 10);
  if (modMatch) result.moderate = parseInt(modMatch[1], 10);
  if (lowMatch) result.low = parseInt(lowMatch[1], 10);

  return result;
}

module.exports = { run, parseAuditOutput };
