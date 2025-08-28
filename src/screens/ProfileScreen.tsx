import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

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
            onPress={() => Alert.alert('Edit Profile', 'Profile editing will be implemented here.')}
          />
          
          <ProfileMenuItem
            icon="shield-account"
            title="Guardians"
            subtitle={`${user?.guardianEmails?.length || 0} guardian(s) added`}
            onPress={() => Alert.alert('Guardians', 'Guardian management will be implemented here.')}
            color="#4CAF50"
          />
          
          <ProfileMenuItem
            icon="phone"
            title="Emergency Contacts"
            subtitle={`${user?.emergencyContacts?.length || 0} contact(s) added`}
            onPress={() => Alert.alert('Emergency Contacts', 'Contact management will be implemented here.')}
            color="#FF9800"
          />
        </View>

        {/* Safety Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety & Security</Text>
          
          <ProfileMenuItem
            icon="crosshairs-gps"
            title="Location Settings"
            subtitle="Manage location permissions and tracking"
            onPress={() => Alert.alert('Location Settings', 'Location settings will be implemented here.')}
            color="#2196F3"
          />
          
          <ProfileMenuItem
            icon="bell"
            title="Notifications"
            subtitle="Configure alert preferences"
            onPress={() => Alert.alert('Notifications', 'Notification settings will be implemented here.')}
            color="#9C27B0"
          />
          
          <ProfileMenuItem
            icon="lock"
            title="Privacy & Security"
            subtitle="Manage your privacy settings"
            onPress={() => Alert.alert('Privacy & Security', 'Privacy settings will be implemented here.')}
            color="#607D8B"
          />
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Help</Text>
          
          <ProfileMenuItem
            icon="help-circle"
            title="Help Center"
            subtitle="Get help and support"
            onPress={() => Alert.alert('Help Center', 'Help center will be implemented here.')}
            color="#00BCD4"
          />
          
          <ProfileMenuItem
            icon="file-document"
            title="Terms & Privacy"
            subtitle="Read our terms and privacy policy"
            onPress={() => Alert.alert('Terms & Privacy', 'Terms and privacy will be implemented here.')}
            color="#795548"
          />
          
          <ProfileMenuItem
            icon="information"
            title="About SafeHer"
            subtitle="Version 1.0.0"
            onPress={() => Alert.alert('About SafeHer', 'SafeHer is a women safety app designed to provide immediate assistance in emergencies.')}
            color="#FF5722"
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 60,
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
});

export default ProfileScreen;
