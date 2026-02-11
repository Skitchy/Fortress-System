'use strict';

const typescriptCheck = require('../checks/typescript-check');
const lintCheck = require('../checks/lint-check');
const testCheck = require('../checks/test-check');
const contentCheck = require('../checks/content-check');
const securityCheck = require('../checks/security-check');
const buildCheck = require('../checks/build-check');
const { createResult } = require('../checks/base-check');

const CHECK_MODULES = {
  typescript: typescriptCheck,
  lint: lintCheck,
  test: testCheck,
  content: contentCheck,
  security: securityCheck,
  build: buildCheck,
};

/**
 * Run all enabled checks sequentially.
 * Returns an array of check results.
 */
function run(config) {
  const results = [];

  for (const [name, checkConfig] of Object.entries(config.checks)) {
    if (!checkConfig.enabled) {
      results.push(createResult(name, {
        passed: true,
        warnings: [`${name} check is disabled`],
        duration: 0,
        score: 0,
      }));
      continue;
    }

    if (checkConfig.command === null && name !== 'content') {
      results.push(createResult(name, {
        passed: true,
        warnings: [`No ${name} command detected - skipped`],
        duration: 0,
        score: 0,
      }));
      continue;
    }

    const mod = CHECK_MODULES[name];
    if (!mod) {
      results.push(createResult(name, {
        passed: false,
        errors: [`Unknown check: ${name}`],
        duration: 0,
        score: 0,
      }));
      continue;
    }

    results.push(mod.run(config, checkConfig));
  }

  return results;
}

module.exports = { run };
