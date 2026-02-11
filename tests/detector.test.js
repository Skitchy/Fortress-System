'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { detect } = require('../src/core/detector');

function createTempProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortress-test-'));
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(dir, name);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  }
  return dir;
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('detector', () => {
  it('detects Next.js + TypeScript + Jest + ESLint', () => {
    const dir = createTempProject({
      'package.json': {
        dependencies: { next: '14.0.0', react: '18.0.0' },
        devDependencies: { typescript: '5.0.0', jest: '29.0.0', eslint: '8.0.0' },
        scripts: { build: 'next build' },
      },
      'tsconfig.json': '{}',
      'package-lock.json': '',
    });
    try {
      const result = detect(dir);
      assert.equal(result.framework, 'next');
      assert.equal(result.language, 'typescript');
      assert.equal(result.testFramework, 'jest');
      assert.equal(result.linter, 'next');
      assert.equal(result.packageManager, 'npm');
      assert.ok(result.buildCommand);
    } finally {
      cleanup(dir);
    }
  });

  it('detects React + Vitest + Biome with pnpm', () => {
    const dir = createTempProject({
      'package.json': {
        dependencies: { react: '18.0.0' },
        devDependencies: { vitest: '1.0.0', '@biomejs/biome': '1.0.0' },
        scripts: { build: 'vite build' },
      },
      'pnpm-lock.yaml': '',
    });
    try {
      const result = detect(dir);
      assert.equal(result.framework, 'react');
      assert.equal(result.language, 'javascript');
      assert.equal(result.testFramework, 'vitest');
      assert.equal(result.linter, 'biome');
      assert.equal(result.packageManager, 'pnpm');
    } finally {
      cleanup(dir);
    }
  });

  it('detects Vue + Mocha with yarn', () => {
    const dir = createTempProject({
      'package.json': {
        dependencies: { vue: '3.0.0' },
        devDependencies: { mocha: '10.0.0', eslint: '8.0.0' },
      },
      'yarn.lock': '',
    });
    try {
      const result = detect(dir);
      assert.equal(result.framework, 'vue');
      assert.equal(result.testFramework, 'mocha');
      assert.equal(result.linter, 'eslint');
      assert.equal(result.packageManager, 'yarn');
    } finally {
      cleanup(dir);
    }
  });

  it('handles minimal project with no detectable tools', () => {
    const dir = createTempProject({
      'package.json': { name: 'bare-project', version: '1.0.0' },
    });
    try {
      const result = detect(dir);
      assert.equal(result.framework, null);
      assert.equal(result.language, 'javascript');
      assert.equal(result.testFramework, null);
      assert.equal(result.linter, null);
      assert.equal(result.packageManager, 'npm');
    } finally {
      cleanup(dir);
    }
  });

  it('handles missing package.json gracefully', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortress-test-'));
    try {
      const result = detect(dir);
      assert.equal(result.framework, null);
      assert.equal(result.language, null);
      assert.equal(result.packageManager, null);
    } finally {
      cleanup(dir);
    }
  });

  it('detects bun package manager', () => {
    const dir = createTempProject({
      'package.json': { name: 'bun-project', dependencies: { react: '18.0.0' } },
      'bun.lockb': '',
    });
    try {
      const result = detect(dir);
      assert.equal(result.packageManager, 'bun');
    } finally {
      cleanup(dir);
    }
  });

  it('detects Angular framework', () => {
    const dir = createTempProject({
      'package.json': {
        dependencies: { '@angular/core': '17.0.0' },
        devDependencies: { typescript: '5.0.0' },
      },
      'tsconfig.json': '{}',
    });
    try {
      const result = detect(dir);
      assert.equal(result.framework, 'angular');
      assert.equal(result.language, 'typescript');
    } finally {
      cleanup(dir);
    }
  });
});
