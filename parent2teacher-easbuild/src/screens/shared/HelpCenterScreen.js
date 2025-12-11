import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/commonStyles';
import commonStyles from '../../styles/commonStyles';
import WatercolorBackground from '../../components/WatercolorBackground';

const HelpCenterScreen = ({ navigation }) => {
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    {
      id: 1,
      question: 'How do I book a session?',
      answer: 'Go to "Find Teachers" from the menu, browse available teachers, select their profile, choose an available time slot, and confirm your booking.',
    },
    {
      id: 2,
      question: 'How do I cancel a booking?',
      answer: 'Navigate to "Bookings" from the menu, find your booking, and tap the cancel button. Please note cancellation policies may apply.',
    },
    {
      id: 3,
      question: 'How do payments work?',
      answer: 'Payments are processed securely through Stripe. You can pay with credit/debit cards, Apple Pay, or Google Pay. Payment is collected when you confirm a booking.',
    },
    {
      id: 4,
      question: 'How do I become a teacher?',
      answer: 'Sign up as a teacher, complete your profile with qualifications and experience, set your hourly rate and availability, and start accepting bookings!',
    },
    {
      id: 5,
      question: 'How do I update my availability?',
      answer: 'Teachers can manage availability by going to "Availability" in the menu, where you can set your weekly schedule and block specific dates.',
    },
    {
      id: 6,
      question: 'How do I contact a teacher/student?',
      answer: 'Use the Messages feature to communicate with teachers or students. You can access messages from the main menu.',
    },
    {
      id: 7,
      question: 'How do I update my profile?',
      answer: 'Go to Settings → Profile to update your name, photo, location, bio, and other profile information.',
    },
    {
      id: 8,
      question: 'Is my data secure?',
      answer: 'Yes! We use industry-standard encryption and follow GDPR guidelines. Your payment information is never stored on our servers.',
    },
  ];

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const handleContactSupport = () => {
    const email = 'esko@edproquo.com';
    const subject = 'Support Request';
    const body = 'Hello,\n\nI need help with:\n\n';
    
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
      .catch(() => Alert.alert('Error', 'Could not open email client'));
  };

  const handleReportBug = () => {
    const email = 'esko@edproquo.com';
    const subject = 'Bug Report';
    const body = 'Bug Description:\n\n\nSteps to Reproduce:\n1. \n2. \n3. \n\nExpected Result:\n\n\nActual Result:\n\n';
    
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
      .catch(() => Alert.alert('Error', 'Could not open email client'));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <WatercolorBackground />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleContactSupport}
          >
            <Ionicons name="mail-outline" size={32} color={colors.primary} />
            <Text style={styles.actionTitle}>Contact Support</Text>
            <Text style={styles.actionSubtitle}>Get help from our team</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleReportBug}
          >
            <Ionicons name="bug-outline" size={32} color={colors.error} />
            <Text style={styles.actionTitle}>Report Bug</Text>
            <Text style={styles.actionSubtitle}>Help us improve</Text>
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          {faqs.map((faq, index) => (
            <View key={faq.id}>
              <TouchableOpacity
                style={styles.faqItem}
                onPress={() => toggleFaq(faq.id)}
              >
                <View style={styles.faqQuestion}>
                  <Ionicons
                    name={expandedFaq === faq.id ? 'chevron-down' : 'chevron-forward'}
                    size={20}
                    color={colors.primary}
                    style={styles.faqIcon}
                  />
                  <Text style={styles.faqQuestionText}>{faq.question}</Text>
                </View>
              </TouchableOpacity>
              
              {expandedFaq === faq.id && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                </View>
              )}
              
              {index < faqs.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Contact Info */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactCard}>
            <View style={styles.contactItem}>
              <Ionicons name="mail" size={20} color={colors.primary} />
              <Text style={styles.contactText}>esko@edproquo.com</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="time" size={20} color={colors.primary} />
              <Text style={styles.contactText}>Mon-Fri, 9AM-5PM EST</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="location" size={20} color={colors.primary} />
              <Text style={styles.contactText}>Available worldwide</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: commonStyles.safeArea,
  header: {
    ...commonStyles.rowBetween,
    padding: 16,
    backgroundColor: colors.primary,
    ...commonStyles.shadow,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionCard: {
    ...commonStyles.card,
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  actionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  faqSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  faqItem: {
    backgroundColor: colors.white,
    paddingVertical: 16,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faqIcon: {
    marginRight: 8,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  faqAnswer: {
    paddingLeft: 28,
    paddingRight: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  faqAnswerText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  contactSection: {
    padding: 16,
  },
  contactCard: commonStyles.card,
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  contactText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 12,
  },
  bottomSpacer: {
    height: 32,
  },
});

export default HelpCenterScreen;
