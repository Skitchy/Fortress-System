'use strict';

const fs = require('fs');
const path = require('path');
const { createResult } = require('./base-check');

// Built-in secret patterns — each has a regex and human-readable label
const BUILT_IN_PATTERNS = [
  // AWS
  { regex: '(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}', label: 'AWS Access Key ID' },
  { regex: 'aws_secret_access_key\\s*=\\s*[A-Za-z0-9/+=]{40}', label: 'AWS Secret Access Key' },

  // GitHub
  { regex: 'ghp_[A-Za-z0-9]{36}', label: 'GitHub Personal Access Token' },
  { regex: 'github_pat_[A-Za-z0-9_]{82}', label: 'GitHub Fine-grained PAT' },
  { regex: 'gho_[A-Za-z0-9]{36}', label: 'GitHub OAuth Token' },
  { regex: 'ghs_[A-Za-z0-9]{36}', label: 'GitHub Server Token' },

  // Stripe
  { regex: 'sk_live_[A-Za-z0-9]{24,}', label: 'Stripe Secret Key' },
  { regex: 'rk_live_[A-Za-z0-9]{24,}', label: 'Stripe Restricted Key' },

  // OpenAI
  { regex: 'sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}', label: 'OpenAI API Key (legacy)' },
  { regex: 'sk-proj-[A-Za-z0-9_-]{20,}', label: 'OpenAI Project API Key' },

  // Slack
  { regex: 'xoxb-[0-9]{10,}-[0-9]{10,}-[A-Za-z0-9]{24}', label: 'Slack Bot Token' },
  { regex: 'xoxp-[0-9]{10,}-[0-9]{10,}-[0-9]{10,}-[a-f0-9]{32}', label: 'Slack User Token' },
  { regex: 'xoxs-[0-9]{10,}-[0-9]{10,}-[0-9]{10,}-[a-f0-9]{32}', label: 'Slack Session Token' },

  // JWT
  { regex: 'eyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}', label: 'JSON Web Token' },

  // Private Keys
  { regex: '-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----', label: 'Private Key' },

  // Generic high-entropy secrets
  { regex: '(?:password|passwd|pwd)\\s*[:=]\\s*["\'][^"\'\\s]{8,}["\']', label: 'Hardcoded Password' },
  { regex: '(?:api_key|apikey|api_secret)\\s*[:=]\\s*["\'][A-Za-z0-9_\\-]{16,}["\']', label: 'Hardcoded API Key' },
  { regex: '(?:secret|token)\\s*[:=]\\s*["\'][A-Za-z0-9_\\-/+=]{20,}["\']', label: 'Hardcoded Secret/Token' },

  // Database connection strings with credentials
  { regex: '(?:mongodb|postgres|mysql|redis)://[^\\s:]+:[^\\s@]+@[^\\s]+', label: 'Database Connection String with Credentials' },
];

const DEFAULT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.yaml', '.yml', '.sh', '.py',
  '.rb', '.go', '.java', '.kt', '.swift', '.rs',
  '.toml', '.ini', '.cfg', '.conf', '.properties',
]);

// Dotfiles have no extension per path.extname(), so match by full name
const DEFAULT_DOTFILES = new Set([
  '.env', '.env.local', '.env.production', '.env.staging',
  '.env.development', '.env.test',
  '.npmrc', '.pypirc',
]);

const DEFAULT_SKIP_DIRS = new Set([
  'node_modules', '.next', '.git', 'dist', 'coverage',
  '.vercel', 'build', '.nuxt', '.output', 'vendor',
]);

const LOCK_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'bun.lockb', 'composer.lock', 'Gemfile.lock',
  'Cargo.lock', 'poetry.lock', 'go.sum',
]);

const MAX_PATTERN_LENGTH = 200;

