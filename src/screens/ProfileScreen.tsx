import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  TextInput,
  Modal,
  Linking,
  Switch,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useEmergency } from '../context/EmergencyContext';
import { useSettings } from '../context/SettingsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FileUtils } from '../utils/FileUtils';
import { useNavigation } from '@react-navigation/native';

const ProfileScreen = () => {
  const { user, signOut, updateProfile, addEmergencyContact, removeEmergencyContact } = useAuth();
  const { isLocationEnabled, requestLocationPermission, startLocationTracking, stopLocationTracking } = useLocation();
  const { isShakeEnabled, isVoiceEnabled, setupShakeDetection, setupVoiceDetection } = useEmergency();
  const { recordingSettings, updateRecordingSettings, resetToDefaults, sosSettings } = useSettings();
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(false);
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', relationship: '' });
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || '',
    phoneNumber: user?.phoneNumber || '',
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        displayName: user.displayName || '',
        phoneNumber: user.phoneNumber || '',
      });
    }
  }, [user, editProfileModal]);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleUpdateProfile = async () => {
    if (!profileData.displayName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    
    // Validate phone number format (basic validation)
    if (profileData.phoneNumber && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(profileData.phoneNumber)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    
    setLoading(true);
    try {
      await updateProfile({
        displayName: profileData.displayName.trim(),
        phoneNumber: profileData.phoneNumber.trim(),
      });
      setEditProfileModal(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmergencyContact = async () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      Alert.alert('Error', 'Please fill in name and phone number');
      return;
    }
    
    setLoading(true);
    try {
      await addEmergencyContact({
        name: newContact.name.trim(),
        phone: newContact.phone.trim(),
        email: newContact.email.trim(),
        relationship: newContact.relationship.trim() || 'Emergency Contact'
      });
      setNewContact({ name: '', phone: '', email: '', relationship: '' });
      Alert.alert('Success', 'Emergency contact added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add emergency contact. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEmergencyContact = (contactId: string, contactName: string) => {
    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove ${contactName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeEmergencyContact(contactId);
              Alert.alert('Success', 'Emergency contact removed');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove contact. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleLocationToggle = async () => {
    if (isLocationEnabled) {
      stopLocationTracking();
      Alert.alert('Location Disabled', 'Location tracking has been stopped');
    } else {
      const granted = await requestLocationPermission();
      if (granted) {
        startLocationTracking();
        Alert.alert('Location Enabled', 'Location tracking has been started');
      } else {
        Alert.alert('Permission Required', 'Location permission is required for safety features');
      }
    }
  };

  const handleShakeToggle = () => {
    if (isShakeEnabled) {
      Alert.alert('Shake Detection Disabled', 'Shake to trigger SOS has been disabled');
    } else {
      setupShakeDetection();
      Alert.alert('Shake Detection Enabled', 'Shake your phone to trigger SOS');
    }
  };

  const handleVoiceToggle = async () => {
    if (isVoiceEnabled) {
      Alert.alert('Voice Detection Disabled', 'Voice commands have been disabled');
    } else {
      try {
        await setupVoiceDetection();
        Alert.alert('Voice Detection Enabled', 'Say "help", "emergency", "bachao", or "madad" to trigger SOS');
      } catch (error) {
        Alert.alert('Voice Detection Error', 'Failed to enable voice detection. Please check microphone permissions.');
      }
    }
  };

  const handleRecordingSettingChange = (key: string, value: any) => {
    updateRecordingSettings({ [key]: value });
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all recording settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetToDefaults();
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setEditProfileModal(false);
    // Reset form data to current user data
    if (user) {
      setProfileData({
        displayName: user.displayName || '',
        phoneNumber: user.phoneNumber || '',
      });
    }
  };

  const handleOpenModal = () => {
    // Load current user data when opening modal
    if (user) {
      console.log('Loading user data for edit:', {
        displayName: user.displayName,
        phoneNumber: user.phoneNumber
      });
      setProfileData({
        displayName: user.displayName || '',
        phoneNumber: user.phoneNumber || '',
      });
    }
    setEditProfileModal(true);
  };

  const ProfileMenuItem = ({ icon, title, subtitle, onPress, color = '#E91E63' }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: color }]}>
        <Icon name={icon} size={24} color="white" />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={24} color="#999" />
    </TouchableOpacity>
  );

  const SettingsItem = ({ 
    title, 
    subtitle, 
    value, 
    onValueChange, 
    type = 'switch',
    icon,
    color = '#673AB7'
  }: {
    title: string;
    subtitle: string;
    value: boolean | number | string;
    onValueChange: (value: any) => void;
    type?: 'switch' | 'button';
    icon: string;
    color?: string;
  }) => (
    <View style={styles.menuItem}>
      <View style={[styles.menuIcon, { backgroundColor: color }]}>
        <Icon name={icon} size={24} color="white" />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.menuRight}>
        {type === 'switch' ? (
          <Switch
            value={value as boolean}
            onValueChange={onValueChange}
            trackColor={{ false: '#E0E0E0', true: '#673AB7' }}
            thumbColor={value ? '#FFFFFF' : '#F4F3F4'}
          />
        ) : (
          <TouchableOpacity style={styles.buttonValue} onPress={onValueChange}>
            <Text style={styles.buttonValueText}>{value}</Text>
            <Icon name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#E91E63" />
      
      {/* Header */}
      <LinearGradient
        colors={['#E91E63', '#C2185B']}
        style={styles.header}
      >
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            <Icon name="account" size={60} color="white" />
          </View>
          <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <ProfileMenuItem
            icon="account-edit"
            title="Edit Profile"
            subtitle="Update your personal information"
            onPress={handleOpenModal}
          />
        </View>

        {/* Safety Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety & Security</Text>
          
          <ProfileMenuItem
            icon="phone-alert"
            title="SOS Settings"
            subtitle={`Call: ${sosSettings.selectedCallContact?.name || 'Not set'}, SMS: ${sosSettings.selectedSMSContacts.length} contact(s)`}
            onPress={() => navigation.navigate('SOSSettings' as never)}
            color="#E91E63"
          />
        </View>

        {/* Recording Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recording Settings</Text>
          
          <SettingsItem
            title="Auto Record on Emergency"
            subtitle="Automatically start recording when emergency is triggered"
            value={recordingSettings.autoRecordOnEmergency}
            onValueChange={(value) => handleRecordingSettingChange('autoRecordOnEmergency', value)}
            icon="record-rec"
            color="#4CAF50"
          />
          
          <SettingsItem
            title="Storage Location"
            subtitle={`Recordings saved to: ${FileUtils.getRecordingsDirectoryDisplayPath()}`}
            value={recordingSettings.storageLocation === 'local' ? 'Local Only' : 'Cloud'}
            onValueChange={() => {
              const newLocation = recordingSettings.storageLocation === 'local' ? 'cloud' : 'local';
              handleRecordingSettingChange('storageLocation', newLocation);
            }}
            type="button"
            icon="folder"
            color="#2196F3"
          />
          
          <SettingsItem
            title="Max Recording Duration"
            subtitle="Maximum recording time in minutes"
            value={`${recordingSettings.maxRecordingDuration} min`}
            onValueChange={() => {
              Alert.alert(
                'Recording Duration',
                'Select maximum recording duration',
                [
                  { text: '2 min', onPress: () => handleRecordingSettingChange('maxRecordingDuration', 2) },
                  { text: '5 min', onPress: () => handleRecordingSettingChange('maxRecordingDuration', 5) },
                  { text: '10 min', onPress: () => handleRecordingSettingChange('maxRecordingDuration', 10) },
                  { text: '15 min', onPress: () => handleRecordingSettingChange('maxRecordingDuration', 15) },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
            type="button"
            icon="timer"
            color="#9C27B0"
          />
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Help</Text>
          
          <ProfileMenuItem
            icon="help-circle"
            title="Help Center"
            subtitle="Get help and support"
            onPress={() => Linking.openURL('mailto:support@safeher.app?subject=Help Request')}
            color="#00BCD4"
          />
          
          <ProfileMenuItem
            icon="phone"
            title="Emergency Numbers"
            subtitle="View all Indian emergency numbers"
            onPress={() => Alert.alert(
              'Indian Emergency Numbers',
              `Police: 100\nWomen Helpline: 1091\nAmbulance: 102\nFire: 101\nNational Emergency: 112\nChild Helpline: 1098`,
              [{ text: 'OK' }]
            )}
            color="#F44336"
          />
          
          <ProfileMenuItem
            icon="information"
            title="About SafeHer"
            subtitle="Version 1.0.0 - Made for Indian Women"
            onPress={() => Alert.alert(
              'About SafeHer', 
              'SafeHer is a comprehensive women safety app designed specifically for Indian women. Features include:\n\n• One-tap SOS with location sharing\n• Guardian network management\n• Real-time safe zone detection\n• Self-defense resources\n• Indian emergency numbers\n• Voice and shake detection\n\nStay safe, stay empowered!'
            )}
            color="#E91E63"
          />
        </View>

        {/* Privacy Notice */}
        <View style={styles.privacySection}>
          <Icon name="shield-check" size={24} color="#4CAF50" />
          <Text style={styles.privacyTitle}>Privacy & Security</Text>
          <Text style={styles.privacyText}>
            All recordings are stored locally on your device and are never uploaded to external servers unless you explicitly choose cloud storage. Your privacy and safety are our top priorities.
          </Text>
        </View>

        {/* Reset Settings Button */}
        <TouchableOpacity style={styles.resetButton} onPress={handleResetSettings}>
          <Icon name="refresh" size={20} color="#F44336" />
          <Text style={styles.resetButtonText}>Reset Recording Settings</Text>
        </TouchableOpacity>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.signOutButton, loading && styles.signOutButtonDisabled]}
          onPress={handleSignOut}
          disabled={loading}
        >
          <Icon name="logout" size={20} color="#F44336" />
          <Text style={styles.signOutText}>
            {loading ? 'Signing Out...' : 'Sign Out'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editProfileModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={profileData.displayName}
                  onChangeText={(text) => setProfileData({...profileData, displayName: text})}
                  placeholder="Enter your full name"
                  editable={!loading}
                />
                
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={profileData.phoneNumber}
                  onChangeText={(text) => setProfileData({...profileData, phoneNumber: text})}
                  placeholder="Enter your phone number (optional)"
                  keyboardType="phone-pad"
                  editable={!loading}
                />
                
                <TouchableOpacity
                  style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                  onPress={handleUpdateProfile}
                  disabled={loading}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
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
    paddingBottom: 30,
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  menuRight: {
    marginLeft: 12,
  },
  buttonValue: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
  },
  buttonValueText: {
    fontSize: 14,
    color: '#333',
    marginRight: 4,
  },
  privacySection: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginLeft: 12,
    marginBottom: 8,
  },
  privacyText: {
    fontSize: 14,
    color: '#2E7D32',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 30,
    marginBottom: 40,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  signOutButtonDisabled: {
    opacity: 0.7,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 50,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '75%',
    minHeight: 350,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
    color: '#000000',
  },
  saveButton: {
    backgroundColor: '#E91E63',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  contactsList: {
    marginBottom: 20,
  },
  contactsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  contactRelationship: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  addContactSection: {
    marginTop: 20,
  },
  addContactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
