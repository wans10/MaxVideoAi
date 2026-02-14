#!/bin/sh
set -e

# Configuration
# DATABASE_URL is expected to be set in the environment
# SQL_DIR is the directory containing SQL files (default: /migrations)

SQL_DIR="${SQL_DIR:-/migrations}"

echo "Starting database initialization check..."

# Wait for database to be ready
echo "Waiting for database connection..."
until psql "$DATABASE_URL" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 2
done

echo "Database is up."

# Check if 'profiles' table exists (created by 00_create_profiles.sql)
# This serves as our marker for whether initialization has run.
TABLE_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles');")

if [ "$TABLE_EXISTS" = "t" ]; then
  echo "Database already initialized (table 'profiles' found)."
  echo "Skipping initialization scripts."
else
  echo "Database appears to be empty (table 'profiles' not found)."
  echo "Running initialization scripts from $SQL_DIR..."

  # Run SQL files in alphanumeric order
  # Note: using `ls` and `sort` for portability in minimal sh environments
  for f in $(ls "$SQL_DIR"/*.sql | sort); do
    echo "Executing $f..."
    psql "$DATABASE_URL" -f "$f"
  done

  echo "Database initialization completed successfully."
fi
