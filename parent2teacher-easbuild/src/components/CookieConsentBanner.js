import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Switch, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GDPRService from '../services/gdprService';

/**
 * GDPR Cookie Consent Banner
 * 
 * Näyttää GDPR-yhteensopivan cookie/tracking suostumusbannerin
 * Sisältää yksityiskohtaiset asetukset ja selkeät kuvaukset
 * 
 * @param {function} onConsentGiven - Callback kun consent annetaan
 * @param {boolean} forceShow - Pakota banner näkyviin (testaus)
 */

const CookieConsentBanner = ({ onConsentGiven, forceShow = false }) => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consents, setConsents] = useState({});
  const [loading, setLoading] = useState(true);
  const [bannerData, setBannerData] = useState(null);

  useEffect(() => {
    initializeBanner();
  }, []);

  const initializeBanner = async () => {
    try {
      const data = await GDPRService.getConsentBannerData();
      setBannerData(data);
      setConsents(data.currentConsent);
      
      // 🧪 Jos forceShow = true, näytä aina (testaus)
      if (forceShow) {
        setShowBanner(true);
      } else {
        setShowBanner(data.showBanner);
      }
    } catch (error) {
      // Error initializing consent banner
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAll = async () => {
    try {
      const allConsents = {};
      bannerData?.consentTypes.forEach(type => {
        allConsents[type.type] = true;
      });

      await GDPRService.saveConsentSettings(allConsents);
      
      setShowBanner(false);
      
      if (onConsentGiven) {
        onConsentGiven(allConsents);
      }
    } catch (error) {
      // Error accepting all consents
    }
  };

  const handleRejectOptional = async () => {
    try {
      const minimalConsents = {};
      bannerData?.consentTypes.forEach(type => {
        minimalConsents[type.type] = type.required;
      });

      await GDPRService.saveConsentSettings(minimalConsents);
      
      setShowBanner(false);
      
      if (onConsentGiven) {
        onConsentGiven(minimalConsents);
      }
    } catch (error) {
      // Error rejecting optional consents
    }
  };

  const handleCustomSave = async () => {
    try {
      await GDPRService.saveConsentSettings(consents);
      setShowBanner(false);
      setShowDetails(false);
      onConsentGiven?.(consents);
    } catch (error) {
      // Error saving custom consents
    }
  };

  const toggleConsent = (consentType) => {
    // Ei voi poistaa pakollisia
    const consentData = bannerData?.consentTypes.find(c => c.type === consentType);
    if (consentData?.required) return;

    setConsents(prev => ({
      ...prev,
      [consentType]: !prev[consentType]
    }));
  };

  if (loading || !showBanner || !bannerData) {
    console.log('🚫 Banner hidden - loading:', loading, 'showBanner:', showBanner, 'bannerData:', !!bannerData);
    return null;
  }

  console.log('✅ Banner rendering - showBanner:', showBanner);

  return (
    <>
      {/* Päämainbanneri */}
      <View style={styles.banner}>
        <View style={styles.bannerContent}>
          <View style={styles.bannerHeader}>
            <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
            <Text style={styles.bannerTitle}>Privacy & Cookies</Text>
          </View>
          
          <Text style={styles.bannerText}>
            We use cookies and tracking technologies to improve our service. 
            You can manage your preferences and read more in our privacy policy.
          </Text>

          <View style={styles.bannerButtons} pointerEvents="box-none">
            <TouchableOpacity 
              style={styles.acceptAllButton}
              activeOpacity={0.7}
              onPress={() => {
                console.log('👆 ACCEPT ALL BUTTON PRESSED!');
                handleAcceptAll();
              }}
            >
              <Text style={styles.acceptAllText}>Accept all</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.rejectButton}
              activeOpacity={0.7}
              onPress={() => {
                console.log('👆 REJECT BUTTON PRESSED!');
                handleRejectOptional();
              }}
            >
              <Text style={styles.rejectText}>Only necessary</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingsButton}
              activeOpacity={0.7}
              onPress={() => {
                console.log('👆 SETTINGS BUTTON PRESSED!');
                setShowDetails(true);
              }}
            >
              <Text style={styles.settingsText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Yksityiskohtaiset asetukset Modal */}
      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cookie Settings</Text>
            <TouchableOpacity 
              onPress={() => setShowDetails(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              You can manage the use of cookies and tracking by selecting which 
              categories you accept. Necessary cookies are always enabled.
            </Text>

            {bannerData.consentTypes.map((consentType) => (
              <View key={consentType.type} style={styles.consentItem}>
                <View style={styles.consentHeader}>
                  <View style={styles.consentTitleRow}>
                    <Text style={styles.consentTitle}>
                      {consentType.title}
                    </Text>
                    {consentType.required && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    )}
                  </View>
                  
                  <Switch
                    value={!!consents[consentType.type]}
                    onValueChange={() => toggleConsent(consentType.type)}
                    disabled={consentType.required}
                    trackColor={{ false: '#ddd', true: '#4CAF50' }}
                    thumbColor={consents[consentType.type] ? '#fff' : '#f4f3f4'}
                  />
                </View>
                
                <Text style={styles.consentDescription}>
                  {consentType.description}
                </Text>

                {/* Lisätiedot per kategoria */}
                {consentType.type === GDPRService.CONSENT_TYPES.ANALYTICS && (
                  <Text style={styles.consentDetails}>
                    Includes: Google Analytics, app usage statistics, 
                    error tracking, and performance metrics.
                  </Text>
                )}

                {consentType.type === GDPRService.CONSENT_TYPES.MARKETING && (
                  <Text style={styles.consentDetails}>
                    Includes: targeted ads, newsletters, 
                    recommendations, and remarketing.
                  </Text>
                )}

                {consentType.type === GDPRService.CONSENT_TYPES.PERSONALIZATION && (
                  <Text style={styles.consentDetails}>
                    Includes: personalized recommendations, customized content, 
                    and tailored user experience.
                  </Text>
                )}
              </View>
            ))}

            <View style={styles.privacyInfo}>
              <Text style={styles.privacyTitle}>Privacy</Text>
              <Text style={styles.privacyText}>
                Read more about our data processing in our privacy policy. 
                You can change your settings or request data deletion at any time.
              </Text>
              <TouchableOpacity style={styles.privacyLink}>
                <Text style={styles.privacyLinkText}>
                  📄 Read privacy policy
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleCustomSave}
            >
              <Text style={styles.saveButtonText}>Save settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000
  },
  bannerContent: {
    padding: 16
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333'
  },
  bannerText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16
  },
  bannerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8
  },
  acceptAllButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    flex: 1,
    minWidth: 100
  },
  acceptAllText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14
  },
  rejectButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    flex: 1,
    minWidth: 100
  },
  rejectText: {
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14
  },
  settingsButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    flex: 1,
    minWidth: 100
  },
  settingsText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  closeButton: {
    padding: 4
  },
  modalContent: {
    flex: 1,
    padding: 16
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 24
  },
  consentItem: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  consentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  consentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  requiredBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8
  },
  requiredText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold'
  },
  consentDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 4
  },
  consentDetails: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    lineHeight: 16
  },
  privacyInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginTop: 16
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  privacyText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12
  },
  privacyLink: {
    alignSelf: 'flex-start'
  },
  privacyLinkText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600'
  },
  modalButtons: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center'
  }
});

export default CookieConsentBanner;