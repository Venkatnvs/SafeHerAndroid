import { Platform, Alert, Linking } from 'react-native';
import { SOSContact, SOSConfig } from '../config/sosConfig';

// Import the packages (will be available after installation)
let ImmediatePhoneCall: any = null;
let Communications: any = null;
let SendIntent: any = null;
let SmsSender: any = null;

try {
  ImmediatePhoneCall = require('react-native-immediate-phone-call');
} catch (error) {
  console.warn('react-native-immediate-phone-call not available:', error);
}

try {
  Communications = require('react-native-communications');
} catch (error) {
  console.warn('react-native-communications not available:', error);
}

try {
  SendIntent = require('react-native-send-intent');
} catch (error) {
  console.warn('react-native-send-intent not available:', error);
}

try {
  SmsSender = require('react-native').NativeModules.SmsSender;
} catch (error) {
  console.warn('SmsSender native module not available:', error);
}

export interface CallResult {
  success: boolean;
  contact: SOSContact;
  error?: string;
}

export interface SMSResult {
  success: boolean;
  contact: SOSContact;
  error?: string;
}

export class SOSService {
  private static instance: SOSService;
  private config: SOSConfig | null = null;

  static getInstance(): SOSService {
    if (!SOSService.instance) {
      SOSService.instance = new SOSService();
    }
    return SOSService.instance;
  }

  setConfig(config: SOSConfig) {
    this.config = config;
  }

