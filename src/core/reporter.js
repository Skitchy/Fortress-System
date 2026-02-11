'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Generate a structured report object from check results and scoring.
 */
function generateReport(results, scoreResult, config, totalDuration) {
  return {
    timestamp: new Date().toISOString(),
    score: scoreResult.score,
    maxScore: scoreResult.maxScore,
    deployReady: scoreResult.deployReady,
    deployThreshold: config.scoring?.deployThreshold || 95,
    duration: totalDuration,
    checks: results.map(r => ({
      name: r.name,
      key: r.key,
      passed: r.passed,
      score: r.score,
      maxScore: config.checks[r.key]?.weight || 0,
      enabled: config.checks[r.key]?.enabled || false,
      duration: r.duration,
      errors: r.errors,
      warnings: r.warnings,
    })),
  };
}

/**
 * Save report as timestamped JSON file.
 * Returns the file path of the saved report.
 */
function saveReport(report, outputDir) {
  const resolvedDir = path.resolve(outputDir);
  fs.mkdirSync(resolvedDir, { recursive: true });

  const timestamp = report.timestamp.replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
  const filename = `fortress-report-${timestamp}.json`;
  const filePath = path.join(resolvedDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
  return filePath;
}

module.exports = { generateReport, saveReport };
