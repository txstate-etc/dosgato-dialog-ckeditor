#!/bin/sh
# Content round-trip tests: every test/samples input through the real editor,
# compared against test/expected (see test/roundtrip.test.ts).
#   ./test.sh         run once
#   ./test.sh -u      accept changed output into test/expected
# Other vitest options pass through.
set -e
cd "$(dirname "$0")"
exec npx vitest run --project unit "$@"
