# PostgreSQL 17 with pgTAP, for scripts/v2-db-test.sh (docker mode, used by CI).
FROM postgres:17
RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql-17-pgtap \
 && rm -rf /var/lib/apt/lists/*
