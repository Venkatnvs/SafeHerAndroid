# SafeHer - Women Safety Mobile Application

A comprehensive cross-platform women safety mobile application built with React Native and Firebase, designed to provide immediate emergency assistance with minimal user effort.

## 🚨 Core Emergency Features

### **Always-Listening Hotword Detection**
- **Background Voice Monitoring**: Continuously listens for emergency keywords even when app is in background
- **Hotword Recognition**: Detects phrases like "Help me", "Emergency", "SOS", "Danger", "Police"
- **Automatic SOS Trigger**: Instantly triggers emergency response when hotwords are detected
- **Background Audio Processing**: Works even when app is minimized or screen is locked
- **Low Battery Impact**: Optimized for minimal battery drain during continuous monitoring

### **Shake Detection**
- **Gesture-Based SOS**: Triggers emergency alert via device shake gesture
- **Configurable Sensitivity**: Adjustable shake threshold for different use cases
- **Background Monitoring**: Works continuously in background
- **Instant Response**: Immediate emergency activation without unlocking device

### **Complete Geofencing System**
- **Safe Zone Monitoring**: Automatically detects when user enters/leaves safe zones
- **Custom Geofences**: Users can create personal safety zones (home, work, etc.)
- **Real-Time Alerts**: Instant notifications when geofence boundaries are crossed
- **Background Location Tracking**: Continuous GPS monitoring with low battery usage
- **Safe Zone Database**: Pre-loaded with police stations, hospitals, schools, fire stations

### **Push Notifications**
- **Firebase Cloud Messaging**: Real-time emergency alerts to guardians
- **Multi-Channel Delivery**: Push notifications, SMS, and email redundancy
- **Guardian Dashboard**: Live emergency status and response tracking
- **Emergency Response Tracking**: Monitor guardian acknowledgment and actions

## 🏗️ Technical Architecture

### **Frontend**
- **React Native 0.74.5**: Cross-platform mobile development
- **React Navigation v6**: Stack and Bottom Tab navigation
- **React Context API**: Global state management for Auth, Location, and Emergency
- **TypeScript**: Full type safety and better development experience

### **Backend Services**
- **Firebase Authentication**: Secure user login and registration
- **Firestore Database**: Real-time data synchronization
- **Firebase Storage**: Audio/video recording storage
- **Firebase Cloud Messaging**: Push notification delivery
- **Firebase Functions**: Serverless backend processing

### **Background Services**
- **BackgroundServiceManager**: Centralized background task management
- **Continuous Location Tracking**: GPS monitoring with geofencing
- **Voice Recognition Service**: Always-listening hotword detection
- **Shake Detection Service**: Gesture-based emergency triggering
- **Emergency Monitoring**: Continuous safety condition checking

## 📱 App Screens & Features

### **1. Onboarding & Authentication**
- **Welcome Screen**: App introduction and feature overview
- **Login Screen**: Email/password authentication
- **Signup Screen**: User registration with guardian setup
- **Forgot Password**: Secure password recovery

### **2. Home Screen (Emergency Hub)**
- **Large SOS Button**: One-tap emergency activation
- **Quick Actions**: Safe Zones, Guardian Dashboard, Self Defense
- **Location Status**: Real-time GPS tracking indicator
- **Motivational Quotes**: Daily safety motivation
- **Emergency Status**: Active emergency alerts display

### **3. Safe Zones & Nearby Assistance**
- **Interactive Map**: Google Maps integration with safe zone highlighting
- **Nearby Services**: Police stations, hospitals, schools, fire stations
- **Distance Calculation**: Real-time proximity to emergency services
- **Geofencing Alerts**: Automatic notifications when entering safe zones
- **Emergency Numbers**: Quick access to local emergency services

### **4. Guardian Dashboard**
- **Protected Users**: List of users under guardian protection
- **Live Location Tracking**: Real-time map view of user locations
- **Emergency Alerts**: Active emergency notifications and status
- **Quick Actions**: Direct call, message, and location sharing
- **Response Tracking**: Monitor emergency response actions

### **5. Self Defense Resources**
- **Training Videos**: Self-defense technique demonstrations
- **Safety Tips**: Daily safety advice and best practices
- **Emergency Resources**: Quick access to safety information
- **Personal Safety**: Customizable safety recommendations

### **6. Profile & Settings**
- **User Profile**: Personal information and emergency contacts
- **Guardian Management**: Add/remove guardians with approval system
- **Emergency Contacts**: Manage emergency contact information
- **Privacy Settings**: Control location sharing and notifications
- **App Preferences**: Customize emergency response settings

## 🔧 Installation & Setup

### **Prerequisites**
- Node.js 18+ and npm
- React Native development environment
- Android Studio (for Android development)
- Xcode (for iOS development)
- Firebase project with enabled services

