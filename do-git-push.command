#!/bin/bash
cd ~/Desktop/shift-exchange
rm -f .git/index.lock .git/HEAD.lock
git add -A
git commit -m "Resolve merge conflict: keep pb-28 bottom padding fix on offers page"
git push origin main
echo ""
git log --oneline -4
echo ""
echo "Done. Press any key to close..."
read -n 1
