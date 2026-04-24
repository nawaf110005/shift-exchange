#!/bin/bash
cd ~/Desktop/shift-exchange
rm -f .git/index.lock .git/HEAD.lock
git pull --no-rebase --allow-unrelated-histories --no-edit origin main
git add -A
git commit -m "Merge remote history and apply all local fixes" --allow-empty
git push origin main
echo ""
git log --oneline -4
echo ""
echo "Done. Press any key to close..."
read -n 1
