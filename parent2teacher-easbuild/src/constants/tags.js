// Oppiaineet
export const SUBJECTS = [
  { id: 'mathematics', label: 'Mathematics', icon: 'calculator' },
  { id: 'physics', label: 'Physics', icon: 'planet' },
  { id: 'chemistry', label: 'Chemistry', icon: 'flask' },
  { id: 'biology', label: 'Biology', icon: 'leaf' },
  { id: 'english', label: 'English', icon: 'language' },
  { id: 'finnish', label: 'Finnish', icon: 'book' },
  { id: 'swedish', label: 'Swedish', icon: 'book-outline' },
  { id: 'history', label: 'History', icon: 'library' },
  { id: 'geography', label: 'Geography', icon: 'earth' },
  { id: 'philosophy', label: 'Philosophy', icon: 'bulb' },
  { id: 'psychology', label: 'Psychology', icon: 'body' },
  { id: 'economics', label: 'Economics', icon: 'trending-up' },
  { id: 'computer_science', label: 'Computer Science', icon: 'laptop' },
  { id: 'programming', label: 'Programming', icon: 'code-slash' },
  { id: 'art', label: 'Art', icon: 'color-palette' },
  { id: 'music', label: 'Music', icon: 'musical-notes' },
  { id: 'sports', label: 'Physical Education', icon: 'fitness' },
  { id: 'french', label: 'French', icon: 'language' },
  { id: 'german', label: 'German', icon: 'language' },
  { id: 'spanish', label: 'Spanish', icon: 'language' },
  { id: 'italian', label: 'Italian', icon: 'language' },
  { id: 'russian', label: 'Russian', icon: 'language' },
  { id: 'chinese', label: 'Chinese', icon: 'language' },
  { id: 'japanese', label: 'Japanese', icon: 'language' },
];

// Kouluasteet
export const EDUCATION_LEVELS = [
  { id: 'elementary', label: 'Elementary (1-6)', icon: 'school' },
  { id: 'middle_school', label: 'Middle School (7-9)', icon: 'library' },
  { id: 'high_school', label: 'High School (10-12)', icon: 'school' },
  { id: 'university', label: 'University', icon: 'library-outline' },
  { id: 'adult_education', label: 'Adult Education', icon: 'person' },
  { id: 'vocational', label: 'Vocational Training', icon: 'construct' },
];

// Sijainnit (Suomen suurimmat kaupungit)
export const LOCATIONS = [
  { id: 'helsinki', label: 'Helsinki', icon: 'location' },
  { id: 'espoo', label: 'Espoo', icon: 'location' },
  { id: 'tampere', label: 'Tampere', icon: 'location' },
  { id: 'vantaa', label: 'Vantaa', icon: 'location' },
  { id: 'oulu', label: 'Oulu', icon: 'location' },
  { id: 'turku', label: 'Turku', icon: 'location' },
  { id: 'jyvaskyla', label: 'Jyväskylä', icon: 'location' },
  { id: 'lahti', label: 'Lahti', icon: 'location' },
  { id: 'kuopio', label: 'Kuopio', icon: 'location' },
  { id: 'pori', label: 'Pori', icon: 'location' },
  { id: 'joensuu', label: 'Joensuu', icon: 'location' },
  { id: 'lappeenranta', label: 'Lappeenranta', icon: 'location' },
  { id: 'hameenlinna', label: 'Hämeenlinna', icon: 'location' },
  { id: 'vaasa', label: 'Vaasa', icon: 'location' },
  { id: 'seinajoki', label: 'Seinäjoki', icon: 'location' },
  { id: 'rovaniemi', label: 'Rovaniemi', icon: 'location' },
  { id: 'online', label: 'Online Only', icon: 'laptop' },
  { id: 'anywhere', label: 'Anywhere in Finland', icon: 'earth' },
];

