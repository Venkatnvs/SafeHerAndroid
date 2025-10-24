import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../context/AuthContext';
import {firestore} from '../config/firebase';

const {width, height} = Dimensions.get('window');

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

interface EmergencyAlert {
  id: string;
  userId: string;
  message?: string;
  timestamp: Date;
  status: 'active' | 'resolved' | 'false_alarm';
  location?: {latitude: number; longitude: number; address?: string};
}

const GuardianMapScreen = () => {
  const {user} = useAuth();
  const [protectedUsers, setProtectedUsers] = useState<ProtectedUser[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<EmergencyAlert[]>([]);
  const [selectedUser, setSelectedUser] = useState<ProtectedUser | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 22.5726, // Default to Bangalore
    longitude: 88.3639, // Default to Bangalore
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProtectedUsers();
  }, []);

  const loadProtectedUsers = async () => {
    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

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
              emergencyContacts: data.emergencyContacts || [],
            };
          });

          setProtectedUsers(users);

          // Set map region to show all users
          if (users.length > 0) {
            const locations = users
              .filter(u => u.currentLocation)
              .map(u => u.currentLocation!);
            if (locations.length > 0) {
              const minLat = Math.min(...locations.map(l => l.latitude));
              const maxLat = Math.max(...locations.map(l => l.latitude));
              const minLng = Math.min(...locations.map(l => l.longitude));
              const maxLng = Math.max(...locations.map(l => l.longitude));

              setMapRegion({
                latitude: (minLat + maxLat) / 2,
                longitude: (minLng + maxLng) / 2,
                latitudeDelta: Math.max(maxLat - minLat, 0.01) * 1.5,
                longitudeDelta: Math.max(maxLng - minLng, 0.01) * 1.5,
              });
            }
          }

          // Load active alerts
          loadActiveAlerts(users.map(u => u.id));
        } else {
          setProtectedUsers([]);
          setError(
            'No protected users found. Add users from the Guardian Dashboard first.',
          );
        }
      } else {
        setError('Guardian profile not found');
      }
    } catch (error) {
      console.error('Error loading protected users:', error);
      setError('Failed to load protected users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveAlerts = async (userIds: string[]) => {
    if (!userIds || userIds.length === 0) return;

    try {
      const alertsSnapshot = await firestore()
        .collection('emergencyAlerts')
        .where('userId', 'in', userIds)
        .where('status', '==', 'active')
        .get();

      const alerts = alertsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          message: data.message,
          status: data.status,
          timestamp: data.timestamp?.toDate() || new Date(),
          location: data.location,
        } as EmergencyAlert;
      });

      setActiveAlerts(alerts);
    } catch (error) {
      console.error('Error loading active alerts:', error);
    }
  };

  const getUserMarkerColor = (user: ProtectedUser) => {
    const hasActiveAlert = activeAlerts.some(alert => alert.userId === user.id);
    if (hasActiveAlert) return '#F44336'; // Red for emergency
    if (user.isOnline) return '#4CAF50'; // Green for online
    return '#FF9800'; // Orange for offline
  };

  const getUserMarkerIcon = (user: ProtectedUser) => {
    const hasActiveAlert = activeAlerts.some(alert => alert.userId === user.id);
    if (hasActiveAlert) return 'alert-circle';
    return 'account';
  };

  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - lastSeen.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440)
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const callUser = (phoneNumber: string) => {
    if (phoneNumber) {
      const url = `tel:${phoneNumber}`;
      require('react-native').Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />

      {/* Header */}
      <LinearGradient colors={['#4CAF50', '#388E3C']} style={styles.header}>
        <View style={styles.headerContent}>
          <Icon name="map" size={40} color="white" />
          <Text style={styles.headerTitle}>Live Location Map</Text>
          <Text style={styles.headerSubtitle}>
            Monitor protected users in real-time
          </Text>
        </View>
      </LinearGradient>

      {/* Map */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Icon name="loading" size={48} color="#4CAF50" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadProtectedUsers}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : protectedUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="account-group-outline" size={64} color="#E0E0E0" />
          <Text style={styles.emptyText}>No Protected Users</Text>
          <Text style={styles.emptySubtext}>
            Add users from the Guardian Dashboard to see their locations on the
            map
          </Text>
        </View>
      ) : (
        <View style={styles.mapContainer}>
           <MapView
             provider={PROVIDER_GOOGLE}
             style={styles.map}
             region={mapRegion}
             showsUserLocation={true}
             showsMyLocationButton={true}
             showsCompass={true}
             showsScale={true}>
            {protectedUsers.map(user => {
              if (!user.currentLocation) return null;

              return (
                <Marker
                  key={user.id}
                  coordinate={{
                    latitude: user.currentLocation.latitude,
                    longitude: user.currentLocation.longitude,
                  }}
                  title={user.name}
                  description={
                    user.currentLocation.address ||
                    `${user.currentLocation.latitude.toFixed(
                      4,
                    )}, ${user.currentLocation.longitude.toFixed(4)}`
                  }
                  pinColor={getUserMarkerColor(user)}
                  onPress={() => setSelectedUser(user)}>
                  <View
                    style={[
                      styles.customMarker,
                      {backgroundColor: getUserMarkerColor(user)},
                    ]}>
                    <Icon
                      name={getUserMarkerIcon(user)}
                      size={24}
                      color="white"
                    />
                  </View>
                </Marker>
              );
            })}
          </MapView>
        </View>
      )}

      {/* User List */}
      {protectedUsers.length > 0 && (
        <View style={styles.userListContainer}>
          <Text style={styles.userListTitle}>
            Protected Users ({protectedUsers.length})
          </Text>
          <View style={styles.userList}>
            {protectedUsers.map(user => {
              const hasActiveAlert = activeAlerts.some(
                alert => alert.userId === user.id,
              );
              const alert = activeAlerts.find(
                alert => alert.userId === user.id,
              );

              return (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.userItem,
                    selectedUser?.id === user.id && styles.selectedUserItem,
                    hasActiveAlert && styles.emergencyUserItem,
                  ]}
                  onPress={() => setSelectedUser(user)}>
                  <View style={styles.userItemContent}>
                    <View style={styles.userAvatar}>
                      <Icon
                        name={getUserMarkerIcon(user)}
                        size={20}
                        color="white"
                      />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.name}</Text>
                      <Text style={styles.userPhone}>{user.phoneNumber}</Text>
                      <Text
                        style={[
                          styles.userStatus,
                          {
                            color: hasActiveAlert
                              ? '#F44336'
                              : user.isOnline
                              ? '#4CAF50'
                              : '#FF9800',
                          },
                        ]}>
                        {hasActiveAlert
                          ? '🚨 EMERGENCY ACTIVE'
                          : user.isOnline
                          ? '🟢 Online'
                          : `🟡 Last seen ${formatLastSeen(user.lastSeen)}`}
                      </Text>
                      {user.currentLocation && (
                        <Text style={styles.userLocation}>
                          📍{' '}
                          {user.currentLocation.address ||
                            `${user.currentLocation.latitude.toFixed(
                              4,
                            )}, ${user.currentLocation.longitude.toFixed(4)}`}
                        </Text>
                      )}
                      {alert && (
                        <Text style={styles.alertMessage}>
                          🚨 {alert.message || 'Emergency alert active'}
                        </Text>
                      )}
                    </View>
                    <View style={styles.userActions}>
                      <TouchableOpacity
                        style={styles.callButton}
                        onPress={() => callUser(user.phoneNumber)}>
                        <Icon name="phone" size={20} color="#4CAF50" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Selected User Details Modal */}
      {selectedUser && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedUser.name}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedUser(null)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                Phone: {selectedUser.phoneNumber}
              </Text>
              <Text style={styles.modalText}>Email: {selectedUser.email}</Text>
              <Text style={styles.modalText}>
                Status:{' '}
                {selectedUser.isOnline
                  ? 'Online'
                  : `Last seen ${formatLastSeen(selectedUser.lastSeen)}`}
              </Text>
              {selectedUser.currentLocation && (
                <>
                  <Text style={styles.modalText}>
                    Location:{' '}
                    {selectedUser.currentLocation.address ||
                      'Address not available'}
                  </Text>
                  <Text style={styles.modalText}>
                    Coordinates:{' '}
                    {selectedUser.currentLocation.latitude.toFixed(6)},{' '}
                    {selectedUser.currentLocation.longitude.toFixed(6)}
                  </Text>
                </>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => callUser(selectedUser.phoneNumber)}>
                <Icon name="phone" size={20} color="white" />
                <Text style={styles.modalButtonText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  mapContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  map: {
    flex: 1,
  },
  customMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  userListContainer: {
    maxHeight: height * 0.3,
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  userListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  userList: {
    flex: 1,
    padding: 10,
  },
  userItem: {
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedUserItem: {
    backgroundColor: '#E3F2FD',
  },
  emergencyUserItem: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  userItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  userLocation: {
    fontSize: 12,
    color: '#666',
  },
  alertMessage: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '600',
    marginTop: 4,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callButton: {
    padding: 8,
    backgroundColor: '#E8F5E8',
    borderRadius: 20,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  modalBody: {
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    margin: 10,
    borderRadius: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    margin: 10,
    borderRadius: 12,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    margin: 10,
    borderRadius: 12,
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    color: '#666',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default GuardianMapScreen;
