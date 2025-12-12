# Feedback Storage Structure

## Overview
Feedback is now stored as a subcollection under each user's profile in the serviceTypes hierarchy, instead of a top-level `feedback` collection.

## New Structure

```
serviceTypes/
  ├─ education/
  │   ├─ teachers/
  │   │   └─ {teacherId}/
  │   │       ├─ (teacher profile fields)
  │   │       ├─ bookings/
  │   │       ├─ notifications/
  │   │       └─ feedback/          ← Feedback received by this teacher
  │   │           └─ {feedbackId}
  │   │               ├─ fromUserId: string
  │   │               ├─ toUserId: string
  │   │               ├─ roleFrom: string
  │   │               ├─ roleTo: string
  │   │               ├─ feedbackText: string
  │   │               ├─ rating: number (optional)
  │   │               ├─ bookingId: string (optional)
  │   │               ├─ categories: array
  │   │               └─ createdAt: timestamp
  │   └─ parents/
  │       └─ {parentId}/
  │           ├─ (parent profile fields)
  │           ├─ bookings/
  │           ├─ notifications/
  │           └─ feedback/          ← Feedback received by this parent
  │               └─ {feedbackId}
  │                   ├─ (same fields as above)
```

## Benefits

1. **Organized Data**: All user-related data (bookings, notifications, feedback) in one place
2. **Easy Access**: Read all feedback for a user without complex queries
3. **Consistent Structure**: Follows the same pattern as bookings and notifications
4. **Better Performance**: Direct path access instead of filtered queries
5. **Clearer Ownership**: Feedback belongs to the receiver's profile

## Code Changes

### feedbackService.js

#### addFeedback()
- Now uses `getRoleCollectionInfo()` to determine receiver's collection path
- Saves feedback to: `serviceTypes/{serviceType}/{collectionName}/{toUserId}/feedback`
- Example: Teacher gives feedback to parent → saved in parent's feedback subcollection

#### listFeedbackForUser(userId, userRole)
- **NEW PARAMETER**: `userRole` required to build correct path
- Reads from: `serviceTypes/{serviceType}/{collectionName}/{userId}/feedback`
- Returns all feedback received by the user

#### listFeedbackGivenByUser(userId)
- Uses `collectionGroup('feedback')` to find all feedback given by user
- Searches across all feedback subcollections in the database

## Usage Examples

### Give Feedback (Teacher to Parent)
```javascript
await addFeedback({
  fromUserId: teacherId,
  toUserId: parentId,
  roleFrom: 'teacher',
  roleTo: 'parent',
  feedbackText: 'Great progress this week!',
  rating: 5,
  bookingId: 'booking123'
});
// Saves to: serviceTypes/education/parents/{parentId}/feedback/{newId}
```

### Get Feedback Received
```javascript
const feedbacks = await listFeedbackForUser(userId, 'parent');
// Reads from: serviceTypes/education/parents/{userId}/feedback
```

### Get Feedback Given
```javascript
const myFeedbacks = await listFeedbackGivenByUser(teacherId);
// Uses collectionGroup to find all feedback where fromUserId === teacherId
```

## Migration Notes

### Old Structure (Before)
```
feedback/
  └─ {feedbackId}/
      ├─ fromUserId: "teacher123"
      ├─ toUserId: "parent456"
      ├─ feedbackText: "Good work!"
      └─ ...
```

### New Structure (After)
```
serviceTypes/education/parents/parent456/
  └─ feedback/
      └─ {feedbackId}/
          ├─ fromUserId: "teacher123"
          ├─ toUserId: "parent456"
          ├─ feedbackText: "Good work!"
          └─ ...
```

## Security Rules

When implementing proper security rules (currently all authenticated users have access), remember to add rules for feedback subcollections:

```javascript
// Allow users to read their own feedback
match /serviceTypes/{serviceType}/{collection}/{userId}/feedback/{feedbackId} {
  allow read: if request.auth != null && 
    (request.auth.uid == userId || resource.data.fromUserId == request.auth.uid);
  allow create: if request.auth != null && 
    request.auth.uid == request.resource.data.fromUserId;
  allow update, delete: if false; // Feedback is immutable
}
```

## Testing

1. **Create Feedback**: 
   - Open Students screen as teacher
   - Click "Give Feedback" on a student
   - Submit feedback
   - Check Firestore: `serviceTypes/education/parents/{parentId}/feedback`

2. **Verify Location**:
   - Feedback should appear under parent's profile
   - Not in root-level `feedback` collection
   - Contains all required fields

3. **Check Console Logs**:
   - Look for: "💬 Saving feedback to path: serviceTypes/education/parents/{id}/feedback"
   - Look for: "💬 Feedback saved with ID: {feedbackId}"

## Future Enhancements

- [ ] Add feedback display in parent's profile view
- [ ] Show feedback history in student details
- [ ] Add feedback notifications
- [ ] Implement feedback analytics/stats
- [ ] Add ability to respond to feedback
- [ ] Filter feedback by subject or date range
