'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const detector = require('../../core/detector');
const claudeHelpers = require('../claude-helpers');

const ENABLE_COLORS = process.stdout.isTTY;
const c = {
  reset: ENABLE_COLORS ? '\x1b[0m' : '',
  green: ENABLE_COLORS ? '\x1b[32m' : '',
  yellow: ENABLE_COLORS ? '\x1b[33m' : '',
  blue: ENABLE_COLORS ? '\x1b[34m' : '',
  bold: ENABLE_COLORS ? '\x1b[1m' : '',
  gray: ENABLE_COLORS ? '\x1b[90m' : '',
  cyan: ENABLE_COLORS ? '\x1b[36m' : '',
};

const FRAMEWORKS = [
  { key: '1', value: 'next', label: 'Next.js', desc: 'Full-stack React with SSR/SSG' },
  { key: '2', value: 'react', label: 'React', desc: 'Frontend UI library (SPA)' },
  { key: '3', value: 'vue', label: 'Vue', desc: 'Progressive frontend framework' },
  { key: '4', value: 'nuxt', label: 'Nuxt', desc: 'Full-stack Vue framework' },
  { key: '5', value: 'svelte', label: 'Svelte/SvelteKit', desc: 'Compiled UI framework' },
  { key: '6', value: 'angular', label: 'Angular', desc: 'Enterprise frontend framework' },
  { key: '7', value: 'node', label: 'Node.js', desc: 'Backend API (Express/Fastify/Koa)' },
  { key: '8', value: null, label: 'Other / None', desc: 'Skip or not listed' },
];

const LANGUAGES = [
  { key: '1', value: 'typescript', label: 'TypeScript', desc: 'JavaScript + type safety (recommended)' },
  { key: '2', value: 'javascript', label: 'JavaScript', desc: 'Dynamic, no type annotations' },
];

const TEST_FRAMEWORKS = [
  { key: '1', value: 'vitest', label: 'Vitest', desc: 'Fast, Vite-native test runner' },
  { key: '2', value: 'jest', label: 'Jest', desc: 'Popular, batteries-included' },
  { key: '3', value: 'mocha', label: 'Mocha', desc: 'Flexible, bring-your-own assertions' },
  { key: '4', value: 'node:test', label: 'Node built-in', desc: 'Zero-dependency, built into Node' },
  { key: '5', value: null, label: 'None', desc: 'Skip for now' },
];

const LINTERS = [
  { key: '1', value: 'eslint', label: 'ESLint', desc: 'Industry standard, highly configurable' },
  { key: '2', value: 'biome', label: 'Biome', desc: 'Fast all-in-one linter + formatter' },
  { key: '3', value: null, label: 'None', desc: 'Skip for now' },
];

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function formatDetected(value) {
  if (!value) return `${c.gray}not detected${c.reset}`;
  return `${c.green}${value}${c.reset}`;
}

