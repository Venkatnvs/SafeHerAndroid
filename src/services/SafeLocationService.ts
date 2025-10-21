import { Platform, Linking } from 'react-native';

// Conditional import for Geolocation
let Geolocation: any = null;
try {
  Geolocation = require('react-native-geolocation-service').default;
} catch (e) {
  console.log('Geolocation service not available');
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export class SafeLocationService {
  private static instance: SafeLocationService;
  private currentLocation: LocationData | null = null;
  private watchId: number | null = null;

  static getInstance(): SafeLocationService {
    if (!SafeLocationService.instance) {
      SafeLocationService.instance = new SafeLocationService();
    }
    return SafeLocationService.instance;
  }

  async getCurrentLocation(): Promise<LocationData | null> {
    if (!Geolocation) {
      console.log('Geolocation service not available');
      return this.currentLocation;
    }

    return new Promise((resolve) => {
      const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
        forceRequestLocation: true,
        forceLocationManager: Platform.OS === 'android',
        showLocationDialog: false,
      };

      Geolocation.getCurrentPosition(
        (position: any) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          this.currentLocation = location;
          resolve(location);
        },
        (error: any) => {
          console.error('Location error:', error);
          resolve(this.currentLocation);
        },
        options
      );
    });
  }

  startWatching(callback: (location: LocationData) => void) {
    if (!Geolocation) {
      console.log('Geolocation service not available');
      return;
    }

    if (this.watchId !== null) {
      this.stopWatching();
    }

    const options = {
      enableHighAccuracy: true,
      distanceFilter: 50,
      interval: 10000,
      fastestInterval: 5000,
      showLocationDialog: false,
      forceRequestLocation: true,
      forceLocationManager: Platform.OS === 'android',
    };

    this.watchId = Geolocation.watchPosition(
      (position: any) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        this.currentLocation = location;
        callback(location);
      },
      (error: any) => {
        console.error('Location watch error:', error);
      },
      options
    );
  }

  stopWatching() {
    if (this.watchId !== null && Geolocation) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  getCachedLocation(): LocationData | null {
    return this.currentLocation;
  }

  async getLocationFallback(): Promise<LocationData | null> {
    if (!Geolocation) {
      console.log('Geolocation service not available');
      return null;
    }

    try {
      const position = await new Promise<any>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000,
            forceRequestLocation: false,
            forceLocationManager: false,
            showLocationDialog: false,
          }
        );
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };
    } catch (error) {
      console.error('Fallback location error:', error);
      return null;
    }
  }
}
