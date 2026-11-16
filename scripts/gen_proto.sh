#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/services/quiz-bank/src/quiz_bank/generated"
PYTHON="${PYTHON:-python}"

find "$OUT" -mindepth 1 ! -name "__init__.py" -exec rm -rf {} +

"$PYTHON" -m grpc_tools.protoc \
  -I "$ROOT/proto" \
  --python_out="$OUT" \
  --pyi_out="$OUT" \
  --grpc_python_out="$OUT" \
  "$ROOT/proto/question_bank/v1/question_bank.proto" \
  "$ROOT/proto/quiz/v1/quiz.proto"

find "$OUT" -type d -exec sh -c 'touch "$1/__init__.py"' _ {} \;

# importurile generate sunt de forma "from question_bank.v1 import ..."
# le facem relative la pachetul quiz_bank.generated
find "$OUT" -name "*.py" -exec sed -i -E \
  's/^from (question_bank|quiz)(\.v1)? import/from quiz_bank.generated.\1\2 import/; s/^from (question_bank|quiz)\.v1 import/from quiz_bank.generated.\1.v1 import/' {} +

echo "Stub-uri generate in $OUT"