/** @type {import('fortress-system').FortressConfig} */
module.exports = {
  checks: {
    typescript: {
      enabled: %TYPESCRIPT_ENABLED%,
      command: '%TYPESCRIPT_COMMAND%',
      weight: 20,
    },
    lint: {
      enabled: %LINT_ENABLED%,
      command: '%LINT_COMMAND%',
      weight: 15,
    },
    test: {
      enabled: %TEST_ENABLED%,
      command: '%TEST_COMMAND%',
      weight: 25,
    },
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
    security: {
      enabled: true,
      command: '%SECURITY_COMMAND%',
      weight: 10,
    },
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
