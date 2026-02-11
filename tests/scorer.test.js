'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calculate } = require('../src/core/scorer');

describe('scorer', () => {
  it('calculates perfect score when all 4 checks pass', () => {
    const results = [
      { key: 'typescript', name: 'TypeScript', passed: true, score: 20, errors: [], warnings: [], duration: 100 },
      { key: 'lint', name: 'Lint', passed: true, score: 15, errors: [], warnings: [], duration: 50 },
      { key: 'test', name: 'Tests', passed: true, score: 25, errors: [], warnings: [], duration: 200 },
      { key: 'content', name: 'Content Guard', passed: true, score: 20, errors: [], warnings: [], duration: 10 },
    ];
    const config = {
      checks: {
        typescript: { enabled: true, weight: 20 },
        lint: { enabled: true, weight: 15 },
        test: { enabled: true, weight: 25 },
        content: { enabled: true, weight: 20 },
      },
      scoring: { deployThreshold: 95 },
    };
    const result = calculate(results, config);
    assert.equal(result.score, 100);
    assert.equal(result.deployReady, true);
  });

  it('calculates perfect score with all 6 checks', () => {
    const results = [
      { key: 'typescript', name: 'TypeScript', passed: true, score: 20, errors: [], warnings: [], duration: 100 },
      { key: 'lint', name: 'Lint', passed: true, score: 15, errors: [], warnings: [], duration: 50 },
      { key: 'test', name: 'Tests', passed: true, score: 25, errors: [], warnings: [], duration: 200 },
      { key: 'content', name: 'Content Guard', passed: true, score: 20, errors: [], warnings: [], duration: 10 },
      { key: 'security', name: 'Security', passed: true, score: 10, errors: [], warnings: [], duration: 30 },
      { key: 'build', name: 'Build', passed: true, score: 10, errors: [], warnings: [], duration: 500 },
    ];
    const config = {
      checks: {
        typescript: { enabled: true, weight: 20 },
        lint: { enabled: true, weight: 15 },
        test: { enabled: true, weight: 25 },
        content: { enabled: true, weight: 20 },
        security: { enabled: true, weight: 10 },
        build: { enabled: true, weight: 10 },
      },
      scoring: { deployThreshold: 95 },
    };
    const result = calculate(results, config);
    assert.equal(result.score, 100);
    assert.equal(result.rawScore, 100);
    assert.equal(result.totalWeight, 100);
    assert.equal(result.deployReady, true);
  });

  it('normalizes score when some checks disabled (adaptive scoring)', () => {
    // Only TS(20) and Test(25) enabled, both pass = 100
    const results = [
      { key: 'typescript', name: 'TypeScript', passed: true, score: 20, errors: [], warnings: [], duration: 100 },
      { key: 'lint', name: 'Lint', passed: true, score: 0, errors: [], warnings: ['disabled'], duration: 0 },
      { key: 'test', name: 'Tests', passed: true, score: 25, errors: [], warnings: [], duration: 200 },
      { key: 'content', name: 'Content Guard', passed: true, score: 0, errors: [], warnings: ['disabled'], duration: 0 },
      { key: 'security', name: 'Security', passed: true, score: 0, errors: [], warnings: ['disabled'], duration: 0 },
      { key: 'build', name: 'Build', passed: true, score: 0, errors: [], warnings: ['disabled'], duration: 0 },
    ];
    const config = {
      checks: {
        typescript: { enabled: true, weight: 20 },
        lint: { enabled: false, weight: 15 },
        test: { enabled: true, weight: 25 },
        content: { enabled: false, weight: 20 },
        security: { enabled: false, weight: 10 },
        build: { enabled: false, weight: 10 },
      },
      scoring: { deployThreshold: 95 },
    };
    const result = calculate(results, config);
    // rawScore = 45, totalWeight = 45, normalized = 100
    assert.equal(result.score, 100);
    assert.equal(result.deployReady, true);
  });

  it('scores 0 when a check fails completely', () => {
    const results = [
      { key: 'typescript', name: 'TypeScript', passed: false, score: 0, errors: ['error'], warnings: [], duration: 100 },
      { key: 'lint', name: 'Lint', passed: true, score: 15, errors: [], warnings: [], duration: 50 },
      { key: 'test', name: 'Tests', passed: true, score: 25, errors: [], warnings: [], duration: 200 },
      { key: 'content', name: 'Content Guard', passed: true, score: 20, errors: [], warnings: [], duration: 10 },
      { key: 'security', name: 'Security', passed: true, score: 10, errors: [], warnings: [], duration: 30 },
      { key: 'build', name: 'Build', passed: true, score: 10, errors: [], warnings: [], duration: 500 },
    ];
    const config = {
      checks: {
        typescript: { enabled: true, weight: 20 },
        lint: { enabled: true, weight: 15 },
        test: { enabled: true, weight: 25 },
        content: { enabled: true, weight: 20 },
        security: { enabled: true, weight: 10 },
        build: { enabled: true, weight: 10 },
      },
      scoring: { deployThreshold: 95 },
    };
    const result = calculate(results, config);
    // rawScore = 80, totalWeight = 100, normalized = 80
    assert.equal(result.score, 80);
    assert.equal(result.deployReady, false);
  });

  it('handles partial test scores (proportional)', () => {
    const results = [
      { key: 'typescript', name: 'TypeScript', passed: true, score: 20, errors: [], warnings: [], duration: 100 },
      { key: 'lint', name: 'Lint', passed: true, score: 15, errors: [], warnings: [], duration: 50 },
      { key: 'test', name: 'Tests', passed: false, score: 13, errors: ['3 failed'], warnings: [], duration: 200 },
      { key: 'content', name: 'Content Guard', passed: true, score: 20, errors: [], warnings: [], duration: 10 },
      { key: 'security', name: 'Security', passed: true, score: 5, errors: [], warnings: [], duration: 30 },
      { key: 'build', name: 'Build', passed: true, score: 10, errors: [], warnings: [], duration: 500 },
    ];
    const config = {
      checks: {
        typescript: { enabled: true, weight: 20 },
        lint: { enabled: true, weight: 15 },
        test: { enabled: true, weight: 25 },
        content: { enabled: true, weight: 20 },
        security: { enabled: true, weight: 10 },
        build: { enabled: true, weight: 10 },
      },
      scoring: { deployThreshold: 95 },
    };
    const result = calculate(results, config);
    // rawScore = 83, totalWeight = 100
    assert.equal(result.score, 83);
    assert.equal(result.deployReady, false);
  });

  it('returns 100 when no checks are enabled', () => {
    const results = [];
    const config = {
      checks: {
        typescript: { enabled: false, weight: 20 },
      },
      scoring: { deployThreshold: 95 },
    };
    const result = calculate(results, config);
    assert.equal(result.score, 100);
  });
});
