import { generateAvailabilitySlots } from '../availabilityService';
import { getDocs, runTransaction, serverTimestamp } from 'firebase/firestore';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => 'TIMESTAMP'),
  collectionGroup: jest.fn(),
}));

jest.mock('../userDatabaseService', () => ({
  getRoleCollectionInfo: jest.fn(() => ({
    serviceType: 'education',
    collection: 'teachers',
  })),
}));

jest.mock('../../config/firebaseConfig', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'teacher123' },
  },
}));

describe('availabilityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAvailabilitySlots', () => {
    it('should prevent duplicate slot generation', async () => {
      // Mock existing slots
      getDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'slot1',
            data: () => ({
              start: new Date('2025-01-15T09:00:00').toISOString(),
              end: new Date('2025-01-15T10:00:00').toISOString(),
            }),
          },
        ],
      });

      // Mock transaction
      runTransaction.mockImplementation(async (db, callback) => {
        await callback({
          get: jest.fn(),
          set: jest.fn(),
        });
      });

      const template = {
        daysOfWeek: [3], // Wednesday
        startTime: '09:00',
        endTime: '10:00',
        durationMin: 60,
      };

      const fromDate = new Date('2025-01-15'); // Wednesday
      const toDate = new Date('2025-01-15');

      const result = await generateAvailabilitySlots(
        'teacher123',
        template,
        fromDate,
        toDate,
        { userRole: 'teacher' }
      );

      // Should skip the overlapping slot
      expect(result.skippedCount).toBeGreaterThan(0);
    });

    it('should create slots on correct days', async () => {
      getDocs.mockResolvedValueOnce({ docs: [] });

      let slotsCreated = 0;
      runTransaction.mockImplementation(async (db, callback) => {
        await callback({
          get: jest.fn(),
          set: jest.fn(() => {
            slotsCreated++;
          }),
        });
      });

      const template = {
        daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
        startTime: '09:00',
        endTime: '11:00',
        durationMin: 60,
      };

      const fromDate = new Date('2025-01-13'); // Monday
      const toDate = new Date('2025-01-17'); // Friday

      await generateAvailabilitySlots('teacher123', template, fromDate, toDate, {
        userRole: 'teacher',
      });

      // Should create 2 slots per day (09:00-10:00, 10:00-11:00) for 3 days = 6 slots
      expect(slotsCreated).toBe(6);
    });
  });
});
