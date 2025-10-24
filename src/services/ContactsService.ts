import { Platform, PermissionsAndroid } from 'react-native';
import { SOSContact } from '../config/sosConfig';

// Conditional imports for device contacts
let Contacts: any = null;

try {
  Contacts = require('react-native-contacts');
} catch (error) {
  console.warn('react-native-contacts not available:', error);
}

export class ContactsService {
  private static instance: ContactsService;

  static getInstance(): ContactsService {
    if (!ContactsService.instance) {
      ContactsService.instance = new ContactsService();
    }
    return ContactsService.instance;
  }

  // Request contacts permission
  async requestContactsPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'SafeHer needs access to your contacts to set up emergency contacts.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.error('Error requesting contacts permission:', error);
        return false;
      }
    }
    return true; // iOS handles permissions automatically
  }

  // Load device contacts
  async loadDeviceContacts(): Promise<SOSContact[]> {
    try {
      console.log('📱 Starting to load device contacts...');
      
      if (!Contacts) {
        console.error('❌ Contacts library not available');
        return [];
      }

      const hasPermission = await this.requestContactsPermission();
      if (!hasPermission) {
        console.warn('❌ Contacts permission denied');
        return [];
      }

      console.log('📱 Fetching contacts from device...');
      const contacts = await Contacts.getAll();
      console.log(`📱 Retrieved ${contacts.length} raw contacts from device`);
      
      if (contacts.length === 0) {
        console.warn('⚠️ No contacts found on device');
        return [];
      }
      
      // Convert to SOSContact format with better filtering
      const sosContacts: SOSContact[] = contacts
        .filter((contact: any) => {
          const hasPhone = contact.phoneNumbers && contact.phoneNumbers.length > 0;
          const hasName = contact.displayName || contact.givenName || contact.familyName;
          const isValidName = hasName && hasName.trim().length > 0;
          const isValidPhone = hasPhone && contact.phoneNumbers[0].number && contact.phoneNumbers[0].number.trim().length > 0;
          
          if (!hasPhone) console.log('❌ Contact without phone:', contact.displayName);
          if (!isValidName) console.log('❌ Contact without name:', contact.phoneNumbers?.[0]?.number);
          if (!isValidPhone) console.log('❌ Contact with invalid phone:', contact.displayName);
          
          return hasPhone && isValidName && isValidPhone;
        })
        .map((contact: any) => {
          const name = (contact.displayName || contact.givenName || contact.familyName || 'Unknown').trim();
          const phone = contact.phoneNumbers[0].number.replace(/[^\d+]/g, ''); // Clean phone number
          
          return {
            name,
            phone,
            isPrimary: false,
            isEmergency: false,
          };
        })
        .filter((contact: SOSContact, index: number, self: SOSContact[]) => 
          // Remove duplicates based on phone number
          index === self.findIndex((c: SOSContact) => c.phone === contact.phone)
        )
        .slice(0, 200); // Increased limit to 200 contacts

      console.log(`✅ Successfully processed ${sosContacts.length} contacts`);
      
      // Log first few contacts for debugging
      if (sosContacts.length > 0) {
        console.log('📋 Sample contacts:', sosContacts.slice(0, 3).map(c => `${c.name}: ${c.phone}`));
      }
      
      return sosContacts;
    } catch (error) {
      console.error('❌ Error loading device contacts:', error);
      return [];
    }
  }

  // Add a custom contact
  addCustomContact(name: string, phone: string): SOSContact {
    return {
      name,
      phone,
      isPrimary: false,
      isEmergency: false,
    };
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

  // Format phone number for display
  formatPhoneNumber(phone: string): string {
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

  // Check if contacts library is available
  isAvailable(): boolean {
    return Contacts !== null;
  }
}

export default ContactsService;
