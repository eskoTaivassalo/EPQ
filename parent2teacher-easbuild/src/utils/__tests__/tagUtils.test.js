import { calculatePriceRange, formatPrice, formatPriceRange } from '../tagUtils';

describe('tagUtils', () => {
  describe('calculatePriceRange', () => {
    it('should return budget for rates <= 20', () => {
      expect(calculatePriceRange(15)).toBe('budget');
      expect(calculatePriceRange(20)).toBe('budget');
    });

    it('should return standard for rates 20-35', () => {
      expect(calculatePriceRange(25)).toBe('standard');
      expect(calculatePriceRange(35)).toBe('standard');
    });

    it('should return premium for rates 35-50', () => {
      expect(calculatePriceRange(40)).toBe('premium');
      expect(calculatePriceRange(50)).toBe('premium');
    });

    it('should return luxury for rates > 50', () => {
      expect(calculatePriceRange(60)).toBe('luxury');
      expect(calculatePriceRange(100)).toBe('luxury');
    });

    it('should return null for invalid rates', () => {
      expect(calculatePriceRange('invalid')).toBe(null);
      expect(calculatePriceRange(NaN)).toBe(null);
    });
  });

  describe('formatPrice', () => {
    it('should format numeric price with euro symbol', () => {
      expect(formatPrice(25)).toBe('€25');
      expect(formatPrice(30.5)).toBe('€30.5');
    });

    it('should handle string numbers', () => {
      expect(formatPrice('25')).toBe('€25');
      expect(formatPrice('30.5')).toBe('€30.5');
    });

    it('should return original value for invalid price', () => {
      expect(formatPrice('free')).toBe('free');
      expect(formatPrice('contact')).toBe('contact');
    });
  });

  describe('formatPriceRange', () => {
    it('should format budget range', () => {
      expect(formatPriceRange('budget')).toBe('€10-20');
    });

    it('should format standard range', () => {
      expect(formatPriceRange('standard')).toBe('€20-35');
    });

    it('should format premium range', () => {
      expect(formatPriceRange('premium')).toBe('€35-50');
    });

    it('should format luxury range', () => {
      expect(formatPriceRange('luxury')).toBe('€50+');
    });

    it('should return original value for unknown range', () => {
      expect(formatPriceRange('custom')).toBe('custom');
      expect(formatPriceRange('unknown')).toBe('unknown');
    });
  });
});
