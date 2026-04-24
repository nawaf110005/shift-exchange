#!/bin/bash
# ============================================================
#  push-to-github.sh — Run this once in VS Code terminal
#  to push shift-exchange to GitHub and set up everything
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
REMOTE="https://github.com/nawaf110005/shift-exchange.git"

echo "📂 Project: $PROJECT_DIR"
echo "🔗 Remote:  $REMOTE"
echo ""

cd "$PROJECT_DIR"

# ── Git setup ────────────────────────────────────────────────
git config user.name  "nawaf110005"
git config user.email "nawaf.ithra@gmail.com"

git checkout -b main 2>/dev/null || git checkout main

git add -A
git commit -m "Initial commit — Shift Exchange App

- Next.js 14 App Router + Arabic RTL UI
- Firebase Auth (Google + Anonymous)
- Firestore real-time offers
- Cloud Functions (selectOffer, cancelSelection, adminConfirmOffer)
- FullCalendar + SheetJS Excel export
- Netlify deployment ready" 2>/dev/null || echo "Nothing new to commit."

# ── Push ─────────────────────────────────────────────────────
echo ""
echo "Pushing to GitHub..."
git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE"
git push -u origin main

echo ""
echo "✅ Pushed to https://github.com/nawaf110005/shift-exchange"
echo ""

# ── Install dependencies ──────────────────────────────────────
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

echo ""
echo "📦 Installing Cloud Functions dependencies..."
cd functions && npm install && cd ..

echo ""
echo "✅ Done! Next steps:"
echo "  1. Run: firebase login"
echo "  2. Run: firebase use shift-exchange-app"
echo "  3. Run: firebase deploy --only firestore:rules,firestore:indexes"
echo "  4. Run: cd functions && npm run build && cd .. && firebase deploy --only functions"
echo "  5. Connect Netlify to https://github.com/nawaf110005/shift-exchange"
