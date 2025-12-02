#!/usr/bin/env node
/*
 Seed 10 diverse teachers from around the world for testing recommendations.
 
 Usage:
   node scripts/seed-diverse-teachers.js --serviceAccount path/to/serviceAccount.json --projectId YOUR_PROJECT_ID
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

(async () => {
  try {
    const { serviceAccount, projectId } = parseArgs();
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
    const nowIso = new Date().toISOString();

    // 10 diverse teachers from around the world
    const teachers = [
      {
        firstName: 'Maria',
        lastName: 'Garcia',
        email: 'maria.garcia@example.com',
        subjects: ['spanish', 'english'],
        location: ['online'],
        languages: ['spanish', 'english', 'french'],
        teachingMethods: ['online'],
        teachingStyles: ['patient', 'creative'],
        experience: 'experienced',
        priceRange: 'standard',
        pricePerHour: 28,
        description: 'Native Spanish speaker from Madrid. Specializing in conversational Spanish and DELE exam preparation.',
        country: 'Spain',
        city: 'Madrid'
      },
      {
        firstName: 'Yuki',
        lastName: 'Tanaka',
        email: 'yuki.tanaka@example.com',
        subjects: ['japanese', 'mathematics'],
        location: ['online', 'helsinki'],
        languages: ['japanese', 'english', 'finnish'],
        teachingMethods: ['online', 'in_person'],
        teachingStyles: ['structured', 'exam_prep'],
        experience: 'expert',
        priceRange: 'premium',
        pricePerHour: 45,
        description: 'Japanese language and math teacher. 10 years experience teaching JLPT preparation.',
        country: 'Finland',
        city: 'Helsinki'
      },
      {
        firstName: 'Ahmed',
        lastName: 'Hassan',
        email: 'ahmed.hassan@example.com',
        subjects: ['mathematics', 'physics', 'chemistry'],
        location: ['online'],
        languages: ['english', 'swedish'],
        teachingMethods: ['online', 'hybrid'],
        teachingStyles: ['structured', 'visual'],
        experience: 'experienced',
        priceRange: 'standard',
        pricePerHour: 32,
        description: 'STEM specialist focusing on IB and advanced mathematics. Patient with students of all levels.',
        country: 'Sweden',
        city: 'Stockholm'
      },
      {
        firstName: 'Sophie',
        lastName: 'Dubois',
        email: 'sophie.dubois@example.com',
        subjects: ['french', 'art', 'music'],
        location: ['online', 'espoo'],
        languages: ['french', 'english', 'finnish'],
        teachingMethods: ['online', 'in_person', 'hybrid', 'group'],
        teachingStyles: ['creative', 'patient', 'kinesthetic'],
        experience: 'intermediate',
        priceRange: 'budget',
        pricePerHour: 22,
        description: 'Creative arts and French language teacher. Specializes in group classes and making learning fun and engaging.',
        country: 'Finland',
        city: 'Espoo'
      },
      {
        firstName: 'Liu',
        lastName: 'Wei',
        email: 'liu.wei@example.com',
        subjects: ['chinese', 'programming', 'computer_science'],
        location: ['online'],
        languages: ['chinese', 'english'],
        teachingMethods: ['online'],
        teachingStyles: ['structured', 'exam_prep'],
        experience: 'expert',
        priceRange: 'premium',
        pricePerHour: 48,
        description: 'Mandarin Chinese and programming instructor. HSK exam specialist and Python/JavaScript tutor.',
        country: 'China',
        city: 'Beijing'
      },
      {
        firstName: 'Emma',
        lastName: 'Johnson',
        email: 'emma.johnson@example.com',
        subjects: ['english', 'history', 'philosophy'],
        location: ['online', 'tampere'],
        languages: ['english', 'finnish'],
        teachingMethods: ['online', 'in_person', 'group'],
        teachingStyles: ['patient', 'creative', 'auditory'],
        experience: 'experienced',
        priceRange: 'standard',
        pricePerHour: 30,
        description: 'Native English speaker from UK. Specializes in group English literature classes, essay writing workshops, and critical thinking seminars.',
        country: 'Finland',
        city: 'Tampere'
      },
      {
        firstName: 'Pietro',
        lastName: 'Rossi',
        email: 'pietro.rossi@example.com',
        subjects: ['italian', 'geography', 'history'],
        location: ['online'],
        languages: ['italian', 'english', 'spanish'],
        teachingMethods: ['online', 'group'],
        teachingStyles: ['creative', 'visual'],
        experience: 'intermediate',
        priceRange: 'budget',
        pricePerHour: 20,
        description: 'Italian language and culture teacher from Rome. Specializes in fun group classes with cultural immersion activities.',
        country: 'Italy',
        city: 'Rome'
      },
      {
        firstName: 'Olga',
        lastName: 'Petrov',
        email: 'olga.petrov@example.com',
        subjects: ['russian', 'mathematics', 'chemistry'],
        location: ['online', 'turku'],
        languages: ['russian', 'english', 'finnish'],
        teachingMethods: ['online', 'in_person'],
        teachingStyles: ['structured', 'patient', 'exam_prep'],
        experience: 'expert',
        priceRange: 'premium',
        pricePerHour: 42,
        description: 'Russian language and advanced sciences. 15 years teaching experience with excellent exam results.',
        country: 'Finland',
        city: 'Turku'
      },
      {
        firstName: 'Hans',
        lastName: 'Mueller',
        email: 'hans.mueller@example.com',
        subjects: ['german', 'economics', 'philosophy'],
        location: ['online', 'oulu'],
        languages: ['german', 'english', 'finnish'],
        teachingMethods: ['online', 'in_person', 'hybrid'],
        teachingStyles: ['structured', 'visual'],
        experience: 'experienced',
        priceRange: 'standard',
        pricePerHour: 35,
        description: 'German teacher and economics tutor. Specializes in business German and economic theory.',
        country: 'Finland',
        city: 'Oulu'
      },
      {
        firstName: 'Priya',
        lastName: 'Sharma',
        email: 'priya.sharma@example.com',
        subjects: ['english', 'biology', 'psychology'],
        location: ['online', 'vantaa'],
        languages: ['english', 'finnish'],
        teachingMethods: ['online', 'in_person'],
        teachingStyles: ['patient', 'visual', 'kinesthetic'],
        experience: 'intermediate',
        priceRange: 'budget',
        pricePerHour: 25,
        description: 'Biology and psychology teacher with focus on special needs students. Very patient and adaptive teaching style.',
        country: 'Finland',
        city: 'Vantaa',
        specialNeeds: ['adhd', 'dyslexia']
      }
    ];

    console.log(`Seeding ${teachers.length} diverse teachers to Firestore project ${projectId}...`);

    const batch = db.batch();

    for (const teacher of teachers) {
      const docRef = db.collection('teachers').doc(); // auto-id
      
      const data = {
        // Display
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        fullName: `${teacher.firstName} ${teacher.lastName}`,
        displayName: `${teacher.firstName} ${teacher.lastName}`,
        email: teacher.email,
        description: teacher.description,

        // Core tags
        subjects: teacher.subjects,
        location: teacher.location,
        languages: teacher.languages,
        teachingMethods: teacher.teachingMethods,
        teachingStyles: teacher.teachingStyles,
        experience: teacher.experience,
        priceRange: teacher.priceRange,

        // Location info
        country: teacher.country,
        city: teacher.city,

        // Numerics
        pricePerHour: teacher.pricePerHour,
        hourlyRate: String(teacher.pricePerHour),
        rating: +(4.2 + Math.random() * 0.8).toFixed(2), // 4.2 - 5.0
        reviewCount: Math.floor(10 + Math.random() * 150),
        totalStudents: Math.floor(5 + Math.random() * 80),

        // Special needs support (if applicable)
        ...(teacher.specialNeeds && { specialNeeds: teacher.specialNeeds }),

        // Flags & meta
        verified: true,
        profileImage: null,
        createdAt: nowIso,
      };

      batch.set(docRef, data);
      console.log(`  ✅ ${teacher.firstName} ${teacher.lastName} - ${teacher.subjects.join(', ')} from ${teacher.city}`);
    }

    await batch.commit();
    console.log('\n🎉 Seeding completed successfully!');
    console.log(`\n📊 Teachers added:`);
    console.log(`  - Languages: Spanish, Japanese, French, Italian, Russian, German, Chinese, English`);
    console.log(`  - Subjects: Math, Sciences, Languages, Arts, Programming, Humanities`);
    console.log(`  - Locations: Finland (Helsinki, Espoo, Tampere, Turku, Oulu, Vantaa), Online`);
    console.log(`  - Teaching methods: Online, In-person, Hybrid`);
    console.log(`  - Price ranges: Budget (€20-25), Standard (€28-35), Premium (€42-48)`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(2);
  }
})();
