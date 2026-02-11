'use strict';

const fs = require('fs');
const path = require('path');
const { createResult } = require('./base-check');

function run(config, checkConfig) {
  const start = Date.now();
  const errors = [];
  const warnings = [];

  const patterns = (checkConfig.patterns || []).map(p => {
    if (typeof p === 'string') return { regex: new RegExp(p, 'gi'), label: p };
    if (p.regex && p.label) return { regex: new RegExp(p.regex, 'gi'), label: p.label };
    return null;
  }).filter(Boolean);

  if (patterns.length === 0) {
    return createResult('Content Guard', { key: 'content',
      passed: true,
      warnings: ['No forbidden patterns configured - content check skipped'],
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
