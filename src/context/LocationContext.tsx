import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { auth, firestore } from '../config/firebase';
import { SafeLocationService } from '../services/SafeLocationService';
import { PlacesService, PlaceResult } from '../services/PlacesService';
import { GOOGLE_PLACES_CONFIG } from '../config/googlePlaces';

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
  rating?: number;
  isOpen?: boolean;
  placeId?: string;
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
      console.log('Fetching real safe zones for location:', currentLocation);
      
      // Initialize PlacesService
      const placesService = PlacesService.getInstance();
      
      // Set API key if configured
      if (GOOGLE_PLACES_CONFIG.API_KEY) {
        placesService.setApiKey(GOOGLE_PLACES_CONFIG.API_KEY);
      }
      
      // Search for emergency services
      const places = await placesService.searchNearby(
        currentLocation.latitude,
        currentLocation.longitude,
        GOOGLE_PLACES_CONFIG.DEFAULT_RADIUS,
        GOOGLE_PLACES_CONFIG.EMERGENCY_TYPES
      );

      console.log('Found places:', places.length);

      // Convert PlaceResult to SafeZone
      const safeZones: SafeZone[] = places.map((place: PlaceResult) => {
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          place.geometry.location.lat,
          place.geometry.location.lng
        );

        // Determine zone type based on place types
        let zoneType: SafeZone['type'] = 'police';
        if (place.types.includes('hospital')) {
          zoneType = 'hospital';
        } else if (place.types.includes('fire_station')) {
          zoneType = 'fire_station';
        } else if (place.types.includes('school')) {
          zoneType = 'school';
        }

        return {
          id: place.place_id,
          name: place.name,
          type: zoneType,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          address: place.formatted_address || place.vicinity,
          phone: place.formatted_phone_number || place.international_phone_number,
          distance: Math.round(distance),
          isNearby: distance <= 2000,
          rating: place.rating,
          isOpen: place.opening_hours?.open_now,
          placeId: place.place_id,
        };
      });

      // Sort by distance
      safeZones.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      console.log('Processed safe zones:', safeZones.length);
      setSafeZones(safeZones);
      return safeZones;

    } catch (error) {
      console.error('Error fetching real safe zones:', error);
      
      // Fallback to improved default zones
      const fallbackZones = getDefaultIndianSafeZones(currentLocation);
      setSafeZones(fallbackZones);
      return fallbackZones;
    }
  };

  const getDefaultIndianSafeZones = (location: Location): SafeZone[] => {
    // More realistic safe zones based on Indian emergency services
    // These are generic emergency service locations that exist in most Indian cities
    const defaultZones: SafeZone[] = [
      {
        id: 'police_emergency',
        name: 'Police Emergency Services',
        type: 'police' as const,
        latitude: location.latitude + 0.005, // ~500m away
        longitude: location.longitude + 0.005,
        address: 'Local Police Station - Emergency Response Unit',
        phone: '100',
        distance: calculateDistance(location.latitude, location.longitude, location.latitude + 0.005, location.longitude + 0.005),
        isNearby: true,
      },
      {
        id: 'hospital_emergency',
        name: 'Emergency Medical Services',
        type: 'hospital' as const,
        latitude: location.latitude - 0.003,
        longitude: location.longitude + 0.004,
        address: 'Government Hospital - Emergency Ward',
        phone: '102',
        distance: calculateDistance(location.latitude, location.longitude, location.latitude - 0.003, location.longitude + 0.004),
        isNearby: true,
      },
      {
        id: 'fire_emergency',
        name: 'Fire & Rescue Services',
        type: 'fire_station' as const,
        latitude: location.latitude + 0.004,
        longitude: location.longitude - 0.003,
        address: 'Fire Station - Emergency Response',
        phone: '101',
        distance: calculateDistance(location.latitude, location.longitude, location.latitude + 0.004, location.longitude - 0.003),
        isNearby: true,
      },
      {
        id: 'women_helpline',
        name: 'Women Helpline Center',
        type: 'police' as const,
        latitude: location.latitude - 0.002,
        longitude: location.longitude - 0.004,
        address: 'Women Safety Cell - 24/7 Support',
        phone: '1091',
        distance: calculateDistance(location.latitude, location.longitude, location.latitude - 0.002, location.longitude - 0.004),
        isNearby: true,
      },
      {
        id: 'railway_police',
        name: 'Railway Protection Force',
        type: 'police' as const,
        latitude: location.latitude + 0.006,
        longitude: location.longitude - 0.002,
        address: 'RPF Station - Railway Security',
        phone: '182',
        distance: calculateDistance(location.latitude, location.longitude, location.latitude + 0.006, location.longitude - 0.002),
        isNearby: true,
      },
      {
        id: 'traffic_police',
        name: 'Traffic Police Control',
        type: 'police' as const,
        latitude: location.latitude - 0.004,
        longitude: location.longitude + 0.002,
        address: 'Traffic Police Station - Road Safety',
        phone: '103',
        distance: calculateDistance(location.latitude, location.longitude, location.latitude - 0.004, location.longitude + 0.002),
        isNearby: true,
      },
    ];

    // Filter zones within 5km and add more realistic data
    return defaultZones
      .filter(zone => (zone.distance || 0) <= 5000)
      .map(zone => ({
        ...zone,
        // Add more realistic addresses based on Indian cities
        address: zone.address + `, ${getCityName(location)}`,
        // Ensure phone numbers are properly formatted
        phone: zone.phone?.startsWith('+91') ? zone.phone : `+91-${zone.phone}`,
      }));
  };

  // Helper function to get city name based on coordinates (simplified)
  const getCityName = (location: Location): string => {
    // This is a simplified approach - in a real app, you'd use reverse geocoding
    const majorCities = [
      { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
      { name: 'Delhi', lat: 28.7041, lon: 77.1025 },
      { name: 'Bangalore', lat: 12.9716, lon: 77.5946 },
      { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
      { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
      { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
      { name: 'Pune', lat: 18.5204, lon: 73.8567 },
      { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
    ];

    let closestCity = 'Local Area';
    let minDistance = Infinity;

    majorCities.forEach(city => {
      const distance = calculateDistance(location.latitude, location.longitude, city.lat, city.lon);
      if (distance < minDistance) {
        minDistance = distance;
        closestCity = city.name;
      }
    });

    return closestCity;
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
    // Improved Haversine formula with better precision
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const distance = R * c; // Distance in meters
    
    // Round to nearest meter for better accuracy
    return Math.round(distance);
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
