import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Platform, Linking, Alert, Vibration } from 'react-native';
import { auth, firestore, storage, messaging } from '../config/firebase';
import { navigate } from '../utils/NavigationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { INDIAN_EMERGENCY_MESSAGES } from '../constants/IndianEmergencyNumbers';
import { SafeLocationService } from '../services/SafeLocationService';
import { request, check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { FileUtils } from '../utils/FileUtils';
import { SOSService } from '../services/SOSService';
import { PushNotificationService, PushNotificationMessage } from '../services/PushNotificationService';
import { SOS_CONFIG, formatSOSMessage, getActiveContacts } from '../config/sosConfig';

// Global reference to EmergencyContext's updateSOSSettings function
let globalUpdateSOSSettings: ((newSettings: any) => void) | null = null;

export const setGlobalUpdateSOSSettings = (fn: (newSettings: any) => void) => {
  globalUpdateSOSSettings = fn;
};

export const getGlobalUpdateSOSSettings = () => globalUpdateSOSSettings;
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
  sendAlertToGuardians: (location: any, message: string) => Promise<void>;
  performSOSActions: (location: any, message: string) => Promise<void>;
  updateSOSSettings: (newSettings: any) => void;
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
  if (!context) {
    console.error('useEmergency must be used within an EmergencyProvider');
    throw new Error('useEmergency must be used within an EmergencyProvider');
  }
  return context;
};

