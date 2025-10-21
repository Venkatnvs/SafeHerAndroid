import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLocation } from '../context/LocationContext';
import { INDIAN_EMERGENCY_NUMBERS } from '../constants/IndianEmergencyNumbers';

const SafeZonesScreen = () => {
  const { 
    safeZones, 
    currentLocation, 
    isLocationEnabled, 
    requestLocationPermission, 
    startLocationTracking,
    getNearbySafeZones 
  } = useLocation();
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (currentLocation && safeZones.length === 0) {
      loadNearbySafeZones();
    }
  }, [currentLocation]);

  const loadNearbySafeZones = async () => {
    setLoading(true);
    try {
      await getNearbySafeZones();
    } catch (error) {
      Alert.alert('Error', 'Failed to load nearby safe zones. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNearbySafeZones();
    setRefreshing(false);
  };

  const handleLocationPermission = async () => {
    const granted = await requestLocationPermission();
    if (granted) {
      startLocationTracking();
    } else {
      Alert.alert(
        'Permission Required',
        'Location access is needed to find nearby safe zones. Please enable it in settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
    }
  };

  const callEmergencyNumber = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const openMaps = (zone: any) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${zone.latitude},${zone.longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open maps. Please try again.');
    });
  };

  const shareLocation = (zone: any) => {
    const message = `I'm at ${zone.name} (${zone.address}). My coordinates: ${zone.latitude}, ${zone.longitude}`;
    const url = `sms:?body=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open SMS. Please try again.');
    });
  };

  const SafeZoneCard = ({ zone, index }: any) => (
    <TouchableOpacity 
      style={styles.zoneCard}
      onPress={() => openMaps(zone)}
    >
      <View style={[styles.zoneIcon, { backgroundColor: getZoneColor(zone.type) }]}>
        <Icon name={getZoneIcon(zone.type)} size={24} color="white" />
      </View>
      <View style={styles.zoneInfo}>
        <Text style={styles.zoneName}>{zone.name}</Text>
        <Text style={styles.zoneAddress}>{zone.address}</Text>
        <Text style={styles.zoneDistance}>
          {zone.distance ? `${(zone.distance / 1000).toFixed(1)} km away` : 'Distance calculating...'}
        </Text>
        {zone.phone && (
          <Text style={styles.zonePhone}>📞 {zone.phone}</Text>
        )}
      </View>
      <View style={styles.zoneActions}>
        {zone.phone && (
          <TouchableOpacity 
            style={styles.callButton}
            onPress={() => callEmergencyNumber(zone.phone)}
          >
            <Icon name="phone" size={20} color="#E91E63" />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={styles.directionsButton}
          onPress={() => openMaps(zone)}
        >
          <Icon name="directions" size={20} color="#2196F3" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={() => shareLocation(zone)}
        >
          <Icon name="share" size={20} color="#4CAF50" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const getZoneIcon = (type: string) => {
    switch (type) {
      case 'police': return 'police-badge';
      case 'hospital': return 'hospital-building';
      case 'school': return 'school';
      case 'pharmacy': return 'pharmacy';
      case 'bus_station': return 'bus';
      default: return 'map-marker';
    }
  };

  const getZoneColor = (type: string) => {
    switch (type) {
      case 'police': return '#2196F3';
      case 'hospital': return '#F44336';
      case 'school': return '#4CAF50';
      case 'pharmacy': return '#FF9800';
      case 'bus_station': return '#9C27B0';
      default: return '#607D8B';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
      
      {/* Header */}
      <LinearGradient
        colors={['#2196F3', '#1976D2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Safe Zones</Text>
          <Text style={styles.headerSubtitle}>
            {currentLocation ? 'Nearby emergency services' : 'Enable location to see nearby help'}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Location Status */}
        {!isLocationEnabled && (
          <View style={styles.locationWarning}>
            <Icon name="crosshairs-gps" size={48} color="#FF9800" />
            <Text style={styles.warningTitle}>Location Access Required</Text>
            <Text style={styles.warningText}>
              SafeHer needs access to your location to show nearby safe zones and emergency services.
            </Text>
            <TouchableOpacity 
              style={styles.enableLocationButton}
              onPress={handleLocationPermission}
            >
              <Text style={styles.enableLocationText}>Enable Location</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Finding nearby safe zones...</Text>
          </View>
        )}

        {/* Safe Zones List */}
        {currentLocation && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nearby Emergency Services</Text>
              <Text style={styles.sectionSubtitle}>
                {safeZones.length} service(s) found within 5km
              </Text>
            </View>

            {safeZones.map((zone, index) => (
              <SafeZoneCard key={zone.id} zone={zone} index={index} />
            ))}

            {safeZones.length === 0 && (
              <View style={styles.noZonesFound}>
                <Icon name="map-marker-off" size={64} color="#CCC" />
                <Text style={styles.noZonesTitle}>No Safe Zones Found</Text>
                <Text style={styles.noZonesText}>
                  We couldn't find any emergency services in your area. Try expanding your search radius.
                </Text>
              </View>
            )}
          </>
        )}

        {/* Indian Emergency Numbers */}
        <View style={styles.emergencySection}>
          <Text style={styles.emergencyTitle}>Indian Emergency Numbers</Text>
          
          <View style={styles.emergencyGrid}>
            {INDIAN_EMERGENCY_NUMBERS.QUICK_DIAL_OPTIONS.slice(0, 4).map((service, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.emergencyCard}
                onPress={() => callEmergencyNumber(service.number)}
              >
                <Icon name={service.icon} size={32} color={getZoneColor(service.name.toLowerCase().replace(' ', '_'))} />
                <Text style={styles.emergencyNumber}>{service.number}</Text>
                <Text style={styles.emergencyLabel}>{service.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <Icon name="refresh" size={20} color="#2196F3" />
            <Text style={styles.refreshText}>
              {refreshing ? 'Refreshing...' : 'Refresh Safe Zones'}
            </Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
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
  locationWarning: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 16,
    marginTop: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  enableLocationButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  enableLocationText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: 30,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  zoneCard: {
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
  zoneIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  zoneAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  zoneDistance: {
    fontSize: 12,
    color: '#999',
  },
  callButton: {
    padding: 8,
  },
  noZonesFound: {
    alignItems: 'center',
    padding: 40,
  },
  noZonesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  noZonesText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  emergencySection: {
    marginTop: 30,
    marginBottom: 40,
  },
  emergencyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  emergencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emergencyCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  emergencyNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  emergencyLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 16,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  zonePhone: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  zoneActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  directionsButton: {
    padding: 8,
    marginLeft: 8,
  },
  shareButton: {
    padding: 8,
    marginLeft: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  refreshText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
});

export default SafeZonesScreen;
