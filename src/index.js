'use strict';

const detector = require('./core/detector');
const configLoader = require('./core/config-loader');
const runner = require('./core/runner');
const scorer = require('./core/scorer');
const reporter = require('./core/reporter');

module.exports = {
  detect: detector.detect,
  loadConfig: configLoader.load,
  runChecks: runner.run,
  calculateScore: scorer.calculate,
  generateReport: reporter.generateReport,
  saveReport: reporter.saveReport,
};
