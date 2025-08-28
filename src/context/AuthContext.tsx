import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, firestore } from '../config/firebase';

interface User {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  guardianEmails: string[];
  emergencyContacts: EmergencyContact[];
  isGuardian: boolean;
  createdAt: Date;
}

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email: string;
  relationship: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  addGuardian: (email: string) => Promise<void>;
  removeGuardian: (email: string) => Promise<void>;
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<void>;
  removeEmergencyContact: (contactId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await firestore()
            .collection('users')
            .doc(firebaseUser.uid)
            .get();

          if (userDoc.exists) {
            const userData = userDoc.data() as User;
            setUser({
              ...userData,
              createdAt: (userData as any).createdAt?.toDate?.() || new Date(),
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await auth().signInWithEmailAndPassword(email, password);
  };

  const signUp = async (email: string, password: string, userData: Partial<User>) => {
    const { user: firebaseUser } = await auth().createUserWithEmailAndPassword(email, password);

    const newUser: User = {
      uid: firebaseUser.uid,
      email: email,
      displayName: userData.displayName || '',
      phoneNumber: userData.phoneNumber || '',
      guardianEmails: userData.guardianEmails || [],
      emergencyContacts: userData.emergencyContacts || [],
      isGuardian: userData.isGuardian || false,
      createdAt: new Date(),
    };

    await firestore().collection('users').doc(firebaseUser.uid).set(newUser);
    setUser(newUser);
  };

  const signOut = async () => {
    await auth().signOut();
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) throw new Error('No user logged in');

    const updatedUser = { ...user, ...data };
    await firestore().collection('users').doc(user.uid).update(data);
    setUser(updatedUser);
  };

  const addGuardian = async (email: string) => {
    if (!user) throw new Error('No user logged in');
    const updatedGuardianEmails = [...user.guardianEmails, email];
    await updateProfile({ guardianEmails: updatedGuardianEmails });
  };

  const removeGuardian = async (email: string) => {
    if (!user) throw new Error('No user logged in');
    const updatedGuardianEmails = user.guardianEmails.filter(e => e !== email);
    await updateProfile({ guardianEmails: updatedGuardianEmails });
  };

  const addEmergencyContact = async (contact: Omit<EmergencyContact, 'id'>) => {
    if (!user) throw new Error('No user logged in');
    const newContact: EmergencyContact = { ...contact, id: Date.now().toString() };
    const updatedContacts = [...user.emergencyContacts, newContact];
    await updateProfile({ emergencyContacts: updatedContacts });
  };

  const removeEmergencyContact = async (contactId: string) => {
    if (!user) throw new Error('No user logged in');
    const updatedContacts = user.emergencyContacts.filter(c => c.id !== contactId);
    await updateProfile({ emergencyContacts: updatedContacts });
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    addGuardian,
    removeGuardian,
    addEmergencyContact,
    removeEmergencyContact,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