// Kielet
export const LANGUAGES = [
  { id: 'finnish', label: 'Finnish', icon: 'language' },
  { id: 'english', label: 'English', icon: 'language' },
  { id: 'swedish', label: 'Swedish', icon: 'language' },
  { id: 'german', label: 'German', icon: 'language' },
  { id: 'french', label: 'French', icon: 'language' },
  { id: 'spanish', label: 'Spanish', icon: 'language' },
  { id: 'italian', label: 'Italian', icon: 'language' },
  { id: 'russian', label: 'Russian', icon: 'language' },
  { id: 'chinese', label: 'Chinese', icon: 'language' },
  { id: 'japanese', label: 'Japanese', icon: 'language' },
  { id: 'arabic', label: 'Arabic', icon: 'language' },
];

// Opetusmuodot
export const TEACHING_METHODS = [
  { id: 'online', label: 'Online Teaching', icon: 'laptop' },
  { id: 'in_person', label: 'In-Person Teaching', icon: 'people' },
  { id: 'hybrid', label: 'Hybrid (Both)', icon: 'git-merge' },
  { id: 'group', label: 'Group Sessions', icon: 'people-circle' },
  { id: 'individual', label: 'Individual Sessions', icon: 'person' },
];

// Kokemusalueet
export const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: '0-2 years', icon: 'leaf' },
  { id: 'intermediate', label: '3-5 years', icon: 'school' },
  { id: 'experienced', label: '6-10 years', icon: 'trophy' },
  { id: 'expert', label: '10+ years', icon: 'ribbon' },
];

// Hintaluokat (tunti)
export const PRICE_RANGES = [
  { id: 'budget', label: '€10-20', icon: 'card' },
  { id: 'standard', label: '€20-35', icon: 'card' },
  { id: 'premium', label: '€35-50', icon: 'card' },
  { id: 'luxury', label: '€50+', icon: 'card' },
];

// Erityistarpeet
export const SPECIAL_NEEDS = [
  { id: 'adhd', label: 'ADHD', icon: 'medical' },
  { id: 'dyslexia', label: 'Dyslexia', icon: 'book' },
  { id: 'autism', label: 'Autism Spectrum', icon: 'heart' },
  { id: 'anxiety', label: 'Anxiety', icon: 'shield' },
  { id: 'learning_difficulties', label: 'Learning Difficulties', icon: 'help-circle' },
  { id: 'gifted', label: 'Gifted', icon: 'star' },
  { id: 'slow_learner', label: 'Slow Learner', icon: 'time' },
];

// Opetustyylit
export const TEACHING_STYLES = [
  { id: 'visual', label: 'Visual Learning', icon: 'eye' },
  { id: 'auditory', label: 'Auditory Learning', icon: 'volume-high' },
  { id: 'kinesthetic', label: 'Hands-on Learning', icon: 'hand-left' },
  { id: 'patient', label: 'Patient Teaching', icon: 'heart' },
  { id: 'structured', label: 'Structured Approach', icon: 'list' },
  { id: 'creative', label: 'Creative Methods', icon: 'color-palette' },
  { id: 'gamified', label: 'Gamified Learning', icon: 'game-controller' },
  { id: 'exam_prep', label: 'Exam Preparation', icon: 'document-text' },
];

// Erikoisalueet (Specializations) - NEW
export const SPECIALIZATIONS = [
  { id: 'esl', label: 'ESL (English as Second Language)', icon: 'language' },
  { id: 'dyslexia_intervention', label: 'Dyslexia Intervention', icon: 'book' },
  { id: 'ib_examiner', label: 'IB Examiner', icon: 'medal' },
  { id: 'gifted_education', label: 'Gifted Education', icon: 'star' },
  { id: 'special_needs', label: 'Special Needs Education', icon: 'heart' },
  { id: 'stem_education', label: 'STEM Education', icon: 'flask' },
  { id: 'montessori', label: 'Montessori Method', icon: 'cube' },
  { id: 'waldorf', label: 'Waldorf Education', icon: 'flower' },
  { id: 'reading_specialist', label: 'Reading Specialist', icon: 'book-outline' },
  { id: 'math_olympiad', label: 'Math Olympiad Coaching', icon: 'trophy' },
  { id: 'test_prep', label: 'Standardized Test Prep', icon: 'document-text' },
  { id: 'curriculum_design', label: 'Curriculum Design', icon: 'create' },
];

