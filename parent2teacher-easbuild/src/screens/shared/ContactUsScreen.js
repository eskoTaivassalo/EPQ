import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { colors, commonStyles } from '../../styles/commonStyles';
import WatercolorBackground from '../../components/WatercolorBackground';
import { sendSupportMessage } from '../../services/communicationService';

const ContactUsScreen = ({ navigation }) => {
  const user = useSelector((state) => state.auth.user);
  const [formData, setFormData] = useState({
    name: user?.name || user?.displayName || '',
    email: user?.email || '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  const categories = [
    { id: 'general', label: 'General Inquiry', icon: 'help-circle' },
    { id: 'technical', label: 'Technical Issue', icon: 'bug' },
    { id: 'billing', label: 'Billing Question', icon: 'card' },
    { id: 'feedback', label: 'Feedback', icon: 'chatbubble' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
  ];

  const [selectedCategory, setSelectedCategory] = useState('general');

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (!formData.subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return false;
    }
    if (!formData.message.trim()) {
      Alert.alert('Error', 'Please enter your message');
      return false;
    }
    if (formData.message.trim().length < 10) {
      Alert.alert('Error', 'Please enter a message with at least 10 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Send message to all admins via internal messaging system
      const messages = await sendSupportMessage({
        userId: user?.uid || 'anonymous',
        senderName: formData.name.trim(),
        senderEmail: formData.email.trim(),
        senderRole: user?.role || 'guest',
        category: selectedCategory,
        subject: formData.subject.trim(),
        text: formData.message.trim(),
      });

      console.log(`✅ Support message sent to ${messages.length} admin(s)`);

      Alert.alert(
        '✅ Message Sent!',
        'Your message has been sent to our support team.\n\nAn admin will respond to you via the app messaging system soon.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Dashboard'),
          },
        ]
      );

      // Reset form
      setFormData({
        name: user?.name || user?.displayName || '',
        email: user?.email || '',
        subject: '',
        message: '',
      });
      setSelectedCategory('general');
    } catch (error) {
      console.error('❌ Error sending support message:', error);
      Alert.alert(
        'Error', 
        `Failed to send message: ${error.message}\n\nPlease try again or contact us at esko@edproquo.com`
      );
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.headerTitle}>Contact Us</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Intro */}
          <View style={styles.introCard}>
            <Ionicons name="mail" size={48} color={colors.primary} />
            <Text style={styles.introTitle}>Get in Touch</Text>
            <Text style={styles.introText}>
              We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </Text>
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoriesContainer}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category.id && styles.categoryChipSelected,
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Ionicons
                    name={category.icon}
                    size={18}
                    color={selectedCategory === category.id ? colors.white : colors.primary}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === category.id && styles.categoryTextSelected,
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Form */}
          <View style={styles.section}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={colors.textSecondary}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={colors.textSecondary}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Subject *</Text>
            <TextInput
              style={styles.input}
              placeholder="Brief summary of your message"
              placeholderTextColor={colors.textSecondary}
              value={formData.subject}
              onChangeText={(text) => setFormData({ ...formData, subject: text })}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Message *</Text>
            <TextInput
              style={[styles.input, styles.messageInput]}
              placeholder="Tell us more about your inquiry..."
              placeholderTextColor={colors.textSecondary}
              value={formData.message}
              onChangeText={(text) => setFormData({ ...formData, message: text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {formData.message.length} characters (min. 10)
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Ionicons name="hourglass" size={20} color={colors.white} />
                <Text style={styles.submitButtonText}>Sending...</Text>
              </>
            ) : (
              <>
                <Ionicons name="send" size={20} color={colors.white} />
                <Text style={styles.submitButtonText}>Send Message</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Alternative Contact */}
          <View style={styles.alternativeContact}>
            <Text style={styles.alternativeText}>Or email us directly at:</Text>
            <Text style={styles.emailLink}>esko@edproquo.com</Text>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  introCard: {
    ...commonStyles.card,
    margin: 16,
    padding: 24,
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
  },
  introText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 6,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: colors.white,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageInput: {
    height: 120,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    marginLeft: 8,
  },
  alternativeContact: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  alternativeText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emailLink: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default ContactUsScreen;
