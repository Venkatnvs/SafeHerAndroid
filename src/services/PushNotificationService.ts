import { messaging, firestore } from '../config/firebase';
import { Platform, Alert } from 'react-native';
// @ts-ignore
import PushNotification from 'react-native-push-notification';

export interface PushNotificationMessage {
  title: string;
  body: string;
  data?: {
    type: string;
    userId?: string;
    location?: string;
    timestamp?: string;
    alertId?: string;
  };
}

export class PushNotificationService {
  private static instance: PushNotificationService;

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
      PushNotificationService.instance.configurePushNotifications();
    }
    return PushNotificationService.instance;
  }

  // Configure push notification channels and settings
  private configurePushNotifications(): void {
    try {
      console.log('🔧 Configuring push notifications...');
      
      PushNotification.configure({
        // Android-specific configuration
        onRegister: function (token: any) {
          console.log('📱 FCM Token:', token);
        },

        onNotification: function (notification: any) {
          console.log('📱 Notification received:', notification);
          
          // Handle SOS emergency notification clicks
          if (notification.userInfo?.type === 'sos_emergency') {
            console.log('🚨 SOS notification clicked, opening emergency screen');
            // Navigate to emergency screen
            const { navigate } = require('../utils/NavigationService');
            navigate('Emergency');
          }
        },

        onAction: function (notification: any) {
          console.log('📱 Notification action:', notification);
          
          // Handle SOS emergency notification clicks
          if (notification.userInfo?.type === 'sos_emergency') {
            console.log('🚨 SOS notification clicked, opening emergency screen');
            // Navigate to emergency screen
            const { navigate } = require('../utils/NavigationService');
            navigate('Emergency');
          }
        },

        onRegistrationError: function(err: any) {
          console.error('❌ Push notification registration error:', err);
        },

        // Android notification channel configuration
        requestPermissions: Platform.OS === 'ios',
        
        // Android-specific settings
        ...(Platform.OS === 'android' && {
          channelId: 'safher-emergency',
          channelName: 'SafeHer Emergency',
          channelDescription: 'Emergency notifications from SafeHer app',
          playSound: true,
          soundName: 'default',
          importance: 'high',
          priority: 'high',
          vibrate: true,
          vibration: 300,
        }),
      });

      // Create notification channels for Android
      if (Platform.OS === 'android') {
        PushNotification.createChannel(
          {
            channelId: 'safher-emergency',
            channelName: 'SafeHer Emergency',
            channelDescription: 'Emergency notifications from SafeHer app',
            playSound: true,
            soundName: 'default',
            importance: 4, // High importance
            vibrate: true,
          },
          (created: any) => console.log(`📱 Emergency channel created: ${created}`)
        );

        PushNotification.createChannel(
          {
            channelId: 'safher-general',
            channelName: 'SafeHer General',
            channelDescription: 'General notifications from SafeHer app',
            playSound: true,
            soundName: 'default',
            importance: 3, // Default importance
            vibrate: true,
          },
          (created: any) => console.log(`📱 General channel created: ${created}`)
        );
      }

      console.log('✅ Push notifications configured successfully');
    } catch (error) {
      console.error('❌ Error configuring push notifications:', error);
    }
  }

  // Send push notification to specific FCM tokens
  async sendPushNotification(tokens: string[], message: PushNotificationMessage): Promise<void> {
    try {
      console.log(`📱 Sending push notification to ${tokens.length} devices`);
      console.log('📱 Message:', message);
      
      if (tokens.length === 0) {
        console.log('⚠️ No FCM tokens provided, skipping push notification');
        return;
      }

      // Method 1: Try direct local notification first (for testing)
      try {
        console.log('📱 Sending local push notification...');
        PushNotification.localNotification({
          title: message.title,
          message: message.body,
          channelId: 'safher-emergency',
          playSound: true,
          soundName: 'default',
          importance: 'high',
          priority: 'high',
          vibrate: true,
          vibration: 300,
          userInfo: message.data || {}
        });
        console.log('✅ Local push notification sent successfully');
      } catch (localError) {
        console.log('❌ Local notification failed:', localError);
      }

      // Method 2: Store in Firestore for FCM processing (fallback)
      try {
        const notificationData = {
          tokens,
          message,
          timestamp: new Date(),
          status: 'pending',
          retryCount: 0
        };

        await firestore()
          .collection('pushNotifications')
          .add(notificationData);

        console.log('✅ Push notification request stored for FCM processing');
      } catch (firestoreError) {
        console.log('❌ Firestore storage failed:', firestoreError);
      }

      // Method 3: Log FCM token for debugging
      try {
        console.log('📱 Logging FCM token for debugging...');
        
        // Get current user's token to test
        const currentToken = await this.getCurrentUserToken();
        if (currentToken) {
          console.log('📱 Current FCM Token:', currentToken.substring(0, 20) + '...');
          console.log('📱 Target tokens:', tokens.map(t => t.substring(0, 20) + '...'));
        }
      } catch (fcmError) {
        console.log('❌ FCM token logging failed:', fcmError);
      }
      
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
      throw error;
    }
  }

  // Send emergency alert to guardians
  async sendEmergencyAlertToGuardians(
    guardianTokens: string[], 
    userName: string, 
    location: any, 
    message: string
  ): Promise<void> {
    try {
      const locationString = location.latitude && location.longitude 
        ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
        : 'Location not available';

      const notificationMessage: PushNotificationMessage = {
        title: '🚨 Emergency Alert',
        body: `${userName} has triggered an emergency alert! Check their location immediately.`,
        data: {
          type: 'emergency',
          location: JSON.stringify(location),
          timestamp: new Date().toISOString(),
        }
      };

      await this.sendPushNotification(guardianTokens, notificationMessage);
      
    } catch (error) {
      console.error('❌ Error sending emergency alert to guardians:', error);
      throw error;
    }
  }

  // Get FCM token for current user
  async getCurrentUserToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
      return null;
    }
  }

  // Update user's FCM token in Firestore
  async updateUserToken(userId: string, token: string): Promise<void> {
    try {
      await firestore()
        .collection('users')
        .doc(userId)
        .update({ 
          fcmToken: token, 
          pushNotificationsEnabled: true,
          lastTokenUpdate: new Date()
        });
      
      console.log('✅ FCM token updated for user:', userId);
    } catch (error) {
      console.error('❌ Error updating FCM token:', error);
      throw error;
    }
  }

  // Setup push notification listeners
  setupNotificationListeners(): void {
    try {
      // Handle foreground messages
      const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
        console.log('📱 Foreground message received:', remoteMessage);
        
        // Show local notification when app is in foreground
        if (remoteMessage.notification) {
          Alert.alert(
            remoteMessage.notification.title || 'Notification',
            remoteMessage.notification.body || '',
            [{ text: 'OK' }]
          );
        }
      });

      // Handle background messages
      messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('📱 Background message received:', remoteMessage);
        
        // Handle emergency notifications
        if (remoteMessage.data?.type === 'emergency') {
          // Navigate to guardian dashboard or show emergency alert
          console.log('🚨 Emergency notification received in background');
        }
      });

      // Handle notification opened app
      messaging().onNotificationOpenedApp(remoteMessage => {
        console.log('📱 Notification opened app:', remoteMessage);
        
        if (remoteMessage.data?.type === 'emergency') {
          // Navigate to emergency screen or guardian dashboard
          console.log('🚨 Emergency notification opened app');
        }
      });

      // Handle initial notification (app was closed)
      messaging()
        .getInitialNotification()
        .then(remoteMessage => {
          if (remoteMessage) {
            console.log('📱 Initial notification:', remoteMessage);
            
            if (remoteMessage.data?.type === 'emergency') {
              // Navigate to emergency screen or guardian dashboard
              console.log('🚨 Initial emergency notification');
            }
          }
        });

      console.log('✅ Push notification listeners setup complete');
      
    } catch (error) {
      console.error('❌ Error setting up notification listeners:', error);
    }
  }

  // Request notification permissions
  async requestNotificationPermissions(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ Notification permission granted');
        return true;
      } else {
        console.log('❌ Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error);
      return false;
    }
  }

  // Check if notifications are enabled
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const authStatus = await messaging().hasPermission();
      return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
             authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    } catch (error) {
      console.error('❌ Error checking notification permissions:', error);
      return false;
    }
  }

  // Check if push notifications are properly configured
  async checkPushNotificationSetup(): Promise<boolean> {
    try {
      console.log('🔍 Checking push notification setup...');
      
      // Check if messaging is available
      if (!messaging) {
        console.log('❌ Firebase messaging not available');
        return false;
      }

      // Check if we can get a token
      const token = await this.getCurrentUserToken();
      if (!token) {
        console.log('❌ Unable to get FCM token');
        return false;
      }

      console.log('✅ Push notifications properly configured');
      console.log('📱 FCM Token:', token.substring(0, 20) + '...');
      
      return true;
    } catch (error) {
      console.error('❌ Error checking push notification setup:', error);
      return false;
    }
  }

  // Test push notification functionality
  async testPushNotification(): Promise<void> {
    try {
      console.log('🧪 Testing push notification functionality...');
      
      // Test local notification first (always works)
      console.log('🧪 Testing local notification...');
      PushNotification.localNotification({
        title: 'SafeHer Test',
        message: 'This is a test local notification from SafeHer app.',
        channelId: 'safher-general',
        playSound: true,
        soundName: 'default',
        importance: 'high',
        priority: 'high',
        vibrate: true,
        vibration: 300,
        userInfo: { type: 'test', timestamp: new Date().toISOString() }
      });
      
      Alert.alert(
        'Local Notification Sent',
        'A test local notification has been sent. You should see it in your notification panel.',
        [{ text: 'OK' }]
      );

      // Also test FCM setup
      const isSetup = await this.checkPushNotificationSetup();
      if (isSetup) {
        const token = await this.getCurrentUserToken();
        if (token) {
          const testMessage: PushNotificationMessage = {
            title: 'FCM Test',
            body: 'This is a test FCM notification from SafeHer app.',
            data: {
              type: 'test',
              timestamp: new Date().toISOString(),
            }
          };

          await this.sendPushNotification([token], testMessage);
        }
      }
      
    } catch (error) {
      console.error('❌ Error testing push notification:', error);
      Alert.alert(
        'Test Failed',
        'Push notification test failed. Check console for details.',
        [{ text: 'OK' }]
      );
    }
  }

  // Send persistent SOS notification
  sendSOSNotification(alertId: string, userName: string, location?: any): void {
    try {
      console.log('🚨 Sending persistent SOS notification...');
      
      const locationText = location && location.latitude && location.longitude 
        ? `Location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
        : 'Location: Getting location...';

      PushNotification.localNotification({
        id: parseInt(alertId.replace(/\D/g, '')) || 999999, // Use alertId as notification ID
        title: '🚨 EMERGENCY ACTIVE',
        message: `${userName} has triggered an emergency alert! Tap to view details.`,
        channelId: 'safher-emergency',
        playSound: true,
        soundName: 'default',
        importance: 'max',
        priority: 'max',
        vibrate: true,
        vibration: 1000,
        ongoing: true, // Makes notification non-removable
        autoCancel: false, // Prevents auto-dismissal
        userInfo: {
          type: 'sos_emergency',
          alertId: alertId
        }
      });
      
      console.log('✅ Persistent SOS notification sent');
    } catch (error) {
      console.error('❌ Error sending SOS notification:', error);
    }
  }

  // Cancel SOS notification when emergency is resolved
  cancelSOSNotification(alertId: string): void {
    try {
      console.log('✅ Canceling SOS notification...');
      
      const notificationId = parseInt(alertId.replace(/\D/g, '')) || 999999;
      PushNotification.cancelLocalNotification(notificationId);
      
      console.log('✅ SOS notification canceled');
    } catch (error) {
      console.error('❌ Error canceling SOS notification:', error);
    }
  }
}
