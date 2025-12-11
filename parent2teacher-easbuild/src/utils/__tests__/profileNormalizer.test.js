import { 
  normalizeTeacherProfile, 
  normalizeParentProfile, 
  normalizeProfile,
  toArray 
} from '../profileNormalizer';

describe('profileNormalizer', () => {
  describe('toArray', () => {
    it('should convert string to array', () => {
      expect(toArray('Math,Physics')).toEqual(['Math', 'Physics']);
    });

    it('should handle array input', () => {
      expect(toArray(['Math', 'Physics'])).toEqual(['Math', 'Physics']);
    });

    it('should handle null/undefined', () => {
      expect(toArray(null)).toEqual([]);
      expect(toArray(undefined)).toEqual([]);
    });
  });

  describe('normalizeProfile', () => {
    it('should flatten nested profile structure', () => {
      const raw = {
        uid: 'user123',
        profile: {
          displayName: 'Test User',
          email: 'test@test.com',
        },
      };

      const normalized = normalizeProfile(raw);
      
      expect(normalized.uid).toBe('user123');
      expect(normalized.displayName).toBe('Test User');
      expect(normalized.email).toBe('test@test.com');
    });

    it('should handle null input', () => {
      const normalized = normalizeProfile(null);
      expect(normalized).toEqual({});
    });
  });

  describe('normalizeTeacherProfile', () => {
    it('should normalize teacher arrays', () => {
      const merged = {
        subjects: 'Math,Physics',
        teachingMethods: ['Online', 'In-person'],
        languages: 'English',
      };

      const normalized = normalizeTeacherProfile(merged);
      
      expect(normalized.subjects).toEqual(['Math', 'Physics']);
      expect(normalized.teachingMethods).toEqual(['Online', 'In-person']);
      expect(normalized.languages).toEqual(['English']);
    });

    it('should handle empty fields', () => {
      const merged = {
        subjects: '',
        teachingMethods: null,
      };

      const normalized = normalizeTeacherProfile(merged);
      
      expect(normalized.subjects).toEqual([]);
      expect(normalized.teachingMethods).toEqual([]);
    });
  });

  describe('normalizeParentProfile', () => {
    it('should normalize parent arrays', () => {
      const merged = {
        childrenGrades: '1,2,3',
        subjectsNeeded: ['Math', 'English'],
        languages: 'Finnish',
      };

      const normalized = normalizeParentProfile(merged);
      
      expect(normalized.childrenGrades).toEqual(['1', '2', '3']);
      expect(normalized.subjectsNeeded).toEqual(['Math', 'English']);
      expect(normalized.languages).toEqual(['Finnish']);
    });

    it('should fallback to lookingFor when subjectsNeeded is empty', () => {
      const merged = {
        lookingFor: 'Math,Science',
        subjectsNeeded: '',
      };

      const normalized = normalizeParentProfile(merged);
      
      expect(normalized.subjectsNeeded).toEqual(['Math', 'Science']);
    });
  });
});
