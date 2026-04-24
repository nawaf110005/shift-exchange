#\!/bin/bash
set -e
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
REMOTE="https://github.com/nawaf110005/shift-exchange.git"

cd "$PROJECT_DIR"

# Remove any stale git lock files
rm -f .git/index.lock .git/MERGE_HEAD .git/CHERRY_PICK_HEAD 2>/dev/null || true

git config user.name  "nawaf110005"
git config user.email "nawaf.ithra@gmail.com"

git checkout -b main 2>/dev/null || git checkout main

git add -A
git commit -m "Initial commit — Shift Exchange App (Mobile-first Arabic RTL UI)" 2>/dev/null || echo "Nothing new to commit."

git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE"

echo ""
echo "Pushing to GitHub — you may be prompted for credentials..."
git push -u origin main

echo ""
echo "✅ Pushed\! Netlify will now auto-build and deploy."
