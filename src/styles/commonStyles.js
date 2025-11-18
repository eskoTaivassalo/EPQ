import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#4CAF50', // Vihreä (kuten sivustolla)
  secondary: '#FF9800', // Oranssi (kuten sivustolla)
  background: '#EFEFEF', // Hieman tummennettu tausta logon kanssa yhteensopivaksi
  white: '#FFFFFF',
  text: '#333333',
  textLight: '#666666',
  textSecondary: '#999999',
  border: '#E0E0E0',
  error: '#F44336',
  success: '#4CAF50',
  warning: '#FF9800'
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
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: colors.white,
    marginBottom: 15,
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
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
  }
});