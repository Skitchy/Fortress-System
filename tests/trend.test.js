'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadReports, getTrend, sparkline, formatDate } = require('../src/core/trend');

function createTempReports(reports) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortress-trend-'));
  for (const report of reports) {
    const timestamp = report.timestamp.replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
    const filename = `fortress-report-${timestamp}.json`;
    fs.writeFileSync(path.join(dir, filename), JSON.stringify(report));
  }
  return dir;
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('trend', () => {
  describe('loadReports', () => {
    it('loads and sorts reports chronologically', () => {
      const dir = createTempReports([
        { timestamp: '2026-01-03T10:00:00.000Z', score: 90, deployReady: false },
        { timestamp: '2026-01-01T10:00:00.000Z', score: 80, deployReady: false },
        { timestamp: '2026-01-02T10:00:00.000Z', score: 85, deployReady: false },
      ]);
      try {
        const reports = loadReports(dir);
        assert.equal(reports.length, 3);
        assert.equal(reports[0].score, 80);
        assert.equal(reports[1].score, 85);
        assert.equal(reports[2].score, 90);
      } finally {
        cleanup(dir);
      }
    });

    it('returns empty array for non-existent directory', () => {
      const reports = loadReports('/tmp/does-not-exist-fortress-xyz');
      assert.deepEqual(reports, []);
    });

    it('respects limit parameter', () => {
      const dir = createTempReports([
        { timestamp: '2026-01-01T10:00:00.000Z', score: 70, deployReady: false },
        { timestamp: '2026-01-02T10:00:00.000Z', score: 80, deployReady: false },
        { timestamp: '2026-01-03T10:00:00.000Z', score: 90, deployReady: false },
        { timestamp: '2026-01-04T10:00:00.000Z', score: 95, deployReady: true },
      ]);
      try {
        const reports = loadReports(dir, 2);
        assert.equal(reports.length, 2);
        // Should return the 2 most recent
        assert.equal(reports[0].score, 90);
        assert.equal(reports[1].score, 95);
      } finally {
        cleanup(dir);
      }
    });

    it('skips malformed JSON files', () => {
      const dir = createTempReports([
        { timestamp: '2026-01-01T10:00:00.000Z', score: 85, deployReady: false },
      ]);
      fs.writeFileSync(path.join(dir, 'fortress-report-bad.json'), 'not valid json');
      try {
        const reports = loadReports(dir);
        assert.equal(reports.length, 1);
        assert.equal(reports[0].score, 85);
      } finally {
        cleanup(dir);
      }
    });

    it('skips files missing required fields', () => {
      const dir = createTempReports([
        { timestamp: '2026-01-01T10:00:00.000Z', score: 85, deployReady: false },
      ]);
      const timestamp = '2026-01-02T10_00_00_000';
      fs.writeFileSync(
        path.join(dir, `fortress-report-${timestamp}.json`),
        JSON.stringify({ someField: 'no score or timestamp' })
      );
      try {
        const reports = loadReports(dir);
        assert.equal(reports.length, 1);
      } finally {
        cleanup(dir);
      }
    });
  });

  describe('getTrend', () => {
    it('returns improving when score increases > 2', () => {
      const trend = getTrend([
        { score: 80 },
        { score: 85 },
        { score: 90 },
      ]);
      assert.equal(trend, 'improving');
    });

    it('returns declining when score decreases > 2', () => {
      const trend = getTrend([
        { score: 90 },
        { score: 85 },
        { score: 80 },
      ]);
      assert.equal(trend, 'declining');
    });

    it('returns stable when score changes <= 2', () => {
      const trend = getTrend([
        { score: 90 },
        { score: 91 },
        { score: 92 },
      ]);
      assert.equal(trend, 'stable');
    });

    it('returns insufficient with fewer than 2 reports', () => {
      assert.equal(getTrend([{ score: 90 }]), 'insufficient');
      assert.equal(getTrend([]), 'insufficient');
    });
  });

  describe('sparkline', () => {
    it('generates sparkline from scores', () => {
      const spark = sparkline([
        { score: 0 },
        { score: 50 },
        { score: 100 },
      ]);
      assert.equal(spark.length, 3);
      assert.equal(spark[0], '▁');
      assert.equal(spark[2], '█');
    });

    it('handles identical scores', () => {
      const spark = sparkline([
        { score: 90 },
        { score: 90 },
        { score: 90 },
      ]);
      assert.equal(spark, '███');
    });

    it('returns empty string for no reports', () => {
      assert.equal(sparkline([]), '');
    });
  });

  describe('formatDate', () => {
    it('formats ISO timestamp to YYYY-MM-DD HH:MM', () => {
      const formatted = formatDate('2026-01-15T14:30:00.000Z');
      assert.equal(formatted, '2026-01-15 14:30');
    });

    it('returns input for invalid timestamps', () => {
      assert.equal(formatDate('not-a-date'), 'not-a-date');
    });
  });
});
