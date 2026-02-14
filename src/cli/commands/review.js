'use strict';

const fs = require('fs');
const path = require('path');
const configLoader = require('../../core/config-loader');
const agentRunner = require('../../core/agent-runner');
const { parseFlags, createColors } = require('../helpers');

const flags = parseFlags();
const c = createColors(flags);

const projectRoot = process.cwd();
const config = configLoader.load(projectRoot);

// Check Claude availability
if (!agentRunner.isClaudeAvailable()) {
  if (flags.isJSON) {
    process.stdout.write(JSON.stringify({
      error: 'Claude Code CLI not found',
      available: false,
    }, null, 2) + '\n');
  } else {
    console.log(`\n${c.bold}${c.blue}Fortress Review${c.reset}`);
    console.log(`\n  ${c.yellow}Claude Code CLI not found in PATH.${c.reset}`);
    console.log(`  ${c.gray}Install Claude Code to use agent-powered reviews:${c.reset}`);
    console.log(`  ${c.gray}  https://claude.ai/code${c.reset}\n`);
  }
  process.exit(0);
}

// Check agents are installed
const agents = agentRunner.getAvailableAgents(projectRoot);
const hasSecurityAuditor = agents.includes('security-auditor');
const hasCodeReviewer = agents.includes('code-reviewer');

if (!hasSecurityAuditor && !hasCodeReviewer) {
  if (flags.isJSON) {
    process.stdout.write(JSON.stringify({
      error: 'No agent templates found',
      available: true,
      agents: [],
    }, null, 2) + '\n');
  } else {
    console.log(`\n${c.bold}${c.blue}Fortress Review${c.reset}`);
    console.log(`\n  ${c.yellow}No agent templates found.${c.reset}`);
    console.log(`  ${c.gray}Run ${c.reset}${c.bold}fortress init${c.reset}${c.gray} to install agent templates.${c.reset}\n`);
  }
  process.exit(0);
}

const startTime = Date.now();
const reviewResults = {};

if (!flags.isJSON) {
  console.log(`\n${c.bold}${c.blue}Fortress Review${c.reset}`);
  console.log(`${c.gray}Running AI-powered code analysis...${c.reset}\n`);
}

// Run security auditor
if (hasSecurityAuditor) {
  if (!flags.isJSON) {
    process.stdout.write(`  ${c.gray}[RUNNING]${c.reset} Security Auditor...`);
  }

  const secResult = agentRunner.invokeAgent('security-auditor', projectRoot, {
    prompt: 'Perform a security audit of this project. Focus on exploitable vulnerabilities. Format findings under ## CRITICAL, ## HIGH, ## MEDIUM, ## LOW headings with bullet points.',
  });

  const parsed = agentRunner.parseSecurityReport(secResult.output);
  reviewResults.security = {
    success: secResult.success,
    error: secResult.error || null,
    severities: parsed.severities,
    findings: parsed.findings,
    raw: secResult.output,
  };

  if (!flags.isJSON) {
    const total = Object.values(parsed.severities).reduce((a, b) => a + b, 0);
    if (secResult.success) {
      const icon = parsed.severities.critical > 0 || parsed.severities.high > 0
        ? `${c.red}[DONE]` : `${c.green}[DONE]`;
      console.log(`\r  ${icon}${c.reset} Security Auditor — ${total} finding${total === 1 ? '' : 's'}`);
    } else {
      console.log(`\r  ${c.red}[ERROR]${c.reset} Security Auditor — ${secResult.error}`);
    }
  }
}

