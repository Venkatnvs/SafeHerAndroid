import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { firestore, auth } from '../config/firebase';
import { INDIAN_EMERGENCY_NUMBERS } from '../constants/IndianEmergencyNumbers';
import { useNavigation } from '@react-navigation/native';

interface ProtectedUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  lastSeen: Date;
  currentLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  isOnline: boolean;
  emergencyContacts: any[];
}

interface EmergencyAlertItem {
  id: string;
  userId: string;
  message?: string;
  timestamp: Date;
  status: 'active' | 'resolved' | 'false_alarm';
  location?: { latitude: number; longitude: number; address?: string };
}

const GuardianDashboardScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [protectedUsers, setProtectedUsers] = useState<ProtectedUser[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<EmergencyAlertItem[]>([]);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const alertUnsubscribersRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    loadProtectedUsers();
    return () => cleanupAlertSubscriptions();
  }, []);

  const loadProtectedUsers = async () => {
    if (!user) return;
    
    try {
      const guardianDoc = await firestore()
        .collection('users')
        .doc(user.uid)
        .get();
      
      if (guardianDoc.exists) {
        const guardianData = guardianDoc.data();
        const protectedUserIds = guardianData?.protectedUsers || [];
        
        if (protectedUserIds.length > 0) {
          const usersSnapshot = await firestore()
            .collection('users')
            .where('uid', 'in', protectedUserIds)
            .get();
          
          const users = usersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.displayName || 'Unknown',
              email: data.email || '',
              phoneNumber: data.phoneNumber || '',
              lastSeen: data.lastLocationUpdate?.toDate() || new Date(),
              currentLocation: data.currentLocation,
              isOnline: data.isOnline || false,
              emergencyContacts: data.emergencyContacts || []
            };
          });
          
          setProtectedUsers(users);
          subscribeToActiveAlerts(users.map(u => u.id));
          subscribeToLiveLocationUpdates(users.map(u => u.id));
        }
      }
    } catch (error) {
      console.error('Error loading protected users:', error);
    }
  };

  const cleanupAlertSubscriptions = () => {
    alertUnsubscribersRef.current.forEach(unsub => { try { unsub(); } catch {} });
    alertUnsubscribersRef.current = [];
  };

  const subscribeToActiveAlerts = (userIds: string[]) => {
    cleanupAlertSubscriptions();
    setActiveAlerts([]);
    if (!userIds || userIds.length === 0) return;

    userIds.forEach(uid => {
      const unsub = firestore()
        .collection('emergencyAlerts')
        .where('userId', '==', uid)
        .where('status', '==', 'active')
        .onSnapshot(snapshot => {
          const newAlerts = snapshot.docs.map(doc => {
            const d: any = doc.data();
            return {
              id: doc.id,
              userId: d.userId,
              message: d.message,
              status: d.status,
              timestamp: (d.timestamp?.toDate && d.timestamp.toDate()) || new Date(),
              location: d.location,
            } as EmergencyAlertItem;
          });

          setActiveAlerts(prev => {
            const withoutUid = prev.filter(a => a.userId !== uid);
            return [...withoutUid, ...newAlerts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          });
        }, err => console.log('Alert subscription error:', err));

      alertUnsubscribersRef.current.push(unsub);
    });
  };

  // Subscribe to live location updates for protected users during emergencies
  const subscribeToLiveLocationUpdates = (userIds: string[]) => {
    if (!userIds || userIds.length === 0) return;

    userIds.forEach(uid => {
      const unsub = firestore()
        .collection('users')
        .doc(uid)
        .onSnapshot(doc => {
          if (doc.exists) {
            const userData = doc.data();
            setProtectedUsers(prev => 
              prev.map(user => 
                user.id === uid 
                  ? {
                      ...user,
                      currentLocation: userData?.currentLocation,
                      lastSeen: userData?.lastLocationUpdate?.toDate() || user.lastSeen,
                      isOnline: userData?.isOnline || false
                    }
                  : user
              )
            );
          }
        }, err => console.log('Live location subscription error:', err));

      alertUnsubscribersRef.current.push(unsub);
    });
  };

  const searchUsersByPhone = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a phone number to search');
      return;
    }

    setLoading(true);
    try {
      const usersSnapshot = await firestore()
        .collection('users')
        .where('phoneNumber', '==', searchQuery.trim())
        .get();

      const results = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.displayName || 'Unknown',
          email: data.email || '',
          phoneNumber: data.phoneNumber || '',
          isGuardian: data.isGuardian || false
        };
      });

      setSearchResults(results);
    } catch (error) {
      Alert.alert('Error', 'Failed to search users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addProtectedUser = async (userToAdd: any) => {
    if (!user) return;

    try {
      // Add user to guardian's protected users list
      await firestore()
        .collection('users')
        .doc(user.uid)
        .update({
          protectedUsers: firestore.FieldValue.arrayUnion(userToAdd.id)
        });

      // Add guardian to user's guardians list
      await firestore()
        .collection('users')
        .doc(userToAdd.id)
        .update({
          guardianEmails: firestore.FieldValue.arrayUnion(user.email)
        });

      Alert.alert('Success', `${userToAdd.name} has been added to your protected users list`);
      setSearchModalVisible(false);
      setSearchQuery('');
      setSearchResults([]);
      loadProtectedUsers();
    } catch (error) {
      Alert.alert('Error', 'Failed to add user. Please try again.');
    }
  };

  const removeProtectedUser = async (userId: string, userName: string) => {
    if (!user) return;

    Alert.alert(
      'Remove User',
      `Are you sure you want to remove ${userName} from your protected users?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore()
                .collection('users')
                .doc(user.uid)
                .update({
                  protectedUsers: firestore.FieldValue.arrayRemove(userId)
                });

              await firestore()
                .collection('users')
                .doc(userId)
                .update({
                  guardianEmails: firestore.FieldValue.arrayRemove(user.email)
                });

              loadProtectedUsers();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove user. Please try again.');
            }
          }
        }
      ]
    );
  };

  const callUser = (phoneNumber: string) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const sendMessageToUser = (phoneNumber: string, userName: string) => {
    const message = `Hi ${userName}, I'm checking on you. Are you safe? Please reply if you need any help.`;
    const url = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open SMS. Please try again.');
    });
  };

  const viewOnMap = (lat?: number, lon?: number) => {
    if (!lat || !lon) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open Maps.'));
  };

  const resolveAlert = async (alertId: string) => {
    try {
      console.log('🔄 Guardian resolving alert:', alertId);
      
      const user = auth().currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to resolve alerts.');
        return;
      }

      await firestore()
        .collection('emergencyAlerts')
        .doc(alertId)
        .update({
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: user.uid,
          resolutionReason: 'Resolved by guardian'
        });
      
      console.log('✅ Alert resolved by guardian successfully');
      
    } catch (error) {
      console.error('❌ Error resolving alert:', error);
      Alert.alert(
        'Error', 
        `Failed to resolve alert: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
      );
    }
  };

  const handleResolveAllAlerts = async () => {
    if (activeAlerts.length === 0) {
      Alert.alert('No Alerts', 'There are no active alerts to resolve.');
      return;
    }

    Alert.alert(
      'Resolve All Alerts',
      `Are you sure you want to resolve all ${activeAlerts.length} active alerts? This will mark all emergencies as resolved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Resolve All', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`🔄 Guardian resolving all ${activeAlerts.length} alerts...`);
              
              const user = auth().currentUser;
              if (!user) {
                Alert.alert('Error', 'You must be logged in to resolve alerts.');
                return;
              }

              // Resolve all active alerts
              const resolvePromises = activeAlerts.map(alert => 
                firestore()
                  .collection('emergencyAlerts')
                  .doc(alert.id)
                  .update({
                    status: 'resolved',
                    resolvedAt: new Date(),
                    resolvedBy: user.uid,
                    resolutionReason: 'Resolved by guardian (Resolve All)'
                  })
              );

              await Promise.all(resolvePromises);
              
              console.log(`✅ All ${activeAlerts.length} alerts resolved by guardian successfully`);
              
              Alert.alert(
                'Success',
                `All ${activeAlerts.length} alerts have been resolved successfully.`,
                [{ text: 'OK' }]
              );
              
            } catch (error) {
              console.error('❌ Error resolving all alerts:', error);
              Alert.alert(
                'Error', 
                `Failed to resolve some alerts: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
              );
            }
          }
        }
      ]
    );
  };

  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const renderUserCard = (user: ProtectedUser) => (
    <View key={user.id} style={styles.userCard}>
      <View style={styles.userAvatar}>
        <Icon name="account" size={32} color="white" />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userPhone}>{user.phoneNumber}</Text>
        <Text style={[styles.userStatus, { color: user.isOnline ? '#4CAF50' : '#FF9800' }]}>
          {user.isOnline ? '🟢 Online' : '🟡 Last seen ' + formatLastSeen(user.lastSeen)}
        </Text>
        {user.currentLocation && (
          <Text style={styles.userLocation}>📍 {user.currentLocation.address}</Text>
        )}
      </View>
      <View style={styles.userActions}>
        <TouchableOpacity 
          style={styles.callButton}
          onPress={() => callUser(user.phoneNumber)}
        >
          <Icon name="phone" size={20} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.messageButton}
          onPress={() => sendMessageToUser(user.phoneNumber, user.name)}
        >
          <Icon name="message" size={20} color="#2196F3" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => removeProtectedUser(user.id, user.name)}
        >
          <Icon name="account-remove" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchResult = ({ item }: { item: any }) => (
    <View style={styles.searchResultCard}>
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultName}>{item.name}</Text>
        <Text style={styles.searchResultPhone}>{item.phoneNumber}</Text>
        <Text style={styles.searchResultEmail}>{item.email}</Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => addProtectedUser(item)}
      >
        <Icon name="account-plus" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />
      
      {/* Header */}
      <LinearGradient
        colors={['#4CAF50', '#388E3C']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Icon name="shield-account" size={60} color="white" />
          <Text style={styles.headerTitle}>Guardian Dashboard</Text>
          <Text style={styles.headerSubtitle}>Monitor and protect your loved ones</Text>
          {activeAlerts.length > 0 && (
            <View style={styles.alertBadge}>
              <Icon name="bell-alert" size={16} color="white" />
              <Text style={styles.alertBadgeText}>{activeAlerts.length}</Text>
            </View>
          )}
          
          {/* Map Button - Only show if there are protected users */}
          {protectedUsers.length > 0 && (
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => navigation.navigate('GuardianMap' as never)}
            >
              <Icon name="map" size={20} color="white" />
              <Text style={styles.mapButtonText}>View Live Map</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Overview */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Status Overview</Text>
          
          <View style={styles.statusGrid}>
            <View style={styles.statusCard}>
              <Icon name="account-check" size={32} color="#4CAF50" />
              <Text style={styles.statusNumber}>{protectedUsers.length}</Text>
              <Text style={styles.statusLabel}>Protected Users</Text>
            </View>
            
            <View style={styles.statusCard}>
              <Icon name="crosshairs-gps" size={32} color="#2196F3" />
              <Text style={styles.statusNumber}>
                {protectedUsers.filter(u => u.isOnline).length}
              </Text>
              <Text style={styles.statusLabel}>Online Now</Text>
            </View>
            
            <View style={styles.statusCard}>
              <Icon name="alert" size={32} color="#FF9800" />
              <Text style={styles.statusNumber}>{activeAlerts.length}</Text>
              <Text style={styles.statusLabel}>Active Alerts</Text>
            </View>
          </View>
        </View>

        {/* Active Alerts */}
        <View style={styles.alertsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Alerts</Text>
            {activeAlerts.length > 0 && (
              <TouchableOpacity
                style={styles.resolveAllButton}
                onPress={handleResolveAllAlerts}
                activeOpacity={0.8}
              >
                <Icon name="check-all" size={16} color="#4CAF50" />
                <Text style={styles.resolveAllText}>Resolve All</Text>
              </TouchableOpacity>
            )}
          </View>
          {activeAlerts.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="bell-outline" size={64} color="#E0E0E0" />
              <Text style={styles.emptyStateText}>No active alerts</Text>
              <Text style={styles.emptyStateSubtext}>You'll see alerts from protected users here</Text>
            </View>
          ) : (
            activeAlerts.map(alert => {
              const pu = protectedUsers.find(u => u.id === alert.userId);
              const currentLocation = pu?.currentLocation || alert.location;
              return (
                <View key={alert.id} style={styles.alertCard}>
                  <View style={styles.alertInfo}>
                    <Text style={styles.alertTitle}>🚨 {pu?.name || 'User'} needs help</Text>
                    {!!alert.message && (
                      <Text style={styles.alertMessage}>{alert.message}</Text>
                    )}
                    <Text style={styles.alertTime}>{alert.timestamp.toLocaleString()}</Text>
                    
                    {/* Live Location Status */}
                    <View style={styles.liveLocationContainer}>
                      <Icon name="crosshairs-gps" size={16} color="#4CAF50" />
                      <Text style={styles.liveLocationText}>
                        Live Location: {currentLocation?.address || `${currentLocation?.latitude?.toFixed(4)}, ${currentLocation?.longitude?.toFixed(4)}`}
                      </Text>
                    </View>
                    
                    {/* Last Update Time */}
                    <Text style={styles.lastUpdateText}>
                      Last update: {pu?.lastSeen ? formatLastSeen(pu.lastSeen) : 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.alertActions}>
                    <TouchableOpacity style={styles.alertActionBtn} onPress={() => callUser(pu?.phoneNumber || '')}>
                      <Icon name="phone" size={18} color="#4CAF50" />
                      <Text style={styles.alertActionText}>Call</Text>
                    </TouchableOpacity>
                    {currentLocation?.latitude && (
                      <TouchableOpacity style={styles.alertActionBtn} onPress={() => viewOnMap(currentLocation.latitude, currentLocation.longitude)}>
                        <Icon name="map" size={18} color="#2196F3" />
                        <Text style={styles.alertActionText}>Live Map</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.alertActionBtn} onPress={() => resolveAlert(alert.id)}>
                      <Icon name="check-circle" size={18} color="#009688" />
                      <Text style={styles.alertActionText}>Resolve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Add User Section */}
        <View style={styles.addUserSection}>
          <TouchableOpacity
            style={styles.addUserButton}
            onPress={() => setSearchModalVisible(true)}
          >
            <LinearGradient
              colors={['#4CAF50', '#388E3C']}
              style={styles.addUserGradient}
            >
              <Icon name="account-plus" size={24} color="white" />
              <Text style={styles.addUserText}>Add Protected User</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Protected Users */}
        <View style={styles.usersSection}>
          <Text style={styles.sectionTitle}>Protected Users</Text>
          
          {protectedUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="account-group" size={64} color="#E0E0E0" />
              <Text style={styles.emptyStateText}>No protected users yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Add users by searching their phone number
              </Text>
            </View>
          ) : (
            protectedUsers.map(renderUserCard)
          )}
        </View>

        {/* Emergency Contacts */}
        <View style={styles.contactsSection}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          
          {INDIAN_EMERGENCY_NUMBERS.QUICK_DIAL_OPTIONS.slice(0, 4).map((service, index) => (
            <View key={index} style={styles.contactCard}>
              <Icon name={service.icon} size={24} color="#F44336" />
              <Text style={styles.contactInfo}>{service.name}: {service.number}</Text>
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => Linking.openURL(`tel:${service.number}`)}
              >
                <Text style={styles.contactButtonText}>Call</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Search Modal */}
      <Modal
        visible={searchModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Protected User</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSearchModalVisible(false)}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Enter phone number (e.g., +91 9876543210)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                keyboardType="phone-pad"
                autoFocus
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={searchUsersByPhone}
                disabled={loading}
              >
                <Icon name="magnify" size={20} color="white" />
              </TouchableOpacity>
            </View>

            {loading && (
              <Text style={styles.loadingText}>Searching...</Text>
            )}

            {searchResults.length > 0 && (
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id}
                style={styles.searchResults}
              />
            )}

            {searchResults.length === 0 && !loading && searchQuery && (
              <Text style={styles.noResultsText}>No users found with this phone number</Text>
            )}
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
  headerContent: {
    alignItems: 'center',
  },
  alertBadge: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alertBadgeText: {
    color: 'white',
    marginLeft: 6,
    fontWeight: '700',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  mapButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statusSection: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  resolveAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  resolveAllText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  statusNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  addUserSection: {
    marginTop: 30,
  },
  addUserButton: {
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addUserGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  addUserText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  usersSection: {
    marginTop: 30,
  },
  alertsSection: {
    marginTop: 30,
  },
  alertCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  alertInfo: {
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D32F2F',
    marginBottom: 6,
  },
  alertMessage: {
    fontSize: 14,
    color: '#444',
    marginBottom: 6,
  },
  alertTime: {
    fontSize: 12,
    color: '#666',
  },
  liveLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  liveLocationText: {
    fontSize: 13,
    color: '#4CAF50',
    marginLeft: 6,
    fontWeight: '600',
  },
  lastUpdateText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  alertActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  alertActionText: {
    marginLeft: 6,
    color: '#333',
    fontSize: 13,
    fontWeight: '600',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userStatus: {
    fontSize: 12,
    marginBottom: 2,
  },
  userLocation: {
    fontSize: 12,
    color: '#666',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callButton: {
    padding: 8,
    marginRight: 8,
  },
  messageButton: {
    padding: 8,
    marginRight: 8,
  },
  removeButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  contactsSection: {
    marginTop: 30,
    marginBottom: 40,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  contactInfo: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
  },
  contactButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  contactButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 12,
    backgroundColor: 'white',
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginVertical: 20,
  },
  searchResults: {
    maxHeight: 300,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  searchResultPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  searchResultEmail: {
    fontSize: 12,
    color: '#999',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 20,
  },
  noResultsText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginVertical: 20,
  },
});

export default GuardianDashboardScreen;