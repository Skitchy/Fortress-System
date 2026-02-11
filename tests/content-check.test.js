'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const contentCheck = require('../src/checks/content-check');

function createTempProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortress-content-'));
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(dir, name);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
  return dir;
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('content-check', () => {
  it('passes when no patterns are configured', () => {
    const dir = createTempProject({ 'src/index.ts': 'console.log("hello")' });
    try {
      const result = contentCheck.run(
        { root: dir },
        { enabled: true, patterns: [], extensions: ['.ts'], skipDirs: [], allowlist: {}, weight: 20 }
      );
      assert.equal(result.passed, true);
      assert.equal(result.score, 20);
    } finally {
      cleanup(dir);
    }
  });

  it('detects forbidden patterns', () => {
    const dir = createTempProject({
      'src/index.ts': 'This is a learning platform for training courses',
    });
    try {
      const result = contentCheck.run(
        { root: dir },
        {
          enabled: true,
          patterns: [
            { regex: 'learning platform', label: 'learning platform' },
            { regex: 'training courses', label: 'training courses' },
          ],
          extensions: ['.ts'],
          skipDirs: [],
          allowlist: {},
          weight: 20,
        }
      );
      assert.equal(result.passed, false);
      assert.equal(result.score, 0);
      assert.ok(result.errors.length >= 2);
    } finally {
      cleanup(dir);
    }
  });

  it('respects allowlist with wildcard', () => {
    const dir = createTempProject({
      'tests/setup.ts': 'This references a learning platform in tests',
    });
    try {
      const result = contentCheck.run(
        { root: dir },
        {
          enabled: true,
          patterns: [{ regex: 'learning platform', label: 'learning platform' }],
          extensions: ['.ts'],
          skipDirs: [],
          allowlist: { 'tests/': '*' },
          weight: 20,
        }
      );
      assert.equal(result.passed, true);
      assert.equal(result.score, 20);
    } finally {
      cleanup(dir);
    }
  });

  it('respects allowlist with specific terms', () => {
    const dir = createTempProject({
      'scripts/validate.ts': 'Check for learning platform remnants',
    });
    try {
      const result = contentCheck.run(
        { root: dir },
        {
          enabled: true,
          patterns: [{ regex: 'learning platform', label: 'learning platform' }],
          extensions: ['.ts'],
          skipDirs: [],
          allowlist: { 'scripts/': ['learning platform'] },
          weight: 20,
        }
      );
      assert.equal(result.passed, true);
      assert.equal(result.score, 20);
    } finally {
      cleanup(dir);
    }
  });

  it('skips configured directories', () => {
    const dir = createTempProject({
      'node_modules/lib/index.ts': 'learning platform reference in node_modules',
      'src/app.ts': 'clean code here',
    });
    try {
      const result = contentCheck.run(
        { root: dir },
        {
          enabled: true,
          patterns: [{ regex: 'learning platform', label: 'learning platform' }],
          extensions: ['.ts'],
          skipDirs: ['node_modules'],
          allowlist: {},
          weight: 20,
        }
      );
      assert.equal(result.passed, true);
    } finally {
      cleanup(dir);
    }
  });

  it('respects file extension filter', () => {
    const dir = createTempProject({
      'src/readme.md': 'This is a learning platform description',
      'src/app.ts': 'clean code',
    });
    try {
      const result = contentCheck.run(
        { root: dir },
        {
          enabled: true,
          patterns: [{ regex: 'learning platform', label: 'learning platform' }],
          extensions: ['.ts'],
          skipDirs: [],
          allowlist: {},
          weight: 20,
        }
      );
      assert.equal(result.passed, true);
    } finally {
      cleanup(dir);
    }
  });

  it('handles string patterns (shorthand)', () => {
    const dir = createTempProject({
      'src/app.ts': 'TODO: fix this later',
    });
    try {
      const result = contentCheck.run(
        { root: dir },
        {
          enabled: true,
          patterns: ['TODO'],
          extensions: ['.ts'],
          skipDirs: [],
          allowlist: {},
          weight: 20,
        }
      );
      assert.equal(result.passed, false);
      assert.ok(result.errors.length >= 1);
    } finally {
      cleanup(dir);
    }
  });

  it('caps error output at 30 violations', () => {
    const lines = Array.from({ length: 40 }, (_, i) => `line ${i}: TODO fix`).join('\n');
    const dir = createTempProject({ 'src/big.ts': lines });
    try {
      const result = contentCheck.run(
        { root: dir },
        {
          enabled: true,
          patterns: ['TODO'],
          extensions: ['.ts'],
          skipDirs: [],
          allowlist: {},
          weight: 20,
        }
      );
      assert.equal(result.passed, false);
      assert.equal(result.errors.length, 30);
      assert.ok(result.warnings.some(w => w.includes('more violations')));
    } finally {
      cleanup(dir);
    }
  });
});