### **1. Clone Repository**
```bash
git clone <repository-url>
cd SafeHerAndroid
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Firebase Configuration**
Create a `.env` file in the root directory:
```env
# Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# Google Maps API Key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### **4. Update Firebase Config**
Edit `src/config/firebase.ts` with your Firebase project details.

### **5. Platform-Specific Setup**

#### **Android**
- Update `android/app/src/main/AndroidManifest.xml` with required permissions
- Configure Firebase services in `android/app/google-services.json`
- Set up background task handling

#### **iOS**
- Update `ios/Info.plist` with required permissions
- Configure Firebase services in `ios/GoogleService-Info.plist`
- Set up background modes and capabilities

### **6. Run the Application**
```bash
# Android
npx react-native run-android

# iOS
npx react-native run-ios
```

## 🚀 Background Services Setup

### **Always-Listening Voice Detection**
The app automatically sets up continuous voice monitoring:
- Requests microphone permissions on startup
- Initializes voice recognition service
- Continuously listens for emergency keywords
- Automatically restarts listening after each recognition cycle

### **Shake Detection**
Shake detection is automatically enabled:
- Configures device motion sensors
- Sets optimal sensitivity for emergency detection
- Works in background mode
- Minimal battery impact

### **Geofencing & Location Tracking**
Background location services provide:
- High-accuracy GPS tracking
- Automatic geofence monitoring
- Safe zone proximity alerts
- Location history logging

### **Emergency Monitoring**
Continuous emergency condition checking:
- Battery level monitoring
- Network connectivity verification
- Location accuracy validation
- Emergency alert status tracking

## 🔐 Security Features

### **User Authentication**
- Firebase Authentication with email/password
- Secure token management
- Session persistence
- Password recovery system

### **Data Privacy**
- Encrypted data transmission
- Secure Firebase rules
- User consent management
- Privacy settings control

### **Emergency Response**
- Verified guardian system
- Emergency contact validation
- Secure location sharing
- Audit trail logging

## 📊 Performance Optimization

### **Battery Life**
- Optimized location update intervals
- Background task batching
- Efficient geofence calculations
- Smart wake-up scheduling

### **Network Usage**
- Compressed data transmission
- Offline capability for critical features
- Efficient Firebase queries
- Background sync optimization

### **Memory Management**
- Efficient component rendering
- Background service cleanup
- Memory leak prevention
- Resource pooling

## 🧪 Testing

### **Unit Tests**
```bash
npm test
```

### **Integration Tests**
```bash
npm run test:integration
```

### **E2E Tests**
```bash
npm run test:e2e
```

## 📱 Platform Support

### **Android**
- Minimum SDK: 21 (Android 5.0)
- Target SDK: 34 (Android 14)
- Background service support
- Custom notification channels

### **iOS**
- Minimum iOS: 12.0
- Background app refresh support
- Location services integration
- Push notification handling

## 🚨 Emergency Response Flow

1. **Emergency Detection**
   - Manual SOS button press
   - Voice hotword detection
   - Shake gesture recognition
   - Geofence boundary crossing

2. **Immediate Actions**
   - Audio recording starts automatically
   - GPS location captured
   - Emergency number dialed (112)
   - Device vibration alert

3. **Guardian Notification**
   - Push notification sent
   - SMS alert delivered
   - Email notification sent
   - Emergency dashboard updated

4. **Response Tracking**
   - Guardian acknowledgment
   - Response time monitoring
   - Action tracking
   - Emergency resolution

## 🔧 Troubleshooting

### **Common Issues**
- **Location not working**: Check location permissions and GPS settings
- **Voice detection issues**: Verify microphone permissions
- **Background services**: Check battery optimization settings
- **Push notifications**: Verify Firebase configuration

### **Debug Mode**
Enable debug logging:
```bash
npx react-native log-android
npx react-native log-ios
```

## 📈 Future Enhancements

### **Planned Features**
- **AI-Powered Threat Detection**: Machine learning for pattern recognition
- **Community Safety Network**: User-reported safety incidents
- **Emergency Response Integration**: Direct connection to emergency services
- **Advanced Analytics**: Safety pattern analysis and insights

### **Integration Possibilities**
- **Smart Home Devices**: IoT integration for home safety
- **Wearable Devices**: Smartwatch and fitness tracker support
- **Vehicle Integration**: Car safety system connectivity
- **Social Media**: Emergency alert sharing capabilities

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For emergency support or technical assistance:
- **Emergency**: Call 112 (European emergency number)
- **Technical Support**: Create an issue in the repository
- **Security Issues**: Contact the development team directly

---

**SafeHer** - Empowering women with technology for personal safety and peace of mind.

*Built with ❤️ for women's safety and security.*
