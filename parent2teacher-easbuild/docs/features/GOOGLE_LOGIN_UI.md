# Google Sign-In LoginScreen Integration

## 📝 Päivitä LoginScreen.js lisäämään Google-kirjautumisnappi

### 1. Lisää import

```javascript
import { AuthService } from '../../services/authService';
```

### 2. Lisää Google-kirjautumis-handler

Lisää komponentin sisään (handleLogin-funktion jälkeen):

```javascript
const handleGoogleSignIn = async () => {
  try {
    setLoading(true);
    setError('');
    
    // Kirjaudu Googleen
    const userCredential = await AuthService.signInWithGoogle();
    
    console.log('✅ Google Sign-In successful!');
    // Käyttäjä ohjautuu automaattisesti sisään Redux authSlice:n kautta
    
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    setError(error.message || 'Google-kirjautuminen epäonnistui');
  } finally {
    setLoading(false);
  }
};
```

### 3. Lisää Google-nappi UI:hin

Lisää tämä login-napin jälkeen (ennen "Don't have an account?" -tekstiä):

```javascript
{/* Google Sign-In Button */}
<TouchableOpacity 
  style={styles.googleButton}
  onPress={handleGoogleSignIn}
  disabled={loading}
>
  <View style={styles.googleButtonContent}>
    <Text style={styles.googleIcon}>🔵</Text>
    <Text style={styles.googleButtonText}>
      Continue with Google
    </Text>
  </View>
</TouchableOpacity>

{/* OR Divider */}
<View style={styles.dividerContainer}>
  <View style={styles.divider} />
  <Text style={styles.dividerText}>OR</Text>
  <View style={styles.divider} />
</View>
```

### 4. Lisää tyylit

Lisää nämä styles-objektiin:

```javascript
googleButton: {
  backgroundColor: '#fff',
  padding: 15,
  borderRadius: 8,
  alignItems: 'center',
  marginTop: 15,
  borderWidth: 1,
  borderColor: '#ddd',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 2,
},
googleButtonContent: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
},
googleIcon: {
  fontSize: 20,
  marginRight: 10,
},
googleButtonText: {
  color: '#000',
  fontSize: 16,
  fontWeight: '600',
},
dividerContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginVertical: 20,
},
divider: {
  flex: 1,
  height: 1,
  backgroundColor: '#ddd',
},
dividerText: {
  marginHorizontal: 10,
  color: '#666',
  fontSize: 14,
  fontWeight: '500',
},
```

### 5. Lopullinen rakenne

Napit järjestyksessä:
1. Google Sign-In nappi (ylhäällä)
2. "OR" jakaja
3. Email/Password kentät
4. Login nappi
5. Forgot Password linkki
6. Sign Up linkki

---

## 🎨 Vaihtoehtoinen tyyli (Google-brändäys)

Jos haluat virallisen Google-tyylisen napin:

```javascript
googleButton: {
  backgroundColor: '#4285F4', // Google sininen
  padding: 15,
  borderRadius: 8,
  alignItems: 'center',
  marginTop: 15,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 3,
},
googleButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
},
```

---

## ✅ Checklist

- [ ] AuthService importattu
- [ ] handleGoogleSignIn-funktio lisätty
- [ ] Google-nappi lisätty UI:hin
- [ ] Tyylit lisätty
- [ ] Testattu että toimii

---

## 🔍 Debugging tips

Jos nappia painaessa ei tapahdu mitään:

1. Tarkista konsolista virheet:
```javascript
console.log('🔍 Starting Google Sign-In...');
```

2. Varmista että Web Client ID on oikein authService.js:ssä

3. Tarkista että Google Play Services on saatavilla:
```javascript
const hasPlayServices = await GoogleSignin.hasPlayServices();
console.log('Play Services available:', hasPlayServices);
```

4. Testaa oikealla laitteella (ei emulaattorilla) jos mahdollista

---

## 📸 Odotettu lopputulos

```
┌─────────────────────────────┐
│                             │
│  🔵 Continue with Google    │ ← Uusi nappi
│                             │
└─────────────────────────────┘

         ──── OR ────             ← Jakaja

┌─────────────────────────────┐
│  Email: ___________________  │
│  Password: _______________  │
│                             │
│  [Login]                    │ ← Vanha login
│                             │
│  Forgot Password?           │
│  Don't have account? Sign Up│
└─────────────────────────────┘
```

---

Kun olet lisännyt nämä, testaa sovellus! 🚀
