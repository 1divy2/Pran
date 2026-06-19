#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Database Setup Script — creates the PostgreSQL database and user.
# Usage: ./server/setup-db.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

DB_NAME="${DB_NAME:-pran}"
DB_USER="${DB_USER:-pran}"
DB_PASSWORD="${DB_PASSWORD:-pran}"

echo "Setting up PRAN database..."

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
  echo "Error: psql not found. Please install PostgreSQL."
  exit 1
fi

# Create user if not exists
echo "Creating database user..."
psql -U postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  psql -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"

# Create database if not exists
echo "Creating database..."
psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  psql -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Grant privileges
echo "Granting privileges..."
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Enable pgvector extension (requires superuser)
echo "Enabling pgvector extension..."
psql -U postgres -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || \
  echo "Warning: Could not enable pgvector. Run with superuser or install manually."

echo "Database setup complete!"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""
echo "Run migrations: npx tsx server/cli.ts migrate"
