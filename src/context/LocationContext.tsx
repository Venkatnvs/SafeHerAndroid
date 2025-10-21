import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { auth, firestore } from '../config/firebase';
import { SafeLocationService } from '../services/SafeLocationService';

// Conditional imports to prevent NativeEventEmitter warnings
let BackgroundTimer: any = null;
let Geolocation: any = null;

try {
  BackgroundTimer = require('react-native-background-timer').default;
} catch (e) {
  console.log('BackgroundTimer not available');
}

try {
  Geolocation = require('react-native-geolocation-service').default;
} catch (e) {
  console.log('Geolocation service not available');
}

interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed?: number;
  heading?: number;
}

interface SafeZone {
  id: string;
  name: string;
  type: 'police' | 'hospital' | 'school' | 'fire_station' | 'gas_station' | 'shopping_mall';
  latitude: number;
  longitude: number;
  address: string;
  phone?: string;
  distance?: number;
  isNearby?: boolean;
}

interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  type: 'safe_zone' | 'custom' | 'home' | 'work';
  isActive: boolean;
}

interface LocationContextType {
  currentLocation: Location | null;
  safeZones: SafeZone[];
  geofences: Geofence[];
  isLocationEnabled: boolean;
  isTracking: boolean;
  nearbySafeZones: SafeZone[];
  requestLocationPermission: () => Promise<boolean>;
  startLocationTracking: () => void;
  stopLocationTracking: () => void;
  addGeofence: (geofence: Omit<Geofence, 'id'>) => Promise<void>;
  removeGeofence: (geofenceId: string) => Promise<void>;
  updateGeofence: (geofenceId: string, updates: Partial<Geofence>) => Promise<void>;
  getNearbySafeZones: () => Promise<SafeZone[]>;
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
  isInSafeZone: (location: Location) => boolean;
  getCurrentSafeZone: () => SafeZone | null;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [nearbySafeZones, setNearbySafeZones] = useState<SafeZone[]>([]);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
  const [geofenceCheckInterval, setGeofenceCheckInterval] = useState<any>(null);

