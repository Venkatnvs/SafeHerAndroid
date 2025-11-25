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
      console.log('📞 Calling phone number (automated call):', phoneNumber);

      // PRIORITY 1: Try ImmediatePhoneCall first - places call automatically (works offline)
      if (ImmediatePhoneCall && typeof ImmediatePhoneCall.immediatePhoneCall === 'function') {
        try {
          console.log('📞 Using ImmediatePhoneCall for AUTOMATED call (offline-capable)');
          // ImmediatePhoneCall places the call automatically without user interaction
          // This works offline - uses native Android call intent, not internet
          await ImmediatePhoneCall.immediatePhoneCall(phoneNumber);
          console.log('✅ AUTOMATED call placed via ImmediatePhoneCall (works offline)');
          return { success: true, contact };
        } catch (immediateCallError) {
          console.log('❌ ImmediatePhoneCall failed:', immediateCallError);
          // Continue to next automated method
        }
      }

      // PRIORITY 2: Try SendIntent - places call automatically (works offline)
      if (SendIntent && typeof SendIntent.sendPhoneCall === 'function') {
        try {
          console.log('📞 Using SendIntent for AUTOMATED call (offline-capable)');
          // react-native-send-intent sendPhoneCall places the call automatically
          // This works offline - uses native Android intent, not internet
          await SendIntent.sendPhoneCall(phoneNumber);
          console.log('✅ AUTOMATED call placed via SendIntent (works offline)');
          return { success: true, contact };
        } catch (sendIntentError) {
          console.log('❌ SendIntent phone call failed:', sendIntentError);
          // Continue to next automated method
        }
      }

      // PRIORITY 3: Try Communications library with immediate=true - places call automatically (works offline)
      if (Communications) {
        try {
          console.log('📞 Using Communications library for AUTOMATED call (offline-capable)');
          // Communications.phonecall(phoneNumber, true) - second param true = immediate call
          // This places the call automatically without user interaction
          // Works offline - uses native dialer, not internet
          Communications.phonecall(phoneNumber, true);
          console.log('✅ AUTOMATED call placed via Communications (works offline)');
          return { success: true, contact };
        } catch (communicationsError) {
          console.log('❌ Communications library failed:', communicationsError);
          // Continue to fallback (opens dialer, requires user to press call)
        }
      }

      // FALLBACK: Try system dialer (opens dialer but requires user to press call button)
      // This is last resort - not automated but better than nothing
      console.log('📞 All automated methods failed, opening dialer as fallback (user must press call)');
      const phoneUrl = `tel:${phoneNumber}`;
      try {
        // Directly open URL without canOpenURL check (works offline)
        // Note: This only opens dialer, doesn't place call automatically
        await Linking.openURL(phoneUrl);
        console.log('⚠️ Phone dialer opened (user must press call button manually)');
        return { success: true, contact };
      } catch (error) {
        console.log('❌ System dialer also failed:', error);
        // All methods failed
      }

      // If all methods fail, log detailed error
      console.error('❌ All phone call methods failed for:', contact.name, phoneNumber);
      console.error('❌ Available methods checked:');
      console.error('  - SendIntent:', !!SendIntent);
      console.error('  - Linking.openURL:', 'available');
      console.error('  - Communications:', !!Communications);
      console.error('  - ImmediatePhoneCall:', !!ImmediatePhoneCall);
      
      return { 
        success: false, 
        contact, 
        error: 'All phone call methods failed. Please check phone permissions and try manually dialing ' + phoneNumber
      };

    } catch (error) {
      console.error(`❌ Error making phone call to ${contact.name}:`, error);
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