function run(config, checkConfig) {
  const start = Date.now();
  const errors = [];
  const warnings = [];

  // Compile built-in patterns
  const patterns = BUILT_IN_PATTERNS.map(p => {
    try {
      return { regex: new RegExp(p.regex, 'g'), label: p.label };
    } catch {
      return null;
    }
  }).filter(Boolean);

  // Add user-supplied custom patterns (with ReDoS protection)
  const customPatterns = checkConfig.patterns || [];
  for (const p of customPatterns) {
    try {
      let source, label;
      if (typeof p === 'string') {
        source = p; label = p;
      } else if (p.regex && p.label) {
        source = p.regex; label = p.label;
      } else {
        continue;
      }

      if (source.length > MAX_PATTERN_LENGTH) {
        warnings.push(`Pattern "${label}" exceeds ${MAX_PATTERN_LENGTH} chars — skipped for safety`);
        continue;
      }

      if (isReDoSRisk(source)) {
        warnings.push(`Pattern "${label}" has ReDoS risk (dangerous backtracking) — skipped`);
        continue;
      }

      patterns.push({ regex: new RegExp(source, 'g'), label });
    } catch (err) {
      warnings.push(`Invalid custom pattern "${p.label || p}": ${err.message}`);
    }
  }

  const extensions = new Set(checkConfig.extensions || DEFAULT_EXTENSIONS);
  const skipDirs = new Set(checkConfig.skipDirs || DEFAULT_SKIP_DIRS);
  const allowlist = checkConfig.allowlist || {};

  const files = collectFiles(config.root, extensions, skipDirs);

  for (const filePath of files) {
    const relative = path.relative(config.root, filePath).replace(/\\/g, '/');
    const basename = path.basename(filePath);

    // Skip lock files
    if (LOCK_FILES.has(basename)) continue;

    let content;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of patterns) {
        pattern.regex.lastIndex = 0;
        let match;
        while ((match = pattern.regex.exec(line)) !== null) {
          if (match[0].length === 0) {
            pattern.regex.lastIndex++;
            if (pattern.regex.lastIndex > line.length) break;
            continue;
          }
          if (isAllowlisted(relative, pattern.label, allowlist)) continue;

          // Mask the matched secret for safe display
          const masked = maskSecret(match[0]);
          errors.push(`${relative}:${i + 1} - ${pattern.label} (matched: ${masked})`);
        }
      }
    }
  }

  const passed = errors.length === 0;
  const duration = Date.now() - start;

  return createResult('Secrets Detection', { key: 'secrets',
    passed,
    errors: errors.slice(0, 30),
    warnings: errors.length > 30
      ? [`... and ${errors.length - 30} more secrets found`]
      : warnings,
    duration,
    score: passed ? checkConfig.weight : 0,
  });
}

/**
 * Mask a secret value for safe display — show first 4 and last 2 chars.
 * Strips trailing/leading quotes to avoid doubled-up quotes in output.
 */
function maskSecret(value) {
  // Strip any surrounding quotes that regex patterns may capture
  let cleaned = value.replace(/^["']+|["']+$/g, '');
  if (cleaned.length <= 8) return '***';
  return cleaned.slice(0, 4) + '***' + cleaned.slice(-2);
}

/**
 * Detect regex patterns likely to cause catastrophic backtracking (ReDoS).
 */
function isReDoSRisk(source) {
  // Nested quantifiers: (a+)+, (a*)+, (a+)*, (a+){2,}
  if (/(\([^)]*[+*][^)]*\))[+*{]/.test(source)) return true;

  // Quantified groups with alternation: (a|a)*, (a|b)+ where branches can match same input
  if (/\([^)]*\|[^)]*\)[+*{]/.test(source)) return true;

  // Quantifier applied to a group that itself is quantified: (.+)+, (\w+)+
  if (/\([^)]*[+*}][^)]*\)[+*{]/.test(source)) return true;

  // Back-references with quantifiers: (a+)\1+ (can cause exponential matching)
  if (/\\[1-9][+*{]/.test(source)) return true;

  // Dot-star or dot-plus inside quantified group: (.*)+, (.+)+
  if (/\([^)]*\.\s*[+*][^)]*\)[+*{]/.test(source)) return true;

  // Lookahead/lookbehind with quantifiers: (?=a+)+, (?<=a+)+
  if (/\(\?[=!<][^)]*[+*][^)]*\)[+*{]/.test(source)) return true;

  return false;
}

function isAllowlisted(relativePath, term, allowlist) {
  for (const [pattern, allowed] of Object.entries(allowlist)) {
    if (relativePath.includes(pattern)) {
      if (allowed === '*') return true;
      if (Array.isArray(allowed) && allowed.some(a => term.toLowerCase().includes(a.toLowerCase()))) {
        return true;
      }
    }
  }
  return false;
}

function collectFiles(dir, extensions, skipDirs) {
  const files = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (skipDirs.has(entry.name)) continue;
    if (entry.isSymbolicLink()) continue;
    // Skip hidden directories (caches, tooling state, etc.) but not hidden files (.env)
    if (entry.isDirectory() && entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, extensions, skipDirs));
    } else if (extensions.has(path.extname(entry.name)) || DEFAULT_DOTFILES.has(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

module.exports = { run, BUILT_IN_PATTERNS, maskSecret };