export const EmergencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize with default settings to avoid dependency issues
  const [recordingSettings] = useState({
    audioRecordingEnabled: false,
    autoRecordOnEmergency: false,
    maxRecordingDuration: 5,
    storageLocation: 'local' as const,
  });
  
  const [sosSettings, setSosSettings] = useState({
    selectedCallContact: {
      name: 'Police',
      phone: '100',
      isPrimary: true,
      isEmergency: true,
    },
    selectedSMSContacts: [
      {
        name: 'Police',
        phone: '100',
        isPrimary: true,
        isEmergency: true,
      },
    ],
    availableHelplines: [
      { name: 'Police', phone: '100', isPrimary: true, isEmergency: true },
      { name: 'Medical Emergency', phone: '102', isPrimary: true, isEmergency: true },
      { name: 'Women Helpline', phone: '1091', isPrimary: true, isEmergency: true },
      { name: 'Fire', phone: '101', isPrimary: true, isEmergency: true },
      { name: 'Child Helpline', phone: '1098', isPrimary: true, isEmergency: true },
    ],
    deviceContacts: [],
    contactsLoaded: false,
  });
  const [currentAlert, setCurrentAlert] = useState<EmergencyAlert | null>(null);
  const [alertHistory, setAlertHistory] = useState<EmergencyAlert[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isShakeEnabled, setIsShakeEnabled] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [lastSOSTrigger, setLastSOSTrigger] = useState<number>(0);
  const [sosCooldownPeriod] = useState(30000); // 30 seconds cooldown
  
  // Function to update SOS settings from SettingsContext
  const updateSOSSettings = (newSettings: any) => {
    console.log('🔄 Updating SOS settings in EmergencyContext:', newSettings);
    console.log('🔄 Previous SOS settings:', sosSettings);
    setSosSettings(prev => {
      const updated = { ...prev, ...newSettings };
      console.log('🔄 Updated SOS settings:', updated);
      return updated;
    });
  };
  
  // Set global reference for SettingsContext to use
  setGlobalUpdateSOSSettings(updateSOSSettings);
  
  // Load initial SOS settings from AsyncStorage
  useEffect(() => {
    const loadInitialSOSSettings = async () => {
      try {
        console.log('🔄 Loading initial SOS settings from AsyncStorage...');
        const savedSOSSettings = await AsyncStorage.getItem('sosSettings');
        if (savedSOSSettings) {
          const parsedSettings = JSON.parse(savedSOSSettings);
          console.log('🔄 Loaded SOS settings from storage:', parsedSettings);
          setSosSettings(prev => ({ ...prev, ...parsedSettings }));
        } else {
          console.log('🔄 No saved SOS settings found, using defaults');
        }
      } catch (error) {
        console.error('❌ Error loading initial SOS settings:', error);
      }
    };
    
    loadInitialSOSSettings();
  }, []);
  
  // Initialize SOS Service
  const sosService = SOSService.getInstance();
  sosService.setConfig(SOS_CONFIG);

  // Initialize Push Notification Service
  const pushNotificationService = PushNotificationService.getInstance();

  const [audioRecorder, setAudioRecorder] = useState<any>(null);
  const [recordingPath, setRecordingPath] = useState<string>('');
  const [backgroundTimer, setBackgroundTimer] = useState<any>(null);
  const [shakeListener, setShakeListener] = useState<any>(null);
  
  // Shake detection tuning
  const SHAKE_WINDOW_MS = 1200;
  const SHAKE_MIN_COUNT = 3;
  const SHAKE_COOLDOWN_MS = 3000;
  const lastShakeTimestampRef = useRef<number>(0);
  const lastShakeTriggerRef = useRef<number>(0);
  const shakeCountRef = useRef<number>(0);

  const setupPushNotifications = async () => {
    try {
      console.log('🔔 Setting up push notifications...');
      
      // Request notification permissions
      const hasPermission = await pushNotificationService.requestNotificationPermissions();
      if (!hasPermission) {
        console.log('❌ Notification permissions not granted');
        return;
      }

      // Get and update FCM token
      const token = await pushNotificationService.getCurrentUserToken();
      const user = auth().currentUser;
      
      if (user && token) {
        await pushNotificationService.updateUserToken(user.uid, token);
        console.log('✅ FCM token updated for user');
      }

      // Setup notification listeners
      pushNotificationService.setupNotificationListeners();
      
      console.log('✅ Push notifications setup complete');
    } catch (error) {
      console.error('❌ Error setting up push notifications:', error);
    }
  };

  const setupShakeDetection = () => {
    try {
      if (!Shake) {
        console.log('Shake detection not available');
        return;
      }
      if (shakeListener) shakeListener.remove();
      const listener = Shake.addListener(() => {
        const now = Date.now();
        // Enforce cooldown to avoid rapid re-triggers
        if (now - lastShakeTriggerRef.current < SHAKE_COOLDOWN_MS) {
          return;
        }

        // Reset counter if outside the accumulation window
        if (now - lastShakeTimestampRef.current > SHAKE_WINDOW_MS) {
          shakeCountRef.current = 0;
        }

        lastShakeTimestampRef.current = now;
        shakeCountRef.current += 1;

        if (shakeCountRef.current >= SHAKE_MIN_COUNT) {
          // Reached required intensity
          shakeCountRef.current = 0;
          lastShakeTriggerRef.current = now;
          triggerShakeAlert();
        }
      });
      setShakeListener(listener);
      setIsShakeEnabled(true);
    } catch (error) {
      console.log('Shake detection setup failed:', error);
    }
  };

  const setupVoiceDetection = async () => {
    try {
      if (!Voice) {
        console.log('Voice detection not available');
        return;
      }

      // Request microphone permission first
      const microphonePermission = await request(
        Platform.OS === 'android' 
          ? PERMISSIONS.ANDROID.RECORD_AUDIO 
          : PERMISSIONS.IOS.MICROPHONE
      );

      if (microphonePermission !== RESULTS.GRANTED) {
        console.log('Microphone permission denied');
        Alert.alert(
          'Microphone Permission Required',
          'SafeHer needs microphone access to detect voice commands. Please enable it in settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('Setting up voice detection...');

      // Set up voice event handlers
      Voice.onSpeechStart = () => {
        console.log('🎤 Voice recognition started');
        setIsListening(true);
      };

      Voice.onSpeechEnd = () => {
        console.log('🎤 Voice recognition ended');
        setIsListening(false);
        
        // Restart listening after a short delay to maintain continuous listening
        setTimeout(() => {
          if (isVoiceEnabled) {
            console.log('🔄 Restarting voice listening after speech end...');
            startVoiceListeningWithRetry();
          }
        }, 500); // Reduced delay for faster restart
      };

      Voice.onSpeechResults = (event: any) => {
        console.log('🎤 Voice results:', event.value);
        const results = event.value || [];
        
        // Comprehensive emergency keywords in English and Hindi
        const keywords = [
          // English keywords
          'help', 'help me', 'emergency', 'sos', 'danger', 'police', 
          'save me', 'please help', 'i am in danger', 'call police',
          'fire', 'ambulance', 'hospital', 'attack', 'threat', 'dangerous',
          'someone help', 'call help', 'emergency help', 'i need help',
          'danger help', 'police help', 'save help', 'urgent help',
          
          // Hindi keywords
          'bachao', 'madad', 'police bulao', 'emergency', 'sahayata',
          'police ko bulao', 'ambulance bulao', 'hospital bulao',
          'madad chahiye', 'bachao madad', 'police madad', 'urgent madad',
          'danger hai', 'attack hai', 'threat hai', 'help chahiye',
          'police call', 'ambulance call', 'hospital call', 'emergency call'
        ];
        
        // Check for keyword matches (case insensitive)
        const detectedKeywords = results.filter((r: string) => {
          const lowerResult = r.toLowerCase().trim();
          return keywords.some(k => lowerResult.includes(k.toLowerCase()));
        });
        
        if (detectedKeywords.length > 0) {
          console.log('🚨 Emergency keywords detected:', detectedKeywords);
          console.log('🚨 Full speech result:', results);
          triggerVoiceAlert();
        } else {
          console.log('🎤 No emergency keywords found in:', results);
        }
      };

      Voice.onSpeechError = (error: any) => {
        console.error('🎤 Voice recognition error:', error);
        setIsListening(false);
        
        // Handle specific error types
        if (error.error && error.error.code) {
          console.log('🎤 Error code:', error.error.code);
          
          // Network error - retry quickly
          if (error.error.code === 6 || error.error.code === 7) {
            setTimeout(() => {
              if (isVoiceEnabled) {
                console.log('🔄 Restarting voice listening after network error...');
                startVoiceListeningWithRetry();
              }
            }, 2000);
            return;
          }
          
          // Audio error - retry with delay
          if (error.error.code === 8 || error.error.code === 9) {
            setTimeout(() => {
              if (isVoiceEnabled) {
                console.log('🔄 Restarting voice listening after audio error...');
                startVoiceListeningWithRetry();
              }
            }, 5000);
            return;
          }
        }
        
        // Default retry for other errors
        setTimeout(() => {
          if (isVoiceEnabled) {
            console.log('🔄 Restarting voice listening after error...');
            startVoiceListeningWithRetry();
          }
        }, 3000);
      };

      setIsVoiceEnabled(true);
      console.log('✅ Voice detection setup completed');
      
      // Start initial listening with retry mechanism after ensuring state is updated
      setTimeout(() => {
        console.log('🎤 Starting automatic voice listening with retry mechanism...');
        // Force start voice listening since we just enabled it
        startVoiceListeningWithRetry(0, 3, true);
      }, 2000); // Increased delay to ensure state is updated
      
    } catch (error) {
      console.error('❌ Voice detection setup failed:', error);
      Alert.alert('Voice Detection Error', 'Failed to setup voice detection. Please check microphone permissions.');
    }
  };

  // Automatic voice detection with retry mechanism
  const startVoiceListeningWithRetry = async (retryCount = 0, maxRetries = 3, forceStart = false) => {
    try {
      console.log(`🎤 Starting voice listening (attempt ${retryCount + 1}/${maxRetries + 1})...`);
      console.log('🎤 Voice object:', !!Voice);
      console.log('🎤 isVoiceEnabled:', isVoiceEnabled);
      console.log('🎤 Voice module available:', Voice !== null);
      console.log('🎤 Force start:', forceStart);
      
      if (!Voice) {
        console.log('❌ Voice module not available');
        return;
      }
      
      if (!isVoiceEnabled && !forceStart) {
        console.log('❌ Voice detection not enabled');
        return;
      }
      
      // Try multiple languages for better recognition
      const languages = ['en-US', 'hi-IN', 'en-IN'];
      let started = false;
      
      for (const lang of languages) {
        try {
          console.log(`🎤 Attempting to start with language: ${lang}`);
          await Voice.start(lang);
          console.log(`✅ Voice listening started with language: ${lang}`);
          setIsListening(true);
          started = true;
          break;
        } catch (langError) {
          console.log(`⚠️ Failed to start with ${lang}:`, langError);
        }
      }
      
      if (!started) {
        throw new Error('Failed to start voice recognition with any language');
      }
      
    } catch (error) {
      console.error(`❌ Failed to start voice listening (attempt ${retryCount + 1}):`, error);
      setIsListening(false);
      
      // Retry with exponential backoff if we haven't exceeded max retries
      if (retryCount < maxRetries) {
        const delay = 5000; // 5 seconds delay
        console.log(`🔄 Retrying voice listening in ${delay/1000} seconds... (${retryCount + 1}/${maxRetries})`);
        
        setTimeout(() => {
          if (isVoiceEnabled || forceStart) {
            startVoiceListeningWithRetry(retryCount + 1, maxRetries, forceStart);
          }
        }, delay);
      } else {
        console.error('❌ Voice listening failed after maximum retries. Giving up.');
        // Still try to restart after a longer delay for background recovery
        setTimeout(() => {
          if (isVoiceEnabled) {
            console.log('🔄 Background recovery: attempting voice listening restart...');
            startVoiceListeningWithRetry(0, maxRetries, false);
          }
        }, 30000); // 30 seconds for background recovery
      }
    }
  };

  const stopVoiceListening = async () => {
    try {
      if (Voice) {
        console.log('🎤 Stopping voice listening...');
        await Voice.stop();
        setIsListening(false);
        console.log('✅ Voice listening stopped');
      }
    } catch (error) {
      console.error('❌ Failed to stop voice listening:', error);
    }
  };

  const startBackgroundMonitoring = () => {
    try {
      console.log('🔄 Starting background monitoring...');
      
      // Start voice listening if enabled
      if (isVoiceEnabled) {
        startVoiceListeningWithRetry();
      }
      
      const timer = setInterval(() => {
        // Periodic health check for voice detection
        if (isVoiceEnabled && !isListening) {
          console.log('🔄 Restarting voice listening (health check)...');
          startVoiceListeningWithRetry();
        } else if (isVoiceEnabled && isListening) {
          console.log('✅ Voice listening is active (health check passed)');
        }
      }, 15000); // More frequent health checks
      
      setBackgroundTimer(timer);
      
      if (BackgroundTimer) {
        BackgroundTimer.start();
      }
      
      console.log('✅ Background monitoring started');
    } catch (error) {
      console.error('❌ Background monitoring setup failed:', error);
    }
  };

  const stopBackgroundMonitoring = () => {
    try {
      console.log('🔄 Stopping background monitoring...');
      
      if (backgroundTimer) clearInterval(backgroundTimer);
      if (shakeListener) shakeListener.remove();
      
      // Stop voice listening
      if (Voice) {
        stopVoiceListening();
        Voice.destroy().then(() => {
          Voice.removeAllListeners();
          console.log('✅ Voice listeners removed');
        });
      }
      
      if (BackgroundTimer) {
        BackgroundTimer.stop();
      }
      
      console.log('✅ Background monitoring stopped');
    } catch (error) {
      console.error('❌ Background monitoring stop failed:', error);
    }
  };

  const triggerSOS = async (message?: string) => {
    // Allow SOS to work even without authentication (offline mode)
    const user = auth().currentUser;
    const userId = user?.uid || 'offline_user';
    
    console.log('🚨 triggerSOS called with message:', message);
    console.log('🚨 Current alert state:', currentAlert);
    console.log('🚨 Current alert ID:', currentAlert?.id);
    console.log('🚨 Current alert status:', currentAlert?.status);
    console.log('🚨 User authenticated:', !!user);
    
    // Check if there's already an active emergency
    if (currentAlert && currentAlert.status === 'active') {
      console.log('⚠️ Emergency already active - not triggering new SOS');
      console.log('⚠️ Current alert ID:', currentAlert.id);
      console.log('⚠️ Current alert status:', currentAlert.status);
      return;
    }
    
    console.log('🚨 SOS TRIGGERED - Starting emergency response sequence');
    
    // Get current location with better error handling using SafeLocationService (works offline)
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
      console.log('SafeLocationService error, trying Firebase location (optional):', error);
      // Only try Firebase if user is authenticated and we have internet
      if (user) {
        try {
          const userDoc = await firestore().collection('users').doc(user.uid).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData?.currentLocation) {
              location = userData.currentLocation;
            }
          }
        } catch (firebaseError) {
          console.log('Firebase location unavailable (offline mode):', firebaseError);
          // Continue with SOS even if Firebase fails
        }
      }
    }

    const alert: Omit<EmergencyAlert, 'id'> = {
      userId: userId,
      type: 'sos',
      status: 'active',
      location,
      timestamp: new Date(),
      message: message || 'SOS triggered manually',
      guardianResponses: [],
    };
    
    // Create local alert immediately (works offline)
    const localAlertId = `local_${Date.now()}`;
    setCurrentAlert({ ...alert, id: localAlertId });
    console.log('💾 Emergency alert created locally:', localAlertId);
    
    // Try to save to Firebase (optional, won't block SOS if it fails)
    if (user) {
      try {
        const docRef = await firestore().collection('emergencyAlerts').add(alert);
        setCurrentAlert({ ...alert, id: docRef.id });
        console.log('💾 Emergency alert saved to Firestore:', docRef.id);
        
        // Send persistent SOS notification (optional)
        try {
          const userName = user.displayName || user.email || 'Unknown User';
          pushNotificationService.sendSOSNotification(docRef.id, userName, location);
        } catch (notifError) {
          console.log('Push notification failed (offline mode):', notifError);
        }
      } catch (firebaseError) {
        console.log('Firebase save failed (offline mode) - SOS will still work:', firebaseError);
        // Keep using local alert ID
      }
    }
    
    // Skip audio recording entirely to avoid permission issues
    console.log('Audio recording disabled to prevent permission crashes');
    
    Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    
    // Navigate to Emergency screen using NavigationService
    setTimeout(() => {
      try {
        navigate('Emergency');
        console.log('✅ Navigated to Emergency screen (triggerSOS)');
      } catch (error) {
        console.log('Navigation error (will be handled by HomeScreen):', error);
      }
    }, 100);
  };

  // Check if SOS can be triggered (spam prevention)
  const canTriggerSOS = (): boolean => {
    // Allow SOS actions if there's an active emergency (countdown phase)
    if (currentAlert && currentAlert.status === 'active') {
      console.log('✅ SOS allowed - Active emergency in progress');
      return true;
    }
    
    const now = Date.now();
    const timeSinceLastTrigger = now - lastSOSTrigger;
    
    if (timeSinceLastTrigger < sosCooldownPeriod) {
      const remainingTime = Math.ceil((sosCooldownPeriod - timeSinceLastTrigger) / 1000);
      console.log(`🚫 SOS cooldown active. ${remainingTime} seconds remaining.`);
      Alert.alert(
        'SOS Cooldown',
        `Please wait ${remainingTime} seconds before triggering SOS again to prevent spam.`,
        [{ text: 'OK' }]
      );
      return false;
    }
    
    return true;
  };

  // New function to perform SOS actions using the SOS service
  const performSOSActions = async (location: any, message: string) => {
    try {
      console.log('🚨 performSOSActions called with:', { location, message });
      
      // Check spam prevention
      if (!canTriggerSOS()) {
        console.log('🚫 SOS blocked by spam prevention');
        return;
      }

      // Update last trigger time
      setLastSOSTrigger(Date.now());
      
      console.log('🚨 Performing SOS actions...');
      
      // Use user-selected contacts instead of hardcoded config
      const callContacts = sosSettings.selectedCallContact ? [sosSettings.selectedCallContact] : [];
      const smsContacts = sosSettings.selectedSMSContacts || [];
      
      console.log(`📞 Call contact: ${callContacts.length > 0 ? callContacts[0].name : 'None'}`);
      console.log(`📱 SMS contacts: ${smsContacts.length} contacts`);
      console.log('🔧 SOS Settings:', sosSettings);
      console.log('🔧 Selected Call Contact:', sosSettings.selectedCallContact);
      console.log('🔧 Selected SMS Contacts:', sosSettings.selectedSMSContacts);
      console.log('🔧 Available Helplines:', sosSettings.availableHelplines);
      console.log('🔧 Device Contacts:', sosSettings.deviceContacts);

      // Removed test alert - SOS should work silently in background
      // Alert.alert(
      //   'SOS Test',
      //   `SOS Actions triggered!\n\nCall Contact: ${callContacts.length > 0 ? callContacts[0].name : 'None'}\nSMS Contacts: ${smsContacts.length}\n\nLocation: ${location.latitude ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Not available'}`,
      //   [{ text: 'OK' }]
      // );

      // Format the SOS message with location and timestamp
      const sosMessage = formatSOSMessage(SOS_CONFIG, location, new Date());
      console.log('📝 SOS Message:', sosMessage);

      // Filter out emergency helpline numbers (quick contacts) from SMS
      const emergencyNumbers = ['100', '101', '102', '103', '108', '1091', '1098', '182', '112'];
      const personalSMSContacts = smsContacts.filter(contact => {
        const cleanPhone = String(contact.phone).replace(/[^\d+]/g, '');
        const isEmergencyNumber = emergencyNumbers.some(emergencyNum => 
          cleanPhone.includes(emergencyNum) || cleanPhone.endsWith(emergencyNum)
        );
        return !isEmergencyNumber;
      });

      // Send SMS if personal contacts are selected (exclude emergency helpline numbers)
      if (personalSMSContacts.length > 0) {
        console.log('📱 Sending emergency SMS...');
        console.log(`📱 Filtered SMS contacts: ${personalSMSContacts.length} personal contacts (excluded ${smsContacts.length - personalSMSContacts.length} emergency numbers)`);
        console.log('📱 SMS Contacts to send:', personalSMSContacts);
        
        const cleanedSMSContacts = personalSMSContacts.map(contact => ({
          ...contact,
          phone: String(contact.phone).replace(/[^\d+]/g, '') // Clean phone number (remove - and other chars)
        }));
        
        console.log('📱 Cleaned SMS Contacts:', cleanedSMSContacts);
        console.log('📱 SOS Service available:', !!sosService);
        console.log('📱 Calling sosService.sendMultipleSMS...');
        
        const smsResults = await sosService.sendMultipleSMS(cleanedSMSContacts, sosMessage);
        console.log('📱 SMS Results:', smsResults);
        const successfulSMS = smsResults.filter(result => result.success);
        console.log(`✅ Sent ${successfulSMS.length}/${smsResults.length} successful SMS to personal contacts`);
        
        // Show detailed results
        smsResults.forEach((result, index) => {
          if (result.success) {
            console.log(`✅ SMS ${index + 1}: Successfully sent to ${result.contact.name}`);
          } else {
            console.log(`❌ SMS ${index + 1}: Failed to send to ${result.contact.name} - ${result.error}`);
          }
        });
      } else {
        console.log('📱 No personal contacts selected for SMS (only emergency numbers)');
        console.log('📱 Original SMS contacts:', smsContacts);
        console.log('📱 Personal SMS contacts after filtering:', personalSMSContacts);
      }

      // Send alerts to guardians (from Guardian Dashboard system) - optional, won't block SOS if offline
      try {
        await sendAlertToGuardians(location, message);
      } catch (guardianError) {
        console.log('Guardian alerts failed (offline mode) - SOS calls/SMS still work:', guardianError);
        // Continue - calls and SMS are more important and work offline
      }

      // Make phone calls if contact is selected
      if (callContacts.length > 0) {
        console.log('📞 Making emergency phone calls...');
        console.log('📞 Call Contacts to call:', callContacts);
        
        const cleanedCallContacts = callContacts.map(contact => ({
          ...contact,
          phone: String(contact.phone).replace(/[^\d+]/g, '') // Clean phone number (remove - and other chars)
        }));
        
        console.log('📞 Cleaned Call Contacts:', cleanedCallContacts);
        console.log('📞 SOS Service available:', !!sosService);
        console.log('📞 Calling sosService.makeMultipleCalls...');
        
        const callResults = await sosService.makeMultipleCalls(cleanedCallContacts);
        console.log('📞 Call Results:', callResults);
        const successfulCalls = callResults.filter(result => result.success);
        console.log(`✅ Made ${successfulCalls.length}/${callResults.length} successful calls`);
        
        // Show detailed results
        callResults.forEach((result, index) => {
          if (result.success) {
            console.log(`✅ Call ${index + 1}: Successfully called ${result.contact.name}`);
          } else {
            console.log(`❌ Call ${index + 1}: Failed to call ${result.contact.name} - ${result.error}`);
          }
        });
      } else {
        console.log('📞 No call contacts selected');
        console.log('📞 Call contacts array:', callContacts);
      }

      // Show success message (only if we have contacts)
      const totalPersonalContacts = personalSMSContacts.length + callContacts.length;
      if (totalPersonalContacts > 0) {
        console.log(`✅ SOS activated - ${totalPersonalContacts} contacts notified`);
        // Don't show alert - let calls/SMS happen silently
        // Alert.alert(
        //   'SOS Activated',
        //   `Emergency alert sent to ${totalPersonalContacts} personal contacts and guardians.\n\nLocation: ${location.latitude ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Not available'}`,
        //   [{ text: 'OK' }]
        // );
      } else {
        console.log('⚠️ No contacts configured for SOS - making emergency call as fallback');
        // Make emergency call even if no contacts configured
        try {
          await sosService.makePhoneCall({ 
            name: 'Emergency Services', 
            phone: '100', 
            isPrimary: true, 
            isEmergency: true 
          });
        } catch (fallbackError) {
          console.error('❌ Emergency call fallback also failed:', fallbackError);
        }
      }

    } catch (error) {
      console.error('❌ Error performing SOS actions:', error);
      // Try emergency call as last resort
      try {
        console.log('🔄 Attempting emergency call as last resort...');
        await sosService.makePhoneCall({ 
          name: 'Emergency Services', 
          phone: '100', 
          isPrimary: true, 
          isEmergency: true 
        });
      } catch (fallbackError) {
        console.error('❌ Emergency call fallback failed:', fallbackError);
        // Don't show alert - let user manually call if needed
        // Alert.alert('SOS Error', 'Some emergency actions failed. Please try calling emergency services manually.');
      }
    }
  };

  const triggerShakeAlert = async () => {
    // Allow SOS to work even without authentication (offline mode)
    const user = auth().currentUser;
    const userId = user?.uid || 'offline_user';
    
    console.log('🔄 SHAKE ALERT TRIGGERED - Starting emergency response sequence');
    
    // Get current location with better error handling using SafeLocationService (works offline)
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
      console.log('SafeLocationService error, trying Firebase location (optional):', error);
      // Only try Firebase if user is authenticated and we have internet
      if (user) {
        try {
          const userDoc = await firestore().collection('users').doc(user.uid).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData?.currentLocation) {
              location = userData.currentLocation;
            }
          }
        } catch (firebaseError) {
          console.log('Firebase location unavailable (offline mode):', firebaseError);
          // Continue with SOS even if Firebase fails
        }
      }
    }

    const alert: Omit<EmergencyAlert, 'id'> = {
      userId: userId,
      type: 'shake',
      status: 'active',
      location,
      timestamp: new Date(),
      message: 'Emergency detected via shake gesture',
      guardianResponses: [],
    };
    
    // Create local alert immediately (works offline)
    const localAlertId = `local_${Date.now()}`;
    setCurrentAlert({ ...alert, id: localAlertId });
    console.log('💾 Emergency alert created locally:', localAlertId);
    
    // Try to save to Firebase (optional, won't block SOS if it fails)
    if (user) {
      try {
        const docRef = await firestore().collection('emergencyAlerts').add(alert);
        setCurrentAlert({ ...alert, id: docRef.id });
        console.log('💾 Emergency alert saved to Firestore:', docRef.id);
        
        // Send persistent SOS notification (optional)
        try {
          const userName = user.displayName || user.email || 'Unknown User';
          pushNotificationService.sendSOSNotification(docRef.id, userName, location);
        } catch (notifError) {
          console.log('Push notification failed (offline mode):', notifError);
        }
      } catch (firebaseError) {
        console.log('Firebase save failed (offline mode) - SOS will still work:', firebaseError);
        // Keep using local alert ID
      }
    }
    
    // Skip audio recording entirely to avoid permission issues
    console.log('Audio recording disabled to prevent permission crashes');
    
    Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    
    // Navigate to Emergency screen using NavigationService
    setTimeout(() => {
      try {
        navigate('Emergency');
        console.log('✅ Navigated to Emergency screen (shake)');
      } catch (error) {
        console.log('Navigation error (shake):', error);
      }
    }, 100);
  };

  const triggerVoiceAlert = async () => {
    // Allow SOS to work even without authentication (offline mode)
    const user = auth().currentUser;
    const userId = user?.uid || 'offline_user';
    
    console.log('🎤 VOICE ALERT TRIGGERED - Starting emergency response sequence');
    
    // Get current location with better error handling using SafeLocationService (works offline)
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
      console.log('SafeLocationService error, trying Firebase location (optional):', error);
      // Only try Firebase if user is authenticated and we have internet
      if (user) {
        try {
          const userDoc = await firestore().collection('users').doc(user.uid).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData?.currentLocation) {
              location = userData.currentLocation;
            }
          }
        } catch (firebaseError) {
          console.log('Firebase location unavailable (offline mode):', firebaseError);
          // Continue with SOS even if Firebase fails
        }
      }
    }

    const alert: Omit<EmergencyAlert, 'id'> = {
      userId: userId,
      type: 'voice',
      status: 'active',
      location,
      timestamp: new Date(),
      message: 'Emergency detected via voice command',
      guardianResponses: [],
    };
    
    // Create local alert immediately (works offline)
    const localAlertId = `local_${Date.now()}`;
    setCurrentAlert({ ...alert, id: localAlertId });
    console.log('💾 Emergency alert created locally:', localAlertId);
    
    // Try to save to Firebase (optional, won't block SOS if it fails)
    if (user) {
      try {
        const docRef = await firestore().collection('emergencyAlerts').add(alert);
        setCurrentAlert({ ...alert, id: docRef.id });
        console.log('💾 Emergency alert saved to Firestore:', docRef.id);
        
        // Send persistent SOS notification (optional)
        try {
          const userName = user.displayName || user.email || 'Unknown User';
          pushNotificationService.sendSOSNotification(docRef.id, userName, location);
        } catch (notifError) {
          console.log('Push notification failed (offline mode):', notifError);
        }
      } catch (firebaseError) {
        console.log('Firebase save failed (offline mode) - SOS will still work:', firebaseError);
        // Keep using local alert ID
      }
    }
    
    // Skip audio recording entirely to avoid permission issues
    console.log('Audio recording disabled to prevent permission crashes');
    
    Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    
    // Navigate to Emergency screen using NavigationService
    setTimeout(() => {
      try {
        navigate('Emergency');
        console.log('✅ Navigated to Emergency screen (voice)');
      } catch (error) {
        console.log('Navigation error (voice):', error);
      }
    }, 100);
  };

  const resolveEmergency = async (alertId: string, reason?: string) => {
    try {
      console.log('🔄 Resolving emergency alert:', alertId);
      
      const user = auth().currentUser;
      
      // Try to update Firebase if online and authenticated (optional)
      if (user && !alertId.startsWith('local_')) {
        try {
          await firestore()
            .collection('emergencyAlerts')
            .doc(alertId)
            .update({ 
              status: 'resolved', 
              resolvedAt: new Date(), 
              resolvedBy: user.uid, 
              resolutionReason: reason || 'Resolved by user'
            });
          console.log('✅ Emergency alert resolved in Firebase');
        } catch (firebaseError) {
          console.log('Firebase update failed (offline mode) - local resolution still works:', firebaseError);
          // Continue with local resolution
        }
      } else {
        console.log('Local alert resolution (offline mode)');
      }
      
      // Stop audio recording if active
      if (isRecording) {
        await stopAudioRecording();
      }
      
      // Clear current alert (works offline)
      setCurrentAlert(null);
      
      // Cancel SOS notification (works offline)
      try {
        pushNotificationService.cancelSOSNotification(alertId);
      } catch (notifError) {
        console.log('Notification cancel failed (offline mode):', notifError);
      }
      
      console.log('✅ Emergency alert resolved successfully');
      
    } catch (error) {
      console.error('❌ Error resolving emergency alert:', error);
      // Still clear local alert even if Firebase fails
      setCurrentAlert(null);
    }
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

  const sendAlertToGuardians = async (location: any, message: string): Promise<void> => {
    try {
      const user = auth().currentUser;
      if (!user) {
        console.log('👥 No user authenticated - skipping guardian alerts (offline mode)');
        return;
      }

      console.log('👥 Sending alerts to guardians...');

      // Try to get user data from Firebase (optional, won't block if offline)
      let userData = null;
      try {
        const userDoc = await firestore().collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          userData = userDoc.data();
        } else {
          console.log('User document not found - guardian alerts skipped (offline mode)');
          return;
        }
      } catch (firebaseError) {
        console.log('Firebase unavailable - guardian alerts skipped (offline mode):', firebaseError);
        return; // Don't throw - this is optional functionality
      }

      const userName = userData?.displayName || 'User';
      
      // Format location string
      const locationString = location.latitude && location.longitude 
        ? `📍 Location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
        : '📍 Location: Not available';
      
      const mapLink = location.latitude && location.longitude 
        ? `🗺️ Map: https://maps.google.com/?q=${location.latitude},${location.longitude}`
        : '';
      
      const timeString = `⏰ Time: ${new Date().toLocaleString()}`;

      // Send alerts to guardian emails (disabled to prevent opening email app)
      if (userData?.guardianEmails && userData.guardianEmails.length > 0) {
        console.log(`📧 Email alerts disabled - would have sent to ${userData.guardianEmails.length} guardians`);
        console.log('📧 Guardian emails:', userData.guardianEmails);
        
        // Email functionality disabled to prevent opening email app
        // The guardian alert will be sent via push notifications instead
      } else {
        console.log('📧 No guardian emails configured');
      }

      // Send push notifications to guardians (if they have the app) - optional, won't block if offline
      if (userData?.guardianEmails && userData.guardianEmails.length > 0) {
        console.log('📱 Sending push notifications to guardians...');
        
        try {
          // Get guardian user IDs from emails
          const guardianEmails = userData.guardianEmails;
          const guardianUsersSnapshot = await firestore()
            .collection('users')
            .where('email', 'in', guardianEmails)
            .get();
          
          const guardianTokens = guardianUsersSnapshot.docs
            .map(doc => doc.data().fcmToken)
            .filter(token => token);
          
          if (guardianTokens.length > 0) {
            try {
              await pushNotificationService.sendEmergencyAlertToGuardians(
                guardianTokens,
                userName,
                location,
                message
              );
              console.log(`✅ Push notifications sent to ${guardianTokens.length} guardians`);
            } catch (pushError) {
              console.log('Push notifications failed (offline mode):', pushError);
              // Don't throw - this is optional
            }
          } else {
            console.log('📱 No guardian FCM tokens found');
          }
        } catch (queryError) {
          console.log('Guardian query failed (offline mode):', queryError);
          // Don't throw - this is optional
        }
      }

    } catch (error) {
      console.log('Guardian alerts failed (offline mode) - this is optional:', error);
      // Don't throw - guardian alerts are optional, SOS calls/SMS are more important
    }
  };

  // Test function to verify SOS is working
  const testSOS = () => {
    console.log('🧪 Testing SOS functionality...');
    console.log('🧪 Current SOS Settings:', sosSettings);
    console.log('🧪 Call Contacts:', sosSettings.selectedCallContact);
    console.log('🧪 SMS Contacts:', sosSettings.selectedSMSContacts);
    
    Alert.alert(
      'SOS Test',
      `SOS Test Successful!\n\nCall Contact: ${sosSettings.selectedCallContact?.name || 'None'}\nSMS Contacts: ${sosSettings.selectedSMSContacts.length}\n\nEmergencyContext is working!`,
      [{ text: 'OK' }]
    );
  };

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
    sendAlertToGuardians,
    performSOSActions,
    updateSOSSettings,
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
