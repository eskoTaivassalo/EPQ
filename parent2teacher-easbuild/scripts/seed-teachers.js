#!/usr/bin/env node
/*
 Seed Firestore "teachers" collection with 15 teacher documents.
 Uses Firebase Admin SDK. Provide a service account JSON and projectId.

 Usage:
   node scripts/seed-teachers.js --serviceAccount path/to/serviceAccount.json --projectId YOUR_PROJECT_ID --count 15

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
      console.error('Missing required args. Example: --serviceAccount ./serviceAccount.json --projectId YOUR_PROJECT_ID');
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

    const firstNames = ['Anna','Mika','Erik','Sara','Noora','Ville','Oskari','Emma','Laura','Kalle','Jenna','Matias','Sofia','Oona','Juho','Eero','Julia','Nelli','Petri','Liisa','Mikko','Hanna','Antti','Maria','Jari','Kaisa','Timo','Sanna','Pekka','Riikka'];
    const lastNames  = ['Virtanen','Korhonen','Mäkinen','Nieminen','Heikkinen','Hämäläinen','Laine','Koskinen','Järvinen','Lehtonen','Lehtinen','Saarinen','Rantanen','Laaksonen','Savolainen'];

    const howMany = Math.min(parseInt(count, 10) || 30, 30);

    console.log(`\n🌱 Seeding ${howMany} teachers to Firestore project ${projectId}...\n`);

    const batch = db.batch();
    const nowIso = new Date().toISOString();

    for (let i = 0; i < howMany; i++) {
      const mainSubject = SUBJECTS[i % SUBJECTS.length];
      const additionalSubjects = pick(SUBJECTS.filter(s => s !== mainSubject), Math.floor(Math.random() * 2) + 1);
      const allSubjects = [mainSubject, ...additionalSubjects];
      
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
      const fullName = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 1}@example.com`;

      const experienceYears = Math.floor(Math.random() * 20) + 1;
      const pricePerHour = Math.floor(25 + Math.random() * 50); // 25-75€
      const priceRange = pricePerHour <= 35 ? 'budget' : pricePerHour <= 50 ? 'standard' : pricePerHour <= 65 ? 'premium' : 'luxury';

      const descriptions = [
        `Passionate ${mainSubject.replaceAll('_',' ')} educator with ${experienceYears} years of experience.`,
        `Dedicated teacher specializing in ${mainSubject.replaceAll('_',' ')} and helping students achieve their goals.`,
        `Experienced ${mainSubject.replaceAll('_',' ')} instructor committed to student success.`,
        `Creative and engaging teacher with expertise in ${mainSubject.replaceAll('_',' ')}.`,
        `Results-driven educator focused on ${mainSubject.replaceAll('_',' ')} excellence.`
      ];

      const educationLevels = pick(['elementary','middle_school','high_school','university','adult'], Math.floor(Math.random() * 3) + 1);
      const phoneNumber = `+358 ${40 + Math.floor(Math.random() * 10)} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`;

      const docRef = db.collection('teachers').doc(); // auto-id
      const data = {
        // Display & Contact
        fullName,
        name: fullName,
        firstName,
        lastName,
        displayName: fullName,
        email,
        phone: phoneNumber,
        phoneNumber,
        description: descriptions[i % descriptions.length],

        // Core tags (IDs from constants)
        subjects: allSubjects,
        educationLevels,
        location: pick(LOCATIONS, Math.floor(Math.random() * 2) + 1),
        languages: pick(LANGUAGES, Math.floor(Math.random() * 2) + 2),
        teachingMethods: pick(TEACHING_METHODS, Math.floor(Math.random() * 2) + 1),
        teachingStyles: pick(TEACHING_STYLES, Math.floor(Math.random() * 3) + 2),
        experience: EXPERIENCE[i % EXPERIENCE.length],
        experienceLevel: EXPERIENCE[i % EXPERIENCE.length],
        priceRange,

        // Numerics used by app
        pricePerHour,
        hourlyRate: pricePerHour,
        experienceYears,
        yearsOfExperience: experienceYears,

        // Professional details
        education: `${['Bachelor','Master','PhD'][i % 3]} in ${mainSubject.replaceAll('_',' ')}`,
        degrees: [`${['Bachelor','Master'][i % 2]} in Education`],
        certifications: [
          { type: 'Teaching Certificate', country: 'Finland', year: String(2015 + Math.floor(Math.random() * 8)) }
        ],
        qualifications: `${experienceYears} years of teaching experience with proven results`,
        
        // Location data
        geoLocation: {
          latitude: 60.1695 + (Math.random() - 0.5) * 2,
          longitude: 24.9354 + (Math.random() - 0.5) * 2
        },

        // Additional fields
        availability: pick(['morning','afternoon','evening','weekend'], Math.floor(Math.random() * 3) + 2),
        clientFocus: pick(['children','teenagers','adults'], Math.floor(Math.random() * 2) + 1),
        gradeRanges: pick(['1-3','4-6','7-9','10-12'], Math.floor(Math.random() * 2) + 1),
        specializations: [mainSubject],
        teachingApproach: descriptions[i % descriptions.length],

        // Flags & meta
        verified: Math.random() > 0.3,
        isActive: true,
        isGoogleAuth: false,
        acceptMarketing: Math.random() > 0.5,
        userType: 'teacher',
        role: 'teacher',
        professionalType: 'teacher',
        profileImage: null,
        photoURL: null,
        
        // Timestamps
        createdAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
        ),
        updatedAt: admin.firestore.Timestamp.now(),

        // Nested profile
        profile: {
          photoURL: null,
          subjects: allSubjects,
          location: pick(LOCATIONS, 1)
        }
      };

      batch.set(docRef, data);
      console.log(`✅ Created: ${fullName} - ${allSubjects.join(', ')}`);
    }

    await batch.commit();
    console.log(`\n🎉 Successfully created ${howMany} teacher profiles!`);
    console.log('\n📊 Summary:');
    console.log(`Total teachers: ${howMany}`);
    console.log(`Subjects covered: ${SUBJECTS.length}`);
    console.log(`Locations: ${LOCATIONS.join(', ')}`);
    console.log('\n✨ Seeding completed successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(2);
  }
})();
