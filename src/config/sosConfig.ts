// SOS Configuration - Emergency Contacts and Messages
// Modify these values to customize emergency contacts and messages

export interface SOSContact {
  name: string;
  phone: string;
  isPrimary: boolean;
  isEmergency: boolean; // True for official emergency numbers (100, 101, 102)
}

export interface SOSMessage {
  template: string;
  includeLocation: boolean;
  includeTimestamp: boolean;
}

export interface SOSConfig {
  // Debug mode - when true, uses test numbers instead of real emergency numbers
  DEBUG_MODE: boolean;
  
  // Primary emergency contacts (always called first)
  PRIMARY_CONTACTS: SOSContact[];
  
  // Secondary contacts (family/friends)
  SECONDARY_CONTACTS: SOSContact[];
  
  // Debug contacts (only used when DEBUG_MODE is true)
  DEBUG_CONTACTS: SOSContact[];
  
  // SMS configuration
  SMS_CONFIG: {
    enabled: boolean;
    message: SOSMessage;
    sendToPrimary: boolean;
    sendToSecondary: boolean;
    sendToDebug: boolean;
  };
  
  // Phone call configuration
  CALL_CONFIG: {
    enabled: boolean;
    callPrimary: boolean;
    callSecondary: boolean;
    callDebug: boolean;
    maxCallDuration: number; // seconds
  };
  
  // Location sharing
  LOCATION_CONFIG: {
    includeInSMS: boolean;
    includeInCall: boolean; // Via voice message or call notes
    accuracy: 'high' | 'medium' | 'low';
  };
}

// Default configuration
export const DEFAULT_SOS_CONFIG: SOSConfig = {
  DEBUG_MODE: false, // Set to true for testing
  
  PRIMARY_CONTACTS: [
    {
      name: 'Police',
      phone: '+91-8050031756',
      isPrimary: true,
      isEmergency: true,
    },
    // {
    //   name: 'Medical Emergency',
    //   phone: '102',
    //   isPrimary: true,
    //   isEmergency: true,
    // },
    // {
    //   name: 'Women Helpline',
    //   phone: '1091',
    //   isPrimary: true,
    //   isEmergency: true,
    // },
  ],
  
  SECONDARY_CONTACTS: [
    {
      name: 'Family Member 1',
      phone: '+91-9876543210', // Replace with actual family number
      isPrimary: false,
      isEmergency: false,
    },
    {
      name: 'Family Member 2',
      phone: '+91-9876543211', // Replace with actual family number
      isPrimary: false,
      isEmergency: false,
    },
    {
      name: 'Close Friend',
      phone: '+91-9876543212', // Replace with actual friend number
      isPrimary: false,
      isEmergency: false,
    },
  ],
  
  DEBUG_CONTACTS: [
    {
      name: 'Debug Test 1',
      phone: '+91-9999999999', // Test number 1
      isPrimary: false,
      isEmergency: false,
    },
    {
      name: 'Debug Test 2',
      phone: '+91-8888888888', // Test number 2
      isPrimary: false,
      isEmergency: false,
    },
  ],
  
  SMS_CONFIG: {
    enabled: true,
    message: {
      template: '🚨 EMERGENCY ALERT 🚨\n\nI need immediate help! This is an emergency SOS from SafeHer app.\n\nLocation: {LOCATION}\nTime: {TIMESTAMP}\n\nPlease call me back or send help immediately.\n\nThis message was sent automatically by SafeHer Safety App.',
      includeLocation: true,
      includeTimestamp: true,
    },
    sendToPrimary: true,
    sendToSecondary: false,
    sendToDebug: false,
  },
  
  CALL_CONFIG: {
    enabled: true,
    callPrimary: true,
    callSecondary: false, // Usually don't call secondary contacts automatically
    callDebug: true,
    maxCallDuration: 30, // 30 seconds max per call
  },
  
  LOCATION_CONFIG: {
    includeInSMS: true,
    includeInCall: false,
    accuracy: 'high',
  },
};

// Helper functions
export const getActiveContacts = (config: SOSConfig): SOSContact[] => {
  if (config.DEBUG_MODE) {
    return config.DEBUG_CONTACTS;
  }
  
  const contacts: SOSContact[] = [];
  
  if (config.CALL_CONFIG.callPrimary || config.SMS_CONFIG.sendToPrimary) {
    contacts.push(...config.PRIMARY_CONTACTS);
  }
  
  if (config.CALL_CONFIG.callSecondary || config.SMS_CONFIG.sendToSecondary) {
    contacts.push(...config.SECONDARY_CONTACTS);
  }
  
  return contacts;
};

export const getEmergencyContacts = (config: SOSConfig): SOSContact[] => {
  return config.PRIMARY_CONTACTS.filter(contact => contact.isEmergency);
};

export const formatSOSMessage = (
  config: SOSConfig,
  location?: { latitude: number; longitude: number; address?: string },
  timestamp?: Date
): string => {
  let message = config.SMS_CONFIG.message.template;
  
  if (config.SMS_CONFIG.message.includeLocation && location) {
    const locationText = location.address || 
      `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}`;
    message = message.replace('{LOCATION}', locationText);
  } else {
    message = message.replace('{LOCATION}', 'Location not available');
  }
  
  if (config.SMS_CONFIG.message.includeTimestamp && timestamp) {
    const timeText = timestamp.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    message = message.replace('{TIMESTAMP}', timeText);
  } else {
    message = message.replace('{TIMESTAMP}', 'Time not available');
  }
  
  return message;
};

// Export the current configuration
export const SOS_CONFIG = DEFAULT_SOS_CONFIG;
