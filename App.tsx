import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, PermissionsAndroid, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import components
import AuthNavigator from './src/components/AuthNavigator';

// Import context
import { AuthProvider } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import { EmergencyProvider } from './src/context/EmergencyContext';
import { navigationRef } from './src/utils/NavigationService';

async function requestNotificationPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
}


// Main App Component
function App(): React.JSX.Element {
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#E91E63" />
      <AuthProvider>
        <LocationProvider>
          <EmergencyProvider>
            <NavigationContainer ref={navigationRef}>
              <AuthNavigator />
            </NavigationContainer>
          </EmergencyProvider>
        </LocationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
