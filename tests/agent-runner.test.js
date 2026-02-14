'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  getAvailableAgents,
  parseSecurityReport,
  parseCodeReview,
} = require('../src/core/agent-runner');

function createTempProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortress-agents-'));
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

describe('agent-runner', () => {
  describe('getAvailableAgents', () => {
    it('returns agent names from .claude/agents/ directory', () => {
      const dir = createTempProject({
        '.claude/agents/security-auditor.md': '# Security Auditor',
        '.claude/agents/code-reviewer.md': '# Code Reviewer',
      });
      try {
        const agents = getAvailableAgents(dir);
        assert.equal(agents.length, 2);
        assert.ok(agents.includes('security-auditor'));
        assert.ok(agents.includes('code-reviewer'));
      } finally {
        cleanup(dir);
      }
    });

    it('returns empty array when no agents directory exists', () => {
      const dir = createTempProject({ 'src/index.js': '' });
      try {
        const agents = getAvailableAgents(dir);
        assert.deepEqual(agents, []);
      } finally {
        cleanup(dir);
      }
    });

    it('ignores non-markdown files', () => {
      const dir = createTempProject({
        '.claude/agents/security-auditor.md': '# Agent',
        '.claude/agents/notes.txt': 'just notes',
      });
      try {
        const agents = getAvailableAgents(dir);
        assert.equal(agents.length, 1);
        assert.equal(agents[0], 'security-auditor');
      } finally {
        cleanup(dir);
      }
    });
  });

  describe('parseSecurityReport', () => {
    it('parses severity counts and findings from markdown', () => {
      const output = `
# Security Audit Report

## CRITICAL
- **SQL Injection** in user query handler
- **Remote Code Execution** via eval

## HIGH
- **XSS vulnerability** in comment rendering

## MEDIUM
- **Missing rate limiting** on API endpoints

## LOW
- **Information disclosure** in error messages
      `.trim();

      const result = parseSecurityReport(output);
      assert.equal(result.severities.critical, 2);
      assert.equal(result.severities.high, 1);
      assert.equal(result.severities.medium, 1);
      assert.equal(result.severities.low, 1);
      assert.equal(result.findings.length, 5);
      assert.ok(result.findings[0].includes('[CRITICAL]'));
      assert.ok(result.findings[0].includes('SQL Injection'));
    });

    it('handles empty output', () => {
      const result = parseSecurityReport('');
      assert.deepEqual(result.severities, { critical: 0, high: 0, medium: 0, low: 0 });
      assert.deepEqual(result.findings, []);
    });

    it('handles output with no severity sections', () => {
      const result = parseSecurityReport('This is a general report with no structured findings.');
      assert.equal(result.findings.length, 0);
    });
  });

  describe('parseCodeReview', () => {
    it('parses verdict and action items from markdown', () => {
      const output = `
# Code Review

## MUST FIX
- Missing error handling in database connection
- Unsanitized user input in search query

## SHOULD FIX
- Add unit tests for utility functions
- Consider extracting common logic into shared module

Overall verdict: **REJECT**
      `.trim();

      const result = parseCodeReview(output);
      assert.equal(result.verdict, 'reject');
      assert.equal(result.mustFix.length, 2);
      assert.equal(result.shouldFix.length, 2);
      assert.ok(result.mustFix[0].includes('error handling'));
    });

    it('handles approve verdict', () => {
      const output = `
# Code Review

Code looks good overall.

Verdict: **APPROVE**
      `.trim();

      const result = parseCodeReview(output);
      assert.equal(result.verdict, 'approve');
      assert.equal(result.mustFix.length, 0);
      assert.equal(result.shouldFix.length, 0);
    });

    it('handles empty output', () => {
      const result = parseCodeReview('');
      assert.equal(result.verdict, 'unknown');
      assert.deepEqual(result.mustFix, []);
      assert.deepEqual(result.shouldFix, []);
    });
  });
});