// Akateemiset kiinnostukset (Academic Interests) - NEW
export const ACADEMIC_INTERESTS = [
  { id: 'british_literature', label: 'British Literature', icon: 'book' },
  { id: 'american_literature', label: 'American Literature', icon: 'book' },
  { id: 'reading_intervention', label: 'Reading Intervention', icon: 'book-outline' },
  { id: 'stem_projects', label: 'STEM Project-Based Learning', icon: 'flask' },
  { id: 'creative_writing', label: 'Creative Writing', icon: 'create' },
  { id: 'debate_speech', label: 'Debate & Public Speaking', icon: 'mic' },
  { id: 'science_fair', label: 'Science Fair Coaching', icon: 'planet' },
  { id: 'robotics', label: 'Robotics & Engineering', icon: 'hardware-chip' },
  { id: 'philosophy_ethics', label: 'Philosophy & Ethics', icon: 'bulb' },
  { id: 'world_history', label: 'World History', icon: 'earth' },
  { id: 'environmental_science', label: 'Environmental Science', icon: 'leaf' },
  { id: 'music_theory', label: 'Music Theory & Composition', icon: 'musical-notes' },
];

// Asiakasryhmät (Client Focus) - NEW
export const CLIENT_FOCUS = [
  { id: 'children_6_12', label: 'Children (6-12)', icon: 'happy' },
  { id: 'teens_13_18', label: 'Teenagers (13-18)', icon: 'school' },
  { id: 'adults_18plus', label: 'Adults (18+)', icon: 'person' },
  { id: 'second_language', label: 'Second Language Learners', icon: 'language' },
  { id: 'special_needs', label: 'Special Needs Students', icon: 'heart' },
  { id: 'gifted_students', label: 'Gifted Students', icon: 'star' },
  { id: 'struggling_learners', label: 'Struggling Learners', icon: 'hand-right' },
  { id: 'homeschool', label: 'Homeschool Students', icon: 'home' },
];

// Sertifikaatti maat (Certification Countries) - NEW
export const CERTIFICATION_COUNTRIES = [
  { id: 'finland', label: 'Finland', icon: 'flag' },
  { id: 'usa', label: 'United States', icon: 'flag' },
  { id: 'uk', label: 'United Kingdom', icon: 'flag' },
  { id: 'canada', label: 'Canada', icon: 'flag' },
  { id: 'australia', label: 'Australia', icon: 'flag' },
  { id: 'germany', label: 'Germany', icon: 'flag' },
  { id: 'france', label: 'France', icon: 'flag' },
  { id: 'sweden', label: 'Sweden', icon: 'flag' },
  { id: 'norway', label: 'Norway', icon: 'flag' },
  { id: 'denmark', label: 'Denmark', icon: 'flag' },
  { id: 'netherlands', label: 'Netherlands', icon: 'flag' },
  { id: 'international', label: 'International (IB, Cambridge, etc.)', icon: 'earth' },
];

// Luokka-asteet (Grade Ranges) - NEW
export const GRADE_RANGES = [
  { id: 'preschool', label: 'Preschool (0-5)', icon: 'happy-outline' },
  { id: 'elementary_1_3', label: 'Elementary (Grades 1-3)', icon: 'school' },
  { id: 'elementary_4_6', label: 'Elementary (Grades 4-6)', icon: 'school' },
  { id: 'middle_6_8', label: 'Middle School (Grades 6-8)', icon: 'library' },
  { id: 'high_9_12', label: 'High School (Grades 9-12)', icon: 'school' },
  { id: 'university', label: 'University / Higher Ed', icon: 'ribbon' },
  { id: 'adult_education', label: 'Adult Education', icon: 'person' },
  { id: 'all_ages', label: 'All Ages', icon: 'people' },
];