  // Make immediate phone call
  async makePhoneCall(contact: SOSContact): Promise<CallResult> {
    try {
      console.log(`Making phone call to ${contact.name}: ${contact.phone}`);

      // Clean phone number for all methods (keep + and digits, remove -)
      const phoneNumber = String(contact.phone).replace(/[^\d+]/g, ''); // Clean phone number
      console.log('Calling phone number:', phoneNumber);

      // Try native intent (send-intent) first for direct phone call
      if (SendIntent && typeof SendIntent.sendPhoneCall === 'function') {
        try {
          console.log('Using SendIntent for phone call');
          // react-native-send-intent expects a string phone number
          await SendIntent.sendPhoneCall(phoneNumber);
          return { success: true, contact };
        } catch (sendIntentError) {
          console.log('SendIntent phone call failed:', sendIntentError);
        }
      }

      // Try system dialer next (most reliable UI path)
      console.log('Using system dialer for phone call');
      const phoneUrl = `tel:${phoneNumber}`;
      try {
        await Linking.openURL(phoneUrl);
        return { success: true, contact };
      } catch (error) {
        console.log('System dialer failed, trying Communications library:', error);
      }

      // Try Communications library as fallback
      if (Communications) {
        try {
          console.log('Using Communications library for phone call');
          Communications.phonecall(phoneNumber, true);
          return { success: true, contact };
        } catch (communicationsError) {
          console.log('Communications library failed:', communicationsError);
        }
      }

      // Try immediate phone call library as final fallback
      if (ImmediatePhoneCall && typeof ImmediatePhoneCall.immediatePhoneCall === 'function') {
        try {
          console.log('Using ImmediatePhoneCall library for phone call');
          await ImmediatePhoneCall.immediatePhoneCall(phoneNumber);
          return { success: true, contact };
        } catch (immediateCallError) {
          console.log('ImmediatePhoneCall library failed:', immediateCallError);
        }
      }

      // If all methods fail
      return { 
        success: false, 
        contact, 
        error: 'All phone call methods failed' 
      };

    } catch (error) {
      console.error(`Error making phone call to ${contact.name}:`, error);
      return { 
        success: false, 
        contact, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Send SMS
  async sendSMS(contact: SOSContact, message: string): Promise<SMSResult> {
    try {
      console.log(`Sending SMS to ${contact.name}: ${contact.phone}`);

      // Clean inputs
      const phoneNumber = String(contact.phone).replace(/[^\d+]/g, '');
      const smsText = String(message);

      // Try native direct SMS first (our custom module)
      if (SmsSender && typeof SmsSender.sendDirectSms === 'function') {
        try {
          console.log('Using native SmsSender for direct SMS');
          await SmsSender.sendDirectSms(phoneNumber, smsText);
          return { success: true, contact };
        } catch (nativeError) {
          console.log('Native SmsSender failed:', nativeError);
        }
      }

      // Try native intent (send-intent) for direct SMS first
      if (SendIntent && typeof SendIntent.sendSms === 'function') {
        try {
          console.log('Using SendIntent for SMS');
          // react-native-send-intent expects (phoneNumber: string, message: string)
          await SendIntent.sendSms(phoneNumber, smsText);
          return { success: true, contact };
        } catch (sendIntentError) {
          console.log('SendIntent SMS failed:', sendIntentError);
        }
      }

      // Try system SMS app with smsto: (more compatible)
      const smsToUrl = `smsto:${phoneNumber}`; // opens composer
      try {
        console.log('Opening system SMS composer via smsto:');
        const smsUrl = `${smsToUrl}?body=${encodeURIComponent(smsText)}`;
        console.log('SMS URL:', smsUrl);
        
        // Check if the URL can be opened
        const canOpen = await Linking.canOpenURL(smsUrl);
        if (canOpen) {
          await Linking.openURL(smsUrl);
          return { success: true, contact };
        } else {
          console.log('Cannot open SMS URL, trying alternative method');
          throw new Error('Cannot open SMS URL');
        }
      } catch (error) {
        console.log('smsto: composer failed, trying sms: scheme:', error);
        try {
          const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(smsText)}`;
          console.log('Alternative SMS URL:', smsUrl);
          
          const canOpen = await Linking.canOpenURL(smsUrl);
          if (canOpen) {
            await Linking.openURL(smsUrl);
            return { success: true, contact };
          } else {
            throw new Error('Cannot open alternative SMS URL');
          }
        } catch (error2) {
          console.log('sms: scheme failed, trying Communications library:', error2);
        }
      }

      // Try Communications library as fallback
      if (Communications) {
        try {
          console.log('Using Communications library for SMS');
          Communications.text(phoneNumber, smsText);
          return { success: true, contact };
        } catch (communicationsError) {
          console.log('Communications library failed:', communicationsError);
        }
      }

      // Try simple SMS URL without body parameter (most compatible)
      try {
        console.log('Trying simple SMS URL without body');
        const simpleSmsUrl = `sms:${phoneNumber}`;
        const canOpen = await Linking.canOpenURL(simpleSmsUrl);
        if (canOpen) {
          await Linking.openURL(simpleSmsUrl);
          // Show alert with message to copy
          Alert.alert(
            'SMS Composer Opened',
            `SMS composer opened for ${contact.name}. Please paste this message:\n\n${smsText}`,
            [{ text: 'OK' }]
          );
          return { success: true, contact };
        }
      } catch (simpleSmsError) {
        console.log('Simple SMS URL failed:', simpleSmsError);
      }

      // If all methods fail, show alert with message for user to copy
      console.log('All SMS methods failed, showing alert with message');
      Alert.alert(
        `SMS to ${contact.name}`,
        `Unable to send SMS automatically. Please copy this message and send it manually to ${contact.phone}:\n\n${smsText}`,
        [
          { text: 'Copy Message', onPress: () => {
            // Copy to clipboard if available
            try {
              const { Clipboard } = require('@react-native-clipboard/clipboard');
              Clipboard.setString(smsText);
              Alert.alert('Copied', 'Message copied to clipboard');
            } catch (clipboardError) {
              console.log('Clipboard not available:', clipboardError);
            }
          }},
          { text: 'OK' }
        ]
      );
      
      return { 
        success: false, 
        contact, 
        error: 'All SMS methods failed - manual sending required' 
      };

    } catch (error) {
      console.error(`Error sending SMS to ${contact.name}:`, error);
      return { 
        success: false, 
        contact, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Make multiple phone calls sequentially
  async makeMultipleCalls(contacts: SOSContact[]): Promise<CallResult[]> {
    const results: CallResult[] = [];
    
    for (const contact of contacts) {
      if (!this.config?.CALL_CONFIG.enabled) {
        results.push({ 
          success: false, 
          contact, 
          error: 'Phone calls disabled in config' 
        });
        continue;
      }

      const result = await this.makePhoneCall(contact);
      results.push(result);

      // Wait a bit between calls to avoid overwhelming the system
      if (result.success) {
        await new Promise<void>(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  }

  // Send multiple SMS messages
  async sendMultipleSMS(contacts: SOSContact[], message: string): Promise<SMSResult[]> {
    const results: SMSResult[] = [];
    
    for (const contact of contacts) {
      if (!this.config?.SMS_CONFIG.enabled) {
        results.push({ 
          success: false, 
          contact, 
          error: 'SMS disabled in config' 
        });
        continue;
      }

      const result = await this.sendSMS(contact, message);
      results.push(result);

      // Small delay between SMS to avoid rate limiting
      await new Promise<void>(resolve => setTimeout(resolve, 500));
    }

    return results;
  }

  // Check if phone call functionality is available
  isPhoneCallAvailable(): boolean {
    return ImmediatePhoneCall !== null || Platform.OS === 'android';
  }

  // Check if SMS functionality is available
  isSMSAvailable(): boolean {
    return Communications !== null || Platform.OS === 'android';
  }

  // Get formatted phone number for display
  formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Format Indian numbers
    if (cleaned.startsWith('+91')) {
      return cleaned.replace(/(\+91)(\d{5})(\d{5})/, '$1 $2 $3');
    } else if (cleaned.startsWith('91') && cleaned.length === 12) {
      return cleaned.replace(/(91)(\d{5})(\d{5})/, '+$1 $2 $3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{5})(\d{5})/, '$1 $2');
    }
    
    return cleaned;
  }

  // Validate phone number
  isValidPhoneNumber(phone: string): boolean {
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Indian emergency numbers (3 digits)
    if (['100', '101', '102', '103', '108', '1091', '1098', '182'].includes(cleaned)) {
      return true;
    }
    
    // Indian mobile numbers (10 digits starting with 6,7,8,9)
    if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
      return true;
    }
    
    // International format (+91 followed by 10 digits)
    if (cleaned.startsWith('+91') && cleaned.length === 13) {
      return true;
    }
    
    return false;
  }

  // Show permission request dialog
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        // Request phone permission
        const phonePermission = await Linking.canOpenURL('tel:100');
        
        // Request SMS permission
        const smsPermission = await Linking.canOpenURL('sms:100');
        
        return phonePermission && smsPermission;
      } catch (error) {
        console.error('Error requesting permissions:', error);
        return false;
      }
    }
    
    return true; // iOS handles permissions automatically
  }
}
