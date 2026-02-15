#!/usr/bin/env bash
# Test the Worker with an email fixture
# Usage: ./scripts/test-fixture.sh [fixture-name]
# Example: ./scripts/test-fixture.sh vklass-utvecklingssamtal

FIXTURE="${1:-vklass-utvecklingssamtal}"
FIXTURE_FILE="fixtures/emails/${FIXTURE}.json"

if [ ! -f "$FIXTURE_FILE" ]; then
  echo "Fixture not found: $FIXTURE_FILE"
  exit 1
fi

curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d @"$FIXTURE_FILE"
