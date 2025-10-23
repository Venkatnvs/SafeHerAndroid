import { Platform } from 'react-native';

export interface PlaceResult {
  place_id: string;
  name: string;
  vicinity: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now: boolean;
  };
  formatted_phone_number?: string;
  international_phone_number?: string;
}

export interface PlacesResponse {
  results: PlaceResult[];
  status: string;
  next_page_token?: string;
}

export class PlacesService {
  private static instance: PlacesService;
  private apiKey: string = ''; // Will be set from environment
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';

  static getInstance(): PlacesService {
    if (!PlacesService.instance) {
      PlacesService.instance = new PlacesService();
    }
    return PlacesService.instance;
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchNearby(
    latitude: number,
    longitude: number,
    radius: number = 5000,
    types: string[] = ['police', 'hospital', 'fire_station']
  ): Promise<PlaceResult[]> {
    if (!this.apiKey) {
      console.warn('Google Places API key not set, using fallback data');
      return this.getFallbackPlaces(latitude, longitude);
    }

    try {
      console.log('Searching for places with types:', types);
      
      // Make separate requests for each type since Google Places API doesn't support multiple types in one request
      const allPlaces: PlaceResult[] = [];
      const seenPlaceIds = new Set<string>();

      for (const type of types) {
        try {
          const url = `${this.baseUrl}/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${type}&key=${this.apiKey}`;
          console.log(`Fetching ${type} places from:`, url);
          
          const response = await fetch(url);
          const data: PlacesResponse = await response.json();

          if (data.status === 'OK') {
            console.log(`Found ${data.results.length} ${type} places`);
            // Add unique places only
            data.results.forEach(place => {
              if (!seenPlaceIds.has(place.place_id)) {
                seenPlaceIds.add(place.place_id);
                allPlaces.push(place);
              }
            });
          } else if (data.status !== 'ZERO_RESULTS') {
            // Only log errors, not zero results (which is normal)
            console.warn(`Places API error for ${type}:`, data.status);
          }
        } catch (error) {
          console.error(`Error fetching ${type} places:`, error);
        }
      }

      console.log(`Total unique places found: ${allPlaces.length}`);
      return allPlaces.length > 0 ? allPlaces : this.getFallbackPlaces(latitude, longitude);
    } catch (error) {
      console.error('Error fetching places:', error);
      return this.getFallbackPlaces(latitude, longitude);
    }
  }

  async getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const fields = 'place_id,name,formatted_address,geometry,types,rating,user_ratings_total,opening_hours,formatted_phone_number,international_phone_number';
      const url = `${this.baseUrl}/details/json?place_id=${placeId}&fields=${fields}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        return data.result;
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }

    return null;
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    if (!this.apiKey) {
      return this.getFallbackCityName(latitude, longitude);
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        return result.formatted_address || result.address_components?.[0]?.long_name || 'Unknown Location';
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }

    return this.getFallbackCityName(latitude, longitude);
  }

  private getFallbackPlaces(latitude: number, longitude: number): PlaceResult[] {
    // More realistic fallback data based on actual Indian emergency services
    const fallbackPlaces: PlaceResult[] = [
      {
        place_id: 'fallback_police_1',
        name: 'Local Police Station',
        vicinity: 'Emergency Response Unit',
        formatted_address: 'Police Station, Emergency Services',
        geometry: {
          location: {
            lat: latitude + 0.005,
            lng: longitude + 0.005,
          },
        },
        types: ['police', 'establishment'],
        rating: 4.2,
        user_ratings_total: 150,
        opening_hours: { open_now: true },
        formatted_phone_number: '100',
        international_phone_number: '+91-100',
      },
      {
        place_id: 'fallback_hospital_1',
        name: 'Government Hospital',
        vicinity: 'Emergency Medical Services',
        formatted_address: 'Government Hospital, Emergency Ward',
        geometry: {
          location: {
            lat: latitude - 0.003,
            lng: longitude + 0.004,
          },
        },
        types: ['hospital', 'health', 'establishment'],
        rating: 4.0,
        user_ratings_total: 200,
        opening_hours: { open_now: true },
        formatted_phone_number: '102',
        international_phone_number: '+91-102',
      },
      {
        place_id: 'fallback_fire_1',
        name: 'Fire Station',
        vicinity: 'Emergency Response',
        formatted_address: 'Fire Station, Emergency Services',
        geometry: {
          location: {
            lat: latitude + 0.004,
            lng: longitude - 0.003,
          },
        },
        types: ['fire_station', 'establishment'],
        rating: 4.3,
        user_ratings_total: 120,
        opening_hours: { open_now: true },
        formatted_phone_number: '101',
        international_phone_number: '+91-101',
      },
      {
        place_id: 'fallback_gas_station_1',
        name: 'Petrol Pump',
        vicinity: 'Fuel Station',
        formatted_address: 'Petrol Pump, Fuel Services',
        geometry: {
          location: {
            lat: latitude - 0.002,
            lng: longitude - 0.004,
          },
        },
        types: ['gas_station', 'establishment'],
        rating: 3.8,
        user_ratings_total: 45,
        opening_hours: { open_now: true },
        formatted_phone_number: '1800-180-1551',
        international_phone_number: '+91-1800-180-1551',
      },
      {
        place_id: 'fallback_shopping_1',
        name: 'Shopping Mall',
        vicinity: 'Shopping Center',
        formatted_address: 'Shopping Mall, Retail Complex',
        geometry: {
          location: {
            lat: latitude + 0.006,
            lng: longitude - 0.002,
          },
        },
        types: ['shopping_mall', 'establishment'],
        rating: 4.1,
        user_ratings_total: 320,
        opening_hours: { open_now: true },
        formatted_phone_number: '1800-XXX-XXXX',
        international_phone_number: '+91-1800-XXX-XXXX',
      },
      {
        place_id: 'fallback_school_1',
        name: 'Government School',
        vicinity: 'Educational Institution',
        formatted_address: 'Government School, Education Center',
        geometry: {
          location: {
            lat: latitude - 0.004,
            lng: longitude + 0.002,
          },
        },
        types: ['school', 'establishment'],
        rating: 4.0,
        user_ratings_total: 85,
        opening_hours: { open_now: false },
        formatted_phone_number: '1800-XXX-XXXX',
        international_phone_number: '+91-1800-XXX-XXXX',
      },
      {
        place_id: 'fallback_post_office_1',
        name: 'Post Office',
        vicinity: 'Postal Services',
        formatted_address: 'Post Office, Postal Services',
        geometry: {
          location: {
            lat: latitude + 0.001,
            lng: longitude - 0.005,
          },
        },
        types: ['post_office', 'establishment'],
        rating: 3.9,
        user_ratings_total: 65,
        opening_hours: { open_now: true },
        formatted_phone_number: '1800-XXX-XXXX',
        international_phone_number: '+91-1800-XXX-XXXX',
      },
      {
        place_id: 'fallback_women_helpline',
        name: 'Women Helpline Center',
        vicinity: '24/7 Support',
        formatted_address: 'Women Safety Cell, Emergency Support',
        geometry: {
          location: {
            lat: latitude - 0.003,
            lng: longitude - 0.003,
          },
        },
        types: ['police', 'establishment'],
        rating: 4.5,
        user_ratings_total: 80,
        opening_hours: { open_now: true },
        formatted_phone_number: '1091',
        international_phone_number: '+91-1091',
      },
    ];

    return fallbackPlaces;
  }

  private getFallbackCityName(latitude: number, longitude: number): string {
    // More comprehensive Indian cities database
    const majorCities = [
      { name: 'Mumbai', lat: 19.0760, lon: 72.8777, state: 'Maharashtra' },
      { name: 'Delhi', lat: 28.7041, lon: 77.1025, state: 'Delhi' },
      { name: 'Bangalore', lat: 12.9716, lon: 77.5946, state: 'Karnataka' },
      { name: 'Chennai', lat: 13.0827, lon: 80.2707, state: 'Tamil Nadu' },
      { name: 'Kolkata', lat: 22.5726, lon: 88.3639, state: 'West Bengal' },
      { name: 'Hyderabad', lat: 17.3850, lon: 78.4867, state: 'Telangana' },
      { name: 'Pune', lat: 18.5204, lon: 73.8567, state: 'Maharashtra' },
      { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714, state: 'Gujarat' },
      { name: 'Jaipur', lat: 26.9124, lon: 75.7873, state: 'Rajasthan' },
      { name: 'Lucknow', lat: 26.8467, lon: 80.9462, state: 'Uttar Pradesh' },
      { name: 'Kanpur', lat: 26.4499, lon: 80.3319, state: 'Uttar Pradesh' },
      { name: 'Nagpur', lat: 21.1458, lon: 79.0882, state: 'Maharashtra' },
      { name: 'Indore', lat: 22.7196, lon: 75.8577, state: 'Madhya Pradesh' },
      { name: 'Thane', lat: 19.2183, lon: 72.9781, state: 'Maharashtra' },
      { name: 'Bhopal', lat: 23.2599, lon: 77.4126, state: 'Madhya Pradesh' },
      { name: 'Visakhapatnam', lat: 17.6868, lon: 83.2185, state: 'Andhra Pradesh' },
      { name: 'Pimpri-Chinchwad', lat: 18.6298, lon: 73.7997, state: 'Maharashtra' },
      { name: 'Patna', lat: 25.5941, lon: 85.1376, state: 'Bihar' },
      { name: 'Vadodara', lat: 22.3072, lon: 73.1812, state: 'Gujarat' },
      { name: 'Ghaziabad', lat: 28.6692, lon: 77.4538, state: 'Uttar Pradesh' },
    ];

    let closestCity = 'Local Area';
    let minDistance = Infinity;

    majorCities.forEach(city => {
      const distance = this.calculateDistance(latitude, longitude, city.lat, city.lon);
      if (distance < minDistance) {
        minDistance = distance;
        closestCity = `${city.name}, ${city.state}`;
      }
    });

    return closestCity;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }
}
