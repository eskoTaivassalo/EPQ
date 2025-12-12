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
  teacher: '#E8824C',        // Pehmeä oranssi
  parent: '#E87D72',         // Pehmeä punainen
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

  // Screen containers
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  contentContainer: {
    padding: 20,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // List items
  listItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  listItemPressed: {
    backgroundColor: colors.backgroundDark,
    transform: [{ scale: 0.98 }],
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Badges and status indicators
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  badgePending: {
    backgroundColor: colors.warning,
  },
  badgeSuccess: {
    backgroundColor: colors.success,
  },
  badgeError: {
    backgroundColor: colors.error,
  },
  badgeInfo: {
    backgroundColor: colors.info,
  },

  // Buttons variants
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonOutlineText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: colors.borderDark,
    opacity: 0.6,
  },
  buttonSmall: {
    padding: 10,
    borderRadius: 6,
  },
  buttonLarge: {
    padding: 18,
    borderRadius: 10,
  },

  // Form elements
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  labelRequired: {
    color: colors.error,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
  },
  modalButtonSecondary: {
    backgroundColor: colors.textSecondary,
  },

  // Headers and sections
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionSubheader: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 16,
  },

  // Empty states
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    marginBottom: 16,
    opacity: 0.4,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Row layouts
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Spacing helpers
  mt8: { marginTop: 8 },
  mt16: { marginTop: 16 },
  mt24: { marginTop: 24 },
  mb8: { marginBottom: 8 },
  mb16: { marginBottom: 16 },
  mb24: { marginBottom: 24 },
  ml8: { marginLeft: 8 },
  ml16: { marginLeft: 16 },
  mr8: { marginRight: 8 },
  mr16: { marginRight: 16 },
  p8: { padding: 8 },
  p16: { padding: 16 },
  p24: { padding: 24 },
});