'use strict';

/**
 * Create a standardized check result.
 * Every check MUST return this shape.
 *
 * @param {string} name - Display name (e.g., "TypeScript")
 * @param {object} opts
 * @param {string} [opts.key] - Config key (e.g., "typescript"). Defaults to name.toLowerCase()
 */
function createResult(name, { key, passed, errors = [], warnings = [], duration = 0, score = 0 }) {
  return {
    name,
    key: key || name.toLowerCase(),
    passed,
    errors,
    warnings,
    duration,
    score,
  };
}

module.exports = { createResult };