// Saatavuus
export const AVAILABILITY = [
  { id: 'weekdays_morning', label: 'Weekdays Morning', icon: 'sunny' },
  { id: 'weekdays_afternoon', label: 'Weekdays Afternoon', icon: 'partly-sunny' },
  { id: 'weekdays_evening', label: 'Weekdays Evening', icon: 'moon' },
  { id: 'weekend_morning', label: 'Weekend Morning', icon: 'sunny-outline' },
  { id: 'weekend_afternoon', label: 'Weekend Afternoon', icon: 'partly-sunny-outline' },
  { id: 'weekend_evening', label: 'Weekend Evening', icon: 'moon-outline' },
  { id: 'flexible', label: 'Flexible Schedule', icon: 'time' },
];

// Terapian erikoisalat
export const THERAPY_SPECIALIZATIONS = [
  { id: 'cognitive_behavioral', label: 'Cognitive Behavioral Therapy (CBT)', icon: 'brain' },
  { id: 'psychodynamic', label: 'Psychodynamic Therapy', icon: 'analytics' },
  { id: 'family_therapy', label: 'Family Therapy', icon: 'people' },
  { id: 'couples_therapy', label: 'Couples Therapy', icon: 'heart' },
  { id: 'child_therapy', label: 'Child & Adolescent Therapy', icon: 'happy' },
  { id: 'trauma', label: 'Trauma Therapy', icon: 'shield' },
  { id: 'addiction', label: 'Addiction Counseling', icon: 'medical' },
  { id: 'grief', label: 'Grief Counseling', icon: 'sad' },
  { id: 'anxiety', label: 'Anxiety Treatment', icon: 'pulse' },
  { id: 'depression', label: 'Depression Treatment', icon: 'rainy' },
  { id: 'mindfulness', label: 'Mindfulness-Based Therapy', icon: 'leaf' },
  { id: 'emdr', label: 'EMDR', icon: 'eye' },
];

// Terapian tarpeet (asiakkaille)
export const THERAPY_NEEDS = [
  { id: 'anxiety', label: 'Anxiety', icon: 'pulse' },
  { id: 'depression', label: 'Depression', icon: 'rainy' },
  { id: 'stress', label: 'Stress Management', icon: 'fitness' },
  { id: 'relationships', label: 'Relationship Issues', icon: 'heart' },
  { id: 'trauma', label: 'Trauma', icon: 'shield' },
  { id: 'grief', label: 'Grief & Loss', icon: 'sad' },
  { id: 'addiction', label: 'Addiction', icon: 'medical' },
  { id: 'family', label: 'Family Issues', icon: 'people' },
  { id: 'personal_growth', label: 'Personal Growth', icon: 'trending-up' },
  { id: 'life_transitions', label: 'Life Transitions', icon: 'swap-horizontal' },
];

// Apufunktiot
export const getTagById = (tags, id) => {
  return tags.find(tag => tag.id === id);
};

export const getTagLabels = (tags, selectedIds) => {
  // Handle cases where selectedIds might be undefined, null, or not an array
  if (!selectedIds || !Array.isArray(selectedIds)) {
    return [];
  }
  
  return selectedIds.map(id => {
    const tag = getTagById(tags, id);
    return tag ? tag.label : id;
  });
};

export const getTagsByIds = (tags, selectedIds) => {
  // Handle cases where selectedIds might be undefined, null, or not an array
  if (!selectedIds || !Array.isArray(selectedIds)) {
    return [];
  }
  
  return selectedIds.map(id => getTagById(tags, id)).filter(Boolean);
};