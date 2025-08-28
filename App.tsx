import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, PermissionsAndroid, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import screens
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import HomeScreen from './src/screens/HomeScreen';
import GuardianDashboardScreen from './src/screens/GuardianDashboardScreen';
import SafeZonesScreen from './src/screens/SafeZonesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SelfDefenseScreen from './src/screens/SelfDefenseScreen';
import EmergencyScreen from './src/screens/EmergencyScreen';

// Import components
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import context
import { AuthProvider } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import { EmergencyProvider } from './src/context/EmergencyContext';
import { navigationRef } from './src/utils/NavigationService';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

async function requestNotificationPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
}

// Tab Navigator for authenticated users
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'SafeZones':
              iconName = focused ? 'map-marker' : 'map-marker-outline';
              break;
            case 'Guardian':
              iconName = focused ? 'shield-account' : 'shield-account-outline';
              break;
            case 'SelfDefense':
              iconName = focused ? 'karate' : 'karate-outline';
              break;
            case 'Profile':
              iconName = focused ? 'account' : 'account-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#E91E63',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'SafeHer' }}
      />
      <Tab.Screen 
        name="SafeZones" 
        component={SafeZonesScreen}
        options={{ title: 'Safe Zones' }}
      />
      <Tab.Screen 
        name="Guardian" 
        component={GuardianDashboardScreen}
        options={{ title: 'Guardian' }}
      />
      <Tab.Screen 
        name="SelfDefense" 
        component={SelfDefenseScreen}
        options={{ title: 'Self Defense' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
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
              <Stack.Navigator
                initialRouteName="Onboarding"
                screenOptions={{
                  headerStyle: {
                    backgroundColor: '#E91E63',
                  },
                  headerTintColor: '#FFFFFF',
                  headerTitleStyle: {
                    fontWeight: 'bold',
                  },
                }}
              >
                <Stack.Screen 
                  name="Onboarding" 
                  component={OnboardingScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen 
                  name="Login" 
                  component={LoginScreen}
                  options={{ title: 'Login to SafeHer' }}
                />
                <Stack.Screen 
                  name="Signup" 
                  component={SignupScreen}
                  options={{ title: 'Create Account' }}
                />
                <Stack.Screen 
                  name="MainApp" 
                  component={TabNavigator}
                  options={{ headerShown: false }}
                />
                <Stack.Screen 
                  name="Emergency" 
                  component={EmergencyScreen}
                  options={{ 
                    title: 'Emergency',
                    headerStyle: { backgroundColor: '#F44336' },
                    presentation: 'modal'
                  }}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </EmergencyProvider>
        </LocationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
