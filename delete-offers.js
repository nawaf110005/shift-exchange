#!/usr/bin/env node
/**
 * delete-offers.js
 *
 * Deletes ALL documents in the `offers` Firestore collection in batches.
 * Does NOT touch any other collection (users, stations/centers, etc.).
 *
 * Prerequisites:
 *   npm install firebase-admin --no-save   (one-time install)
 *   firebase login                          (if not already logged in)
 *
 * Usage:
 *   node delete-offers.js
 */

const admin = require('firebase-admin');

const PROJECT_ID = 'shift-exchange-app';
const COLLECTION  = 'offers';
const BATCH_SIZE  = 500; // Firestore max per batch

// ── Initialise Admin SDK with Application Default Credentials ──────────────
// Works automatically when you are logged in via `firebase login`.
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: PROJECT_ID,
});

const db = admin.firestore();

// ── Main ───────────────────────────────────────────────────────────────────
async function deleteOffersCollection() {
  console.log(`\n🔥  Connecting to project: ${PROJECT_ID}`);
  console.log(`🗑️   Target collection:     ${COLLECTION}\n`);

  let totalDeleted = 0;
  let round = 1;

  while (true) {
    const snapshot = await db
      .collection(COLLECTION)
      .limit(BATCH_SIZE)
      .get();

    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    totalDeleted += snapshot.size;
    console.log(
      `  Round ${round}: deleted ${snapshot.size} documents  (running total: ${totalDeleted})`
    );
    round++;
  }

  console.log(`\n✅  Done! Deleted ${totalDeleted} document(s) from '${COLLECTION}'.`);
  if (totalDeleted === 0) {
    console.log('   (Collection was already empty.)');
  }
}

deleteOffersCollection()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌  Error:', err.message);
    if (err.message.includes('Could not load the default credentials')) {
      console.error(
        '\n   → Run  firebase login  (or  gcloud auth application-default login)\n' +
        '     to set up Application Default Credentials, then try again.'
      );
    }
    process.exit(1);
  });
