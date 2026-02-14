'use strict';

const fs = require('fs');
const path = require('path');

const SPARKLINE_CHARS = '▁▂▃▄▅▆▇█';

/**
 * Load fortress report JSON files from a directory, sorted chronologically.
 * @param {string} reportDir - Absolute or relative path to reports directory
 * @param {number} limit - Maximum number of reports to return
 * @returns {Array} Parsed report objects, oldest first
 */
function loadReports(reportDir, limit = 10) {
  const resolvedDir = path.resolve(reportDir);

  if (!fs.existsSync(resolvedDir)) {
    return [];
  }

  let entries;
  try {
    entries = fs.readdirSync(resolvedDir);
  } catch {
    return [];
  }

  const reportFiles = entries
    .filter(f => f.startsWith('fortress-report-') && f.endsWith('.json'))
    .sort(); // Lexicographic sort works because timestamp format is consistent

  // Take the most recent N files
  const selected = reportFiles.slice(-limit);

  const reports = [];
  for (const file of selected) {
    try {
      const content = fs.readFileSync(path.join(resolvedDir, file), 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed.score === 'number' && parsed.timestamp) {
        reports.push({
          timestamp: parsed.timestamp,
          score: parsed.score,
          deployReady: !!parsed.deployReady,
          duration: parsed.duration || 0,
          checks: parsed.checks || [],
          file,
        });
      }
    } catch {
      // Skip malformed files
    }
  }

  return reports;
}

/**
 * Analyze score trend from last 3 reports.
 * @param {Array} reports - Array of report objects (oldest first)
 * @returns {'improving'|'declining'|'stable'|'insufficient'} Trend direction
 */
function getTrend(reports) {
  if (reports.length < 2) return 'insufficient';

  const recent = reports.slice(-3);
  const first = recent[0].score;
  const last = recent[recent.length - 1].score;
  const diff = last - first;

  if (diff > 2) return 'improving';
  if (diff < -2) return 'declining';
  return 'stable';
}

/**
 * Generate an ASCII sparkline from report scores.
 * Uses Unicode block characters to visualize score trend.
 * @param {Array} reports - Array of report objects
 * @returns {string} Sparkline string
 */
function sparkline(reports) {
  if (reports.length === 0) return '';

  const scores = reports.map(r => r.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min;

  return scores.map(score => {
    if (range === 0) return SPARKLINE_CHARS[SPARKLINE_CHARS.length - 1];
    const idx = Math.round(((score - min) / range) * (SPARKLINE_CHARS.length - 1));
    return SPARKLINE_CHARS[idx];
  }).join('');
}

/**
 * Format a timestamp string for display (YYYY-MM-DD HH:MM).
 */
function formatDate(timestamp) {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return timestamp;
    return d.toISOString().slice(0, 16).replace('T', ' ');
  } catch {
    return timestamp;
  }
}

module.exports = { loadReports, getTrend, sparkline, formatDate };
