#!/usr/bin/env bash
# Runs tests layer by layer, prints failures, exits 0 only if all pass.
# Usage: ./scripts/test_recursive.sh [--e2e]

set -euo pipefail

E2E_FLAG=""
if [[ "${1:-}" == "--e2e" ]]; then
  E2E_FLAG="--e2e"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "LAYER 1: Unit tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pytest tests/unit/ -v --tb=short
UNIT_EXIT=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "LAYER 2: Integration tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pytest tests/integration/ -v --tb=short
INTEG_EXIT=$?

if [[ -n "$E2E_FLAG" ]]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "LAYER 3: E2E tests (live stack)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  pytest tests/e2e/ -v --tb=short $E2E_FLAG
  E2E_EXIT=$?
else
  echo ""
  echo "Skipping E2E (pass --e2e to run against live stack)"
  E2E_EXIT=0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Unit:        $([ $UNIT_EXIT -eq 0 ] && echo PASS || echo FAIL)"
echo "Integration: $([ $INTEG_EXIT -eq 0 ] && echo PASS || echo FAIL)"
echo "E2E:         $([ $E2E_EXIT -eq 0 ] && echo PASS || echo FAIL)"

exit $(( UNIT_EXIT || INTEG_EXIT || E2E_EXIT ))
