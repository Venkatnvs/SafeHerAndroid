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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useEmergency } from '../context/EmergencyContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { INDIAN_EMERGENCY_NUMBERS } from '../constants/IndianEmergencyNumbers';

const ProfileScreen = () => {
  const { user, signOut, updateProfile, addEmergencyContact, removeEmergencyContact } = useAuth();
  const { isLocationEnabled, requestLocationPermission, startLocationTracking, stopLocationTracking } = useLocation();
  const { isShakeEnabled, isVoiceEnabled, setupShakeDetection, setupVoiceDetection } = useEmergency();
  
  const [loading, setLoading] = useState(false);
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [emergencyContactModal, setEmergencyContactModal] = useState(false);
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
  }, [user]);

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
    
    setLoading(true);
    try {
      await updateProfile(profileData);
      setEditProfileModal(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
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
      setEmergencyContactModal(false);
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

  const handleVoiceToggle = () => {
    if (isVoiceEnabled) {
      Alert.alert('Voice Detection Disabled', 'Voice commands have been disabled');
    } else {
      setupVoiceDetection();
      Alert.alert('Voice Detection Enabled', 'Say "help" or "emergency" to trigger SOS');
    }
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
            onPress={() => setEditProfileModal(true)}
          />
          
          <ProfileMenuItem
            icon="shield-account"
            title="Guardians"
            subtitle={`${user?.guardianEmails?.length || 0} guardian(s) added`}
            onPress={() => Alert.alert('Guardians', 'Guardian management is available in the Guardian Dashboard tab.')}
            color="#4CAF50"
          />
          
          <ProfileMenuItem
            icon="phone"
            title="Emergency Contacts"
            subtitle={`${user?.emergencyContacts?.length || 0} contact(s) added`}
            onPress={() => setEmergencyContactModal(true)}
            color="#FF9800"
          />
        </View>

        {/* Safety Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety & Security</Text>
          
          <ProfileMenuItem
            icon="crosshairs-gps"
            title="Location Settings"
            subtitle={isLocationEnabled ? "Location tracking enabled" : "Location tracking disabled"}
            onPress={handleLocationToggle}
            color="#2196F3"
          />
          
          <ProfileMenuItem
            icon="phone-vibrate"
            title="Shake Detection"
            subtitle={isShakeEnabled ? "Shake to SOS enabled" : "Shake to SOS disabled"}
            onPress={handleShakeToggle}
            color="#9C27B0"
          />
          
          <ProfileMenuItem
            icon="microphone"
            title="Voice Commands"
            subtitle={isVoiceEnabled ? "Voice commands enabled" : "Voice commands disabled"}
            onPress={handleVoiceToggle}
            color="#FF5722"
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
        onRequestClose={() => setEditProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditProfileModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={profileData.displayName}
                onChangeText={(text) => setProfileData({...profileData, displayName: text})}
                placeholder="Enter your full name"
              />
              
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={profileData.phoneNumber}
                onChangeText={(text) => setProfileData({...profileData, phoneNumber: text})}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
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
            </View>
          </View>
        </View>
      </Modal>

      {/* Emergency Contact Modal */}
      <Modal
        visible={emergencyContactModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEmergencyContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Emergency Contacts</Text>
              <TouchableOpacity onPress={() => setEmergencyContactModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {/* Existing Contacts */}
              {user?.emergencyContacts && user.emergencyContacts.length > 0 && (
                <View style={styles.contactsList}>
                  <Text style={styles.contactsTitle}>Your Emergency Contacts</Text>
                  {user.emergencyContacts.map((contact: any) => (
                    <View key={contact.id} style={styles.contactItem}>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        <Text style={styles.contactPhone}>{contact.phone}</Text>
                        <Text style={styles.contactRelationship}>{contact.relationship}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveEmergencyContact(contact.id, contact.name)}
                      >
                        <Icon name="delete" size={20} color="#F44336" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Add New Contact */}
              <View style={styles.addContactSection}>
                <Text style={styles.addContactTitle}>Add New Contact</Text>
                
                <Text style={styles.inputLabel}>Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newContact.name}
                  onChangeText={(text) => setNewContact({...newContact, name: text})}
                  placeholder="Enter contact name"
                />
                
                <Text style={styles.inputLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newContact.phone}
                  onChangeText={(text) => setNewContact({...newContact, phone: text})}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
                
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  value={newContact.email}
                  onChangeText={(text) => setNewContact({...newContact, email: text})}
                  placeholder="Enter email (optional)"
                  keyboardType="email-address"
                />
                
                <Text style={styles.inputLabel}>Relationship</Text>
                <TextInput
                  style={styles.textInput}
                  value={newContact.relationship}
                  onChangeText={(text) => setNewContact({...newContact, relationship: text})}
                  placeholder="e.g., Mother, Father, Friend"
                />
                
                <TouchableOpacity
                  style={[styles.addButton, loading && styles.addButtonDisabled]}
                  onPress={handleAddEmergencyContact}
                  disabled={loading}
                >
                  <Text style={styles.addButtonText}>
                    {loading ? 'Adding...' : 'Add Contact'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
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
