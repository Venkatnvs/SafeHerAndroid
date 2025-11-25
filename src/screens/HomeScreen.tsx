import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  StatusBar,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Contacts from 'react-native-contacts';
import { request, RESULTS, PERMISSIONS, check } from 'react-native-permissions';
import { Linking, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useEmergency } from '../context/EmergencyContext';
import { useLocation } from '../context/LocationContext';
import { INDIAN_EMERGENCY_NUMBERS } from '../constants/IndianEmergencyNumbers';
import QuotesService, { MotivationalQuote } from '../services/QuotesService';

const { width, height } = Dimensions.get('window');

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { triggerSOS, currentAlert, isVoiceEnabled, isListening } = useEmergency();
  const { 
    currentLocation, 
    safeZones, 
    isLocationEnabled, 
    requestLocationPermission, 
    startLocationTracking 
  } = useLocation();
  
  const [motivationalQuote, setMotivationalQuote] = useState<MotivationalQuote | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [quickContacts, setQuickContacts] = useState<{ name: string; phone: string }[]>([]);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [allContacts, setAllContacts] = useState<{ name: string; phone: string; id: string }[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<{ name: string; phone: string; id: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<{ name: string; phone: string; id: string }[]>([]);

  useEffect(() => {
    loadMotivationalQuote();

    // Update time every minute
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }));
    };

    updateTime();
    const timeInterval = setInterval(updateTime, 60000);

    const requestAllPermissions = async () => {
      if (Platform.OS === 'android') {
        const androidPermissions = [
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
          PERMISSIONS.ANDROID.READ_CONTACTS,
          PERMISSIONS.ANDROID.RECORD_AUDIO,
          PERMISSIONS.ANDROID.CAMERA,
          PERMISSIONS.ANDROID.CALL_PHONE,
          PERMISSIONS.ANDROID.SEND_SMS,
        ];

        for (const permission of androidPermissions) {
          try {
            const result = await request(permission);
            console.log(`Android Permission ${permission}: ${result}`);
          } catch (error) {
            console.error(`Error requesting Android permission ${permission}:`, error);
          }
        }
      }
    };

    // Request location permission and start tracking
    const initializeLocation = async () => {
      await requestAllPermissions();
      
      if (!isLocationEnabled) {
        const granted = await requestLocationPermission();
        if (granted) {
          startLocationTracking();
        } else {
          Alert.alert(
            'Location Permission Required',
            'SafeHer needs location access to provide emergency services, send your location to guardians, and find nearby safe zones. Please enable location permission in settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
      } else {
        startLocationTracking();
      }
    };

    initializeLocation();

    return () => {
      clearInterval(timeInterval);
    };
  }, [isLocationEnabled, requestLocationPermission, startLocationTracking]);

  const loadMotivationalQuote = async () => {
    try {
      await QuotesService.fetchQuotes();
      const currentQuote = QuotesService.getCurrentQuote();
      if (currentQuote) {
        setMotivationalQuote(currentQuote);
      }
    } catch (error) {
      console.error('Error loading motivational quote:', error);
      // Fallback to a default quote
      setMotivationalQuote({
        id: 'default',
        text: "You are stronger than you think, braver than you believe, and more capable than you know.",
        index: 0,
        createdAt: new Date(),
        isActive: true
      });
    }
  };

  const handleSwipeQuote = (direction: 'left' | 'right') => {
    const newQuote = direction === 'left' 
      ? QuotesService.getNextQuote() 
      : QuotesService.getPreviousQuote();
    
    if (newQuote) {
      // Just change the quote without any animation
      setMotivationalQuote(newQuote);
    }
  };

  const onPanHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === 5) { // END state
      const { translationX, velocityX } = event.nativeEvent;
      
      if (Math.abs(translationX) > width * 0.3 || Math.abs(velocityX) > 500) {
        const direction = translationX > 0 ? 'right' : 'left';
        handleSwipeQuote(direction);
      }
    }
  };

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('quickDialContacts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setQuickContacts(parsed.slice(0, 2));
        } catch {}
      }
    })();
  }, []);

  const handleSOSPress = async () => {
    console.log('🔴 SOS Button Pressed');
    console.log('🔴 Current Alert Status:', currentAlert);
    console.log('🔴 Current Alert ID:', currentAlert?.id);
    console.log('🔴 Current Alert Status:', currentAlert?.status);
    
    // Add a small delay to ensure state is properly updated
    await new Promise((resolve: any) => setTimeout(resolve as any, 100));
    
    if (currentAlert && currentAlert.status === 'active') {
      console.log('🔴 Emergency already active - navigating to Emergency screen');
      console.log('🔴 Alert details:', {
        id: currentAlert.id,
        status: currentAlert.status,
        timestamp: currentAlert.timestamp
      });
      navigation.navigate('Emergency' as never);
      return;
    }
    
    console.log('🔴 No active emergency - triggering new SOS');
    try {
      await triggerSOS('One-tap SOS triggered from home screen');
      
      // Wait a moment for state to update, then navigate
      setTimeout(() => {
        console.log('🔴 Navigating to Emergency screen after SOS trigger');
        try {
          navigation.navigate('Emergency' as never);
        } catch (navError) {
          console.error('🔴 Navigation error:', navError);
          // Try alternative navigation method
          try {
            (navigation as any).push('Emergency');
          } catch (pushError) {
            console.error('🔴 Push navigation also failed:', pushError);
            Alert.alert('Emergency Active', 'SOS has been triggered. Please navigate to Emergency screen manually.');
          }
        }
      }, 300); // Small delay to ensure state is updated
    } catch (error) {
      console.error('🔴 Error triggering SOS:', error);
      Alert.alert('Error', 'Failed to trigger SOS. Please try again.');
    }
  };

  const QuickActionButton = ({ icon, title, subtitle, onPress, color }: any) => (
    <TouchableOpacity style={styles.quickActionButton} onPress={onPress}>
      <LinearGradient
        colors={[color, `${color}CC`]}
        style={styles.quickActionGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Icon name={icon} size={32} color="white" />
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const requestContactsPermission = async (): Promise<boolean> => {
    try {
      const permission = Platform.OS === 'ios' ? PERMISSIONS.IOS.CONTACTS : PERMISSIONS.ANDROID.READ_CONTACTS;
      const result = await request(permission);
      return result === RESULTS.GRANTED || result === RESULTS.LIMITED;
    } catch {
      return false;
    }
  };

  const pickQuickContacts = async () => {
    const granted = await requestContactsPermission();
    if (!granted) {
      Alert.alert('Permission required', 'Contacts permission is needed to pick quick-dial contacts.');
      return;
    }
    
    try {
      const contacts = await Contacts.getAll();
      if (!contacts || contacts.length === 0) {
        Alert.alert('No contacts', 'Your contact list appears to be empty.');
        return;
      }

      // Process contacts and get unique entries
      const processedContacts = contacts
        .map((c, index) => {
          const phone = (c.phoneNumbers && c.phoneNumbers[0] && c.phoneNumbers[0].number) || '';
          const name = [c.givenName, c.familyName].filter(Boolean).join(' ') || c.displayName || 'Unknown';
          return { name, phone, id: `${index}-${phone}` };
        })
        .filter(c => !!c.phone)
        .reduce((acc, current) => {
          // Remove duplicates based on phone number
          const existing = acc.find(item => item.phone === current.phone);
          if (!existing) {
            acc.push(current);
          }
          return acc;
        }, [] as { name: string; phone: string; id: string }[]);

      if (processedContacts.length === 0) {
        Alert.alert('No numbers', 'Could not find contacts with phone numbers.');
        return;
      }

      setAllContacts(processedContacts);
      setFilteredContacts(processedContacts);
      setSelectedContacts([]);
      setSearchQuery('');
      setContactModalVisible(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to access contacts.');
    }
  };

  const handleSearchContacts = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredContacts(allContacts);
    } else {
      const filtered = allContacts.filter(contact =>
        contact.name.toLowerCase().includes(query.toLowerCase()) ||
        contact.phone.includes(query)
      );
      setFilteredContacts(filtered);
    }
  };

  const toggleContactSelection = (contact: { name: string; phone: string; id: string }) => {
    const isSelected = selectedContacts.some(c => c.id === contact.id);
    if (isSelected) {
      setSelectedContacts(selectedContacts.filter(c => c.id !== contact.id));
    } else if (selectedContacts.length < 5) { // Limit to 5 contacts
      setSelectedContacts([...selectedContacts, contact]);
    } else {
      Alert.alert('Limit Reached', 'You can select maximum 5 contacts for quick dial.');
    }
  };

  const saveSelectedContacts = async () => {
    if (selectedContacts.length === 0) {
      Alert.alert('No Selection', 'Please select at least one contact.');
      return;
    }

    const contactsToSave = selectedContacts.map(c => ({ name: c.name, phone: c.phone }));
    setQuickContacts(contactsToSave);
    await AsyncStorage.setItem('quickDialContacts', JSON.stringify(contactsToSave));
    setContactModalVisible(false);
    Alert.alert('Saved', `Quick-dial contacts updated. ${contactsToSave.length} contact(s) added.`);
  };

  const removeQuickContact = async (index: number) => {
    const updatedContacts = quickContacts.filter((_, i) => i !== index);
    setQuickContacts(updatedContacts);
    await AsyncStorage.setItem('quickDialContacts', JSON.stringify(updatedContacts));
  };

  const callPhoneNumber = (phone: string) => {
    if (!phone) return;
    const url = `tel:${phone.replace(/\s|-/g, '')}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#E91E63" />
      
      {/* Header */}
      <LinearGradient
        colors={['#E91E63', '#C2185B']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.displayName || 'Hero'}</Text>
            <Text style={styles.time}>{currentTime}</Text>
          </View>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Profile' as never)}
          >
            <Icon name="cog" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Motivational Section */}
        {/* Motivational Quote Card with Swipe */}
        <View style={styles.motivationalSection}>
          <Text style={styles.sectionTitle}>Daily Inspiration</Text>
          <PanGestureHandler
            onHandlerStateChange={onPanHandlerStateChange}
          >
            <View style={styles.motivationalCardContainer}>
              <LinearGradient
                colors={['#FF6B9D', '#C44569']}
                style={styles.motivationalCard}
              >
                <Icon name="heart" size={32} color="white" style={styles.motivationalIcon} />
                <Text style={styles.motivationalText}>
                  {motivationalQuote?.text || "Loading inspiration..."}
                </Text>
                <View style={styles.swipeIndicator}>
                  <Icon name="gesture-swipe-horizontal" size={16} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.swipeText}>Swipe for more</Text>
                </View>
              </LinearGradient>
            </View>
          </PanGestureHandler>
        </View>

        {/* SOS Button Section */}
        <View style={styles.sosSection}>
          <Text style={styles.sosTitle}>Emergency SOS</Text>
          <Text style={styles.sosSubtitle}>Tap to get immediate help</Text>
          
          <TouchableOpacity
            style={[
              styles.sosButton,
              currentAlert && styles.sosButtonActive
            ]}
            onPress={handleSOSPress}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={currentAlert ? ['#F44336', '#D32F2F'] : ['#FF5722', '#E64A19']}
              style={styles.sosButtonGradient}
            >
              <Icon 
                name={currentAlert ? "phone-alert" : "alert-circle"} 
                size={80} 
                color="white" 
              />
              <Text style={styles.sosButtonText}>
                {currentAlert ? 'EMERGENCY ACTIVE' : 'SOS'}
              </Text>
              <Text style={styles.sosButtonSubtext}>
                {currentAlert ? 'Tap to resolve' : 'Tap for help'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Quick Dial buttons under SOS */}
          <View style={styles.quickDialContainer}>
            <View style={styles.quickDialHeader}>
              <Text style={styles.quickDialTitle}>Quick Dial Contacts</Text>
              <TouchableOpacity style={styles.quickDialAddButton} onPress={pickQuickContacts}>
                <Icon name="account-plus" size={16} color="#E91E63" />
                <Text style={styles.quickDialAddText}>Add</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.quickDialScrollView}
              contentContainerStyle={styles.quickDialContent}
            >
              {quickContacts.map((contact, idx) => (
                <View key={idx} style={styles.quickDialItem}>
                  <TouchableOpacity 
                    style={styles.quickDialButton} 
                    onPress={() => callPhoneNumber(contact.phone)}
                  >
                    <Icon name="phone" size={20} color="#fff" />
                    <Text style={styles.quickDialText} numberOfLines={1}>{contact.name}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.removeContactButton}
                    onPress={() => removeQuickContact(idx)}
                  >
                    <Icon name="close" size={14} color="#F44336" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {quickContacts.length === 0 && (
                <TouchableOpacity style={styles.emptyQuickDial} onPress={pickQuickContacts}>
                  <Icon name="account-plus" size={24} color="#E91E63" />
                  <Text style={styles.emptyQuickDialText}>Add Quick Dial Contacts</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionButton
              icon="map-marker"
              title="Safe Zones"
              subtitle="Find nearby help"
              onPress={() => navigation.navigate('SafeZones' as never)}
              color="#2196F3"
            />
            <QuickActionButton
              icon="shield"
              title="Guardian"
              subtitle="View dashboard"
              onPress={() => navigation.navigate('Guardian' as never)}
              color="#4CAF50"
            />
            <QuickActionButton
              icon="shield"
              title="Self Defense"
              subtitle="Learn techniques"
              onPress={() => navigation.navigate('SelfDefense' as never)}
              color="#FF9800"
            />
            <QuickActionButton
              icon="phone"
              title="Emergency"
              subtitle="Call 100 for Police"
              onPress={() => callPhoneNumber(INDIAN_EMERGENCY_NUMBERS.POLICE)}
              color="#F44336"
            />
          </View>
        </View>

        {/* Location Status */}
        <View style={styles.locationSection}>
          <LinearGradient
            colors={isLocationEnabled ? ['#4CAF50', '#388E3C'] : ['#F44336', '#D32F2F']}
            style={styles.locationCard}
          >
            <Icon 
              name={isLocationEnabled ? "crosshairs-gps" : "map-marker"} 
              size={24} 
              color="white" 
            />
            <Text style={styles.locationText}>
              {isLocationEnabled 
                ? `Location tracking active • ${safeZones.length} safe zones nearby`
                : 'Location permission required for emergency services'
              }
            </Text>
          </LinearGradient>
        </View>

        {/* Voice Detection Status */}
        <View style={styles.locationSection}>
          <LinearGradient
            colors={isVoiceEnabled ? (isListening ? ['#FF9800', '#F57C00'] : ['#4CAF50', '#388E3C']) : ['#9E9E9E', '#757575']}
            style={styles.locationCard}
          >
            <Icon 
              name={isVoiceEnabled ? (isListening ? "microphone" : "microphone-off") : "microphone-off"} 
              size={24} 
              color="white" 
            />
            <Text style={styles.locationText}>
              {isVoiceEnabled 
                ? (isListening 
                  ? 'Voice detection active • Say "help" or "emergency"'
                  : 'Voice detection enabled • Starting...'
                )
                : 'Voice detection disabled • Enable in Profile settings'
              }
            </Text>
          </LinearGradient>
          
        </View>
        <View style={styles.emergencyNumbersSection}>
          <Text style={styles.sectionTitle}>Indian Emergency Numbers</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {INDIAN_EMERGENCY_NUMBERS.QUICK_DIAL_OPTIONS.map((service, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.emergencyNumberChip}
                onPress={() => callPhoneNumber(service.number)}
              >
                <Icon name={service.icon} size={20} color="#E91E63" />
                <Text style={styles.emergencyNumberName}>{service.name}</Text>
                <Text style={styles.emergencyNumberValue}>{service.number}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Emergency Contacts Preview */}
        {user?.emergencyContacts && user.emergencyContacts.length > 0 && (
          <View style={styles.contactsSection}>
            <Text style={styles.sectionTitle}>Your Emergency Contacts</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {user.emergencyContacts.slice(0, 5).map((contact, index) => (
                <View key={contact.id} style={styles.contactChip}>
                  <Icon name="account" size={16} color="#E91E63" />
                  <Text style={styles.contactName}>{contact.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Contact Selection Modal */}
      <Modal
        visible={contactModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
          
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setContactModalVisible(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Quick Dial Contacts</Text>
            <TouchableOpacity onPress={saveSelectedContacts}>
              <Text style={styles.saveButton}>Save ({selectedContacts.length})</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              value={searchQuery}
              onChangeText={handleSearchContacts}
              placeholderTextColor="#999"
            />
          </View>

          {/* Selected Contacts Preview */}
          {selectedContacts.length > 0 && (
            <View style={styles.selectedContactsContainer}>
              <Text style={styles.selectedContactsTitle}>Selected ({selectedContacts.length}/5)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {selectedContacts.map((contact, index) => (
                  <View key={contact.id} style={styles.selectedContactChip}>
                    <Text style={styles.selectedContactName}>{contact.name}</Text>
                    <TouchableOpacity 
                      style={styles.removeSelectedButton}
                      onPress={() => toggleContactSelection(contact)}
                    >
                      <Icon name="close" size={12} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Contacts List */}
          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.id}
            style={styles.contactsList}
            renderItem={({ item }) => {
              const isSelected = selectedContacts.some(c => c.id === item.id);
              return (
                <TouchableOpacity
                  style={[styles.contactItem, isSelected && styles.selectedContactItem]}
                  onPress={() => toggleContactSelection(item)}
                >
                  <View style={styles.contactInfo}>
                    <View style={[styles.contactAvatar, isSelected && styles.selectedContactAvatar]}>
                      <Text style={styles.contactAvatarText}>
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.contactDetails}>
                      <Text style={styles.modalContactName}>{item.name}</Text>
                      <Text style={styles.contactPhone}>{item.phone}</Text>
                    </View>
                  </View>
                  <View style={styles.contactActions}>
                    {isSelected && (
                      <Icon name="check-circle" size={24} color="#4CAF50" />
                    )}
                    <TouchableOpacity 
                      style={styles.callButton}
                      onPress={() => callPhoneNumber(item.phone)}
                    >
                      <Icon name="phone" size={20} color="#2196F3" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  time: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  settingsButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  motivationalSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  motivationalCardContainer: {
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  motivationalCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  motivationalIcon: {
    marginBottom: 12,
  },
  motivationalText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
    marginBottom: 8,
  },
  swipeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  swipeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  sosSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  sosTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sosSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  sosButton: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  sosButtonActive: {
    transform: [{ scale: 1.05 }],
  },
  sosButtonGradient: {
    flex: 1,
    borderRadius: (width * 0.7) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sosButtonText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    textAlign: 'center',
  },
  sosButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
    textAlign: 'center',
  },
  quickActionsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: (width - 60) / 2,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  quickActionGradient: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 12,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  quickDialContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  quickDialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickDialTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  quickDialAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickDialAddText: {
    color: '#E91E63',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  quickDialScrollView: {
    maxHeight: 80,
  },
  quickDialContent: {
    paddingRight: 20,
  },
  quickDialItem: {
    position: 'relative',
    marginRight: 12,
  },
  quickDialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E91E63',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    maxWidth: width * 0.35,
  },
  quickDialText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  removeContactButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'white',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  emptyQuickDial: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E91E63',
    borderStyle: 'dashed',
  },
  emptyQuickDialText: {
    color: '#E91E63',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  locationSection: {
    marginBottom: 20,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  locationText: {
    color: 'white',
    marginLeft: 12,
    fontSize: 14,
    flex: 1,
  },
  contactsSection: {
    marginBottom: 10,
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  contactName: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  emergencyNumbersSection: {
    marginBottom: 30,
  },
  emergencyNumberChip: {
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    minWidth: 80,
  },
  emergencyNumberName: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  emergencyNumberValue: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: 'bold',
    marginTop: 2,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E91E63',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    color: '#333',
  },
  selectedContactsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedContactsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selectedContactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  selectedContactName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
    marginRight: 6,
  },
  removeSelectedButton: {
    backgroundColor: '#F44336',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedContactItem: {
    backgroundColor: '#E8F5E8',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedContactAvatar: {
    backgroundColor: '#4CAF50',
  },
  contactAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactDetails: {
    flex: 1,
  },
  modalContactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
});

export default HomeScreen;
