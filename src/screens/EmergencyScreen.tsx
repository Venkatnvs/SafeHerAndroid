import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Dimensions,
  Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useEmergency } from '../context/EmergencyContext';
import { useLocation } from '../context/LocationContext';

const { width } = Dimensions.get('window');

const EmergencyScreen = () => {
  const navigation = useNavigation();
  const { currentAlert, resolveEmergency, notifyQuickContactsSMS } = useEmergency();
  const { currentLocation } = useLocation();
  
  const [isResolving, setIsResolving] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [autoActionsStarted, setAutoActionsStarted] = useState(false);
  const [showCancelOption, setShowCancelOption] = useState(true);

  const handleResolveEmergency = async () => {
    Alert.alert(
      'Resolve Emergency',
      'Are you sure you want to resolve this emergency? This will stop all alerts and recordings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Resolve', 
          style: 'destructive',
          onPress: async () => {
            setIsResolving(true);
            try {
              if (!currentAlert) return;
              await resolveEmergency(currentAlert.id);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to resolve emergency. Please try again.');
            } finally {
              setIsResolving(false);
            }
          }
        }
      ]
    );
  };

  const handleCallEmergency = () => {
    const emergencyNumber = '100';
    const serviceName = 'Police';
    
    Alert.alert(
      'Call Emergency Services',
      `This will dial ${emergencyNumber} (${serviceName}) immediately. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: `Call ${emergencyNumber}`, onPress: () => {
          Linking.openURL(`tel:${emergencyNumber}`);
        }}
      ]
    );
  };

  const handleContactGuardians = () => {
    Alert.alert(
      'Contact Guardians',
      'Send an additional alert to all your guardians?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Alert', onPress: () => {
          Alert.alert('Alert Sent', 'Additional alerts have been sent to your guardians.');
        }}
      ]
    );
  };

  useEffect(() => {
    let timer: any = null;
    if (currentAlert && countdown !== null) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            if (!autoActionsStarted) {
              setAutoActionsStarted(true);
              const emergencyNumber = '100';
              Linking.openURL(`tel:${emergencyNumber}`);
              // Send additional notifications
              notifyQuickContactsSMS('Emergency active. Please help or call me back.');
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [currentAlert, countdown, autoActionsStarted]);

  if (!currentAlert) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#F44336" />
        <View style={styles.noEmergencyContainer}>
          <Icon name="check-circle" size={80} color="#4CAF50" />
          <Text style={styles.noEmergencyTitle}>No Active Emergency</Text>
          <Text style={styles.noEmergencyText}>
            There is currently no active emergency. You can go back to the home screen.
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F44336" />
      {countdown !== null && (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownText}>{countdown}</Text>
          <Text style={styles.countdownSubtext}>Preparing to start emergency actions…</Text>
          {showCancelOption && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                Alert.alert(
                  'Cancel Emergency',
                  'Are you sure you want to cancel this emergency? This will stop all alerts.',
                  [
                    { text: 'Continue Emergency', style: 'cancel' },
                    { 
                      text: 'Cancel Emergency', 
                      style: 'destructive',
                      onPress: async () => {
                        if (currentAlert) {
                          await resolveEmergency(currentAlert.id, 'Cancelled by user');
                          navigation.goBack();
                        }
                      }
                    }
                  ]
                );
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel Emergency</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Emergency Header */}
      <LinearGradient
        colors={['#F44336', '#D32F2F']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Icon name="phone-alert" size={80} color="white" />
          <Text style={styles.headerTitle}>EMERGENCY ACTIVE</Text>
          <Text style={styles.headerSubtitle}>Immediate assistance required</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Emergency Status */}
        <View style={styles.statusSection}>
          <View style={styles.statusCard}>
            <Icon name="alert-circle" size={48} color="#F44336" />
            <Text style={styles.statusTitle}>Emergency Alert Active</Text>
            <Text style={styles.statusTime}>
              Triggered at {currentAlert.timestamp.toLocaleTimeString()}
            </Text>
            <Text style={styles.statusMessage}>
              {currentAlert.message}
            </Text>
          </View>
        </View>

        {/* Location Information */}
        {currentLocation && (
          <View style={styles.locationSection}>
            <Text style={styles.sectionTitle}>Your Current Location</Text>
            
            <View style={styles.locationCard}>
              <Icon name="crosshairs-gps" size={24} color="#2196F3" />
              <View style={styles.locationInfo}>
                <Text style={styles.locationText}>
                  Latitude: {currentLocation.latitude.toFixed(6)}
                </Text>
                <Text style={styles.locationText}>
                  Longitude: {currentLocation.longitude.toFixed(6)}
                </Text>
                <Text style={styles.locationAccuracy}>
                  Accuracy: ±{currentLocation.accuracy.toFixed(1)} meters
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Emergency Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleCallEmergency}
          >
            <LinearGradient
              colors={['#F44336', '#D32F2F']}
              style={styles.actionButtonGradient}
            >
              <Icon name="phone" size={32} color="white" />
              <Text style={styles.actionButtonText}>
                Call Emergency Services (100)
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleContactGuardians}
          >
            <LinearGradient
              colors={['#FF9800', '#F57C00']}
              style={styles.actionButtonGradient}
            >
              <Icon name="bell" size={32} color="white" />
              <Text style={styles.actionButtonText}>Contact Guardians</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Safe Zones', 'Opening safe zones map...')}
          >
            <LinearGradient
              colors={['#2196F3', '#1976D2']}
              style={styles.actionButtonGradient}
            >
              <Icon name="map-marker" size={32} color="white" />
              <Text style={styles.actionButtonText}>Find Nearest Safe Zone</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Recording Status */}
        <View style={styles.recordingSection}>
          <Text style={styles.sectionTitle}>Recording Status</Text>
          
          <View style={styles.recordingCard}>
            <View style={styles.recordingItem}>
              <Icon name="microphone" size={24} color="#4CAF50" />
              <Text style={styles.recordingText}>Audio Recording: Active</Text>
            </View>
            
            <Text style={styles.recordingNote}>
              All recordings are automatically saved and can be used as evidence if needed.
            </Text>
          </View>
        </View>

        {/* Guardian Responses */}
        {currentAlert.guardianResponses && currentAlert.guardianResponses.length > 0 && (
          <View style={styles.responsesSection}>
            <Text style={styles.sectionTitle}>Guardian Responses</Text>
            
            {currentAlert.guardianResponses.map((response, index) => (
              <View key={index} style={styles.responseCard}>
                <View style={styles.responseHeader}>
                  <Text style={styles.guardianEmail}>{response.guardianEmail}</Text>
                  <Text style={styles.responseTime}>
                    {response.responseTime.toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.responseAction}>{response.action}</Text>
                {response.message && (
                  <Text style={styles.responseMessage}>{response.message}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Resolve Emergency */}
        <View style={styles.resolveSection}>
          <TouchableOpacity
            style={[styles.resolveButton, (isResolving) && styles.resolveButtonDisabled]}
            onPress={handleResolveEmergency}
            disabled={isResolving}
          >
            <LinearGradient
              colors={['#4CAF50', '#388E3C']}
              style={styles.resolveButtonGradient}
            >
              <Icon name="check-circle" size={32} color="white" />
              <Text style={styles.resolveButtonText}>
                {isResolving ? 'Resolving...' : 'Resolve Emergency'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <Text style={styles.resolveNote}>
            Only resolve the emergency when you are safe and no longer need assistance.
          </Text>
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
  noEmergencyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  noEmergencyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  noEmergencyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: 60,
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
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(244,67,54,0.85)',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  countdownText: {
    fontSize: 96,
    color: '#fff',
    fontWeight: 'bold',
  },
  countdownSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 8,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    marginTop: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statusSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusTime: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  statusMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
  },
  locationSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  locationInfo: {
    flex: 1,
    marginLeft: 16,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  locationAccuracy: {
    fontSize: 12,
    color: '#666',
  },
  actionsSection: {
    marginBottom: 20,
  },
  actionButton: {
    height: 64,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  actionButtonGradient: {
    flex: 1,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 16,
    flex: 1,
  },
  recordingSection: {
    marginBottom: 20,
  },
  recordingCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  recordingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordingText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
  },
  recordingNote: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 20,
  },
  responsesSection: {
    marginBottom: 20,
  },
  responseCard: {
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
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  guardianEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  responseTime: {
    fontSize: 12,
    color: '#666',
  },
  responseAction: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 4,
  },
  responseMessage: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  resolveSection: {
    marginBottom: 40,
    alignItems: 'center',
  },
  resolveButton: {
    width: '100%',
    height: 64,
    borderRadius: 32,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  resolveButtonDisabled: {
    opacity: 0.7,
  },
  resolveButtonGradient: {
    flex: 1,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  resolveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 16,
  },
  resolveNote: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});

export default EmergencyScreen;
