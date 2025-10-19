import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, commonStyles } from '../../styles/commonStyles';

const WelcomeScreen = ({ navigation }) => {
  const handleRoleSelection = (role) => {
    navigation.navigate('Login', { userType: role });
  };

  const handleSignupSelection = (role) => {
    if (role === 'teacher') {
      navigation.navigate('TeacherSignup');
    } else if (role === 'parent') {
      navigation.navigate('ParentSignup');
    } else {
      navigation.navigate('Login', { userType: role });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo ja otsikko */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="school" size={35} color={colors.white} />
          </View>
          <Text style={styles.appTitle}>Parents & Teachers</Text>
          <Text style={styles.appSubtitle}>
            Parenting Consultants with a click of your finger
          </Text>
        </View>

        {/* Role selection */}
        <View style={styles.roleSelection}>
          <Text style={styles.roleTitle}>Choose your role:</Text>
          
          <TouchableOpacity
            style={[styles.roleCard, styles.teacherCard]}
            onPress={() => handleRoleSelection('teacher')}
          >
            <View style={styles.roleIcon}>
              <Ionicons name="school" size={30} color={colors.secondary} />
            </View>
            <Text style={styles.roleCardTitle}>Teacher</Text>
            <Text style={styles.roleCardSubtitle}>
              Manage students, create profile and offer services globally
            </Text>
            <TouchableOpacity 
              style={styles.signupButton}
              onPress={() => handleSignupSelection('teacher')}
            >
              <Text style={styles.signupButtonText}>Join as Professional</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleCard, styles.parentCard]}
            onPress={() => handleRoleSelection('parent')}
          >
            <View style={styles.roleIcon}>
              <Ionicons name="heart" size={30} color="#E91E63" />
            </View>
            <Text style={styles.roleCardTitle}>Parent</Text>
            <Text style={styles.roleCardSubtitle}>
              Find and discover the best teachers for your child worldwide
            </Text>
            <TouchableOpacity 
              style={styles.signupButton}
              onPress={() => handleSignupSelection('parent')}
            >
              <Text style={styles.signupButtonText}>Join as Parent</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Welcome to the modern learning environment
          </Text>
          
          {/* General registration link */}
          <View style={styles.registrationSection}>
            <Text style={styles.registrationText}>
              New user? 
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('TeacherSignup')}>
              <Text style={styles.registrationLink}>Teacher</Text>
            </TouchableOpacity>
            <Text style={styles.registrationSeparator}> • </Text>
            <TouchableOpacity onPress={() => navigation.navigate('ParentSignup')}>
              <Text style={styles.registrationLink}>Parent</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 15,
    paddingBottom: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  roleSelection: {
    marginTop: 10,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 15,
  },
  roleCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.65,
    elevation: 6,
  },
  studentCard: {
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
  },
  teacherCard: {
    borderLeftWidth: 5,
    borderLeftColor: colors.secondary,
  },
  parentCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#E91E63',
  },
  roleIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  roleCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  roleCardSubtitle: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 10,
  },
  signupButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 5,
  },
  signupButtonText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    marginTop: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: colors.textLight,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  registrationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  registrationText: {
    fontSize: 11,
    color: colors.textLight,
  },
  registrationLink: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginHorizontal: 2,
  },
  registrationSeparator: {
    fontSize: 11,
    color: colors.textLight,
  },
});

export default WelcomeScreen;