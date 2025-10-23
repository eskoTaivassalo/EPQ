#!/usr/bin/env node
/*
 Seed Firestore "teachers" collection with 15 teacher documents.
 Uses Firebase Admin SDK. Provide a service account JSON and projectId.

 Usage:
   node scripts/seed-teachers.js --serviceAccount path/to/serviceAccount.json --projectId parents2teachers-1d8a3 --count 15

 The created documents align with the app's existing tag IDs:
 - subjects: from src/constants/tags.js (e.g., "mathematics", "physics", ...)
 - languages: e.g., "finnish", "english"
 - teachingMethods: "online", "in_person", "hybrid"
 - teachingStyles, experience, priceRange use existing IDs
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const val = args[i + 1];
    if (!key?.startsWith('--')) continue;
    out[key.substring(2)] = val;
  }
  return out;
}

function pick(arr, n = 1) {
  const copy = [...arr];
  const res = [];
  while (n-- > 0 && copy.length) {
    const idx = Math.floor(Math.random() * copy.length);
    res.push(copy.splice(idx, 1)[0]);
  }
  return res;
}

(async () => {
  try {
    const { serviceAccount, projectId, count = '15' } = parseArgs();
    if (!serviceAccount || !projectId) {
      console.error('Missing required args. Example: --serviceAccount ./serviceAccount.json --projectId parents2teachers-1d8a3');
      process.exit(1);
    }

    const serviceAccountPath = path.resolve(process.cwd(), serviceAccount);
    if (!fs.existsSync(serviceAccountPath)) {
      console.error(`Service account file not found: ${serviceAccountPath}`);
      process.exit(1);
    }

    const creds = require(serviceAccountPath);

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(creds),
        projectId,
      });
    }

    const db = admin.firestore();

    // Existing tag IDs (aligned with src/constants/tags.js)
    const SUBJECTS = [
      'mathematics','physics','chemistry','biology','english','finnish','swedish','history','geography','philosophy','psychology','economics','computer_science','programming','art','music','sports','french','german','spanish','italian','russian','chinese','japanese'
    ];
    const LOCATIONS = ['helsinki','espoo','tampere','turku','oulu','vantaa','online'];
    const LANGUAGES = ['finnish','english','swedish','german','french','spanish'];
    const TEACHING_METHODS = ['online','in_person','hybrid'];
    const TEACHING_STYLES = ['patient','structured','creative','exam_prep','visual','auditory','kinesthetic'];
    const EXPERIENCE = ['beginner','intermediate','experienced','expert'];
    const PRICE_RANGES = ['budget','standard','premium','luxury'];

    const firstNames = ['Anna','Mika','Erik','Sara','Noora','Ville','Oskari','Emma','Laura','Kalle','Jenna','Matias','Sofia','Oona','Juho','Eero','Julia','Nelli'];
    const lastNames  = ['Virtanen','Korhonen','Mäkinen','Nieminen','Heikkinen','Hämäläinen','Laine','Koskinen','Järvinen','Lehtonen','Lehtinen','Saarinen'];

    const howMany = Math.min(parseInt(count, 10) || 15, SUBJECTS.length);

    console.log(`Seeding ${howMany} teachers to Firestore project ${projectId}...`);

    const batch = db.batch();
    const nowIso = new Date().toISOString();

    for (let i = 0; i < howMany; i++) {
      const subject = SUBJECTS[i];
      const fullName = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
      const email = `${subject}.${i + 1}@example.com`.replace(/[^a-zA-Z0-9@._-]/g,'');

      const pricePerHour = [15, 22, 28, 35, 45, 55][i % 6];
      const priceRange = pricePerHour <= 20 ? 'budget' : pricePerHour <= 35 ? 'standard' : pricePerHour <= 50 ? 'premium' : 'luxury';

      const docRef = db.collection('teachers').doc(); // auto-id
      const data = {
        // Display
        fullName,
        displayName: fullName,
        email,
        description: `Certified ${subject.replaceAll('_',' ')} teacher helping students succeed.`,

        // Core tags (IDs from constants)
        subjects: [subject],
        location: [pick(LOCATIONS, 1)[0]],
        languages: pick(LANGUAGES, 2),
        teachingMethods: pick(TEACHING_METHODS, 1),
        teachingStyles: pick(TEACHING_STYLES, 2),
        experience: EXPERIENCE[i % EXPERIENCE.length],
        priceRange,

        // Numerics used by app
        pricePerHour,
        hourlyRate: String(pricePerHour),
        rating: +(4 + Math.random() * 1).toFixed(2), // 4.00 - 5.00
        reviewCount: Math.floor(20 + Math.random() * 200),
        totalStudents: Math.floor(5 + Math.random() * 100),

        // Flags & meta
        verified: true,
        profileImage: null,
        createdAt: nowIso,
      };

      batch.set(docRef, data);
    }

    await batch.commit();
    console.log('Seeding completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(2);
  }
})();
