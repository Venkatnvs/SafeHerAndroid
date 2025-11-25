import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';

// Import screens
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import GuardianDashboardScreen from '../screens/GuardianDashboardScreen';
import SafeZonesScreen from '../screens/SafeZonesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SelfDefenseScreen from '../screens/SelfDefenseScreen';
import EmergencyScreen from '../screens/EmergencyScreen';
import CommunityScreen from '../screens/CommunityScreen';
import SOSSettingsScreen from '../screens/SOSSettingsScreen';
import GuardianMapScreen from '../screens/GuardianMapScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Loading Screen Component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#E91E63" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

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
              iconName = focused ? 'karate' : 'karate';
              break;
            // case 'Community':
            //   iconName = focused ? 'account-group' : 'account-group-outline';
            //   break;
            case 'Profile':
              iconName = focused ? 'account-cog' : 'account-cog-outline';
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
      {/* <Tab.Screen 
        name="Community" 
        component={CommunityScreen}
        options={{ title: 'Community' }}
      /> */}
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile & Settings' }}
      />
    </Tab.Navigator>
  );
}

// Main Auth Navigator Component
const AuthNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  // Show loading screen while checking authentication state
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
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
      {user ? (
        // User is authenticated - show main app
        <>
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
          <Stack.Screen 
            name="SOSSettings" 
            component={SOSSettingsScreen}
            options={{ 
              title: 'SOS Settings',
              headerStyle: { backgroundColor: '#E91E63' },
            }}
          />
          <Stack.Screen 
            name="GuardianMap" 
            component={GuardianMapScreen}
            options={{ 
              title: 'Live Location Map',
              headerStyle: { backgroundColor: '#4CAF50' },
            }}
          />
        </>
      ) : (
        // User is not authenticated - show auth screens
        <>
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
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default AuthNavigator;
