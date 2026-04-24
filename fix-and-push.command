#!/bin/bash
# Fix lock file and push to GitHub

set -e

PROJECT_DIR="/Users/nawaf/Desktop/shift-exchange"
REMOTE="https://github.com/nawaf110005/shift-exchange.git"

echo "📂 Project: $PROJECT_DIR"
echo "🔗 Remote:  $REMOTE"
echo ""

cd "$PROJECT_DIR"

# Remove stale lock file if it exists
if [ -f ".git/index.lock" ]; then
  echo "🔧 Removing stale git lock file..."
  rm -f ".git/index.lock"
fi

# Git config
git config user.name  "nawaf110005"
git config user.email "nawaf.ithra@gmail.com"

# Stage all changes
git add -A

# Commit (first commit on this repo)
git commit -m "Initial commit — Shift Exchange App

- Next.js 14 App Router + Arabic RTL UI
- Firebase Auth (Google + Anonymous)
- Firestore real-time offers
- Cloud Functions (selectOffer, cancelSelection, adminConfirmOffer)
- FullCalendar + SheetJS Excel export
- Netlify deployment ready" 2>/dev/null || echo "Nothing new to commit."

# Set up remote and push
git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE"

echo ""
echo "🚀 Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Pushed! Check: https://github.com/nawaf110005/shift-exchange"
echo ""
echo "Press Enter to close..."
read
