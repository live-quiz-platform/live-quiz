# syntax=docker/dockerfile:1

FROM python:3.12-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /build

COPY services/quiz-bank/pyproject.toml ./pyproject.toml
RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir \
        "grpcio>=1.66" "grpcio-tools>=1.66" "grpcio-health-checking>=1.66" \
        "protobuf>=5.27" "pymongo>=4.8"

COPY proto ./proto
COPY services/quiz-bank/src ./src

RUN mkdir -p src/quiz_bank/generated \
    && /opt/venv/bin/python -m grpc_tools.protoc \
        -I proto \
        --python_out=src/quiz_bank/generated \
        --pyi_out=src/quiz_bank/generated \
        --grpc_python_out=src/quiz_bank/generated \
        proto/question_bank/v1/question_bank.proto \
        proto/quiz/v1/quiz.proto \
    && find src/quiz_bank/generated -type d -exec touch {}/__init__.py \; \
    && find src/quiz_bank/generated -name "*.py" -exec sed -i -E \
        's/^from (question_bank|quiz)\.v1 import/from quiz_bank.generated.\1.v1 import/' {} +


FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH=/app/src

RUN useradd --system --uid 10001 --no-create-home app

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /build/src ./src
COPY scripts/check_health.py ./scripts/check_health.py

USER app

EXPOSE 50052

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
    CMD ["python", "scripts/check_health.py", "localhost:50052"]

CMD ["python", "-m", "quiz_bank.main"]