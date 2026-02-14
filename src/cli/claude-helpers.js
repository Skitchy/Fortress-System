'use strict';

const fs = require('fs');
const path = require('path');

const { execSync } = require('child_process');

const FORTRESS_START = '<!-- FORTRESS:START -->';
const FORTRESS_END = '<!-- FORTRESS:END -->';
const HOOK_START = '# FORTRESS:START';
const HOOK_END = '# FORTRESS:END';

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

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    // Both markers found in correct order — replace the section
    const before = existing.substring(0, startIdx);
    const after = existing.substring(endIdx + FORTRESS_END.length);
    return before + newSection + after;
  }

  if (startIdx !== -1 && (endIdx === -1 || endIdx <= startIdx)) {
    // Malformed: START found but END missing or before START — replace from START to end of file
    const before = existing.substring(0, startIdx);
    return before.trimEnd() + '\n\n' + newSection + '\n';
  }

  // No existing section — append
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

  // Ensure permissions object exists with allow array
  // Claude Code expects { allow: [...], deny: [...] }, not a flat array
  if (!settings.permissions || typeof settings.permissions !== 'object' || Array.isArray(settings.permissions)) {
    settings.permissions = { allow: [] };
  }
  if (!Array.isArray(settings.permissions.allow)) {
    settings.permissions.allow = [];
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
    'Bash(fortress trend)',
    'Bash(fortress review)',
    'Bash(npx fortress trend)',
    'Bash(npx fortress review)',
  ];

  for (const perm of fortressPerms) {
    if (!settings.permissions.allow.includes(perm)) {
      settings.permissions.allow.push(perm);
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

/**
 * Install or update the git pre-commit hook.
 * - If no .git exists, runs `git init`
 * - If no hook exists, copies our template
 * - If hook exists with our markers, replaces our section
 * - If hook exists without our markers, appends our section
 */
function installGitHook(projectRoot) {
  const gitDir = path.join(projectRoot, '.git');

  // Ensure git is initialized
  if (!fs.existsSync(gitDir)) {
    execSync('git init', { cwd: projectRoot, stdio: 'pipe' });
  }

  const hooksDir = path.join(gitDir, 'hooks');
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  const hookPath = path.join(hooksDir, 'pre-commit');
  const templatePath = path.join(__dirname, '../templates/pre-commit');
  const template = fs.readFileSync(templatePath, 'utf-8');

  // Extract just the fortress section (everything from HOOK_START to HOOK_END inclusive)
  const sectionStart = template.indexOf(HOOK_START);
  const sectionEnd = template.indexOf(HOOK_END) + HOOK_END.length;
  const fortressSection = template.substring(sectionStart, sectionEnd);

  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf-8');
    const isSymlink = fs.lstatSync(hookPath).isSymbolicLink();

    // If it's a symlink, remove it so we don't mutate the target file
    if (isSymlink) {
      fs.unlinkSync(hookPath);
    }

    // Treat empty files the same as no file
    if (!existing.trim()) {
      fs.writeFileSync(hookPath, template);
    } else {
      const existingStart = existing.indexOf(HOOK_START);
      const existingEnd = existing.indexOf(HOOK_END);

      if (existingStart !== -1 && existingEnd !== -1) {
        // Replace existing fortress section
        const before = existing.substring(0, existingStart);
        const after = existing.substring(existingEnd + HOOK_END.length);
        fs.writeFileSync(hookPath, before + fortressSection + after);
      } else {
        // Append our section to existing hook
        fs.writeFileSync(hookPath, existing.trimEnd() + '\n\n' + fortressSection + '\n');
      }
    }
  } else {
    // No hook exists — write the full template (includes shebang)
    fs.writeFileSync(hookPath, template);
  }

  fs.chmodSync(hookPath, 0o755);
}

/**
 * Install agent templates to .claude/agents/ directory.
 * Reads all .md files from src/templates/agents/ and copies them.
 * Returns array of installed filenames for logging.
 */
function installAgents(projectRoot) {
  const claudeDir = path.join(projectRoot, '.claude');
  const agentsDir = path.join(claudeDir, 'agents');
  const templatesDir = path.join(__dirname, '../templates/agents');

  if (!fs.existsSync(templatesDir)) {
    return [];
  }

  if (!fs.existsSync(agentsDir)) {
    fs.mkdirSync(agentsDir, { recursive: true });
  }

  const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    fs.copyFileSync(
      path.join(templatesDir, file),
      path.join(agentsDir, file)
    );
  }

  return files;
}

module.exports = {
  updateClaudeMd,
  updateClaudeSettings,
  installStatusline,
  installGitHook,
  installAgents,
  mergeFortressSection,
};
