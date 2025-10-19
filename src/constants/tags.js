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
  { id: 'group', label: 'Group Lessons', icon: 'people-circle' },
  { id: 'individual', label: 'Individual Lessons', icon: 'person' },
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