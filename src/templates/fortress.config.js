/**
 * Fortress System Configuration
 * ─────────────────────────────
 * Each check below can be toggled with `enabled: true/false`.
 * Set `enabled: true` and provide a `command` to activate a check.
 *
 * To re-detect your project and regenerate this file:
 *   npx fortress init --force
 *
 * Docs: https://github.com/skitch/fortress-system
 *
 * @type {import('fortress-system').FortressConfig}
 */
module.exports = {
  checks: {
    // Type checking — requires TypeScript (npm install --save-dev typescript)
    typescript: {
      enabled: %TYPESCRIPT_ENABLED%,
      command: '%TYPESCRIPT_COMMAND%',
      weight: 20,
    },
    // Linting — requires ESLint or Biome (npm install --save-dev eslint)
    lint: {
      enabled: %LINT_ENABLED%,
      command: '%LINT_COMMAND%',
      weight: 15,
    },
    // Tests — requires a test runner (npm install --save-dev vitest)
    test: {
      enabled: %TEST_ENABLED%,
      command: '%TEST_COMMAND%',
      weight: 25,
    },
    // Content scanning — searches for forbidden patterns (TODOs, FIXMEs, etc.)
    content: {
      enabled: false,
      // Define forbidden patterns for your project:
      // patterns: [
      //   { regex: 'TODO\\s*:', label: 'TODO comment' },
      //   { regex: 'FIXME', label: 'FIXME comment' },
      // ],
      // allowlist: { 'tests/': '*' },
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      skipDirs: ['node_modules', '.next', '.git', 'dist', 'coverage', '.vercel'],
      weight: 20,
    },
    // Security audit — runs npm/yarn/pnpm audit
    security: {
      enabled: true,
      command: '%SECURITY_COMMAND%',
      weight: 10,
    },
    // Build verification — checks that the project compiles
    build: {
      enabled: %BUILD_ENABLED%,
      command: '%BUILD_COMMAND%',
      weight: 10,
    },
  },
  scoring: {
    deployThreshold: 95,
  },
  report: {
    outputDir: './fortress-reports/',
  },
};