// Run code reviewer
if (hasCodeReviewer) {
  if (!flags.isJSON) {
    process.stdout.write(`  ${c.gray}[RUNNING]${c.reset} Code Reviewer...`);
  }

  const reviewResult = agentRunner.invokeAgent('code-reviewer', projectRoot, {
    prompt: 'Review this project for code quality. Categorize issues under ## MUST FIX and ## SHOULD FIX headings with bullet points. End with a verdict: APPROVE, REJECT, or NEEDS CHANGES.',
  });

  const parsed = agentRunner.parseCodeReview(reviewResult.output);
  reviewResults.codeReview = {
    success: reviewResult.success,
    error: reviewResult.error || null,
    verdict: parsed.verdict,
    mustFix: parsed.mustFix,
    shouldFix: parsed.shouldFix,
    raw: reviewResult.output,
  };

  if (!flags.isJSON) {
    if (reviewResult.success) {
      const verdictColor = parsed.verdict === 'approve' ? c.green : c.red;
      console.log(`\r  ${c.green}[DONE]${c.reset} Code Reviewer — verdict: ${verdictColor}${parsed.verdict.toUpperCase()}${c.reset}`);
    } else {
      console.log(`\r  ${c.red}[ERROR]${c.reset} Code Reviewer — ${reviewResult.error}`);
    }
  }
}

const totalDuration = Date.now() - startTime;

// Print summary in console mode
if (!flags.isJSON) {
  console.log('\n' + '─'.repeat(50));

  if (reviewResults.security && reviewResults.security.success) {
    const sev = reviewResults.security.severities;
    console.log(`\n  ${c.bold}Security Findings:${c.reset}`);
    if (sev.critical > 0) console.log(`    ${c.red}CRITICAL: ${sev.critical}${c.reset}`);
    if (sev.high > 0) console.log(`    ${c.red}HIGH: ${sev.high}${c.reset}`);
    if (sev.medium > 0) console.log(`    ${c.yellow}MEDIUM: ${sev.medium}${c.reset}`);
    if (sev.low > 0) console.log(`    ${c.gray}LOW: ${sev.low}${c.reset}`);
    if (sev.critical + sev.high + sev.medium + sev.low === 0) {
      console.log(`    ${c.green}No findings${c.reset}`);
    }

    for (const finding of reviewResults.security.findings.slice(0, 10)) {
      console.log(`    ${c.gray}• ${finding}${c.reset}`);
    }
    if (reviewResults.security.findings.length > 10) {
      console.log(`    ${c.gray}... and ${reviewResults.security.findings.length - 10} more${c.reset}`);
    }
  }

  if (reviewResults.codeReview && reviewResults.codeReview.success) {
    console.log(`\n  ${c.bold}Code Review:${c.reset}`);
    if (reviewResults.codeReview.mustFix.length > 0) {
      console.log(`    ${c.red}MUST FIX (${reviewResults.codeReview.mustFix.length}):${c.reset}`);
      for (const item of reviewResults.codeReview.mustFix.slice(0, 5)) {
        console.log(`      ${c.red}• ${item}${c.reset}`);
      }
    }
    if (reviewResults.codeReview.shouldFix.length > 0) {
      console.log(`    ${c.yellow}SHOULD FIX (${reviewResults.codeReview.shouldFix.length}):${c.reset}`);
      for (const item of reviewResults.codeReview.shouldFix.slice(0, 5)) {
        console.log(`      ${c.yellow}• ${item}${c.reset}`);
      }
    }
    if (reviewResults.codeReview.mustFix.length === 0 && reviewResults.codeReview.shouldFix.length === 0) {
      console.log(`    ${c.green}No issues found${c.reset}`);
    }
  }

  console.log(`\n  ${c.gray}Duration: ${(totalDuration / 1000).toFixed(1)}s${c.reset}`);
}

// Save review report
const report = {
  timestamp: new Date().toISOString(),
  duration: totalDuration,
  ...reviewResults,
};

// JSON mode
if (flags.isJSON) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.exit(0);
}

// Save to file
const outputDir = config.report?.outputDir || './fortress-reports/';
const resolvedDir = path.resolve(projectRoot, outputDir);

try {
  fs.mkdirSync(resolvedDir, { recursive: true });
  const timestamp = report.timestamp.replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
  const filename = `fortress-review-${timestamp}.json`;
  const filePath = path.join(resolvedDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
  console.log(`\n  ${c.gray}Review saved: ${filePath}${c.reset}\n`);
} catch (err) {
  console.error(`\n  ${c.red}Failed to save review:${c.reset} ${err.message}\n`);
}

process.exit(0);
