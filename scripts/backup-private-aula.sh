#!/usr/bin/env bash
# Create a GASI Aula PostgreSQL backup encrypted with age, never on disk in plaintext.
set -Eeuo pipefail
umask 077
if [[ -z "${GASI_AULA_DB_URL:-}" || -z "${GASI_AULA_BACKUP_RECIPIENT:-}" || $# -ne 1 ]]; then
  echo "Define GASI_AULA_DB_URL and age public key GASI_AULA_BACKUP_RECIPIENT, then pass a private destination directory." >&2
  exit 2
fi
if [[ ! "${GASI_AULA_DB_URL}" =~ ^postgres(ql)?:// ]] || [[ ! "${GASI_AULA_DB_URL}" =~ sslmode=(require|verify-full) ]]; then
  echo "PostgreSQL TLS is required." >&2
  exit 2
fi
if [[ ! "${GASI_AULA_BACKUP_RECIPIENT}" =~ ^age1[a-z0-9]+$ ]]; then
  echo "A valid age public key is required." >&2
  exit 2
fi
for tool in pg_dump age; do command -v "$tool" >/dev/null || { echo "Missing: $tool" >&2; exit 2; }; done
directory="$1"
mkdir -p -- "$directory"
chmod 700 -- "$directory"
destination="$directory/gasi-aula-$(date -u +%Y%m%dT%H%M%SZ)-$RANDOM.dump.age"
temp="$(mktemp "$directory/.gasi-aula-XXXXXXXX.tmp")"
trap 'rm -f -- "$temp"' EXIT INT TERM
export PGDATABASE="$GASI_AULA_DB_URL"
unset GASI_AULA_DB_URL
pg_dump --format=custom --no-owner --no-privileges |
  age --recipient "$GASI_AULA_BACKUP_RECIPIENT" --output "$temp"
test -s "$temp" || { echo "Empty encrypted backup" >&2; exit 1; }
chmod 600 "$temp"
mv -- "$temp" "$destination"
echo "Encrypted backup created: $destination"
echo "Keep the age private key separate and verify restores on a separate database."
