#!/usr/bin/env node
'use strict';

// Postinstall script for fortress-system
// Creates CLAUDE.md and .claude/settings.local.json on npm install
// Silent failure - never break npm install

try {
  const path = require('path');
  const fs = require('fs');
  const claudeHelpers = require('./claude-helpers');

  // INIT_CWD is set by npm/yarn/pnpm to the directory where npm install was run
  const projectRoot = process.env.INIT_CWD;

  // Skip if no INIT_CWD (global install or unexpected environment)
  if (!projectRoot) {
    process.exit(0);
  }

  // Sanity check - project root should have a package.json
  if (!fs.existsSync(path.join(projectRoot, 'package.json'))) {
    process.exit(0);
  }

  // Don't overwrite if fortress init has already run (CLAUDE.md has real values)
  const claudePath = path.join(projectRoot, 'CLAUDE.md');
  if (fs.existsSync(claudePath)) {
    const content = fs.readFileSync(claudePath, 'utf-8');
    if (content.includes('FORTRESS:START') && !content.includes('not detected')) {
      // Already has real detected values, don't overwrite
      process.exit(0);
    }
  }

  // Create CLAUDE.md with generic placeholders (tells user to run fortress init)
  const genericDetected = {
    framework: 'run `fortress init` to detect',
    language: 'run `fortress init` to detect',
    testFramework: 'run `fortress init` to detect',
    linter: 'run `fortress init` to detect',
  };

  claudeHelpers.updateClaudeMd(projectRoot, genericDetected);
  claudeHelpers.updateClaudeSettings(projectRoot);

  // Welcome banner
  console.log('');
  console.log('  \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510');
  console.log('  \u2502  Fortress System installed!              \u2502');
  console.log('  \u2502  Run: npx fortress init                  \u2502');
  console.log('  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518');
  console.log('');

} catch {
  // Silent failure - never break npm install
  process.exit(0);
}
