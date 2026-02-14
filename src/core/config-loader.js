'use strict';

const fs = require('fs');
const path = require('path');
const detector = require('./detector');

const CONFIG_FILENAME = 'fortress.config.js';

/**
 * Load fortress config from the project root.
 * Falls back to auto-detection if no config file exists.
 */
function load(projectRoot) {
  const configPath = path.join(projectRoot, CONFIG_FILENAME);
  let userConfig = {};

  if (fs.existsSync(configPath)) {
    try {
      userConfig = require(configPath);
    } catch (err) {
      console.error(`\nError loading ${CONFIG_FILENAME}: ${err.message}`);
      console.error(`\nThis usually means there's a syntax error in your config file.`);
      console.error(`To regenerate it, run: npx fortress init --force\n`);
      process.exit(1);
    }
  }

  const detected = detector.detect(projectRoot);
  // Guard against non-object configs (null, arrays, strings, functions)
  if (!userConfig || typeof userConfig !== 'object' || Array.isArray(userConfig)) {
    userConfig = {};
  }
  return mergeWithDefaults(detected, userConfig);
}

function mergeWithDefaults(detected, userConfig) {
  // Build the default check commands based on detection
  const defaults = {
    root: detected.root,

    checks: {
      typescript: {
        enabled: detected.language === 'typescript',
        command: 'npx tsc --noEmit',
        weight: 20,
      },
      lint: {
        enabled: !!detected.linter,
        command: getLintCommand(detected),
        weight: 15,
      },
      test: {
        enabled: !!detected.testFramework,
        command: getTestCommand(detected),
        weight: 25,
      },
      content: {
        enabled: false,
        patterns: [],
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
        skipDirs: ['node_modules', '.next', '.git', 'dist', 'coverage', '.vercel'],
        allowlist: {},
        weight: 20,
      },
      secrets: {
        enabled: true,
        patterns: [],
        allowlist: {},
        weight: 10,
      },
      security: {
        enabled: true,
        command: getAuditCommand(detected),
        weight: 10,
      },
      build: {
        enabled: !!detected.buildCommand,
        command: detected.buildCommand,
        weight: 10,
      },
    },

    scoring: {
      deployThreshold: 95,
    },

    report: {
      outputDir: './fortress-reports/',
    },
  };

  // Deep merge user config over defaults
  if (userConfig.checks) {
    for (const [name, checkConfig] of Object.entries(userConfig.checks)) {
      if (defaults.checks[name]) {
        defaults.checks[name] = { ...defaults.checks[name], ...checkConfig };
      } else {
        defaults.checks[name] = checkConfig;
      }
    }
  }

  if (userConfig.scoring) {
    defaults.scoring = { ...defaults.scoring, ...userConfig.scoring };
  }

  if (userConfig.report) {
    defaults.report = { ...defaults.report, ...userConfig.report };
  }

  return defaults;
}

function getLintCommand(detected) {
  switch (detected.linter) {
    case 'next': return 'npx next lint';
    case 'biome': return 'npx biome check .';
    case 'eslint': return 'npx eslint .';
    default: return null;
  }
}

function getTestCommand(detected) {
  switch (detected.testFramework) {
    case 'vitest': return 'npx vitest run';
    case 'jest': return 'npx jest --passWithNoTests';
    case 'mocha': return 'npx mocha';
    case 'node:test': return 'node --test tests/';
    default: return null;
  }
}

function getAuditCommand(detected) {
  switch (detected.packageManager) {
    case 'pnpm': return 'pnpm audit --production';
    case 'yarn': return 'yarn audit --production';
    case 'bun': return 'bun audit';
    default: return 'npm audit --production';
  }
}

module.exports = { load };
