#!/bin/bash
cd "$(dirname "$0")"
rm -f .git/index.lock
git add -A
git commit -m "Fix UI/UX: offers, auth, admin, navbar, branding, and bottom nav overlap

- Fix bottom nav bar overlapping last offer card (add pb-28 to offers page)
- Fixes to offer creation, editing, and display (OfferCard, OfferForm, OfferFilters, SelectOfferModal)
- Auth improvements (lib/firebase/auth.ts)
- Firestore query and rules fixes
- Admin page fixes
- Navbar/branding updates
- next.config.ts cleanup, remove duplicate config files
- netlify.toml update
- Validation improvements
- Cloud Functions (index.ts) fixes
- Remove stale helper scripts"
git push origin main
echo ""
echo "✅ Done! Press any key to close..."
read -n 1
