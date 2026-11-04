#!/usr/bin/env bash
set -Eeuo pipefail

# Create isolated database roles and databases for each microservice.
psql \
  --username "$POSTGRES_USER" \
  --dbname postgres \
  --set ON_ERROR_STOP=1 \
  --set identity_password="$IDENTITY_DB_PASSWORD" \
  --set course_password="$COURSE_DB_PASSWORD" \
  --set scoring_password="$SCORING_DB_PASSWORD" <<'EOSQL'

CREATE ROLE identity_app
    LOGIN PASSWORD :'identity_password';

CREATE ROLE course_app
    LOGIN PASSWORD :'course_password';

CREATE ROLE scoring_app
    LOGIN PASSWORD :'scoring_password';

CREATE DATABASE identity_db OWNER identity_app;
CREATE DATABASE course_db OWNER course_app;
CREATE DATABASE scoring_db OWNER scoring_app;

EOSQL

echo "PostgreSQL initialization completed successfully."