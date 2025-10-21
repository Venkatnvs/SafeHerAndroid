# Firebase Setup Guide for SafeHer App

## 🔥 Firebase Configuration Steps

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `SafeHer-WomenSafety`
4. Enable Google Analytics (optional)
5. Create project

### 2. Enable Required Services

#### Authentication
1. Go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Configure authorized domains if needed

#### Firestore Database
1. Go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for development)
4. Select location closest to India (asia-south1)

#### Cloud Messaging
1. Go to **Cloud Messaging**
2. No additional setup needed for basic functionality

#### Storage (Optional)
1. Go to **Storage**
2. Click **Get started**
3. Choose **Start in test mode**

### 3. Add Android App
1. Click **Add app** → **Android**
2. Enter package name: `com.safeherandroid`
3. Enter app nickname: `SafeHer Android`
4. Download `google-services.json`
5. Place it in `android/app/` directory

### 4. Configure Firestore Security Rules

Replace the default rules with these:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read/write their own location history
    match /users/{userId}/locationHistory/{locationId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read/write their own geofences
    match /users/{userId}/geofences/{geofenceId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Emergency alerts - users can create and read their own
    match /emergencyAlerts/{alertId} {
      allow read, write: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         request.auth.uid in resource.data.guardianIds);
    }
    
    // Community messages - anyone can read, authenticated users can write
    match /communityMessages/{messageId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Self-defense topics - anyone can read, admins can write
    match /selfDefenseTopics/{topicId} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.auth.token.email in get(/databases/$(database)/documents/adminList/admins).data.emails;
    }
    
    // Safe zones - anyone can read
    match /safeZones/{zoneId} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.auth.token.email in get(/databases/$(database)/documents/adminList/admins).data.emails;
    }
    
    // Admin list - only admins can read/write
    match /adminList/{docId} {
      allow read, write: if request.auth != null && 
        request.auth.token.email in get(/databases/$(database)/documents/adminList/admins).data.emails;
    }
    
    // Geofence events - users can read/write their own
    match /geofence_events/{eventId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

### 5. Initialize Admin List

Create the admin list in Firestore:

1. Go to **Firestore Database**
2. Click **Start collection**
3. Collection ID: `adminList`
4. Document ID: `admins`
5. Add field:
   - Field: `emails`
   - Type: `array`
   - Value: `["admin@safeher.app", "your-email@domain.com"]`

### 6. Add Sample Safe Zones (Optional)

Create sample safe zones for testing:

1. Go to **Firestore Database**
2. Click **Start collection**
3. Collection ID: `safeZones`
4. Add documents with these fields:
   - `name`: "Police Station"
   - `type`: "police"
   - `latitude`: 28.6139 (Delhi coordinates)
   - `longitude`: 77.2090
   - `address`: "Police Station, Delhi"
   - `phone`: "100"

### 7. Environment Configuration

Create a `.env` file in the project root:

```env
# Firebase Configuration
FIREBASE_API_KEY=your_api_key_here
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

### 8. Test Configuration

Run these commands to test:

```bash
cd SafeHerAndroid
npm install
npx react-native run-android
```

### 9. Production Considerations

#### Security Rules for Production
- Change Firestore rules from test mode to production mode
- Implement proper authentication checks
- Add rate limiting for API calls
- Enable Firebase App Check for additional security

#### Performance Optimization
- Enable Firestore offline persistence
- Implement proper caching strategies
- Optimize location update frequency
- Use Firebase Performance Monitoring

#### Monitoring
- Enable Firebase Crashlytics
- Set up Firebase Performance Monitoring
- Configure Firebase Analytics
- Monitor Firebase usage quotas

## 🔧 Troubleshooting

### Common Issues

1. **google-services.json not found**
   - Ensure file is in `android/app/` directory
   - Check package name matches exactly

2. **Firebase connection issues**
   - Verify internet connection
   - Check Firebase project configuration
   - Ensure all required services are enabled

3. **Permission errors**
   - Check Firestore security rules
   - Verify user authentication status
   - Ensure proper data structure

4. **Location services not working**
   - Check device location permissions
   - Verify GPS is enabled
   - Test on physical device (not emulator)

### Support

For additional help:
- Check Firebase documentation
- Review React Native Firebase documentation
- Test with Firebase emulator suite
- Use Firebase console for debugging

## 📱 Ready to Deploy

Once Firebase is configured:
1. Test all features on physical devices
2. Configure production security rules
3. Set up monitoring and analytics
4. Deploy to app stores

Your SafeHer app is now ready for production use! 🚀
