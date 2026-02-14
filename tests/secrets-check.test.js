'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const secretsCheck = require('../src/checks/secrets-check');

function createTempProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortress-secrets-'));
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

const baseConfig = {
  enabled: true,
  patterns: [],
  allowlist: {},
  weight: 10,
};

describe('secrets-check', () => {
  it('passes when no secrets are present', () => {
    const dir = createTempProject({
      'src/index.js': 'const greeting = "hello world";\nconsole.log(greeting);',
    });
    try {
      const result = secretsCheck.run({ root: dir }, baseConfig);
      assert.equal(result.passed, true);
      assert.equal(result.score, 10);
      assert.equal(result.key, 'secrets');
      assert.equal(result.name, 'Secrets Detection');
    } finally {
      cleanup(dir);
    }
  });

  it('detects AWS access key', () => {
    const dir = createTempProject({
      'src/config.js': 'const key = "AKIAIOSFODNN7EXAMPLE";',
    });
    try {
      const result = secretsCheck.run({ root: dir }, baseConfig);
      assert.equal(result.passed, false);
      assert.equal(result.score, 0);
      assert.ok(result.errors.some(e => e.includes('AWS Access Key ID')));
    } finally {
      cleanup(dir);
    }
  });

  it('detects GitHub personal access token', () => {
    const dir = createTempProject({
      'src/api.js': 'const token = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";',
    });
    try {
      const result = secretsCheck.run({ root: dir }, baseConfig);
      assert.equal(result.passed, false);
      assert.ok(result.errors.some(e => e.includes('GitHub Personal Access Token')));
    } finally {
      cleanup(dir);
    }
  });

  it('detects Stripe secret key', () => {
    const dir = createTempProject({
      'src/billing.js': 'const stripe = require("stripe")("sk_live_abcdefghijklmnopqrstuvwx");',
    });
    try {
      const result = secretsCheck.run({ root: dir }, baseConfig);
      assert.equal(result.passed, false);
      assert.ok(result.errors.some(e => e.includes('Stripe Secret Key')));
    } finally {
      cleanup(dir);
    }
  });

  it('detects hardcoded passwords', () => {
    const dir = createTempProject({
      'src/db.js': 'const password = "SuperSecret123!";\nconst db = connect(password);',
    });
    try {
      const result = secretsCheck.run({ root: dir }, baseConfig);
      assert.equal(result.passed, false);
      assert.ok(result.errors.some(e => e.includes('Hardcoded Password')));
    } finally {
      cleanup(dir);
    }
  });

  it('detects private keys', () => {
    const dir = createTempProject({
      'certs/key.sh': '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAK...\n-----END RSA PRIVATE KEY-----',
    });
    try {
      const result = secretsCheck.run({ root: dir }, baseConfig);
      assert.equal(result.passed, false);
      assert.ok(result.errors.some(e => e.includes('Private Key')));
    } finally {
      cleanup(dir);
    }
  });

  it('detects database connection strings with credentials', () => {
    const dir = createTempProject({
      'src/db.js': 'const uri = "mongodb://admin:password123@db.example.com:27017/mydb";',
    });
    try {
      const result = secretsCheck.run({ root: dir }, baseConfig);
      assert.equal(result.passed, false);
      assert.ok(result.errors.some(e => e.includes('Database Connection String')));
    } finally {
      cleanup(dir);
    }
  });

  it('respects allowlist with wildcard', () => {
    const dir = createTempProject({
      'tests/fixtures/mock.js': 'const key = "AKIAIOSFODNN7EXAMPLE";',
    });
    try {
      const result = secretsCheck.run({ root: dir }, {
        ...baseConfig,
        allowlist: { 'tests/': '*' },
      });
      assert.equal(result.passed, true);
      assert.equal(result.score, 10);
    } finally {
      cleanup(dir);
    }
  });

  it('respects allowlist with specific terms', () => {
    const dir = createTempProject({
      'docs/example.js': 'const key = "AKIAIOSFODNN7EXAMPLE";',
    });
    try {
      const result = secretsCheck.run({ root: dir }, {
        ...baseConfig,
        allowlist: { 'docs/': ['AWS Access Key'] },
      });
      assert.equal(result.passed, true);
    } finally {
      cleanup(dir);
    }
  });

  it('skips lock files', () => {
    const dir = createTempProject({
      'package-lock.json': '{"token": "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12"}',
    });
    try {
      const result = secretsCheck.run({ root: dir }, {
        ...baseConfig,
        extensions: ['.json'],
      });
      assert.equal(result.passed, true);
    } finally {
      cleanup(dir);
    }
  });

  it('skips hidden directories but scans hidden files', () => {
    const dir = createTempProject({
      '.cache/uv/pkg/config.py': 'password = "SuperSecret123!"',
      '.venv/lib/key.py': '-----BEGIN RSA PRIVATE KEY-----',
      '.env': 'API_KEY="sk_live_abcdefghijklmnopqrstuvwx"',
      'src/app.js': 'console.log("clean");',
    });
    try {
      const result = secretsCheck.run({ root: dir }, baseConfig);
      assert.equal(result.passed, false);
      // Should find the .env secret but NOT the ones in .cache/ or .venv/
      assert.ok(result.errors.some(e => e.includes('.env')));
      assert.ok(!result.errors.some(e => e.includes('.cache')));
      assert.ok(!result.errors.some(e => e.includes('.venv')));
    } finally {
      cleanup(dir);
    }
  });

  it('skips node_modules by default', () => {
    const dir = createTempProject({
      'node_modules/pkg/config.js': 'const key = "AKIAIOSFODNN7EXAMPLE";',
      'src/app.js': 'console.log("clean");',
    });
    try {
      const result = secretsCheck.run({ root: dir }, baseConfig);
      assert.equal(result.passed, true);
    } finally {
      cleanup(dir);
    }
  });

  it('caps error output at 30 violations', () => {
    const lines = Array.from({ length: 40 }, (_, i) =>
      `const key${i} = "AKIAIOSFODNN7EXAMPL${String(i).padStart(2, '0')}";`
    ).join('\n');
    const dir = createTempProject({ 'src/keys.js': lines });
    try {
      const result = secretsCheck.run({ root: dir }, baseConfig);
      assert.equal(result.passed, false);
      assert.equal(result.errors.length, 30);
      assert.ok(result.warnings.some(w => w.includes('more secrets found')));
    } finally {
      cleanup(dir);
    }
  });

  it('supports custom patterns', () => {
    const dir = createTempProject({
      'src/config.js': 'const myKey = "MYAPP_KEY_abcdefghijklmnop";',
    });
    try {
      const result = secretsCheck.run({ root: dir }, {
        ...baseConfig,
        patterns: [{ regex: 'MYAPP_KEY_[a-z]{16}', label: 'MyApp Key' }],
      });
      assert.equal(result.passed, false);
      assert.ok(result.errors.some(e => e.includes('MyApp Key')));
    } finally {
      cleanup(dir);
    }
  });

  it('rejects ReDoS-risk custom patterns', () => {
    const dir = createTempProject({
      'src/app.js': 'safe code',
    });
    try {
      const result = secretsCheck.run({ root: dir }, {
        ...baseConfig,
        patterns: [{ regex: '(a+)+', label: 'Bad Pattern' }],
      });
      assert.equal(result.passed, true);
      assert.ok(result.warnings.some(w => w.includes('ReDoS risk')));
    } finally {
      cleanup(dir);
    }
  });

  it('masks secret values in error output', () => {
    const masked = secretsCheck.maskSecret('AKIAIOSFODNN7EXAMPLE');
    assert.equal(masked, 'AKIA***LE');
    assert.equal(secretsCheck.maskSecret('short'), '***');
  });
});
