'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Auto-detect project framework, language, tooling, and configuration.
 * Returns a detection result used to generate fortress.config.js.
 */
function detect(projectRoot) {
  const result = {
    root: projectRoot,
    framework: null,
    language: null,
    packageManager: null,
    testFramework: null,
    linter: null,
    buildCommand: null,
  };

  const pkg = readJson(path.join(projectRoot, 'package.json'));
  if (!pkg) {
    return result;
  }

  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  // Language
  if (allDeps.typescript || fs.existsSync(path.join(projectRoot, 'tsconfig.json'))) {
    result.language = 'typescript';
  } else {
    result.language = 'javascript';
  }

  // Framework
  if (allDeps.next) {
    result.framework = 'next';
  } else if (allDeps.nuxt) {
    result.framework = 'nuxt';
  } else if (allDeps.gatsby) {
    result.framework = 'gatsby';
  } else if (allDeps['@angular/core']) {
    result.framework = 'angular';
  } else if (allDeps.svelte || allDeps['@sveltejs/kit']) {
    result.framework = 'svelte';
  } else if (allDeps.react) {
    result.framework = 'react';
  } else if (allDeps.vue) {
    result.framework = 'vue';
  } else if (allDeps.express || allDeps.fastify || allDeps.koa) {
    result.framework = 'node';
  }

  // Package manager
  if (fs.existsSync(path.join(projectRoot, 'bun.lockb'))) {
    result.packageManager = 'bun';
  } else if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
    result.packageManager = 'pnpm';
  } else if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) {
    result.packageManager = 'yarn';
  } else {
    result.packageManager = 'npm';
  }

  // Test framework
  if (allDeps.vitest) {
    result.testFramework = 'vitest';
  } else if (allDeps.jest || allDeps['@jest/core']) {
    result.testFramework = 'jest';
  } else if (allDeps.mocha) {
    result.testFramework = 'mocha';
  } else if (pkg.scripts && pkg.scripts.test && pkg.scripts.test.includes('node --test')) {
    result.testFramework = 'node:test';
  }

  // Linter
  if (allDeps.biome || allDeps['@biomejs/biome']) {
    result.linter = 'biome';
  } else if (allDeps.eslint) {
    if (result.framework === 'next') {
      result.linter = 'next';  // next lint wraps eslint
    } else {
      result.linter = 'eslint';
    }
  }

  // Build command
  if (pkg.scripts) {
    if (pkg.scripts.build) {
      result.buildCommand = `${result.packageManager} run build`;
    }
  }

  return result;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

module.exports = { detect };
