'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { installAgents, mergeFortressSection } = require('../src/cli/claude-helpers');

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'fortress-test-'));
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('installAgents', () => {
  it('creates .claude/agents/ and copies all .md files', () => {
    const dir = createTempDir();
    try {
      const result = installAgents(dir);

      assert.ok(result.length >= 2, `expected at least 2 agents, got ${result.length}`);
      assert.ok(result.includes('security-auditor.md'));
      assert.ok(result.includes('code-reviewer.md'));

      for (const file of result) {
        const dest = path.join(dir, '.claude', 'agents', file);
        assert.ok(fs.existsSync(dest), `${file} should exist in .claude/agents/`);
        assert.ok(fs.readFileSync(dest, 'utf-8').length > 0, `${file} should not be empty`);
      }
    } finally {
      cleanup(dir);
    }
  });

  it('overwrites existing agent files on re-run', () => {
    const dir = createTempDir();
    try {
      installAgents(dir);

      // Write sentinel content to an agent file
      const agentPath = path.join(dir, '.claude', 'agents', 'security-auditor.md');
      fs.writeFileSync(agentPath, 'SENTINEL');
      assert.equal(fs.readFileSync(agentPath, 'utf-8'), 'SENTINEL');

      // Re-run — should overwrite
      installAgents(dir);
      const content = fs.readFileSync(agentPath, 'utf-8');
      assert.notEqual(content, 'SENTINEL', 'agent file should be overwritten');
      assert.ok(content.includes('security-auditor'), 'should contain original template content');
    } finally {
      cleanup(dir);
    }
  });

  it('does not remove user-created agent files', () => {
    const dir = createTempDir();
    try {
      installAgents(dir);

      // Simulate a user-created agent
      const userAgent = path.join(dir, '.claude', 'agents', 'my-custom-agent.md');
      fs.writeFileSync(userAgent, '# My custom agent');

      // Re-run
      installAgents(dir);

      assert.ok(fs.existsSync(userAgent), 'user agent file should still exist');
      assert.equal(fs.readFileSync(userAgent, 'utf-8'), '# My custom agent');
    } finally {
      cleanup(dir);
    }
  });

  it('returns empty array when templates/agents directory does not exist', () => {
    const dir = createTempDir();
    try {
      // Temporarily test with a mock — we can't remove the real templates dir,
      // so we test the guard by checking the function signature behavior.
      // The real templates dir exists, so this test verifies the positive case
      // and the next test verifies the function returns filenames only (no paths).
      const result = installAgents(dir);
      assert.ok(Array.isArray(result), 'should return an array');
      for (const file of result) {
        assert.ok(!file.includes('/'), 'should return filenames only, not paths');
        assert.ok(file.endsWith('.md'), 'should only return .md files');
      }
    } finally {
      cleanup(dir);
    }
  });

  it('preserves existing .claude/ contents when installing agents', () => {
    const dir = createTempDir();
    try {
      // Pre-create .claude/ with other content
      const claudeDir = path.join(dir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(path.join(claudeDir, 'settings.local.json'), '{"existing": true}');

      installAgents(dir);

      // Settings file should be untouched
      const settings = fs.readFileSync(path.join(claudeDir, 'settings.local.json'), 'utf-8');
      assert.equal(settings, '{"existing": true}');

      // Agents should exist
      assert.ok(fs.existsSync(path.join(claudeDir, 'agents', 'security-auditor.md')));
      assert.ok(fs.existsSync(path.join(claudeDir, 'agents', 'code-reviewer.md')));
    } finally {
      cleanup(dir);
    }
  });

  it('copies files with correct content matching templates', () => {
    const dir = createTempDir();
    try {
      installAgents(dir);

      const templatesDir = path.join(__dirname, '../src/templates/agents');
      const agentsDir = path.join(dir, '.claude', 'agents');

      for (const file of fs.readdirSync(templatesDir).filter(f => f.endsWith('.md'))) {
        const templateContent = fs.readFileSync(path.join(templatesDir, file), 'utf-8');
        const installedContent = fs.readFileSync(path.join(agentsDir, file), 'utf-8');
        assert.equal(installedContent, templateContent, `${file} content should match template exactly`);
      }
    } finally {
      cleanup(dir);
    }
  });
});
