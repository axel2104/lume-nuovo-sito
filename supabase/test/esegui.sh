#!/usr/bin/env bash
# Applica le migrazioni su un database vuoto e ci gira sopra i test.
#
# Serve un Postgres qualunque: quello locale, un container, o un progetto
# Supabase di prova. NON puntarlo al database di produzione — il primo comando
# è un `drop database`.
#
#   ./supabase/test/esegui.sh                              # postgres locale
#   PGHOST=/tmp PGPORT=5433 ./supabase/test/esegui.sh      # socket e porta
#   DB=lume_prova ./supabase/test/esegui.sh
set -euo pipefail

DB="${DB:-lume_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -q)
# Per le migrazioni si abbassa il livello: i NOTICE di "already exists" sono il
# comportamento voluto di un file rieseguibile, non un problema da leggere. Sui
# test invece i NOTICE servono, sono il "tutti i test passati".
MIGRA=(psql -v ON_ERROR_STOP=1 -q -c "set client_min_messages = warning")

cd "$(dirname "$0")/../.."

echo "→ ricreo $DB"
"${PSQL[@]}" -d postgres -c "drop database if exists $DB;" -c "create database $DB;"

echo "→ applico le migrazioni"
for f in supabase/migrations/*.sql; do
  echo "   $f"
  "${MIGRA[@]}" -d "$DB" -f "$f" > /dev/null
done

echo "→ le riapplico, per verificare che siano rieseguibili"
for f in supabase/migrations/*.sql; do
  "${MIGRA[@]}" -d "$DB" -f "$f" > /dev/null
done

echo "→ test"
for f in supabase/test/*.test.sql; do
  echo "   $f"
  "${PSQL[@]}" -d "$DB" -f "$f" 2>&1 | sed -n 's/^psql.*NOTICE:  /     /p'
done

echo "✓ tutto verde"
