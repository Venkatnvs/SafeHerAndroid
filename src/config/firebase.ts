import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import messaging from '@react-native-firebase/messaging';

// React Native Firebase auto-initializes using google-services.json (Android)
// No manual initializeApp is required in React Native.

export { auth, firestore, storage, messaging };
