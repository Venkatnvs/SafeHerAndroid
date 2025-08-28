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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Contacts from 'react-native-contacts';
import { request, RESULTS, PERMISSIONS } from 'react-native-permissions';
import { Linking, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useEmergency } from '../context/EmergencyContext';
import { useLocation } from '../context/LocationContext';

const { width, height } = Dimensions.get('window');

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { triggerSOS, isEmergencyActive, loading } = useEmergency();
  const { currentLocation, safeZones } = useLocation();
  
  const [motivationalQuote, setMotivationalQuote] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [quickContacts, setQuickContacts] = useState<{ name: string; phone: string }[]>([]);

  const quotes = [
    "You are stronger than you think, braver than you believe, and more capable than you know.",
    "Every woman has the power to protect herself and others. You are that woman.",
    "Your safety is not a luxury, it's a right. Stand strong, stay safe.",
    "Courage doesn't mean you're not afraid. It means you don't let fear stop you.",
    "You are the hero of your own story. Trust your instincts, trust your strength.",
    "Empowered women empower women. Together we are unstoppable.",
    "Your voice matters, your safety matters, you matter.",
    "Strength comes from within. You have everything you need to protect yourself.",
    "Be bold, be brave, be beautiful. You are enough.",
    "Every step you take towards safety is a step towards empowerment."
  ];

  useEffect(() => {
    // Set random motivational quote
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setMotivationalQuote(randomQuote);

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
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, []);

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

  const handleSOSPress = () => {
    if (isEmergencyActive) {
      Alert.alert(
        'Emergency Active',
        'An emergency is already active. Do you want to resolve it?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Resolve', onPress: () => navigation.navigate('Emergency' as never) }
        ]
      );
      return;
    }

    Alert.alert(
      'Trigger SOS',
      'Are you sure you want to trigger an emergency alert? This will notify all your guardians and emergency contacts.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'TRIGGER SOS', style: 'destructive', onPress: () => triggerSOS() }
      ]
    );
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
      const allContacts = await Contacts.getAll();
      if (!allContacts || allContacts.length === 0) {
        Alert.alert('No contacts', 'Your contact list appears to be empty.');
        return;
      }

      // Simple chooser: take the first two phone entries after prompting minimal choice
      // For a richer UX, implement a modal list; keeping minimal per request
      const selectable = allContacts
        .map(c => {
          const phone = (c.phoneNumbers && c.phoneNumbers[0] && c.phoneNumbers[0].number) || '';
          const name = [c.givenName, c.familyName].filter(Boolean).join(' ') || c.displayName || 'Unknown';
          return { name, phone };
        })
        .filter(c => !!c.phone);

      if (selectable.length === 0) {
        Alert.alert('No numbers', 'Could not find contacts with phone numbers.');
        return;
      }

      // Minimal flow: let user confirm auto-pick of the first two
      const autoPick = selectable.slice(0, 2);
      Alert.alert(
        'Set Quick Dial',
        `Use these contacts?
1) ${autoPick[0]?.name} (${autoPick[0]?.phone})
2) ${autoPick[1]?.name ?? 'None'}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: async () => {
              const finalList = autoPick.filter(Boolean);
              setQuickContacts(finalList);
              await AsyncStorage.setItem('quickDialContacts', JSON.stringify(finalList));
              Alert.alert('Saved', 'Quick-dial contacts updated.');
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to access contacts.');
    }
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Motivational Section */}
        <View style={styles.motivationalSection}>
          <LinearGradient
            colors={['#FF6B9D', '#C44569']}
            style={styles.motivationalCard}
          >
            <Icon name="heart" size={32} color="white" style={styles.motivationalIcon} />
            <Text style={styles.motivationalText}>{motivationalQuote}</Text>
          </LinearGradient>
        </View>

        {/* SOS Button Section */}
        <View style={styles.sosSection}>
          <Text style={styles.sosTitle}>Emergency SOS</Text>
          <Text style={styles.sosSubtitle}>Tap to get immediate help</Text>
          
          <TouchableOpacity
            style={[
              styles.sosButton,
              isEmergencyActive && styles.sosButtonActive
            ]}
            onPress={handleSOSPress}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isEmergencyActive ? ['#F44336', '#D32F2F'] : ['#FF5722', '#E64A19']}
              style={styles.sosButtonGradient}
            >
              <Icon 
                name={isEmergencyActive ? "phone-alert" : "alert-circle"} 
                size={80} 
                color="white" 
              />
              <Text style={styles.sosButtonText}>
                {isEmergencyActive ? 'EMERGENCY ACTIVE' : 'SOS'}
              </Text>
              <Text style={styles.sosButtonSubtext}>
                {isEmergencyActive ? 'Tap to resolve' : 'Tap for help'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Quick Dial buttons under SOS */}
          <View style={styles.quickDialRow}>
            {quickContacts.map((c, idx) => (
              <TouchableOpacity key={idx} style={styles.quickDialButton} onPress={() => callPhoneNumber(c.phone)}>
                <Icon name="phone" size={20} color="#fff" />
                <Text style={styles.quickDialText} numberOfLines={1}>{c.name}</Text>
              </TouchableOpacity>
            ))}
            {quickContacts.length < 2 && (
              <TouchableOpacity style={styles.quickDialButtonAdd} onPress={pickQuickContacts}>
                <Icon name="account-plus" size={20} color="#E91E63" />
                <Text style={styles.quickDialAddText}>Set Quick Dial</Text>
              </TouchableOpacity>
            )}
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
              icon="shield-account"
              title="Guardian"
              subtitle="View dashboard"
              onPress={() => navigation.navigate('Guardian' as never)}
              color="#4CAF50"
            />
            <QuickActionButton
              icon="karate"
              title="Self Defense"
              subtitle="Learn techniques"
              onPress={() => navigation.navigate('SelfDefense' as never)}
              color="#FF9800"
            />
            <QuickActionButton
              icon="phone"
              title="Emergency"
              subtitle="Call 112"
              onPress={() => navigation.navigate('Emergency' as never)}
              color="#F44336"
            />
          </View>
        </View>

        {/* Location Status */}
        {currentLocation && (
          <View style={styles.locationSection}>
            <LinearGradient
              colors={['#9C27B0', '#7B1FA2']}
              style={styles.locationCard}
            >
              <Icon name="crosshairs-gps" size={24} color="white" />
              <Text style={styles.locationText}>
                Location tracking active • {safeZones.length} safe zones nearby
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* Emergency Contacts Preview */}
        {user?.emergencyContacts && user.emergencyContacts.length > 0 && (
          <View style={styles.contactsSection}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 50,
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
  motivationalSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  motivationalCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  motivationalIcon: {
    marginBottom: 12,
  },
  motivationalText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
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
  quickDialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  quickDialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E91E63',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 6,
    maxWidth: width * 0.35,
  },
  quickDialText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  quickDialButtonAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E91E63',
  },
  quickDialAddText: {
    color: '#E91E63',
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
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
    marginBottom: 30,
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
});

export default HomeScreen;
