# Tietokantarakenteen uudistus

## Nykyinen ongelma
- Käyttäjät tallennetaan vain `teachers/` tai `parents/` kokoelmaan
- Ei tue monia rooleja samalle käyttäjälle
- Ei tue eri palveluluokkia (education, therapy, coaching, jne.)

## Uusi hierarkkinen rakenne

### 1. Pääkokoelma: `users/`
Kaikki käyttäjät samaan kokoelmaan riippumatta roolista.

```
users/{userId}
  ├── uid: string
  ├── email: string
  ├── displayName: string
  ├── emailVerified: boolean
  ├── roles: string[] // ['teacher', 'parent', 'therapist']
  ├── primaryRole: string // 'teacher'
  ├── createdAt: timestamp
  ├── updatedAt: timestamp
  └── profileImageUrl: string (optional)
```

### 2. Palvelukohtaiset alakokoelmat

#### Education (opetus)
```
users/{userId}/education/
  ├── teachers/{userId}/
  │     ├── subjects: string[]
  │     ├── hourlyRate: number
  │     ├── description: string
  │     ├── experience: string
  │     ├── education: string
  │     └── ...
  └── students/{userId}/
        ├── childrenAges: string
        ├── subjectsNeeded: string[]
        ├── goals: string
        └── ...
```

#### Therapy (terapia)
```
users/{userId}/therapy/
  ├── therapists/{userId}/
  │     ├── specializations: string[]
  │     ├── certifications: string[]
  │     ├── hourlyRate: number
  │     └── ...
  └── clients/{userId}/
        ├── needs: string[]
        ├── preferences: string
        └── ...
```

#### Coaching (valmennus)
```
users/{userId}/coaching/
  ├── coaches/{userId}/
  │     ├── expertise: string[]
  │     ├── hourlyRate: number
  │     └── ...
  └── athletes/{userId}/
        ├── goals: string[]
        ├── level: string
        └── ...
```

## Kyselyt

### Hae opettajat
```js
const teachersRef = collectionGroup(db, 'teachers');
const snapshot = await getDocs(teachersRef);
```

### Hae käyttäjän kaikki roolit
```js
const userRef = doc(db, 'users', userId);
const educationTeacherRef = doc(db, 'users', userId, 'education', 'teachers', userId);
const educationStudentRef = doc(db, 'users', userId, 'education', 'students', userId);
```

## Implementointisuunnitelma

### Vaihe 1: Luo uudet apufunktiot
- `getUserMainProfile(userId)` - Hae users/{userId}
- `getUserRoleProfile(userId, category, role)` - Hae roolitiedot
- `createUserWithRole(userData, category, role)` - Luo käyttäjä roolilla

### Vaihe 2: Päivitä authSlice.js
- registerUser: Tallenna users/ + education/teachers tai education/students
- loginUser: Lue users/ + tarkista roolit
- refreshUser: Päivitä molemmista

### Vaihe 3: Päivitä roleConfig.js
- Lisää category: 'education', 'therapy', 'coaching'
- Lisää collectionName: 'teachers' tai 'students'

### Vaihe 4: Migraatio
- Luo migraatioskripti vanhoille käyttäjille
- Kopioi teachers/ ja parents/ -> users/ rakenne

## Hyödyt
✅ Tukee monia rooleja per käyttäjä
✅ Skaalautuva uusille palveluille
✅ Selkeä hierarkia
✅ Nopeat kyselyt collectionGroup:lla
✅ Helppo lisätä uusia rooleja
