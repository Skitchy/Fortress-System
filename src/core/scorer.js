'use strict';

/**
 * Calculate a normalized score from check results.
 *
 * Adaptive scoring: disabled checks redistribute their weight proportionally.
 * If only 3 of 4 checks are enabled, those 3 checks can still reach 100/100.
 */
function calculate(results, config) {
  const enabledChecks = Object.entries(config.checks).filter(([, c]) => c.enabled);
  const totalWeight = enabledChecks.reduce((sum, [, c]) => sum + (c.weight || 0), 0);

  if (totalWeight === 0) {
    return { score: 100, maxScore: 100, checks: results };
  }

  // Sum raw scores from enabled checks
  const rawScore = results
    .filter(r => {
      const checkCfg = config.checks[r.key];
      return checkCfg && checkCfg.enabled;
    })
    .reduce((sum, r) => sum + r.score, 0);

  // Normalize to 100-point scale
  const normalizedScore = Math.round((rawScore / totalWeight) * 100);

  return {
    score: normalizedScore,
    maxScore: 100,
    rawScore,
    totalWeight,
    deployReady: normalizedScore >= (config.scoring?.deployThreshold || 95),
    checks: results,
  };
}

module.exports = { calculate };
