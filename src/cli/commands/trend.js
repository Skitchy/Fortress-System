'use strict';

const path = require('path');
const configLoader = require('../../core/config-loader');
const { loadReports, getTrend, sparkline, formatDate } = require('../../core/trend');
const { parseFlags, createColors } = require('../helpers');

const flags = parseFlags();
const c = createColors(flags);

const projectRoot = process.cwd();
const config = configLoader.load(projectRoot);

// Parse --limit flag
const args = process.argv.slice(2);
let limit = 10;
const limitIdx = args.indexOf('--limit');
if (limitIdx !== -1 && args[limitIdx + 1]) {
  const parsed = parseInt(args[limitIdx + 1], 10);
  if (!isNaN(parsed) && parsed > 0) limit = parsed;
}

const outputDir = config.report?.outputDir || './fortress-reports/';
const reportDir = path.resolve(projectRoot, outputDir);
const reports = loadReports(reportDir, limit);

if (reports.length === 0) {
  if (flags.isJSON) {
    process.stdout.write(JSON.stringify({ reports: [], trend: 'insufficient', sparkline: '' }, null, 2) + '\n');
  } else {
    console.log(`\n${c.bold}${c.blue}Fortress Trend${c.reset}`);
    console.log(`\n  ${c.yellow}No reports found.${c.reset}`);
    console.log(`  ${c.gray}Run ${c.reset}${c.bold}fortress report${c.reset}${c.gray} to generate your first report.${c.reset}\n`);
  }
  process.exit(0);
}

const trend = getTrend(reports);
const spark = sparkline(reports);

// JSON mode
if (flags.isJSON) {
  const output = {
    reports: reports.map(r => ({
      timestamp: r.timestamp,
      score: r.score,
      deployReady: r.deployReady,
      duration: r.duration,
    })),
    trend,
    sparkline: spark,
  };
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  process.exit(0);
}

// Console mode
console.log(`\n${c.bold}${c.blue}Fortress Trend${c.reset}`);
console.log(`${c.gray}Score history across ${reports.length} report${reports.length === 1 ? '' : 's'}${c.reset}\n`);

// Sparkline
console.log(`  ${c.bold}Sparkline:${c.reset} ${spark}\n`);

// Table header
const dateWidth = 18;
const scoreWidth = 7;
const statusWidth = 12;
console.log(`  ${c.bold}${'Date'.padEnd(dateWidth)}${'Score'.padEnd(scoreWidth)}${'Status'.padEnd(statusWidth)}${c.reset}`);
console.log(`  ${'─'.repeat(dateWidth + scoreWidth + statusWidth)}`);

// Table rows
for (const report of reports) {
  const date = formatDate(report.timestamp).padEnd(dateWidth);
  const scoreColor = report.score >= 95 ? c.green : report.score >= 80 ? c.yellow : c.red;
  const score = `${scoreColor}${String(report.score).padEnd(scoreWidth)}${c.reset}`;
  const status = report.deployReady
    ? `${c.green}deploy ready${c.reset}`
    : `${c.red}not ready${c.reset}`;

  console.log(`  ${date}${score}${status}`);
}

// Trend direction
console.log('');
const trendIcons = {
  improving: `${c.green}↑ Improving${c.reset}`,
  declining: `${c.red}↓ Declining${c.reset}`,
  stable: `${c.yellow}→ Stable${c.reset}`,
  insufficient: `${c.gray}? Not enough data${c.reset}`,
};
console.log(`  ${c.bold}Trend:${c.reset} ${trendIcons[trend]}\n`);

process.exit(0);
