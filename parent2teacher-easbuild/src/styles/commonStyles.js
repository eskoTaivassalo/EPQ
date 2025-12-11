import { StyleSheet } from 'react-native';

/**
 * 🎨 Yhtenäinen väripaletti koko sovellukselle
 * 
 * Perusvärit - käytetään koko sovelluksessa
 */
export const colors = {
  // Päävärit - brändi-identiteetti
  primary: '#667EEA',        // Sinipurppura - pääpainikkeet, headerit
  primaryDark: '#5568D3',    // Tummempi sinipurppura - hover states
  primaryLight: '#8B9EF5',   // Vaaleampi sinipurppura - taustat
  
  secondary: '#764BA2',      // Syvä purppura - sekundääriset elementit
  secondaryDark: '#5F3C85',  // Tummempi purppura
  secondaryLight: '#9B6FC9', // Vaaleampi purppura
  
  // Neutraalit värit - tekstit ja taustat
  background: '#F8F9FA',     // Pääasiallinen tausta (vaalea harmaa)
  backgroundDark: '#E9ECEF', // Tummempi tausta
  surface: '#FFFFFF',        // Kortit, modaalit
  
  // Tekstivärit - hierarkia
  text: '#2C3E50',           // Pääasiallinen teksti (tumma siniharmaa)
  textSecondary: '#6C757D',  // Sekundäärinen teksti (keskiharmaa)
  textLight: '#ADB5BD',      // Vaalea teksti (vaalean harmaa)
  textDisabled: '#DEE2E6',   // Disabled teksti
  
  // Rajat ja erottimet
  border: '#DEE2E6',         // Oletusrajat
  borderLight: '#E9ECEF',    // Vaaleammat rajat
  borderDark: '#CED4DA',     // Tummemmat rajat
  divider: '#F1F3F5',        // Eroitinviivat
  
  // Tilat - semanttiset värit
  success: '#28A745',        // Onnistumiset, vahvistukset
  successLight: '#D4EDDA',   // Onnistumistaustallt
  successDark: '#1E7E34',    // Tumma onnistumisväri
  
  warning: '#FFC107',        // Varoitukset
  warningLight: '#FFF3CD',   // Varoitustaustat
  warningDark: '#E0A800',    // Tumma varoitusväri
  
  error: '#DC3545',          // Virheet
  errorLight: '#F8D7DA',     // Virhetaustat
  errorDark: '#BD2130',      // Tumma virheväri
  
  info: '#17A2B8',           // Informaatio
  infoLight: '#D1ECF1',      // Infotaustat
  infoDark: '#117A8B',       // Tumma infoväri
  
  // Erikoisvärit
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  
  // Varjot
  shadow: '#000000',
  shadowLight: 'rgba(0, 0, 0, 0.05)',
  shadowMedium: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.2)',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
};

/**
 * 🎨 Rooli-spesifit accent-värit
 * Käytetään roolien erottamiseen, mutta muut värit pysyvät yhtenäisinä
 */
export const roleAccents = {
  teacher: '#FF6B35',        // Oranssi
  parent: '#3498DB',         // Sininen
  therapist: '#9B59B6',      // Purppura
  therapyClient: '#8E44AD',  // Tumma purppura
  coach: '#2ECC71',          // Vihreä
  athlete: '#27AE60',        // Tumma vihreä
  admin: '#6366F1',          // Indigo
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: colors.surface,
    marginBottom: 15,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonSecondary: {
    backgroundColor: colors.secondary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  // Shadow helpers
  shadow: {
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  shadowLight: {
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  shadowHeavy: {
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
});