import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLocation } from '../context/LocationContext';

const SafeZonesScreen = () => {
  const { safeZones, loading, currentLocation } = useLocation();

  const SafeZoneCard = ({ zone, index }: any) => (
    <TouchableOpacity style={styles.zoneCard}>
      <View style={[styles.zoneIcon, { backgroundColor: getZoneColor(zone.type) }]}>
        <Icon name={getZoneIcon(zone.type)} size={24} color="white" />
      </View>
      <View style={styles.zoneInfo}>
        <Text style={styles.zoneName}>{zone.name}</Text>
        <Text style={styles.zoneAddress}>{zone.address}</Text>
        <Text style={styles.zoneDistance}>
          {zone.distance ? `${zone.distance.toFixed(1)} km away` : 'Distance calculating...'}
        </Text>
      </View>
      <TouchableOpacity style={styles.callButton}>
        <Icon name="phone" size={20} color="#E91E63" />
      </TouchableOpacity>
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
        {!currentLocation && (
          <View style={styles.locationWarning}>
            <Icon name="crosshairs-gps" size={48} color="#FF9800" />
            <Text style={styles.warningTitle}>Location Access Required</Text>
            <Text style={styles.warningText}>
              SafeHer needs access to your location to show nearby safe zones and emergency services.
            </Text>
            <TouchableOpacity style={styles.enableLocationButton}>
              <Text style={styles.enableLocationText}>Enable Location</Text>
            </TouchableOpacity>
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

            {safeZones.length === 0 && !loading && (
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

        {/* Emergency Numbers */}
        <View style={styles.emergencySection}>
          <Text style={styles.emergencyTitle}>Emergency Numbers</Text>
          
          <View style={styles.emergencyGrid}>
            <TouchableOpacity style={styles.emergencyCard}>
              <Icon name="phone-alert" size={32} color="#F44336" />
              <Text style={styles.emergencyNumber}>112</Text>
              <Text style={styles.emergencyLabel}>General Emergency</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.emergencyCard}>
              <Icon name="police-badge" size={32} color="#2196F3" />
              <Text style={styles.emergencyNumber}>15</Text>
              <Text style={styles.emergencyLabel}>Police</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.emergencyCard}>
              <Icon name="ambulance" size={32} color="#F44336" />
              <Text style={styles.emergencyNumber}>16</Text>
              <Text style={styles.emergencyLabel}>Ambulance</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.emergencyCard}>
              <Icon name="fire-truck" size={32} color="#FF9800" />
              <Text style={styles.emergencyNumber}>18</Text>
              <Text style={styles.emergencyLabel}>Fire Brigade</Text>
            </TouchableOpacity>
          </View>
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
    paddingTop: 60,
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
});

export default SafeZonesScreen;
