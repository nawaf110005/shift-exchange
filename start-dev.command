#\!/bin/bash
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"
echo "🚀 Starting Shift Exchange dev server..."
echo "📂 Project: $PROJECT_DIR"
echo ""
echo "Installing dependencies if needed..."
npm install --legacy-peer-deps 2>/dev/null | tail -5
echo ""
echo "Starting server on http://localhost:3000"
echo "Press Ctrl+C to stop"
echo "---"
npm run dev
