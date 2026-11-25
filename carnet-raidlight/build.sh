#!/usr/bin/env bash
# Wraps page.html (artifact form) into a standalone index.html for any static host.
set -euo pipefail
cd "$(dirname "$0")"
{
  printf '<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  sed -n '1,/<link rel="stylesheet" href="style.css">/p' page.html
  printf '</head>\n<body>\n'
  sed '1,/<link rel="stylesheet" href="style.css">/d' page.html
  printf '</body>\n</html>\n'
} > index.html
echo "index.html built"
