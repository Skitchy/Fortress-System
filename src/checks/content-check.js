'use strict';

const fs = require('fs');
const path = require('path');
const { createResult } = require('./base-check');

function run(config, checkConfig) {
  const start = Date.now();
  const errors = [];
  const warnings = [];

  const MAX_PATTERN_LENGTH = 200;
  const patterns = (checkConfig.patterns || []).map(p => {
    try {
      let source, label;
      if (typeof p === 'string') {
        source = p; label = p;
      } else if (p.regex && p.label) {
        source = p.regex; label = p.label;
      } else {
        return null;
      }

      // Reject excessively long patterns (ReDoS risk)
      if (source.length > MAX_PATTERN_LENGTH) {
        warnings.push(`Pattern "${label}" exceeds ${MAX_PATTERN_LENGTH} chars — skipped for safety`);
        return null;
      }

      // Reject patterns likely to cause ReDoS (catastrophic backtracking)
      if (isReDoSRisk(source)) {
        warnings.push(`Pattern "${label}" has ReDoS risk (dangerous backtracking) — skipped`);
        return null;
      }

      return { regex: new RegExp(source, 'gi'), label };
    } catch (err) {
      warnings.push(`Invalid regex pattern "${p.label || p}": ${err.message}`);
      return null;
    }
  }).filter(Boolean);

  if (patterns.length === 0) {
    // Preserve any security warnings from pattern validation above
    if (warnings.length === 0) {
      warnings.push('No forbidden patterns configured - content check skipped');
    }
    return createResult('Content Guard', { key: 'content',
      passed: true,
      warnings,
      duration: Date.now() - start,
      score: checkConfig.weight,
    });
  }

  const extensions = new Set(checkConfig.extensions || ['.ts', '.tsx', '.js', '.jsx']);
  const skipDirs = new Set(checkConfig.skipDirs || ['node_modules', '.next', '.git', 'dist', 'coverage']);
  const allowlist = checkConfig.allowlist || {};

  const files = collectFiles(config.root, extensions, skipDirs);

  for (const filePath of files) {
    const relative = path.relative(config.root, filePath).replace(/\\/g, '/');
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
          // Prevent infinite loop on empty-string matches (e.g., /.*/ with global flag)
          if (match[0].length === 0) {
            pattern.regex.lastIndex++;
            if (pattern.regex.lastIndex > line.length) break;
            continue;
          }
          if (isAllowlisted(relative, pattern.label, allowlist)) continue;
          errors.push(`${relative}:${i + 1}:${match.index + 1} - "${pattern.label}" (matched: "${match[0]}")`);
        }
      }
    }
  }

  const passed = errors.length === 0;
  const duration = Date.now() - start;

  return createResult('Content Guard', { key: 'content',
    passed,
    errors: errors.slice(0, 30),
    warnings: errors.length > 30 ? [`... and ${errors.length - 30} more violations`] : warnings,
    duration,
    score: passed ? checkConfig.weight : 0,
  });
}

/**
 * Detect regex patterns likely to cause catastrophic backtracking (ReDoS).
 * Catches: nested quantifiers (a+)+, quantified alternation (a|a)*, overlapping groups.
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
    // Skip symlinks to prevent traversal outside the project root
    if (entry.isSymbolicLink()) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, extensions, skipDirs));
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

module.exports = { run };