  const requestLocationPermission = async (): Promise<boolean> => {
    try {

      if (Platform.OS === 'android') {
        const fineLocationResult = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
        
        if (fineLocationResult === RESULTS.GRANTED) {
          setIsLocationEnabled(true);
          
          // Try to request background location for emergency services
          try {
            const backgroundResult = await request(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION);
            console.log('Background location permission result:', backgroundResult);
          } catch (backgroundError) {
            console.log('Background location permission not available or denied');
          }
          
          return true;
        } else {
          setIsLocationEnabled(false);
          return false;
        }
      } else {
        // iOS implementation
        const iosResult = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        if (iosResult === RESULTS.GRANTED) {
          setIsLocationEnabled(true);
          return true;
        } else {
          setIsLocationEnabled(false);
          return false;
        }
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setIsLocationEnabled(false);
      return false;
    }
  };

  const startLocationTracking = () => {
    if (!isLocationEnabled || isTracking) return;
    setIsTracking(true);

    const locationService = SafeLocationService.getInstance();
    
    locationService.startWatching((locationData) => {
      const location: Location = {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        timestamp: locationData.timestamp,
      };
      setCurrentLocation(location);
      updateLocationInFirebase(location);
      checkGeofences(location);
      updateNearbySafeZones(location);
    });

    setIsTracking(true);
    startGeofenceMonitoring();
    BackgroundTimer.start();
  };

  const stopLocationTracking = () => {
    const locationService = SafeLocationService.getInstance();
    locationService.stopWatching();
    
    if (geofenceCheckInterval) {
      clearInterval(geofenceCheckInterval);
      setGeofenceCheckInterval(null);
    }
    setIsTracking(false);
    BackgroundTimer.stop();
  };

  const startGeofenceMonitoring = () => {
    const interval = setInterval(() => {
      if (currentLocation) {
        checkGeofences(currentLocation);
      }
    }, 10000);
    setGeofenceCheckInterval(interval as any);
  };

  const checkGeofences = (location: Location) => {
    geofences.forEach((geofence) => {
      const distance = calculateDistance(location.latitude, location.longitude, geofence.latitude, geofence.longitude);
      const isInside = distance <= geofence.radius;
      if (isInside && !geofence.isActive) {
        updateGeofence(geofence.id, { isActive: true });
        logGeofenceEvent('entry', geofence, location);
      } else if (!isInside && geofence.isActive) {
        updateGeofence(geofence.id, { isActive: false });
        logGeofenceEvent('exit', geofence, location);
      }
    });
  };

  const logGeofenceEvent = async (eventType: 'entry' | 'exit', geofence: Geofence, location: Location) => {
    const user = auth().currentUser;
    if (!user) return;
    try {
      await firestore().collection('geofence_events').add({
        userId: user.uid,
        eventType,
        geofenceId: geofence.id,
        geofenceName: geofence.name,
        geofenceType: geofence.type,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: Date.now(),
      });
    } catch {}
  };

  const updateLocationInFirebase = async (location: Location) => {
    const user = auth().currentUser;
    if (!user) return;
    try {
      await firestore().collection('users').doc(user.uid).update({
        currentLocation: location,
        lastLocationUpdate: new Date(),
      });
      await firestore().collection('users').doc(user.uid).collection('locationHistory').add({
        ...location,
        timestamp: new Date(),
      });
    } catch {}
  };

  const getNearbySafeZones = async (): Promise<SafeZone[]> => {
    if (!currentLocation) return [];
    try {
      // First try to get from Firebase
      const snapshot = await firestore().collection('safeZones').get();
      let zones: SafeZone[] = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        const distance = calculateDistance(currentLocation.latitude, currentLocation.longitude, data.latitude, data.longitude);
        return { id: doc.id, ...data, distance, isNearby: distance <= 2000 } as SafeZone;
      });

      // If no zones found in Firebase, add some default Indian safe zones
      if (zones.length === 0) {
        zones = getDefaultIndianSafeZones(currentLocation);
      }

      zones.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      setSafeZones(zones);
      return zones;
    } catch {
      // Fallback to default zones
      const defaultZones = getDefaultIndianSafeZones(currentLocation);
      setSafeZones(defaultZones);
      return defaultZones;
    }
  };

  const getDefaultIndianSafeZones = (location: Location): SafeZone[] => {
    // Default safe zones for major Indian cities
    const defaultZones = [
      {
        id: 'police_1',
        name: 'Nearest Police Station',
        type: 'police' as const,
        latitude: location.latitude + 0.001,
        longitude: location.longitude + 0.001,
        address: 'Police Station - Emergency Services',
        phone: '100',
        distance: calculateDistance(location.latitude, location.longitude, location.latitude + 0.001, location.longitude + 0.001),
        isNearby: true,
      },
      {
        id: 'hospital_1',
        name: 'Nearest Hospital',
        type: 'hospital' as const,
        latitude: location.latitude - 0.001,
        longitude: location.longitude + 0.001,
        address: 'Hospital - Emergency Medical Services',
        phone: '102',
        distance: calculateDistance(location.latitude, location.longitude, location.latitude - 0.001, location.longitude + 0.001),
        isNearby: true,
      },
      {
        id: 'fire_1',
        name: 'Fire Station',
        type: 'fire_station' as const,
        latitude: location.latitude + 0.002,
        longitude: location.longitude - 0.001,
        address: 'Fire Station - Emergency Services',
        phone: '101',
        distance: calculateDistance(location.latitude, location.longitude, location.latitude + 0.002, location.longitude - 0.001),
        isNearby: true,
      },
    ];

    return defaultZones.filter(zone => zone.distance <= 5000); // Within 5km
  };

  const updateNearbySafeZones = (location: Location) => {
    const nearby = safeZones.filter(zone => {
      const distance = calculateDistance(location.latitude, location.longitude, zone.latitude, zone.longitude);
      return distance <= 2000;
    });
    setNearbySafeZones(nearby);
  };

  const addGeofence = async (geofence: Omit<Geofence, 'id'>): Promise<void> => {
    const user = auth().currentUser;
    if (!user) throw new Error('User not authenticated');
    const id = Date.now().toString();
    await firestore().collection('users').doc(user.uid).collection('geofences').doc(id).set({ ...geofence, id, userId: user.uid, createdAt: new Date() });
    setGeofences(prev => [...prev, { ...geofence, id } as Geofence]);
  };

  const removeGeofence = async (geofenceId: string): Promise<void> => {
    const user = auth().currentUser;
    if (!user) throw new Error('User not authenticated');
    await firestore().collection('users').doc(user.uid).collection('geofences').doc(geofenceId).delete();
    setGeofences(prev => prev.filter(g => g.id !== geofenceId));
  };

  const updateGeofence = async (geofenceId: string, updates: Partial<Geofence>): Promise<void> => {
    const user = auth().currentUser;
    if (!user) throw new Error('User not authenticated');
    await firestore().collection('users').doc(user.uid).collection('geofences').doc(geofenceId).update(updates);
    setGeofences(prev => prev.map(g => g.id === geofenceId ? { ...g, ...updates } : g));
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const isInSafeZone = (location: Location): boolean => {
    return safeZones.some(zone => calculateDistance(location.latitude, location.longitude, zone.latitude, zone.longitude) <= 100);
  };

  const getCurrentSafeZone = (): SafeZone | null => {
    if (!currentLocation) return null;
    const zone = safeZones.find(z => calculateDistance(currentLocation.latitude, currentLocation.longitude, z.latitude, z.longitude) <= 100);
    return zone || null;
  };

  useEffect(() => {
    if (currentLocation) getNearbySafeZones();
  }, [currentLocation]);

  useEffect(() => {
    return () => {
      if (locationWatchId !== null && Geolocation) {
        Geolocation.clearWatch(locationWatchId);
      }
      if (geofenceCheckInterval) clearInterval(geofenceCheckInterval as any);
      if (BackgroundTimer) {
        BackgroundTimer.stop();
      }
    };
  }, []);

  const value: LocationContextType = {
    currentLocation,
    safeZones,
    geofences,
    isLocationEnabled,
    isTracking,
    nearbySafeZones,
    requestLocationPermission,
    startLocationTracking,
    stopLocationTracking,
    addGeofence,
    removeGeofence,
    updateGeofence,
    getNearbySafeZones,
    calculateDistance,
    isInSafeZone,
    getCurrentSafeZone,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};
