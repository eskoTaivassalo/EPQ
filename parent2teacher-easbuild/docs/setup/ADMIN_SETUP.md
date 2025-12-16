# Admin Setup Instructions

## How to Add Administrators

The app uses a secure admin system where **only users listed in the Firestore `admins` collection** can access admin features.

### Security Model

- ❌ Users **CANNOT** create admin accounts through the app UI
- ✅ Admins must be manually added to Firestore by a database administrator
- 🔒 Admin status is checked on every login via the `authSlice`
- 🛡️ Admin screens verify permissions before loading
- 🚫 Admin actions verify permissions before executing

### Adding an Admin User

#### Method 1: Firebase Console (Recommended)

1. Go to Firebase Console → Firestore Database
2. Navigate to the `admins` collection (create if it doesn't exist)
3. Add a new document with the following structure:

**Document ID:** Use the admin's email address (lowercase)
Example: `admin@example.com`

**Document Fields:**
```json
{
  "email": "admin@example.com",
  "role": "admin",
  "isActive": true,
  "createdAt": "2025-12-08T12:00:00.000Z",
  "createdBy": "system",
  "permissions": {
    "canManageUsers": true,
    "canViewAllBookings": true,
    "canViewSystemStats": true,
    "canModerateContent": true,
    "canAccessReports": true
  }
}
```

#### Method 2: Firebase CLI / Script

```javascript
// addAdmin.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function addAdmin(email) {
  const adminEmail = email.toLowerCase();
  
  await db.collection('admins').doc(adminEmail).set({
    email: adminEmail,
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBy: 'script',
    permissions: {
      canManageUsers: true,
      canViewAllBookings: true,
      canViewSystemStats: true,
      canModerateContent: true,
      canAccessReports: true
    }
  });
  
  console.log(`✅ Admin added: ${adminEmail}`);
}

// Usage
addAdmin('admin@example.com');
```

### Removing Admin Access

1. Go to Firestore → `admins` collection
2. Either:
   - Delete the document, OR
   - Set `isActive: false` in the document

### How Admin Login Works

1. User logs in with email/password
2. `authSlice.loginUser` checks Firestore `admins` collection
3. If email exists in `admins` collection:
   - `user.isAdmin = true`
   - `user.role = 'admin'`
4. Admin screens check `hasAdminPermission(authState)`
5. If not admin → redirect to regular Dashboard

### Security Rules (Firestore)

Add these rules to protect the `admins` collection:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin collection - only admins can read, nobody can write from client
    match /admins/{adminId} {
      allow read: if request.auth != null && 
                    get(/databases/$(database)/documents/admins/$(request.auth.token.email)).data.role == 'admin';
      allow write: if false; // Only server-side scripts can modify
    }
  }
}
```

### Testing Admin Access

1. Add your email to `admins` collection in Firestore
2. Log out of the app
3. Log in with that email
4. Check console logs for: `✅ Redux: User is ADMIN`
5. Navigate to admin screens (if available in navigation)

### Current Admin Screens

- `AdminDashboard` - Overview with stats and quick actions
- `UserManagement` - Manage all users (activate/deactivate/delete)
- `AdminStatistics` - System-wide statistics (TODO)
- `AdminBookings` - View all bookings (TODO)
- `AdminReports` - User reports and moderation (TODO)

### Important Notes

⚠️ **Never** allow users to self-promote to admin through the app
⚠️ Always use lowercase emails in the `admins` collection
⚠️ Keep admin credentials secure
⚠️ Regularly audit the `admins` collection
⚠️ Consider implementing 2FA for admin accounts

### Example Admin Emails Structure

```
admins/
  ├── admin@example.com
  │   ├── email: "admin@example.com"
  │   ├── role: "admin"
  │   └── isActive: true
  ├── superadmin@example.com
  │   ├── email: "superadmin@example.com"
  │   ├── role: "admin"
  │   └── isActive: true
  └── moderator@example.com
      ├── email: "moderator@example.com"
      ├── role: "admin"
      └── isActive: true
```
