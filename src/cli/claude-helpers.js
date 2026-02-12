'use strict';

const fs = require('fs');
const path = require('path');

const FORTRESS_START = '<!-- FORTRESS:START -->';
const FORTRESS_END = '<!-- FORTRESS:END -->';

/**
 * Create or update CLAUDE.md with detected project info.
 * Preserves any user content outside the fortress section.
 */
function updateClaudeMd(projectRoot, detected) {
  const claudePath = path.join(projectRoot, 'CLAUDE.md');
  const templatePath = path.join(__dirname, '../templates/CLAUDE.md');

  const template = fs.readFileSync(templatePath, 'utf-8');

  const filled = template
    .replace('%FRAMEWORK%', detected.framework || 'not detected')
    .replace('%LANGUAGE%', detected.language || 'not detected')
    .replace('%TEST_FRAMEWORK%', detected.testFramework || 'not detected')
    .replace('%LINTER%', detected.linter || 'not detected');

  const section = `${FORTRESS_START}\n${filled}\n${FORTRESS_END}`;

  if (fs.existsSync(claudePath)) {
    const existing = fs.readFileSync(claudePath, 'utf-8');
    const merged = mergeFortressSection(existing, section);
    fs.writeFileSync(claudePath, merged);
  } else {
    fs.writeFileSync(claudePath, section + '\n');
  }
}

/**
 * Smart merge: replace fortress section, preserve everything else.
 */
function mergeFortressSection(existing, newSection) {
  const startIdx = existing.indexOf(FORTRESS_START);
  const endIdx = existing.indexOf(FORTRESS_END);

  if (startIdx !== -1 && endIdx !== -1) {
    const before = existing.substring(0, startIdx);
    const after = existing.substring(endIdx + FORTRESS_END.length);
    return before + newSection + after;
  }

  // No existing section - append
  return existing.trimEnd() + '\n\n' + newSection + '\n';
}

/**
 * Create or merge .claude/settings.local.json with fortress permissions.
 */
function updateClaudeSettings(projectRoot, options = {}) {
  const claudeDir = path.join(projectRoot, '.claude');
  const settingsPath = path.join(claudeDir, 'settings.local.json');

  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch {
      settings = {};
    }
  }

  // Ensure permissions array exists
  if (!Array.isArray(settings.permissions)) {
    settings.permissions = [];
  }

  // Fortress commands to allow
  const fortressPerms = [
    'Bash(fortress quick)',
    'Bash(fortress validate)',
    'Bash(fortress report)',
    'Bash(fortress deploy)',
    'Bash(npx fortress quick)',
    'Bash(npx fortress validate)',
    'Bash(npx fortress report)',
    'Bash(npx fortress deploy)',
  ];

  for (const perm of fortressPerms) {
    if (!settings.permissions.includes(perm)) {
      settings.permissions.push(perm);
    }
  }

  // Add statusline if script is installed
  if (options.statusline) {
    settings.statusline = {
      command: 'bash .claude/statusline-fortress.sh',
    };
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

/**
 * Copy statusline script to .claude/ directory.
 */
function installStatusline(projectRoot) {
  const claudeDir = path.join(projectRoot, '.claude');
  const destPath = path.join(claudeDir, 'statusline-fortress.sh');
  const srcPath = path.join(__dirname, '../templates/statusline-fortress.sh');

  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  fs.copyFileSync(srcPath, destPath);
  // Make executable
  fs.chmodSync(destPath, 0o755);
}

module.exports = {
  updateClaudeMd,
  updateClaudeSettings,
  installStatusline,
  mergeFortressSection,
};
