import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, Linking, Alert, Vibration } from 'react-native';
import { auth, firestore, storage, messaging } from '../config/firebase';
import BackgroundTimer from 'react-native-background-timer';
import Shake from 'react-native-shake';
import Voice from '@react-native-voice/voice';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { navigate } from '../utils/NavigationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { INDIAN_EMERGENCY_MESSAGES } from '../constants/IndianEmergencyNumbers';

interface EmergencyAlert {
  id: string;
  userId: string;
  type: 'sos' | 'shake' | 'voice' | 'geofence' | 'manual';
  status: 'active' | 'resolved' | 'false_alarm';
  location: { latitude: number; longitude: number; accuracy: number; address?: string };
  timestamp: Date;
  message?: string;
  audioRecordingUrl?: string;
  videoRecordingUrl?: string;
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
  const [currentAlert, setCurrentAlert] = useState<EmergencyAlert | null>(null);
  const [alertHistory, setAlertHistory] = useState<EmergencyAlert[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isShakeEnabled, setIsShakeEnabled] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);

  const [audioRecorder, setAudioRecorder] = useState<AudioRecorderPlayer | null>(null);
  const [recordingPath, setRecordingPath] = useState<string>('');
  const [backgroundTimer, setBackgroundTimer] = useState<NodeJS.Timeout | null>(null);
  const [shakeListener, setShakeListener] = useState<any>(null);

  const setupPushNotifications = async () => {
    try {
      // RNFirebase messaging auto-initializes; token retrieval on Android:
      const token = await messaging().getToken();
      const user = auth().currentUser;
      if (user && token) {
        await firestore().collection('users').doc(user.uid).update({ fcmToken: token, pushNotificationsEnabled: true });
      }
    } catch (e) {}
  };

  const setupShakeDetection = () => {
    try {
      if (shakeListener) shakeListener.remove();
      const listener = Shake.addListener(() => { triggerShakeAlert(); });
      setShakeListener(listener);
      setIsShakeEnabled(true);
    } catch {}
  };

  const setupVoiceDetection = () => {
    try {
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
    } catch {}
  };

  const startBackgroundMonitoring = () => {
    try {
      if (isVoiceEnabled) { Voice.start('en-US'); }
      const timer = setInterval(() => {}, 30000);
      setBackgroundTimer(timer);
      BackgroundTimer.start();
    } catch {}
  };

  const stopBackgroundMonitoring = () => {
    try {
      if (backgroundTimer) clearInterval(backgroundTimer);
      if (shakeListener) shakeListener.remove();
      Voice.destroy().then(Voice.removeAllListeners);
      BackgroundTimer.stop();
    } catch {}
  };

  const triggerSOS = async (message?: string) => {
    const user = auth().currentUser;
    if (!user) return;
    
    // Get current location if available
    let location = { latitude: 0, longitude: 0, accuracy: 0 };
    try {
      const userDoc = await firestore().collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.currentLocation) {
          location = userData.currentLocation;
        }
      }
    } catch (error) {
      console.error('Error getting location:', error);
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
    const docRef = await firestore().collection('emergencyAlerts').add(alert);
    setCurrentAlert({ ...alert, id: docRef.id });
    await startAudioRecording();
    Vibration.vibrate([0, 500, 200, 500]);
    try { navigate('Emergency'); } catch {}
    
    // Send enhanced SMS with location
    await sendEmergencySMSWithLocation(location, message || 'SOS triggered manually');
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
    await startAudioRecording();
    Vibration.vibrate([0, 500, 200, 500]);
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
    await startAudioRecording();
    Vibration.vibrate([0, 500, 200, 500]);
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

  const startAudioRecording = async () => {
    if (!audioRecorder) setAudioRecorder(new AudioRecorderPlayer());
    const path = Platform.OS === 'ios' ? 'emergency_recording.m4a' : '/sdcard/emergency_recording.mp3';
    setRecordingPath(path);
    await (audioRecorder || new AudioRecorderPlayer()).startRecorder(path);
    setIsRecording(true);
  };

  const stopAudioRecording = async (): Promise<string | null> => {
    if (!audioRecorder || !isRecording) return null;
    await audioRecorder.stopRecorder();
    setIsRecording(false);
    return null; // Upload implementation can be added when needed
  };

  const startVideoRecording = async (): Promise<void> => {};
  const stopVideoRecording = async (): Promise<string | null> => null;

  const dialEmergencyNumber = () => {
    Linking.openURL(`tel:112`);
  };

  const sendSMS = async (phoneNumber: string, message: string): Promise<void> => {
    await Linking.openURL(`sms:${phoneNumber}?body=${encodeURIComponent(message)}`);
  };

  const sendEmail = async (email: string, subject: string, message: string): Promise<void> => {
    await Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`);
  };

  const sendEmergencySMSWithLocation = async (location: any, message: string): Promise<void> => {
    try {
      const user = auth().currentUser;
      if (!user) return;

      // Get user data for personalized messages
      const userDoc = await firestore().collection('users').doc(user.uid).get();
      const userData = userDoc.exists ? userDoc.data() : null;
      const userName = userData?.displayName || 'SafeHer User';
      
      // Create location string
      const locationString = location.latitude !== 0 && location.longitude !== 0 
        ? `📍 Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
        : '📍 Location: Unable to determine';
      
      const timeString = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Send to emergency contacts
      if (userData?.emergencyContacts && userData.emergencyContacts.length > 0) {
        for (const contact of userData.emergencyContacts) {
          if (contact.phone) {
            const smsMessage = INDIAN_EMERGENCY_MESSAGES.SOS_MESSAGE(locationString, timeString);
            await sendSMS(contact.phone, smsMessage);
          }
        }
      }

      // Send to guardians
      if (userData?.guardianEmails && userData.guardianEmails.length > 0) {
        for (const email of userData.guardianEmails) {
          const guardianMessage = INDIAN_EMERGENCY_MESSAGES.GUARDIAN_MESSAGE(locationString, timeString, userName);
          await sendEmail(email, 'SafeHer Emergency Alert', guardianMessage);
        }
      }

      // Send to quick dial contacts
      await notifyQuickContactsSMS(INDIAN_EMERGENCY_MESSAGES.SOS_MESSAGE(locationString, timeString));
      
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
      // Ensure background listening starts automatically
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
