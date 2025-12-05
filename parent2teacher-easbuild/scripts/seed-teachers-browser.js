/**
 * Web-based seed script
 * Run this in the browser console on your Firebase app, or create a temporary admin page
 * 
 * Instructions:
 * 1. Open your app in the browser (must be logged in as admin)
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter
 */

const SUBJECTS = ['mathematics','physics','chemistry','biology','english','finnish','swedish','history','geography','philosophy','psychology','economics','computer_science','programming','art','music','sports','french','german','spanish','italian','russian','chinese','japanese'];
const LOCATIONS = ['helsinki','espoo','tampere','turku','oulu','vantaa','online'];
const LANGUAGES = ['finnish','english','swedish','german','french','spanish'];
const TEACHING_METHODS = ['online','in_person','hybrid'];
const TEACHING_STYLES = ['patient','structured','creative','exam_prep','visual','auditory','kinesthetic'];
const EXPERIENCE = ['beginner','intermediate','experienced','expert'];
const EDUCATION_LEVELS = ['elementary','middle_school','high_school','university','adult'];

const firstNames = ['Anna','Mika','Erik','Sara','Noora','Ville','Oskari','Emma','Laura','Kalle','Jenna','Matias','Sofia','Oona','Juho','Eero','Julia','Nelli','Petri','Liisa','Mikko','Hanna','Antti','Maria','Jari','Kaisa','Timo','Sanna','Pekka','Riikka'];
const lastNames = ['Virtanen','Korhonen','Mäkinen','Nieminen','Heikkinen','Hämäläinen','Laine','Koskinen','Järvinen','Lehtonen','Lehtinen','Saarinen','Rantanen','Laaksonen','Savolainen'];

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
  console.log('🌱 Starting to create 30 teachers...');
  
  const { collection, addDoc, serverTimestamp, Timestamp } = window.firebase?.firestore || window.firebaseFirestore || {};
  const { db } = window;
  
  if (!collection || !db) {
    console.error('❌ Firebase Firestore not available. Make sure you\'re running this in your app.');
    return;
  }

  for (let i = 0; i < 30; i++) {
    const mainSubject = SUBJECTS[i % SUBJECTS.length];
    const additionalSubjects = pick(SUBJECTS.filter(s => s !== mainSubject), Math.floor(Math.random() * 2) + 1);
    const allSubjects = [mainSubject, ...additionalSubjects];
    
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const fullName = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 1}@edproquo.com`;

    const experienceYears = Math.floor(Math.random() * 20) + 1;
    const pricePerHour = Math.floor(25 + Math.random() * 50);

    const descriptions = [
      `Passionate ${mainSubject.replace(/_/g,' ')} educator with ${experienceYears} years of experience.`,
      `Dedicated teacher specializing in ${mainSubject.replace(/_/g,' ')} and helping students achieve their goals.`,
      `Experienced ${mainSubject.replace(/_/g,' ')} instructor committed to student success.`,
      `Creative and engaging teacher with expertise in ${mainSubject.replace(/_/g,' ')}.`,
      `Results-driven educator focused on ${mainSubject.replace(/_/g,' ')} excellence.`
    ];

    const phoneNumber = `+358 ${40 + Math.floor(Math.random() * 10)} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`;

    const data = {
      fullName, name: fullName, firstName, lastName, displayName: fullName,
      email, phone: phoneNumber, phoneNumber,
      description: descriptions[i % descriptions.length],
      subjects: allSubjects,
      educationLevels: pick(EDUCATION_LEVELS, Math.floor(Math.random() * 3) + 1),
      location: pick(LOCATIONS, Math.floor(Math.random() * 2) + 1),
      languages: pick(LANGUAGES, Math.floor(Math.random() * 2) + 2),
      teachingMethods: pick(TEACHING_METHODS, Math.floor(Math.random() * 2) + 1),
      teachingStyles: pick(TEACHING_STYLES, Math.floor(Math.random() * 3) + 2),
      experience: EXPERIENCE[i % EXPERIENCE.length],
      experienceLevel: EXPERIENCE[i % EXPERIENCE.length],
      pricePerHour, hourlyRate: pricePerHour,
      experienceYears, yearsOfExperience: experienceYears,
      education: `${['Bachelor','Master','PhD'][i % 3]} in ${mainSubject.replace(/_/g,' ')}`,
      degrees: [`${['Bachelor','Master'][i % 2]} in Education`],
      certifications: [{type: 'Teaching Certificate', country: 'Finland', year: String(2015 + Math.floor(Math.random() * 8))}],
      qualifications: `${experienceYears} years of teaching experience`,
      geoLocation: {latitude: 60.1695 + (Math.random() - 0.5) * 2, longitude: 24.9354 + (Math.random() - 0.5) * 2},
      availability: pick(['morning','afternoon','evening','weekend'], Math.floor(Math.random() * 3) + 2),
      clientFocus: pick(['children','teenagers','adults'], Math.floor(Math.random() * 2) + 1),
      gradeRanges: pick(['1-3','4-6','7-9','10-12'], Math.floor(Math.random() * 2) + 1),
      specializations: [mainSubject],
      teachingApproach: descriptions[i % descriptions.length],
      verified: Math.random() > 0.3,
      isActive: true,
      isGoogleAuth: false,
      acceptMarketing: Math.random() > 0.5,
      userType: 'teacher',
      role: 'teacher',
      professionalType: 'teacher',
      photoURL: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      profile: {photoURL: null, subjects: allSubjects, location: pick(LOCATIONS, 1)}
    };

    try {
      await addDoc(collection(db, 'teachers'), data);
      console.log(`✅ ${i+1}/30: ${fullName} - ${allSubjects.join(', ')}`);
    } catch (error) {
      console.error(`❌ Error creating ${fullName}:`, error.message);
    }
  }

  console.log('\n🎉 Seeding completed!');
}

// Run it
seedTeachers();