function pickFromOptions(options, choice, currentValue) {
  if (!choice) return currentValue; // Enter = accept auto-detected
  const picked = options.find((o) => o.key === choice);
  if (picked) return picked.value;
  return currentValue; // invalid input = keep current
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
    case 'node:test': return 'node --test tests/';
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

function generateConfig(detected, originalDetected) {
  const projectRoot = process.cwd();
  const configPath = path.join(projectRoot, 'fortress.config.js');

  const template = fs.readFileSync(
    path.join(__dirname, '../../templates/fortress.config.js'),
    'utf-8'
  );

  // Only enable checks for tools that are actually installed.
  // The user may have selected tools in the wizard that aren't installed yet.
  const orig = originalDetected || detected;
  const tsInstalled = orig.language === 'typescript';
  const linterInstalled = !!orig.linter;
  // node:test is built into Node.js — always available if selected
  const testInstalled = !!orig.testFramework || detected.testFramework === 'node:test';
  const buildAvailable = !!orig.buildCommand;

  const tsCommand = detected.language === 'typescript' ? 'npx tsc --noEmit' : '';
  const lintCommand = getLintCommand(detected);
  const testCommand = getTestCommand(detected);
  const securityCommand = getAuditCommand(detected);
  const buildCommand = detected.buildCommand || '';

  // Track tools the user wants but doesn't have installed yet
  const missing = [];
  if (detected.language === 'typescript' && !tsInstalled) {
    missing.push({ name: 'TypeScript', install: 'npm install --save-dev typescript', then: 'npx tsc --init' });
  }
  if (detected.linter && !linterInstalled) {
    const pkg = detected.linter === 'biome' ? '@biomejs/biome' : 'eslint';
    missing.push({ name: detected.linter, install: `npm install --save-dev ${pkg}` });
  }
  if (detected.testFramework && !testInstalled) {
    if (detected.testFramework !== 'node:test') {
      missing.push({ name: detected.testFramework, install: `npm install --save-dev ${detected.testFramework}` });
    }
  }

  const config = template
    .replace('%TYPESCRIPT_ENABLED%', String(detected.language === 'typescript' && tsInstalled))
    .replace("'%TYPESCRIPT_COMMAND%'", detected.language === 'typescript' ? `'${tsCommand}'` : "''")
    .replace('%LINT_ENABLED%', String(!!detected.linter && linterInstalled))
    .replace("'%LINT_COMMAND%'", detected.linter ? `'${lintCommand}'` : "''")
    .replace('%TEST_ENABLED%', String(!!detected.testFramework && testInstalled))
    .replace("'%TEST_COMMAND%'", detected.testFramework ? `'${testCommand}'` : "''")
    .replace("'%SECURITY_COMMAND%'", `'${securityCommand}'`)
    .replace('%BUILD_ENABLED%', String(buildAvailable))
    .replace("'%BUILD_COMMAND%'", detected.buildCommand ? `'${buildCommand}'` : "''");

  fs.writeFileSync(configPath, config);

  const filesCreated = [`${c.green}${c.bold}Created fortress.config.js${c.reset}`];

  try {
    claudeHelpers.updateClaudeMd(projectRoot, detected);
    claudeHelpers.installStatusline(projectRoot);
    claudeHelpers.updateClaudeSettings(projectRoot, { statusline: true });
    filesCreated.push(`${c.green}${c.bold}Created CLAUDE.md${c.reset}`);
    filesCreated.push(`${c.green}${c.bold}Created .claude/settings.local.json${c.reset}`);
    filesCreated.push(`${c.green}${c.bold}Installed .claude/statusline-fortress.sh${c.reset}`);
    const agents = claudeHelpers.installAgents(projectRoot);
    for (const agent of agents) {
      filesCreated.push(`${c.green}${c.bold}Installed .claude/agents/${agent}${c.reset}`);
    }
  } catch {
    filesCreated.push(`${c.yellow}Claude Code integration skipped${c.reset} ${c.gray}(non-critical)${c.reset}`);
  }

  try {
    claudeHelpers.installGitHook(projectRoot);
    filesCreated.push(`${c.green}${c.bold}Installed .git/hooks/pre-commit${c.reset}`);
  } catch {
    filesCreated.push(`${c.yellow}Git hook installation skipped${c.reset} ${c.gray}(non-critical)${c.reset}`);
  }

  // Ensure fortress-reports/ is in .gitignore to prevent accidental commit of reports
  try {
    const gitignorePath = path.join(projectRoot, '.gitignore');
    let gitignore = '';
    if (fs.existsSync(gitignorePath)) {
      gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    }
    const entries = ['fortress-reports/'];
    const missing_entries = entries.filter(e => !gitignore.split('\n').some(line => line.trim() === e));
    if (missing_entries.length > 0) {
      const addition = (gitignore && !gitignore.endsWith('\n') ? '\n' : '') +
        '\n# Fortress System reports\n' + missing_entries.join('\n') + '\n';
      fs.appendFileSync(gitignorePath, addition);
      filesCreated.push(`${c.green}${c.bold}Updated .gitignore${c.reset} ${c.gray}(added fortress-reports/)${c.reset}`);
    }
  } catch {
    // Non-critical — don't block init
  }

  return { filesCreated, missing };
}

async function runWizard(detected) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // Step 1: Welcome
    console.log(`\n  ${c.bold}${c.blue}Fortress Init${c.reset} ${c.gray}\u2014 Project Setup Wizard${c.reset}`);
    console.log(`  ${c.gray}Let's configure quality checks for your project.${c.reset}\n`);

    // Step 2: Framework
    console.log(`  ${c.bold}What framework are you using?${c.reset}\n`);
    for (const fw of FRAMEWORKS) {
      console.log(`  ${c.gray}[${fw.key}]${c.reset} ${fw.label}  ${c.gray}${fw.desc}${c.reset}`);
    }
    console.log(`\n  Auto-detected: ${formatDetected(detected.framework)}`);
    console.log(`  ${c.gray}Not sure? Pick anything — you can reconfigure later with: fortress init --force${c.reset}`);
    const fwChoice = await ask(rl, `  ${c.bold}Choice [1-8, or Enter to accept]:${c.reset} `);
    detected.framework = pickFromOptions(FRAMEWORKS, fwChoice, detected.framework);
    console.log('');

    // Step 3: Language
    console.log(`  ${c.bold}What language?${c.reset}\n`);
    for (const lang of LANGUAGES) {
      console.log(`  ${c.gray}[${lang.key}]${c.reset} ${lang.label}  ${c.gray}${lang.desc}${c.reset}`);
    }
    console.log(`\n  Auto-detected: ${formatDetected(detected.language)}`);
    const langChoice = await ask(rl, `  ${c.bold}Choice [1-2, or Enter to accept]:${c.reset} `);
    detected.language = pickFromOptions(LANGUAGES, langChoice, detected.language);
    console.log('');

    // Step 4: Test Framework
    console.log(`  ${c.bold}What test framework?${c.reset}\n`);
    for (const tf of TEST_FRAMEWORKS) {
      console.log(`  ${c.gray}[${tf.key}]${c.reset} ${tf.label}  ${c.gray}${tf.desc}${c.reset}`);
    }
    console.log(`\n  Auto-detected: ${formatDetected(detected.testFramework)}`);
    const tfChoice = await ask(rl, `  ${c.bold}Choice [1-5, or Enter to accept]:${c.reset} `);
    detected.testFramework = pickFromOptions(TEST_FRAMEWORKS, tfChoice, detected.testFramework);
    console.log('');

    // Step 5: Linter
    console.log(`  ${c.bold}What linter?${c.reset}\n`);
    for (const lt of LINTERS) {
      console.log(`  ${c.gray}[${lt.key}]${c.reset} ${lt.label}  ${c.gray}${lt.desc}${c.reset}`);
    }
    console.log(`\n  Auto-detected: ${formatDetected(detected.linter)}`);
    const ltChoice = await ask(rl, `  ${c.bold}Choice [1-3, or Enter to accept]:${c.reset} `);
    detected.linter = pickFromOptions(LINTERS, ltChoice, detected.linter);
    console.log('');

    // Step 6: Summary + Confirm
    console.log(`  ${c.bold}Your configuration:${c.reset}\n`);
    console.log(`    Framework:      ${formatDetected(detected.framework)}`);
    console.log(`    Language:       ${formatDetected(detected.language)}`);
    console.log(`    Test Framework: ${formatDetected(detected.testFramework)}`);
    console.log(`    Linter:         ${formatDetected(detected.linter)}`);
    console.log(`    Package Mgr:    ${formatDetected(detected.packageManager)} ${c.gray}(auto-detected)${c.reset}`);
    console.log('');

    const confirm = await ask(rl, `  ${c.bold}Proceed? [Y/n]:${c.reset} `);
    if (confirm.toLowerCase() === 'n') {
      console.log(`\n  ${c.yellow}Aborted.${c.reset}\n`);
      rl.close();
      return null;
    }
    console.log('');

    rl.close();
    return detected;
  } catch {
    rl.close();
    return null;
  }
}

