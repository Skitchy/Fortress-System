'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

/**
 * Check if the `claude` CLI is available in PATH.
 */
function isClaudeAvailable() {
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(cmd, ['claude'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * List available agent templates from .claude/agents/ directory.
 * @param {string} projectRoot
 * @returns {string[]} Array of agent names (without .md extension)
 */
function getAvailableAgents(projectRoot) {
  const agentsDir = path.join(projectRoot, '.claude', 'agents');
  if (!fs.existsSync(agentsDir)) return [];

  try {
    return fs.readdirSync(agentsDir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace(/\.md$/, ''));
  } catch {
    return [];
  }
}

/**
 * Invoke a Claude Code agent and capture its output.
 * @param {string} agentName - Agent name (matches .claude/agents/<name>.md)
 * @param {string} projectRoot - Project root directory
 * @param {object} options
 * @param {string} options.prompt - Prompt to send to the agent
 * @param {number} [options.timeout=120000] - Timeout in ms (default 2 minutes)
 * @returns {{output: string, success: boolean, error?: string}}
 */
function invokeAgent(agentName, projectRoot, options = {}) {
  const { prompt = 'Review this project', timeout = 120000 } = options;

  try {
    const output = execFileSync('claude', [
      '--print',
      '--agent', agentName,
      '-p', prompt,
    ], {
      cwd: projectRoot,
      timeout,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    return { output: output.trim(), success: true };
  } catch (err) {
    if (err.killed) {
      return { output: '', success: false, error: `Agent "${agentName}" timed out after ${timeout / 1000}s` };
    }
    return {
      output: err.stdout ? err.stdout.toString().trim() : '',
      success: false,
      error: err.message,
    };
  }
}

/**
 * Parse a security audit report output for severity counts and finding titles.
 * Expects markdown with headings like "## CRITICAL", "## HIGH", etc.
 * @param {string} output - Raw agent output
 * @returns {{severities: object, findings: string[]}}
 */
function parseSecurityReport(output) {
  const severities = { critical: 0, high: 0, medium: 0, low: 0 };
  const findings = [];

  if (!output) return { severities, findings };

  const lines = output.split('\n');
  let currentSeverity = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect severity headings
    const severityMatch = trimmed.match(/^#{1,3}\s*(CRITICAL|HIGH|MEDIUM|LOW)/i);
    if (severityMatch) {
      currentSeverity = severityMatch[1].toLowerCase();
      continue;
    }

    // Count findings (list items under severity headings)
    if (currentSeverity && /^[-*]\s+/.test(trimmed)) {
      const title = trimmed.replace(/^[-*]\s+/, '').replace(/\*\*/g, '');
      if (title.length > 0) {
        severities[currentSeverity]++;
        findings.push(`[${currentSeverity.toUpperCase()}] ${title}`);
      }
    }

    // Reset severity context on new non-severity heading
    if (/^#{1,3}\s+/.test(trimmed) && !severityMatch) {
      currentSeverity = null;
    }
  }

  return { severities, findings };
}

/**
 * Parse a code review report for verdict and action items.
 * Expects markdown with "MUST FIX" and "SHOULD FIX" sections.
 * @param {string} output - Raw agent output
 * @returns {{verdict: string, mustFix: string[], shouldFix: string[]}}
 */
function parseCodeReview(output) {
  const mustFix = [];
  const shouldFix = [];
  let verdict = 'unknown';

  if (!output) return { verdict, mustFix, shouldFix };

  const lines = output.split('\n');
  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect verdict
    const verdictMatch = trimmed.match(/(?:verdict|overall)[:\s]*\**(APPROVE|REJECT|NEEDS\s*CHANGES|REQUEST\s*CHANGES)\**/i);
    if (verdictMatch) {
      verdict = verdictMatch[1].toLowerCase().replace(/\s+/g, '_');
    }

    // Detect section headings
    if (/MUST\s*FIX/i.test(trimmed) && /^#{1,3}\s+/.test(trimmed)) {
      currentSection = 'must';
      continue;
    }
    if (/SHOULD\s*FIX/i.test(trimmed) && /^#{1,3}\s+/.test(trimmed)) {
      currentSection = 'should';
      continue;
    }
    // New heading resets section
    if (/^#{1,3}\s+/.test(trimmed) && !/MUST|SHOULD/i.test(trimmed)) {
      currentSection = null;
    }

    // Collect items
    if (currentSection && /^[-*]\s+/.test(trimmed)) {
      const item = trimmed.replace(/^[-*]\s+/, '').replace(/\*\*/g, '');
      if (item.length > 0) {
        if (currentSection === 'must') mustFix.push(item);
        else shouldFix.push(item);
      }
    }
  }

  return { verdict, mustFix, shouldFix };
}

module.exports = {
  isClaudeAvailable,
  getAvailableAgents,
  invokeAgent,
  parseSecurityReport,
  parseCodeReview,
};
