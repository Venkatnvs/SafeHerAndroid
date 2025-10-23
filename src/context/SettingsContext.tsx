import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RecordingSettings {
  audioRecordingEnabled: boolean;
  autoRecordOnEmergency: boolean;
  maxRecordingDuration: number; // in minutes
  storageLocation: 'local' | 'cloud';
}

interface SettingsContextType {
  recordingSettings: RecordingSettings;
  updateRecordingSettings: (settings: Partial<RecordingSettings>) => Promise<void>;
  loadSettings: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const defaultSettings: RecordingSettings = {
  audioRecordingEnabled: false, // Disabled by default to avoid permission issues
  autoRecordOnEmergency: false, // Disabled to prevent permission crashes
  maxRecordingDuration: 5, // 5 minutes
  storageLocation: 'local',
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

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('recordingSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setRecordingSettings({ ...defaultSettings, ...parsedSettings });
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

  const resetToDefaults = async () => {
    try {
      setRecordingSettings(defaultSettings);
      await AsyncStorage.setItem('recordingSettings', JSON.stringify(defaultSettings));
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const value: SettingsContextType = {
    recordingSettings,
    updateRecordingSettings,
    loadSettings,
    resetToDefaults,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