(async () => {
  const projectRoot = process.cwd();
  const configPath = path.join(projectRoot, 'fortress.config.js');
  const args = process.argv.slice(2);
  const skipWizard = args.includes('--yes') || args.includes('-y');
  const force = args.includes('--force');

  // Check for existing config
  if (fs.existsSync(configPath)) {
    console.log(`\n${c.yellow}fortress.config.js already exists.${c.reset}`);
    if (!force) {
      console.log(`Use ${c.bold}fortress init --force${c.reset} to overwrite.\n`);
      process.exit(0);
    }
    console.log(`${c.gray}--force flag detected, overwriting...${c.reset}\n`);
  }

  // Auto-detect project — save original before wizard may modify it
  const detected = detector.detect(projectRoot);
  const originalDetected = { ...detected };

  let finalConfig;

  if (skipWizard || !process.stdin.isTTY) {
    // --yes flag or non-interactive: skip wizard, use auto-detected values
    console.log(`\n${c.bold}${c.blue}Fortress Init${c.reset}`);
    console.log(`${c.gray}Detecting project configuration...${c.reset}\n`);
    console.log(`  Framework:      ${formatDetected(detected.framework)}`);
    console.log(`  Language:       ${formatDetected(detected.language)}`);
    console.log(`  Package Mgr:    ${formatDetected(detected.packageManager)}`);
    console.log(`  Test Framework: ${formatDetected(detected.testFramework)}`);
    console.log(`  Linter:         ${formatDetected(detected.linter)}`);
    console.log(`  Build Command:  ${formatDetected(detected.buildCommand)}`);

    // Check if most things went undetected (empty/new project)
    const detectedCount = [detected.framework, detected.testFramework, detected.linter, detected.buildCommand].filter(Boolean).length;
    if (detectedCount === 0) {
      console.log(`\n  ${c.yellow}${c.bold}Looks like a fresh project!${c.reset}`);
      console.log(`  ${c.gray}That's totally normal — most checks are disabled until you add tooling.${c.reset}`);
      console.log(`\n  ${c.bold}Suggested next steps:${c.reset}`);
      console.log(`  ${c.gray}•${c.reset} Add a test framework: ${c.bold}npm install --save-dev vitest${c.reset} ${c.gray}(or jest, mocha)${c.reset}`);
      console.log(`  ${c.gray}•${c.reset} Add a linter:         ${c.bold}npm install --save-dev eslint${c.reset} ${c.gray}(or biome)${c.reset}`);
      console.log(`  ${c.gray}•${c.reset} Add TypeScript:       ${c.bold}npm install --save-dev typescript${c.reset}`);
      console.log(`  ${c.gray}•${c.reset} Then re-run:          ${c.bold}fortress init --force --yes${c.reset} to pick up the new tools`);
    }

    finalConfig = detected;
  } else {
    // Interactive wizard
    finalConfig = await runWizard(detected);
    if (!finalConfig) {
      process.exit(0);
    }
  }

  // Step 7: Write files
  const { filesCreated, missing } = generateConfig(finalConfig, originalDetected);
  console.log('');
  for (const line of filesCreated) {
    console.log(`  ${line}`);
  }

  // Final guidance — different messaging depending on whether tools are missing
  console.log('');
  console.log(`  ${c.bold}\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550${c.reset}`);

  if (missing.length > 0) {
    console.log(`  ${c.bold}Almost there!${c.reset} Just a few more steps:\n`);

    // Step 1: install commands
    let step = 1;
    console.log(`  ${c.bold}Step ${step}.${c.reset} Copy and paste this into your terminal to`);
    console.log(`         install the tools you selected:\n`);
    const installCmds = missing.map(t => t.install);
    console.log(`         ${c.cyan}${installCmds.join(' && ')}${c.reset}\n`);

    // Step 1b: any follow-up init commands (like npx tsc --init)
    const initCmds = missing.filter(t => t.then);
    if (initCmds.length > 0) {
      step++;
      console.log(`  ${c.bold}Step ${step}.${c.reset} Set up config files for your new tools:\n`);
      for (const tool of initCmds) {
        console.log(`         ${c.cyan}${tool.then}${c.reset}`);
      }
      console.log('');
    }

    // Step N: re-run fortress to pick up the tools
    step++;
    console.log(`  ${c.bold}Step ${step}.${c.reset} Tell Fortress to detect your new tools:\n`);
    console.log(`         ${c.cyan}npx fortress init --force --yes${c.reset}\n`);

    // Step N+1: run fortress quick
    step++;
    console.log(`  ${c.bold}Step ${step}.${c.reset} Verify everything works:\n`);
    console.log(`         ${c.cyan}npx fortress quick${c.reset}`);
  } else {
    console.log(`  ${c.bold}Setup complete!${c.reset}`);
    console.log('');
    console.log(`  Type ${c.bold}claude${c.reset} in this terminal and wait`);
    console.log(`  for the awesomeness!`);
    console.log('');
    console.log(`  Or run: ${c.bold}npx fortress quick${c.reset}`);
  }

  console.log(`  ${c.bold}\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550${c.reset}`);
  console.log('');
})();
