import { toISODate, parseTimeHM, addMinutes, dayOfWeek } from '../dateUtils';

describe('dateUtils', () => {
  describe('toISODate', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2025-01-15T10:30:00');
      expect(toISODate(date)).toBe('2025-01-15');
    });

    it('should handle single digit months and days', () => {
      const date = new Date('2025-03-05T10:30:00');
      expect(toISODate(date)).toBe('2025-03-05');
    });
  });

  describe('parseTimeHM', () => {
    it('should parse time string correctly', () => {
      expect(parseTimeHM('09:30')).toEqual({ h: 9, m: 30 });
      expect(parseTimeHM('14:45')).toEqual({ h: 14, m: 45 });
    });

    it('should handle time with leading zeros', () => {
      expect(parseTimeHM('00:00')).toEqual({ h: 0, m: 0 });
      expect(parseTimeHM('08:05')).toEqual({ h: 8, m: 5 });
    });
  });

  describe('addMinutes', () => {
    it('should add minutes to date', () => {
      const date = new Date('2025-01-15T10:00:00');
      const result = addMinutes(date, 30);
      expect(result.getHours()).toBe(10);
      expect(result.getMinutes()).toBe(30);
    });

    it('should handle hour overflow', () => {
      const date = new Date('2025-01-15T10:45:00');
      const result = addMinutes(date, 30);
      expect(result.getHours()).toBe(11);
      expect(result.getMinutes()).toBe(15);
    });
  });

  describe('dayOfWeek', () => {
    it('should return correct day of week', () => {
      const monday = new Date('2025-01-13'); // Monday
      const sunday = new Date('2025-01-12'); // Sunday
      
      expect(dayOfWeek(monday)).toBe(1);
      expect(dayOfWeek(sunday)).toBe(0);
    });
  });
});
