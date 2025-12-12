# Tietokantarakenteen Korjaus - 12.12.2025

## Ongelma
Sovelluksessa oli kaksi eri tietokantarakennetta sekoittuneena:
- **Vanha**: `teachers/{userId}`, `parents/{userId}`
- **Uusi**: `serviceTypes/education/{teachers|parents}/{userId}`

Lisäksi suosikit tallennettiin väärään paikkaan array-kenttänä profiilidokumentissa.

## Tehdyt Muutokset

### 1. Profiilin Luonti Korjattu ✅
**Tiedostot**: `src/store/slices/appDataSlice.js`

#### createTeacherProfile
- ❌ Ennen: `teachers/{randomId}`
- ✅ Nyt: `serviceTypes/education/teachers/{auth.currentUser.uid}`
- Käyttää autentikoitua käyttäjän UID:tä generoidun ID:n sijaan

#### createParentProfile  
- ❌ Ennen: `parents/{randomId}`
- ✅ Nyt: `serviceTypes/education/parents/{auth.currentUser.uid}`
- Käyttää autentikoitua käyttäjän UID:tä generoidun ID:n sijaan

### 2. Suosikki-järjestelmä Uudelleenrakennettu ✅
**Tiedostot**: 
- `src/store/slices/appDataSlice.js`
- `firestore.rules`

#### Vanha rakenne
```
serviceTypes/education/parents/{userId} {
  favoriteTeacherIds: [id1, id2, id3]  // Array kentässä
}
```

#### Uusi rakenne
```
serviceTypes/education/parents/{userId}/favorites/{teacherId} {
  teacherId: "xyz123",
  addedAt: timestamp
}
```

**Edut**:
- ✅ Selkeämpi rakenne
- ✅ Helpompi hallita (ei array-rajoitteita)
- ✅ Voidaan lisätä metadata (esim. addedAt)
- ✅ Parempi skaalautuvuus

### 3. Päivitetyt Funktiot

#### loadFavoritesForCurrentUser
- Lukee `favorites`-kokoelmasta
- Palauttaa teacherId-listan

#### addFavoriteTeacher
- Luo dokumentin: `favorites/{teacherId}`
- Tallentaa `teacherId` ja `addedAt` timestamp

#### removeFavoriteTeacher
- Poistaa dokumentin `favorites/{teacherId}`

### 4. Firestore-säännöt Päivitetty ✅
**Tiedosto**: `firestore.rules`

Lisätty `favorites`-kokoelman säännöt:
```javascript
match /favorites/{favoriteId} {
  allow read: if isOwner(userId);
  allow create: if isOwner(userId);
  allow update: if isOwner(userId);
  allow delete: if isOwner(userId);
}
```

### 5. Muut Korjatut Tiedostot

#### src/screens/shared/ClientsScreen.js
- Opettajan tietojen haku: `serviceTypes/education/teachers/{uid}`

#### src/services/communicationService.js
- Admin-haku: `serviceTypes/education/{teachers|parents}`

#### src/screens/auth/WelcomeScreen.js
- Featured teachers: `serviceTypes/education/teachers`

#### src/screens/admin/UserManagement.js
- Käyttäjien haku: `serviceTypes/education/{teachers|parents}`

#### src/screens/admin/AdminDashboard.js
- Dashboard-data: `serviceTypes/education/{teachers|parents}`

## Tietokantarakenne Nyt

```
Firestore Root
├── users/{userId}                                      # Firebase Auth käyttäjien perustiedot
│   └── notifications/{notificationId}                  # Push-ilmoitukset
│
├── serviceTypes/
│   └── education/
│       ├── teachers/{userId}                           # Opettajaprofiilit
│       │   ├── messages/{messageId}                    # Lähetetyt viestit
│       │   ├── availabilitySlots/{slotId}             # Aikataulut
│       │   ├── bookings/{bookingId}                    # Varaukset
│       │   └── favorites/{teacherId}                   # Suosikkiopettajat (jos opettaja)
│       │
│       └── parents/{userId}                            # Vanhemmat/oppilaat
│           ├── messages/{messageId}                    # Lähetetyt viestit
│           ├── bookings/{bookingId}                    # Varaukset
│           └── favorites/{teacherId}                   # ✅ Suosikkiopettajat
│
└── admins/{email}                                      # Admin-käyttäjät
```

## Migraatio-ohjeet

### Vanhan datan siirtäminen

Jos vanhassa tietokannassa on dataa, se pitää siirtää:

1. **Profiilit**:
   ```javascript
   // Vanha: teachers/{randomId}
   // Uusi: serviceTypes/education/teachers/{auth.uid}
   ```

2. **Suosikit**:
   ```javascript
   // Vanha: favoriteTeacherIds: [id1, id2]
   // Uusi: favorites/{teacherId} { teacherId, addedAt }
   ```

Migraatio-scripti tarvittaessa erikseen.

## Testaus

Testaa seuraavat toiminnot:
- ✅ Uuden opettajaprofiilin luonti
- ✅ Uuden vanhemman profiilin luonti
- ✅ Suosikkiopettajan lisääminen
- ✅ Suosikkiopettajan poistaminen
- ✅ Suosikkilistan lataaminen
- ✅ Viestien lähetys ja lukeminen
- ✅ Admin-dashboard datan lataaminen

## Hyödyt

1. **Yhtenäinen rakenne**: Kaikki käyttää `serviceTypes/education/{role}/{userId}`
2. **Skaalautuva suosikki-järjestelmä**: Ei array-rajoitteita, helppo hallita
3. **Selkeä data**: Jokainen rooli omassa kokoelmassaan
4. **Turvallinen**: Firestore-säännöt päivitetty
5. **Laajennettavuus**: Helppo lisätä muita serviceTypejä tulevaisuudessa

## Muutosloki
- 2025-12-12: Korjattu profiilin luonti ja suosikki-järjestelmä
- 2025-12-12: Päivitetty Firestore-säännöt
- 2025-12-12: Korjattu kaikki viittaukset käyttämään uutta rakennetta
