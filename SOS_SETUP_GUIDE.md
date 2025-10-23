# SOS Direct Call & SMS Setup Guide

## 📦 Package Installation

To enable direct phone calls and SMS functionality, you need to install these packages:

```bash
npm install react-native-immediate-phone-call react-native-communications
```

### Android Setup

After installation, you may need to add permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CALL_PHONE" />
<uses-permission android:name="android.permission.SEND_SMS" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
```

## 🔧 Configuration

### 1. Update Phone Numbers

Edit `src/config/sosConfig.ts`:

```typescript
SECONDARY_CONTACTS: [
  {
    name: 'Family Member 1',
    phone: '+91-9876543210', // Replace with actual family number
    isPrimary: false,
    isEmergency: false,
  },
  // Add more family/friends
],
```

### 2. Enable Debug Mode

For testing, set `DEBUG_MODE: true` in `sosConfig.ts`:

```typescript
export const DEFAULT_SOS_CONFIG: SOSConfig = {
  DEBUG_MODE: true, // Set to true for testing
  // ... rest of config
};
```

### 3. Customize Emergency Message

Modify the SMS template in `sosConfig.ts`:

```typescript
SMS_CONFIG: {
  message: {
    template: '🚨 EMERGENCY ALERT 🚨\n\nI need immediate help! This is an emergency SOS from SafeHer app.\n\nLocation: {LOCATION}\nTime: {TIMESTAMP}\n\nPlease call me back or send help immediately.\n\nThis message was sent automatically by SafeHer Safety App.',
    includeLocation: true,
    includeTimestamp: true,
  },
  // ... rest of config
},
```

## 🚀 Features

### ✅ Direct Phone Calls
- **Immediate calls** to emergency numbers (100, 101, 102, 1091)
- **Automatic fallback** to system dialer if direct calls fail
- **Sequential calling** to multiple contacts
- **Debug mode** with test numbers

### ✅ Direct SMS
- **Automatic SMS** with location and timestamp
- **Customizable message** templates
- **Multiple recipients** support
- **Fallback to SMS app** if direct sending fails

### ✅ Smart Configuration
- **Easy phone number management** in config file
- **Debug mode** for testing without calling real emergency numbers
- **Flexible contact groups** (Primary, Secondary, Debug)
- **Customizable message templates**

## 🔍 How It Works

### SOS Trigger Sequence:
1. **Location Detection** - Gets current GPS location
2. **Alert Creation** - Saves emergency alert to Firestore
3. **Audio Recording** - Starts recording if enabled
4. **Phone Calls** - Makes immediate calls to emergency contacts
5. **SMS Sending** - Sends location-based SMS to contacts
6. **Navigation** - Redirects to emergency screen
7. **Vibration** - Alerts user with device vibration

### Debug Mode:
- Uses test phone numbers instead of real emergency numbers
- Perfect for development and testing
- No accidental calls to emergency services

## 📱 Usage

### For Users:
1. **Press SOS Button** - Triggers immediate emergency response
2. **Automatic Actions** - Calls and SMS sent automatically
3. **Emergency Screen** - Shows status and options
4. **Manual Override** - Can still manually call if needed

### For Developers:
1. **Set DEBUG_MODE: true** for testing
2. **Update phone numbers** in `sosConfig.ts`
3. **Customize messages** as needed
4. **Test with debug numbers** first

## 🛡️ Safety Features

- **Graceful Fallbacks** - Always falls back to system apps if direct methods fail
- **Error Handling** - Comprehensive error handling and logging
- **Permission Management** - Proper permission requests
- **Debug Mode** - Safe testing without real emergency calls

## 🔧 Troubleshooting

### Packages Not Working?
1. Check if packages are installed: `npm list react-native-immediate-phone-call react-native-communications`
2. Rebuild the app: `npx react-native run-android`
3. Check Android permissions in manifest

### SMS Not Sending?
1. Verify SMS permissions in Android settings
2. Check if SMS service is available on device
3. Test with debug numbers first

### Calls Not Working?
1. Verify CALL_PHONE permission
2. Test with debug numbers first
3. Check if device supports direct calling

## 📞 Emergency Numbers Included

- **Police**: 100
- **Medical**: 102  
- **Fire**: 101
- **Women Helpline**: 1091
- **Traffic Police**: 103
- **Railway Police**: 182

## 🎯 Next Steps

1. **Install packages** (when ready)
2. **Update phone numbers** in config
3. **Test with debug mode** first
4. **Enable in production** when ready

---

**Note**: This implementation provides both direct calling/SMS and graceful fallbacks to system apps, ensuring reliability in emergency situations.
