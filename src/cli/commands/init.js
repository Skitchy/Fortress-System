'use strict';

const fs = require('fs');
const path = require('path');
const detector = require('../../core/detector');

const ENABLE_COLORS = process.stdout.isTTY;
const c = {
  reset: ENABLE_COLORS ? '\x1b[0m' : '',
  green: ENABLE_COLORS ? '\x1b[32m' : '',
  yellow: ENABLE_COLORS ? '\x1b[33m' : '',
  blue: ENABLE_COLORS ? '\x1b[34m' : '',
  bold: ENABLE_COLORS ? '\x1b[1m' : '',
  gray: ENABLE_COLORS ? '\x1b[90m' : '',
};

const projectRoot = process.cwd();
const configPath = path.join(projectRoot, 'fortress.config.js');

// Check for existing config
if (fs.existsSync(configPath)) {
  console.log(`\n${c.yellow}fortress.config.js already exists.${c.reset}`);
  const args = process.argv.slice(2);
  if (!args.includes('--force')) {
    console.log(`Use ${c.bold}fortress init --force${c.reset} to overwrite.\n`);
    process.exit(0);
  }
  console.log(`${c.gray}--force flag detected, overwriting...${c.reset}\n`);
}

// Detect project
console.log(`\n${c.bold}${c.blue}Fortress Init${c.reset}`);
console.log(`${c.gray}Detecting project configuration...${c.reset}\n`);

const detected = detector.detect(projectRoot);

// Print detection results
console.log(`  Framework:      ${formatDetected(detected.framework)}`);
console.log(`  Language:       ${formatDetected(detected.language)}`);
console.log(`  Package Mgr:    ${formatDetected(detected.packageManager)}`);
console.log(`  Test Framework: ${formatDetected(detected.testFramework)}`);
console.log(`  Linter:         ${formatDetected(detected.linter)}`);
console.log(`  Build Command:  ${formatDetected(detected.buildCommand)}`);

// Generate config
const template = fs.readFileSync(
  path.join(__dirname, '../../templates/fortress.config.js'),
  'utf-8'
);

const tsCommand = detected.language === 'typescript' ? 'npx tsc --noEmit' : '';
const lintCommand = getLintCommand(detected);
const testCommand = getTestCommand(detected);

const securityCommand = getAuditCommand(detected);
const buildCommand = detected.buildCommand || '';

const config = template
  .replace('%TYPESCRIPT_ENABLED%', String(detected.language === 'typescript'))
  .replace("'%TYPESCRIPT_COMMAND%'", detected.language === 'typescript' ? `'${tsCommand}'` : "''")
  .replace('%LINT_ENABLED%', String(!!detected.linter))
  .replace("'%LINT_COMMAND%'", detected.linter ? `'${lintCommand}'` : "''")
  .replace('%TEST_ENABLED%', String(!!detected.testFramework))
  .replace("'%TEST_COMMAND%'", detected.testFramework ? `'${testCommand}'` : "''")
  .replace("'%SECURITY_COMMAND%'", `'${securityCommand}'`)
  .replace('%BUILD_ENABLED%', String(!!detected.buildCommand))
  .replace("'%BUILD_COMMAND%'", detected.buildCommand ? `'${buildCommand}'` : "''");

fs.writeFileSync(configPath, config);

console.log(`\n${c.green}${c.bold}Created fortress.config.js${c.reset}`);
console.log(`${c.gray}Edit this file to customize checks, weights, and content patterns.${c.reset}`);
console.log(`\n${c.bold}Next steps:${c.reset}`);
console.log(`  ${c.gray}1.${c.reset} Review fortress.config.js`);
console.log(`  ${c.gray}2.${c.reset} Run ${c.bold}fortress quick${c.reset} to validate your project\n`);

function formatDetected(value) {
  if (!value) return `${c.gray}not detected${c.reset}`;
  return `${c.green}${value}${c.reset}`;
}

function getLintCommand(det) {
  switch (det.linter) {
    case 'next': return 'npx next lint';
    case 'biome': return 'npx biome check .';
    case 'eslint': return 'npx eslint .';
    default: return '';
  }
}

function getTestCommand(det) {
  switch (det.testFramework) {
    case 'vitest': return 'npx vitest run';
    case 'jest': return 'npx jest --passWithNoTests';
    case 'mocha': return 'npx mocha';
    case 'node:test': return 'node --test';
    default: return '';
  }
}

function getAuditCommand(det) {
  switch (det.packageManager) {
    case 'pnpm': return 'pnpm audit --production';
    case 'yarn': return 'yarn audit --production';
    case 'bun': return 'bun audit';
    default: return 'npm audit --production';
  }
}
