'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ENABLE_COLORS = process.stdout.isTTY;
const c = {
  reset: ENABLE_COLORS ? '\x1b[0m' : '',
  green: ENABLE_COLORS ? '\x1b[32m' : '',
  yellow: ENABLE_COLORS ? '\x1b[33m' : '',
  blue: ENABLE_COLORS ? '\x1b[34m' : '',
  bold: ENABLE_COLORS ? '\x1b[1m' : '',
  gray: ENABLE_COLORS ? '\x1b[90m' : '',
  red: ENABLE_COLORS ? '\x1b[31m' : '',
};

function detectPackageManager(projectRoot) {
  if (fs.existsSync(path.join(projectRoot, 'bun.lockb'))) return 'bun';
  if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

function getInstallCommand(pm, pkg) {
  switch (pm) {
    case 'bun': return `bun add ${pkg}`;
    case 'pnpm': return `pnpm add ${pkg}`;
    case 'yarn': return `yarn add ${pkg}`;
    default: return `npm install ${pkg}`;
  }
}

function getInitCommand(pm) {
  switch (pm) {
    case 'bun': return 'bun init -y';
    case 'pnpm': return 'npm init -y'; // pnpm uses npm init
    default: return 'npm init -y';
  }
}

(async () => {
  const projectRoot = process.cwd();

  console.log(`\n  ${c.bold}${c.blue}Fortress Setup${c.reset}`);
  console.log(`  ${c.gray}Setting up your project...${c.reset}\n`);

  const pm = detectPackageManager(projectRoot);

  // Step 1: Ensure package.json exists
  const pkgPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    console.log(`  ${c.green}[1/3]${c.reset} package.json already exists`);
  } else {
    console.log(`  ${c.bold}[1/3]${c.reset} Initializing package.json...`);
    try {
      execSync(getInitCommand(pm), { cwd: projectRoot, stdio: 'pipe' });
      console.log(`  ${c.green}       Created package.json${c.reset}`);
    } catch (err) {
      console.error(`\n  ${c.red}Failed to initialize package.json${c.reset}`);
      console.error(`  ${c.gray}${err.message}${c.reset}\n`);
      process.exit(1);
    }
  }

  // Step 2: Install fortress-system
  // --local flag: install from a local path (for development/testing)
  const args = process.argv.slice(2);
  const localFlag = args.find((a) => a.startsWith('--local'));
  let localPath = null;
  if (localFlag) {
    if (localFlag.includes('=')) {
      localPath = localFlag.split('=')[1];
    } else {
      // Default: resolve relative to this file's package root
      localPath = path.resolve(__dirname, '..', '..', '..');
    }
  }

  const fortressInstalled = (() => {
    try {
      const nmPath = path.join(projectRoot, 'node_modules', 'fortress-system');
      return fs.existsSync(nmPath);
    } catch {
      return false;
    }
  })();

  if (fortressInstalled) {
    console.log(`  ${c.green}[2/3]${c.reset} fortress-system already installed`);
  } else {
    const pkg = localPath || 'fortress-system';
    const label = localPath ? `fortress-system from ${pkg}` : 'fortress-system';
    console.log(`  ${c.bold}[2/3]${c.reset} Installing ${label}...`);
    try {
      const installCmd = getInstallCommand(pm, pkg);
      execSync(installCmd, { cwd: projectRoot, stdio: 'inherit' });
      console.log(`  ${c.green}       Installed successfully${c.reset}`);
    } catch (err) {
      console.error(`\n  ${c.red}Failed to install fortress-system${c.reset}`);
      console.error(`  ${c.gray}${err.message}${c.reset}\n`);
      process.exit(1);
    }
  }

  // Step 3: Launch init wizard
  console.log(`  ${c.bold}[3/3]${c.reset} Launching setup wizard...\n`);

  // Resolve init.js — prefer the installed copy so it matches the installed version,
  // but fall back to the local copy (useful during development).
  let initPath;
  try {
    initPath = require.resolve('fortress-system/src/cli/commands/init.js', {
      paths: [projectRoot],
    });
  } catch {
    // Fallback for development: use the copy adjacent to this file
    initPath = path.join(__dirname, 'init.js');
  }

  try {
    execSync(`node "${initPath}" ${process.argv.slice(3).join(' ')}`, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: process.env,
    });
  } catch {
    // init.js handles its own errors and output; a non-zero exit just means
    // the user aborted or something went wrong inside the wizard.
    process.exit(1);
  }
})();
