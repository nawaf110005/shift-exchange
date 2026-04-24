#!/bin/bash
cd ~/Desktop/shift-exchange
rm -f .git/index.lock .git/HEAD.lock
git add -A
git stash
git pull --no-rebase --no-edit origin main
git stash pop
git add -A
git commit -m "Merge remote and apply local fixes" --allow-empty
git push origin main
echo ""
git log --oneline -3
echo ""
echo "Done. Press any key to close..."
read -n 1
