import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, Linking, Alert, Vibration } from 'react-native';
import { auth, firestore, storage, messaging } from '../config/firebase';
import { navigate } from '../utils/NavigationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { INDIAN_EMERGENCY_MESSAGES } from '../constants/IndianEmergencyNumbers';
import { SafeLocationService } from '../services/SafeLocationService';
import { request, check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { FileUtils } from '../utils/FileUtils';
import { useSettings } from './SettingsContext';
import { SOSService } from '../services/SOSService';
import { SOS_CONFIG, formatSOSMessage, getActiveContacts } from '../config/sosConfig';

// Conditional imports to prevent NativeEventEmitter warnings
let BackgroundTimer: any = null;
let Shake: any = null;
let Voice: any = null;
let AudioRecorderPlayer: any = null;

try {
  BackgroundTimer = require('react-native-background-timer').default;
} catch (e) {
  console.log('BackgroundTimer not available');
}

try {
  Shake = require('react-native-shake').default;
} catch (e) {
  console.log('Shake not available');
}

try {
  Voice = require('@react-native-voice/voice').default;
} catch (e) {
  console.log('Voice not available');
}

try {
  AudioRecorderPlayer = require('react-native-audio-recorder-player').default;
} catch (e) {
  console.log('AudioRecorderPlayer not available');
}

// Using FileUtils for safe file paths

interface EmergencyAlert {
  id: string;
  userId: string;
  type: 'sos' | 'shake' | 'voice' | 'geofence' | 'manual';
  status: 'active' | 'resolved' | 'false_alarm';
  location: { latitude: number; longitude: number; accuracy: number; address?: string };
  timestamp: Date;
  message?: string;
  audioRecordingUrl?: string;
  guardianResponses: any[];
  resolvedAt?: Date;
  resolvedBy?: string;
}

interface EmergencyContextType {
  currentAlert: EmergencyAlert | null;
  alertHistory: EmergencyAlert[];
  isRecording: boolean;
  isListening: boolean;
  isShakeEnabled: boolean;
  isVoiceEnabled: boolean;
  setupPushNotifications: () => Promise<void>;
  setupShakeDetection: () => void;
  setupVoiceDetection: () => void;
  startBackgroundMonitoring: () => void;
  stopBackgroundMonitoring: () => void;
  triggerSOS: (message?: string) => Promise<void>;
  triggerShakeAlert: () => Promise<void>;
  triggerVoiceAlert: () => Promise<void>;
  resolveEmergency: (alertId: string, reason?: string) => Promise<void>;
  loadAlertHistory: () => Promise<void>;
  sendAlertToGuardians: (alert: EmergencyAlert) => Promise<void>;
  startAudioRecording: () => Promise<void>;
  stopAudioRecording: () => Promise<string | null>;
  startVideoRecording: () => Promise<void>;
  stopVideoRecording: () => Promise<string | null>;
  dialEmergencyNumber: () => void;
  sendSMS: (phoneNumber: string, message: string) => Promise<void>;
  sendEmail: (email: string, subject: string, message: string) => Promise<void>;
  notifyQuickContactsSMS: (message: string) => Promise<void>;
}

const EmergencyContext = createContext<EmergencyContextType | undefined>(undefined);

export const useEmergency = () => {
  const context = useContext(EmergencyContext);
  if (!context) throw new Error('useEmergency must be used within an EmergencyProvider');
  return context;
};

export const EmergencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { recordingSettings } = useSettings();
  const [currentAlert, setCurrentAlert] = useState<EmergencyAlert | null>(null);
  const [alertHistory, setAlertHistory] = useState<EmergencyAlert[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isShakeEnabled, setIsShakeEnabled] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  
  // Initialize SOS Service
  const sosService = SOSService.getInstance();
  sosService.setConfig(SOS_CONFIG);

  const [audioRecorder, setAudioRecorder] = useState<any>(null);
  const [recordingPath, setRecordingPath] = useState<string>('');
  const [backgroundTimer, setBackgroundTimer] = useState<any>(null);
  const [shakeListener, setShakeListener] = useState<any>(null);

  const setupPushNotifications = async () => {
    try {
      const token = await messaging().getToken();
      const user = auth().currentUser;
      if (user && token) {
        await firestore().collection('users').doc(user.uid).update({ fcmToken: token, pushNotificationsEnabled: true });
      }
    } catch (e) {}
  };

  const setupShakeDetection = () => {
    try {
      if (!Shake) {
        console.log('Shake detection not available');
        return;
      }
      if (shakeListener) shakeListener.remove();
      const listener = Shake.addListener(() => { triggerShakeAlert(); });
      setShakeListener(listener);
      setIsShakeEnabled(true);
    } catch (error) {
      console.log('Shake detection setup failed:', error);
    }
  };

  const setupVoiceDetection = () => {
    try {
      if (!Voice) {
        console.log('Voice detection not available');
        return;
      }
      Voice.onSpeechStart = () => setIsListening(true);
      Voice.onSpeechEnd = () => setIsListening(false);
      Voice.onSpeechResults = (event: any) => {
        const results = event.value || [];
        const keywords = ['help', 'help me', 'emergency', 'sos', 'danger', 'police', 'save me', 'please help', 'i am in danger', 'call police'];
        if (results.some((r: string) => keywords.some(k => r.toLowerCase().includes(k)))) {
          triggerVoiceAlert();
        }
      };
      setIsVoiceEnabled(true);
    } catch (error) {
      console.log('Voice detection setup failed:', error);
    }
  };

  const startBackgroundMonitoring = () => {
    try {
      if (isVoiceEnabled && Voice) { 
        Voice.start('en-US'); 
      }
      const timer = setInterval(() => {}, 30000);
      setBackgroundTimer(timer);
      if (BackgroundTimer) {
        BackgroundTimer.start();
      }
    } catch (error) {
      console.log('Background monitoring setup failed:', error);
    }
  };

  const stopBackgroundMonitoring = () => {
    try {
      if (backgroundTimer) clearInterval(backgroundTimer);
      if (shakeListener) shakeListener.remove();
      if (Voice) {
        Voice.destroy().then(Voice.removeAllListeners);
      }
      if (BackgroundTimer) {
        BackgroundTimer.stop();
      }
    } catch (error) {
      console.log('Background monitoring stop failed:', error);
    }
  };

  const triggerSOS = async (message?: string) => {
    const user = auth().currentUser;
    if (!user) return;
    
    console.log('🚨 SOS TRIGGERED - Starting emergency response sequence');
    
    // Get current location with better error handling using SafeLocationService
    let location = { latitude: 0, longitude: 0, accuracy: 0 };
    try {
      const locationService = SafeLocationService.getInstance();

      const currentLocation = await locationService.getCurrentLocation();
      if (currentLocation) {
        location = currentLocation;
      } else {
        const fallbackLocation = await locationService.getLocationFallback();
        if (fallbackLocation) {
          location = fallbackLocation;
        } else {
          const cachedLocation = locationService.getCachedLocation();
          if (cachedLocation) {
            location = cachedLocation;
          }
        }
      }
      console.log('📍 Location obtained:', location);
    } catch (error) {
      console.log('SafeLocationService error, trying Firebase location:', error);
      try {
        const userDoc = await firestore().collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData?.currentLocation) {
            location = userData.currentLocation;
          }
        }
      } catch (firebaseError) {
        console.error('Error getting location from Firebase:', firebaseError);
      }
    }

    const alert: Omit<EmergencyAlert, 'id'> = {
      userId: user.uid,
      type: 'sos',
      status: 'active',
      location,
      timestamp: new Date(),
      message: message || 'SOS triggered manually',
      guardianResponses: [],
    };
    
    try {
      const docRef = await firestore().collection('emergencyAlerts').add(alert);
      setCurrentAlert({ ...alert, id: docRef.id });
      console.log('💾 Emergency alert saved to Firestore:', docRef.id);
      
      // Skip audio recording entirely to avoid permission issues
      console.log('Audio recording disabled to prevent permission crashes');
      
      // Trigger immediate SOS actions
      await performSOSActions(location, message || 'SOS triggered manually');
      
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);
      
      // Navigate to Emergency screen
      try { 
        navigate('Emergency'); 
      } catch (error) {
        console.log('Navigation error:', error);
      }
      
    } catch (error) {
      console.error('Error creating emergency alert:', error);
      Alert.alert('Error', 'Failed to create emergency alert. Please try again.');
    }
  };

  // New function to perform SOS actions using the SOS service
  const performSOSActions = async (location: any, message: string) => {
    try {
      console.log('🚨 Performing SOS actions...');
      
      // Get active contacts based on configuration
      const contacts = getActiveContacts(SOS_CONFIG);
      console.log(`📞 Found ${contacts.length} contacts to notify: ${contacts.map(contact => contact.name).join(', ')}`);

      // Format the SOS message with location and timestamp
      const sosMessage = formatSOSMessage(SOS_CONFIG, location, new Date());
      console.log('📝 SOS Message:', sosMessage);

      // Send SMS if enabled
      if (SOS_CONFIG.SMS_CONFIG.enabled) {
        console.log('📱 Sending emergency SMS...');
        const smsContacts = contacts.filter(contact => 
          SOS_CONFIG.SMS_CONFIG.sendToPrimary && contact.isPrimary ||
          SOS_CONFIG.SMS_CONFIG.sendToSecondary && !contact.isPrimary ||
          SOS_CONFIG.SMS_CONFIG.sendToDebug && SOS_CONFIG.DEBUG_MODE
        ).map(contact => ({
          ...contact,
          phone: String(contact.phone).replace(/[^\d+]/g, '') // Clean phone number (remove - and other chars)
        }));
        
        const smsResults = await sosService.sendMultipleSMS(smsContacts, sosMessage);
        const successfulSMS = smsResults.filter(result => result.success);
        console.log(`✅ Sent ${successfulSMS.length}/${smsResults.length} successful SMS`);
      }

      // Make phone calls if enabled
      if (SOS_CONFIG.CALL_CONFIG.enabled) {
        console.log('📞 Making emergency phone calls...');
        const callContacts = contacts.filter(contact => 
          SOS_CONFIG.CALL_CONFIG.callPrimary && contact.isPrimary ||
          SOS_CONFIG.CALL_CONFIG.callSecondary && !contact.isPrimary ||
          SOS_CONFIG.CALL_CONFIG.callDebug && SOS_CONFIG.DEBUG_MODE
        ).map(contact => ({
          ...contact,
          phone: String(contact.phone).replace(/[^\d+]/g, '') // Clean phone number (remove - and other chars)
        }));
        
        const callResults = await sosService.makeMultipleCalls(callContacts);
        const successfulCalls = callResults.filter(result => result.success);
        console.log(`✅ Made ${successfulCalls.length}/${callResults.length} successful calls`);
      }

      // Show success message
      Alert.alert(
        'SOS Activated',
        `Emergency alert sent to ${contacts.length} contacts.\n\nLocation: ${location.latitude ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Not available'}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('❌ Error performing SOS actions:', error);
      Alert.alert('SOS Error', 'Some emergency actions failed. Please try calling emergency services manually.');
    }
  };

  const triggerShakeAlert = async () => {
    const user = auth().currentUser;
    if (!user) return;
    const alert: Omit<EmergencyAlert, 'id'> = {
      userId: user.uid,
      type: 'shake',
      status: 'active',
      location: { latitude: 0, longitude: 0, accuracy: 0 },
      timestamp: new Date(),
      message: 'Emergency detected via shake gesture',
      guardianResponses: [],
    };
    const docRef = await firestore().collection('emergencyAlerts').add(alert);
    setCurrentAlert({ ...alert, id: docRef.id });
    
    // Skip audio recording to avoid permission issues
    console.log('Audio recording disabled to prevent permission crashes');
    
    Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    try { navigate('Emergency'); } catch {}
    await notifyQuickContactsSMS('Emergency detected via shake gesture. I need help.');
  };

  const triggerVoiceAlert = async () => {
    const user = auth().currentUser;
    if (!user) return;
    const alert: Omit<EmergencyAlert, 'id'> = {
      userId: user.uid,
      type: 'voice',
      status: 'active',
      location: { latitude: 0, longitude: 0, accuracy: 0 },
      timestamp: new Date(),
      message: 'Emergency detected via voice command',
      guardianResponses: [],
    };
    const docRef = await firestore().collection('emergencyAlerts').add(alert);
    setCurrentAlert({ ...alert, id: docRef.id });
    
    // Skip audio recording to avoid permission issues
    console.log('Audio recording disabled to prevent permission crashes');
    
    Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    try { navigate('Emergency'); } catch {}
    await notifyQuickContactsSMS('Emergency detected via voice command. I need help.');
  };

  const resolveEmergency = async (alertId: string, reason?: string) => {
    await firestore().collection('emergencyAlerts').doc(alertId).update({ status: 'resolved', resolvedAt: new Date(), resolvedBy: auth().currentUser?.uid, resolutionReason: reason });
    if (isRecording) await stopAudioRecording();
    setCurrentAlert(null);
  };

  const loadAlertHistory = async () => {
    const snapshot = await firestore().collection('emergencyAlerts').orderBy('timestamp', 'desc').limit(50).get();
    const list: EmergencyAlert[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    setAlertHistory(list);
  };

  // Helper function to check permissions without requesting them
  const checkPermissions = async () => {
    try {
      // Skip permission check entirely to avoid native crashes
      console.log('Skipping permission check to avoid native crashes');
      return false; // Always return false to skip audio recording
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  };

  const startAudioRecording = async () => {
    try {
      // Check if audio recording is enabled in settings
      if (!recordingSettings.audioRecordingEnabled) {
        console.log('Audio recording is disabled in settings');
        return;
      }

      if (!AudioRecorderPlayer) {
        console.log('Audio recording not available');
        return;
      }

      // Check for audio recording permission with better error handling
      let permission;
      try {
        permission = Platform.OS === 'ios' 
          ? PERMISSIONS.IOS.MICROPHONE 
          : PERMISSIONS.ANDROID.RECORD_AUDIO;
        
        console.log('Platform:', Platform.OS);
        console.log('Permission object:', permission);
        
        if (!permission) {
          console.error('Permission is null or undefined');
          console.log('Available permissions:', Object.keys(PERMISSIONS.ANDROID || {}));
          Alert.alert('Permission Error', 'Unable to request audio recording permission. Please check app permissions in settings.');
          return;
        }
      } catch (permissionError) {
        console.error('Error getting permission object:', permissionError);
        Alert.alert('Permission Error', 'Unable to access permission system. Please check app permissions in settings.');
        return;
      }
      
      let result;
      try {
        console.log('Requesting permission:', permission);
        result = await request(permission);
        console.log('Permission result:', result);
      } catch (error) {
        console.error('Permission request error:', error);
        Alert.alert('Permission Error', 'Failed to request audio recording permission. Please try again.');
        return;
      }
      
      if (result !== RESULTS.GRANTED) {
        console.log('Permission not granted:', result);
        Alert.alert('Permission Required', 'Audio recording permission is required for emergency features.');
        return;
      }

      if (!audioRecorder) setAudioRecorder(new AudioRecorderPlayer());
      
      // Ensure recordings directory exists
      try {
        await FileUtils.ensureRecordingsDirectory();
      } catch (dirError) {
        console.log('Failed to create recordings directory:', dirError);
        Alert.alert('Storage Error', 'Unable to create recordings folder. Please check storage permissions.');
        return;
      }
      
      // Use timestamped filename for better organization
      const path = await FileUtils.getTimestampedRecordingPath('audio');
      setRecordingPath(path);
      await (audioRecorder || new AudioRecorderPlayer()).startRecorder(path);
      setIsRecording(true);
      
      // Auto-stop recording after max duration if set
      if (recordingSettings.maxRecordingDuration > 0) {
        setTimeout(() => {
          if (isRecording) {
            stopAudioRecording();
          }
        }, recordingSettings.maxRecordingDuration * 60 * 1000);
      }
    } catch (error) {
      console.log('Audio recording start failed:', error);
      try {
        const originalPath = await FileUtils.getTimestampedRecordingPath('audio');
        const fallbackPath = FileUtils.getFallbackPath(originalPath);
        await (audioRecorder || new AudioRecorderPlayer()).startRecorder(fallbackPath);
        setRecordingPath(fallbackPath);
        setIsRecording(true);
      } catch (fallbackError) {
        console.log('Fallback audio recording also failed:', fallbackError);
        // If all recording attempts fail, just log it but don't crash the app
        Alert.alert('Recording Unavailable', 'Audio recording is not available at the moment. Emergency features will still work.');
      }
    }
  };

  const stopAudioRecording = async (): Promise<string | null> => {
    try {
      if (!audioRecorder || !isRecording || !AudioRecorderPlayer) return null;
      await audioRecorder.stopRecorder();
      setIsRecording(false);
      return null;
    } catch (error) {
      console.log('Audio recording stop failed:', error);
      return null;
    }
  };

  const startVideoRecording = async (): Promise<void> => {};
  const stopVideoRecording = async (): Promise<string | null> => null;

  const dialEmergencyNumber = () => {
    // Use the SOS service to make immediate calls to emergency numbers
    const emergencyContacts = SOS_CONFIG.PRIMARY_CONTACTS.filter(contact => contact.isEmergency);
    
    if (emergencyContacts.length > 0) {
      // Ensure contact phone number is a string and clean it (remove - and other chars)
      const contact = {
        ...emergencyContacts[0],
        phone: String(emergencyContacts[0].phone).replace(/[^\d+]/g, '')
      };
      
      // Call the first emergency contact immediately
      sosService.makePhoneCall(contact)
        .then(result => {
          if (result.success) {
            console.log(`✅ Emergency call initiated to ${result.contact.name}`);
          } else {
            console.error(`❌ Failed to call ${result.contact.name}:`, result.error);
            // Fallback to system dialer
            const phoneUrl = Platform.OS === 'android' ? `tel:100` : `tel:112`;
            Linking.openURL(phoneUrl);
          }
        })
        .catch(error => {
          console.error('Error making emergency call:', error);
          // Fallback to system dialer
          const phoneUrl = Platform.OS === 'android' ? `tel:100` : `tel:112`;
          Linking.openURL(phoneUrl);
        });
    } else {
      // Fallback to system dialer
      const phoneUrl = Platform.OS === 'android' ? `tel:100` : `tel:112`;
      Linking.openURL(phoneUrl);
    }
  };

  const sendSMS = async (phoneNumber: string, message: string): Promise<void> => {
    try {
      // Use SOS service for direct SMS sending with proper string conversion
      const contact = {
        name: 'Emergency Contact',
        phone: String(phoneNumber), // Ensure it's a string
        isPrimary: true,
        isEmergency: true,
      };
      
      const result = await sosService.sendSMS(contact, String(message)); // Ensure it's a string
      
      if (result.success) {
        console.log(`✅ SMS sent successfully to ${phoneNumber}`);
      } else {
        console.error(`❌ Failed to send SMS to ${phoneNumber}:`, result.error);
        // Fallback to system SMS app with proper encoding
        const cleanPhone = String(phoneNumber).replace(/[^\d+]/g, ''); // Remove - and other chars, keep + and digits
        const cleanMessage = String(message);
        const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(cleanMessage)}`;
        console.log('Fallback SMS URL:', smsUrl);
        await Linking.openURL(smsUrl);
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      // Fallback to system SMS app with proper encoding
      const cleanPhone = String(phoneNumber).replace(/[^\d+]/g, ''); // Remove - and other chars, keep + and digits
      const cleanMessage = String(message);
      const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(cleanMessage)}`;
      console.log('Catch fallback SMS URL:', smsUrl);
      await Linking.openURL(smsUrl);
    }
  };

  const sendEmail = async (email: string, subject: string, message: string): Promise<void> => {
    await Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`);
  };

  const sendEmergencySMSWithLocation = async (location: any, message: string): Promise<void> => {
    try {
      const user = auth().currentUser;
      if (!user) return;

      const userDoc = await firestore().collection('users').doc(user.uid).get();
      const userData = userDoc.exists ? userDoc.data() : null;
      const userName = userData?.displayName || 'SafeHer User';
      
      let locationString = '📍 Location: Unable to determine';
      let mapLink = '';
      
      if (location.latitude !== 0 && location.longitude !== 0) {
        locationString = `📍 GPS Coordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
        mapLink = `🗺️ Live Map: https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      }
      
      const timeString = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      const emergencyMessage = `🚨 EMERGENCY ALERT 🚨

${userName} is in danger and needs immediate help!

${locationString}
${mapLink}
⏰ Time: ${timeString}

${message}

Please call Police (100) and send help immediately!

This alert was sent from SafeHer app.`;

      if (userData?.emergencyContacts && userData.emergencyContacts.length > 0) {
        for (const contact of userData.emergencyContacts) {
          if (contact.phone) {
            await sendSMS(contact.phone, emergencyMessage);
          }
        }
      }

      if (userData?.guardianEmails && userData.guardianEmails.length > 0) {
        for (const email of userData.guardianEmails) {
          const guardianMessage = `🚨 GUARDIAN ALERT 🚨

${userName} has triggered an emergency alert!

${locationString}
${mapLink}
⏰ Time: ${timeString}

${message}

Please check on them immediately and call emergency services if needed.

Sent from SafeHer app.`;
          await sendEmail(email, 'SafeHer Emergency Alert', guardianMessage);
        }
      }

      await notifyQuickContactsSMS(emergencyMessage);
      
    } catch (error) {
      console.error('Error sending emergency SMS:', error);
    }
  };

  const notifyQuickContactsSMS = async (message: string): Promise<void> => {
    try {
      const saved = await AsyncStorage.getItem('quickDialContacts');
      if (!saved) return;
      const contacts = JSON.parse(saved);
      if (Array.isArray(contacts)) {
        const toSend = contacts.slice(0, 2);
        for (const c of toSend) {
          if (c?.phone) {
            await sendSMS(c.phone, message);
          }
        }
      }
    } catch {}
  };

  useEffect(() => {
    (async () => {
      await setupPushNotifications();
      setupShakeDetection();
      setupVoiceDetection();
      startBackgroundMonitoring();
      await loadAlertHistory();
    })();
    return () => stopBackgroundMonitoring();
  }, []);

  const value: EmergencyContextType = {
    currentAlert,
    alertHistory,
    isRecording,
    isListening,
    isShakeEnabled,
    isVoiceEnabled,
    setupPushNotifications,
    setupShakeDetection,
    setupVoiceDetection,
    startBackgroundMonitoring,
    stopBackgroundMonitoring,
    triggerSOS,
    triggerShakeAlert,
    triggerVoiceAlert,
    resolveEmergency,
    loadAlertHistory,
    sendAlertToGuardians: async () => {},
    startAudioRecording,
    stopAudioRecording,
    startVideoRecording,
    stopVideoRecording,
    dialEmergencyNumber,
    sendSMS,
    sendEmail,
    notifyQuickContactsSMS,
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  );
};
