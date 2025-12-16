# Ilmoitusten hallinta (Facebook-tyyli)

## Ominaisuudet

### 1. **Batch-toiminnot**
- **Merkitse kaikki luetuiksi**: Merkitsee kaikki lukemattomat ilmoitukset kerralla luetuiksi
- **Poista luetut**: Poistaa kaikki luetut ilmoitukset (batch delete)
- **Poista vanhat**: Poistaa automaattisesti yli 30 päivää vanhat ilmoitukset

### 2. **Swipe-to-delete**
- Pyyhkäise ilmoitusta vasemmalle nähdäksesi "Poista"-painikkeen
- Käyttää `react-native-gesture-handler` Swipeable-komponenttia
- Punainen "trash"-kuvake ja teksti

### 3. **Automaattinen siivous**
- Kun käyttäjä avaa ilmoitukset, poistetaan automaattisesti yli 30 pv vanhat
- Tapahtuu taustalla `useEffect`-hookissa
- Ei häiritse käyttäjää, ei vahvistuskysymystä

### 4. **Ryhmittely päivämäärän mukaan**
- **Tänään**: Tämän päivän ilmoitukset
- **Eilen**: Eilisen ilmoitukset
- **Tällä viikolla**: 7 päivän sisällä
- **Vanhemmat**: Yli viikko vanhoja

### 5. **Lukemattomien laskuri**
- Näkyy otsikossa: "Ilmoitukset (3)"
- Badge-tyylinen sininen piste ilmoituksessa
- Päivittyy reaaliajassa

### 6. **3-piste valikko**
- Oikeassa yläkulmassa (iOS/Facebook-tyyli)
- Avautuu päälle "dropdown"-tyylisesti
- Sisältää kaikki batch-toiminnot

## Käyttäjän toiminnot

### Yksittäinen ilmoitus
1. **Klikkaa** → Merkitään luetuksi + navigoi kohteeseen
2. **Pyyhkäise vasemmalle** → Näytä "Poista"-painike
3. **Klikkaa "Poista"** → Poistaa ilmoituksen

### Batch-toiminnot (valikko)
1. **Merkitse kaikki luetuiksi** → Kaikki lukemattomat → luettuja (ei poista)
2. **Poista luetut (X)** → Vahvistuskysymys → poistaa kaikki luetut
3. **Poista yli 30 pv vanhat** → Vahvistuskysymys → poistaa vanhat

## Tekninen toteutus

### Redux Actions (notificationsSlice.js)

```javascript
// Olemassa olevat
- fetchNotifications(userId)
- createNotification(data)
- markAsRead(notificationId)
- markAllAsRead(userId)

// Uudet batch-toiminnot
- deleteNotification(notificationId)        // Yksittäinen poisto
- clearReadNotifications(userId)            // Poista luetut
- deleteOldNotifications(userId)            // Poista yli 30 pv vanhat
```

### NotificationsScreen.js

**Komponentit:**
- `Swipeable` (react-native-gesture-handler)
- `FlatList` ryhmitellyllä datalla
- 3-piste valikko (`showMenu` state)

**Funktiot:**
- `groupNotificationsByDate()` - Ryhmittely päivämäärän mukaan
- `renderRightActions()` - Swipe-delete UI
- `renderSectionHeader()` - Päivämäärä-otsikot
- `handleDelete()` - Yksittäinen poisto
- `handleClearRead()` - Batch-poisto luetuille
- `handleClearOld()` - Batch-poisto vanhoille

## Firestore Rules

Ilmoitusten poisto sallittu:
```javascript
match /notifications/{notificationId} {
  allow delete: if isAuthenticated() && 
                  request.auth.uid == resource.data.userId;
}
```

## Facebook-tyylinen käyttökokemus

### Visuaaliset elementit
✅ Lukematon = sininen piste oikealla + lihavoitu otsikko + vasen sininen viiva  
✅ Luettu = tavallinen teksti, ei pistettä  
✅ Ryhmitellyt otsikot = "TÄNÄÄN", "EILEN" jne. (uppercase, harmaa)  
✅ Swipe-delete = punainen tausta, trash-ikoni  
✅ 3-piste valikko = oikeassa yläkulmassa, valkoinen card dropshadow:lla  

### Käytettävyys
✅ Pull-to-refresh = päivitä ilmoitukset  
✅ Automaattinen siivous taustalla = ei häiriötä  
✅ Vahvistuskysymykset = vain batch-poistoille  
✅ Laskurit = "Poista luetut (5)" jne.  
✅ Tyhjä tila = ikoni + selitys  

## Tulevaisuuden parannukset

1. **Push-notifikaatioiden hallinta**
   - Mykistä ilmoitukset X tunniksi
   - Ilmoitusasetukset tyypeittäin

2. **Suodattimet**
   - Näytä vain lukemattomat
   - Suodata ilmoitustyypeittäin

3. **Arkisto**
   - Arkistoi ilmoitus (piilota, älä poista)
   - "Näytä arkistoidut" -nappi

4. **Ryhmäilmoitukset**
   - "Sinulla on 5 uutta varausta" → yksi ilmoitus, avaa lista

5. **Inline-toiminnot**
   - Hyväksy/hylkää suoraan ilmoituksesta (booking requests)
   - Vastaa viestiin suoraan ilmoituksesta
