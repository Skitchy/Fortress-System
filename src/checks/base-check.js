'use strict';

/**
 * Create a standardized check result.
 * Every check MUST return this shape.
 *
 * @param {string} name - Display name (e.g., "TypeScript")
 * @param {object} opts
 * @param {string} [opts.key] - Config key (e.g., "typescript"). Defaults to name.toLowerCase()
 */
function createResult(name, { key, passed, errors = [], warnings = [], duration = 0, score = 0 }) {
  return {
    name,
    key: key || name.toLowerCase(),
    passed,
    errors,
    warnings,
    duration,
    score,
  };
}

/**
 * Build a minimal environment for child processes.
 * Only passes variables needed for tool execution — prevents
 * leaking secrets (API keys, tokens) to spawned commands.
 */
function safeEnv() {
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    FORCE_COLOR: '0',
  };
  // Node.js needs these to resolve modules correctly
  if (process.env.NODE_PATH) env.NODE_PATH = process.env.NODE_PATH;
  if (process.env.NODE_OPTIONS) env.NODE_OPTIONS = process.env.NODE_OPTIONS;
  // npm/yarn/pnpm need these for registry access
  if (process.env.npm_config_registry) env.npm_config_registry = process.env.npm_config_registry;
  if (process.env.npm_config_cache) env.npm_config_cache = process.env.npm_config_cache;
  // Windows compatibility
  if (process.env.APPDATA) env.APPDATA = process.env.APPDATA;
  if (process.env.USERPROFILE) env.USERPROFILE = process.env.USERPROFILE;
  if (process.env.SYSTEMROOT) env.SYSTEMROOT = process.env.SYSTEMROOT;
  // CI detection (tools may change behavior in CI)
  if (process.env.CI) env.CI = process.env.CI;
  return env;
}

module.exports = { createResult, safeEnv };
