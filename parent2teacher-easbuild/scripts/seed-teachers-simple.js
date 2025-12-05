// Simple seed script that uses firebase-admin with Application Default Credentials
// This works if you're already logged in with firebase login

const admin = require('firebase-admin');

// Initialize with default credentials (uses firebase login)
try {
  admin.initializeApp({
    projectId: 'edproquo2'
  });
  console.log('✅ Firebase Admin initialized with project: edproquo2');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  process.exit(1);
}

const db = admin.firestore();

// Tag IDs from constants
const SUBJECTS = [
  'mathematics','physics','chemistry','biology','english','finnish','swedish','history','geography','philosophy','psychology','economics','computer_science','programming','art','music','sports','french','german','spanish','italian','russian','chinese','japanese'
];
const LOCATIONS = ['helsinki','espoo','tampere','turku','oulu','vantaa','online'];
const LANGUAGES = ['finnish','english','swedish','german','french','spanish'];
const TEACHING_METHODS = ['online','in_person','hybrid'];
const TEACHING_STYLES = ['patient','structured','creative','exam_prep','visual','auditory','kinesthetic'];
const EXPERIENCE = ['beginner','intermediate','experienced','expert'];
const EDUCATION_LEVELS = ['elementary','middle_school','high_school','university','adult'];

const firstNames = ['Anna','Mika','Erik','Sara','Noora','Ville','Oskari','Emma','Laura','Kalle','Jenna','Matias','Sofia','Oona','Juho','Eero','Julia','Nelli','Petri','Liisa','Mikko','Hanna','Antti','Maria','Jari','Kaisa','Timo','Sanna','Pekka','Riikka'];
const lastNames  = ['Virtanen','Korhonen','Mäkinen','Nieminen','Heikkinen','Hämäläinen','Laine','Koskinen','Järvinen','Lehtonen','Lehtinen','Saarinen','Rantanen','Laaksonen','Savolainen'];

function pick(arr, n = 1) {
  const copy = [...arr];
  const res = [];
  while (n-- > 0 && copy.length) {
    const idx = Math.floor(Math.random() * copy.length);
    res.push(copy.splice(idx, 1)[0]);
  }
  return res;
}

async function seedTeachers() {
  console.log('\n🌱 Creating 30 teacher profiles...\n');

  const batch = db.batch();
  let created = 0;

  for (let i = 0; i < 30; i++) {
    const mainSubject = SUBJECTS[i % SUBJECTS.length];
    const additionalSubjects = pick(SUBJECTS.filter(s => s !== mainSubject), Math.floor(Math.random() * 2) + 1);
    const allSubjects = [mainSubject, ...additionalSubjects];
    
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const fullName = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 1}@edproquo.com`;

    const experienceYears = Math.floor(Math.random() * 20) + 1;
    const pricePerHour = Math.floor(25 + Math.random() * 50); // 25-75€

    const descriptions = [
      `Passionate ${mainSubject.replaceAll('_',' ')} educator with ${experienceYears} years of experience.`,
      `Dedicated teacher specializing in ${mainSubject.replaceAll('_',' ')} and helping students achieve their goals.`,
      `Experienced ${mainSubject.replaceAll('_',' ')} instructor committed to student success.`,
      `Creative and engaging teacher with expertise in ${mainSubject.replaceAll('_',' ')}.`,
      `Results-driven educator focused on ${mainSubject.replaceAll('_',' ')} excellence.`
    ];

    const phoneNumber = `+358 ${40 + Math.floor(Math.random() * 10)} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`;

    const docRef = db.collection('teachers').doc();
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

      // Core tags
      subjects: allSubjects,
      educationLevels: pick(EDUCATION_LEVELS, Math.floor(Math.random() * 3) + 1),
      location: pick(LOCATIONS, Math.floor(Math.random() * 2) + 1),
      languages: pick(LANGUAGES, Math.floor(Math.random() * 2) + 2),
      teachingMethods: pick(TEACHING_METHODS, Math.floor(Math.random() * 2) + 1),
      teachingStyles: pick(TEACHING_STYLES, Math.floor(Math.random() * 3) + 2),
      experience: EXPERIENCE[i % EXPERIENCE.length],
      experienceLevel: EXPERIENCE[i % EXPERIENCE.length],

      // Numerics
      pricePerHour,
      hourlyRate: pricePerHour,
      experienceYears,
      yearsOfExperience: experienceYears,

      // Professional
      education: `${['Bachelor','Master','PhD'][i % 3]} in ${mainSubject.replaceAll('_',' ')}`,
      degrees: [`${['Bachelor','Master'][i % 2]} in Education`],
      certifications: [
        { type: 'Teaching Certificate', country: 'Finland', year: String(2015 + Math.floor(Math.random() * 8)) }
      ],
      qualifications: `${experienceYears} years of teaching experience`,
      
      // Location
      geoLocation: {
        latitude: 60.1695 + (Math.random() - 0.5) * 2,
        longitude: 24.9354 + (Math.random() - 0.5) * 2
      },

      // Additional
      availability: pick(['morning','afternoon','evening','weekend'], Math.floor(Math.random() * 3) + 2),
      clientFocus: pick(['children','teenagers','adults'], Math.floor(Math.random() * 2) + 1),
      gradeRanges: pick(['1-3','4-6','7-9','10-12'], Math.floor(Math.random() * 2) + 1),
      specializations: [mainSubject],
      teachingApproach: descriptions[i % descriptions.length],

      // Flags
      verified: Math.random() > 0.3,
      isActive: true,
      isGoogleAuth: false,
      acceptMarketing: Math.random() > 0.5,
      userType: 'teacher',
      role: 'teacher',
      professionalType: 'teacher',
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
    created++;
    console.log(`✅ ${created}/30: ${fullName} - ${allSubjects.join(', ')}`);
  }

  await batch.commit();
  
  console.log(`\n🎉 Successfully created ${created} teacher profiles!`);
  console.log('\n📊 Summary:');
  console.log(`Total teachers: ${created}`);
  console.log(`Subjects: ${SUBJECTS.length} different subjects`);
  console.log(`Locations: ${LOCATIONS.join(', ')}`);
  console.log('\n✨ Seeding completed!\n');
}

seedTeachers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error seeding teachers:', error);
    process.exit(1);
  });
