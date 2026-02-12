# Fortress System - Quality Mandate

This project uses **Fortress System** for automated quality validation.

## Project Stack
- **Framework:** %FRAMEWORK%
- **Language:** %LANGUAGE%
- **Test Framework:** %TEST_FRAMEWORK%
- **Linter:** %LINTER%

## Available Commands
- `fortress init` - Auto-detect project and generate config
- `fortress quick` - Fast validation (skips slow checks)
- `fortress validate` - Full validation pipeline
- `fortress report` - Full validation with scoring and JSON report
- `fortress deploy` - Validate then generate deploy report

## Quality Mandate
- **Run `fortress quick` before every commit** to catch issues early
- **Run `fortress report` before every deploy** for full scoring
- **Score >= 95 = deploy ready** — do not deploy below this threshold
- Fix all failing checks before committing or deploying
- If a check fails, address the root cause — do not skip or disable checks

## Setup
If the project stack above shows placeholder values, run `fortress init` to detect your project and configure Fortress with accurate settings.
