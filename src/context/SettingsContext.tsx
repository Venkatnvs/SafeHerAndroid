import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOSContact } from '../config/sosConfig';
import ContactsService from '../services/ContactsService';
import { getGlobalUpdateSOSSettings } from './EmergencyContext';

interface RecordingSettings {
  audioRecordingEnabled: boolean;
  autoRecordOnEmergency: boolean;
  maxRecordingDuration: number; // in minutes
  storageLocation: 'local' | 'cloud';
}

interface SOSSettings {
  selectedCallContact: SOSContact | null;
  selectedSMSContacts: SOSContact[];
  availableHelplines: SOSContact[];
  deviceContacts: SOSContact[];
  contactsLoaded: boolean;
}

interface SettingsContextType {
  recordingSettings: RecordingSettings;
  sosSettings: SOSSettings;
  updateRecordingSettings: (settings: Partial<RecordingSettings>) => Promise<void>;
  updateSOSSettings: (settings: Partial<SOSSettings>) => Promise<void>;
  loadSettings: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
  loadDeviceContacts: () => Promise<void>;
}

const defaultSettings: RecordingSettings = {
  audioRecordingEnabled: false, // Disabled by default to avoid permission issues
  autoRecordOnEmergency: false, // Disabled to prevent permission crashes
  maxRecordingDuration: 5, // 5 minutes
  storageLocation: 'local',
};

const defaultSOSSettings: SOSSettings = {
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
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [recordingSettings, setRecordingSettings] = useState<RecordingSettings>(defaultSettings);
  const [sosSettings, setSosSettings] = useState<SOSSettings>(defaultSOSSettings);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('recordingSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setRecordingSettings({ ...defaultSettings, ...parsedSettings });
      }
      
      const savedSOSSettings = await AsyncStorage.getItem('sosSettings');
      if (savedSOSSettings) {
        const parsedSOSSettings = JSON.parse(savedSOSSettings);
        setSosSettings({ ...defaultSOSSettings, ...parsedSOSSettings });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateRecordingSettings = async (newSettings: Partial<RecordingSettings>) => {
    try {
      const updatedSettings = { ...recordingSettings, ...newSettings };
      setRecordingSettings(updatedSettings);
      await AsyncStorage.setItem('recordingSettings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const updateSOSSettings = async (newSettings: Partial<SOSSettings>) => {
    try {
      const updatedSettings = { ...sosSettings, ...newSettings };
      setSosSettings(updatedSettings);
      await AsyncStorage.setItem('sosSettings', JSON.stringify(updatedSettings));
      
      // Also update EmergencyContext if available
      const updateEmergencySOS = getGlobalUpdateSOSSettings();
      if (updateEmergencySOS) {
        console.log('🔄 Syncing SOS settings to EmergencyContext');
        updateEmergencySOS(updatedSettings);
      }
    } catch (error) {
      console.error('Error updating SOS settings:', error);
    }
  };

  const loadDeviceContacts = async () => {
    try {
      // Prevent multiple calls
      if (sosSettings.contactsLoaded) {
        console.log('Device contacts already loaded, skipping...');
        return;
      }

      console.log('Loading device contacts...');
      const contactsService = ContactsService.getInstance();
      
      if (contactsService.isAvailable()) {
        const deviceContacts = await contactsService.loadDeviceContacts();
        updateSOSSettings({ deviceContacts, contactsLoaded: true });
      } else {
        console.warn('Contacts service not available');
        updateSOSSettings({ contactsLoaded: true });
      }
    } catch (error) {
      console.error('Error loading device contacts:', error);
      updateSOSSettings({ contactsLoaded: true });
    }
  };

  const resetToDefaults = async () => {
    try {
      setRecordingSettings(defaultSettings);
      setSosSettings(defaultSOSSettings);
      await AsyncStorage.setItem('recordingSettings', JSON.stringify(defaultSettings));
      await AsyncStorage.setItem('sosSettings', JSON.stringify(defaultSOSSettings));
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const value: SettingsContextType = {
    recordingSettings,
    sosSettings,
    updateRecordingSettings,
    updateSOSSettings,
    loadSettings,
    resetToDefaults,
    loadDeviceContacts,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
