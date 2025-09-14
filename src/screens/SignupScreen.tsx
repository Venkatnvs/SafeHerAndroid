import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const SignupScreen = () => {
  const navigation = useNavigation();
  const { signUp, loading } = useAuth();
  
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    guardianEmail: '',
  });
  
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\+?[\d\s-()]{10,}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.guardianEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guardianEmail)) {
      newErrors.guardianEmail = 'Please enter a valid guardian email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      const userData = {
        displayName: formData.displayName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        guardianEmails: formData.guardianEmail.trim() ? [formData.guardianEmail.trim()] : [],
        emergencyContacts: [],
        isGuardian: false,
      };

      await signUp(formData.email.trim(), formData.password, userData);
      // Navigation will be handled automatically by AuthNavigator based on auth state
    } catch (error: any) {
      let errorMessage = 'Signup failed. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak.';
      }
      
      Alert.alert('Signup Error', errorMessage);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const renderInput = (
    field: string,
    placeholder: string,
    icon: string,
    keyboardType: any = 'default',
    secureTextEntry?: boolean,
    showToggle?: boolean,
    toggleState?: boolean,
    onToggleChange?: () => void
  ) => (
    <View style={styles.inputContainer}>
      <Icon name={icon} size={20} color="#E91E63" style={styles.inputIcon} />
      <TextInput
        style={[styles.input, errors[field] ? styles.inputError : null]}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={formData[field as keyof typeof formData]}
        onChangeText={(text) => updateFormData(field, text)}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={field === 'displayName' ? 'words' : 'none'}
        autoCorrect={false}
      />
      {showToggle && (
        <TouchableOpacity style={styles.passwordToggle} onPress={onToggleChange}>
          <Icon 
            name={toggleState ? "eye-off" : "eye"} 
            size={20} 
            color="#999" 
          />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#E91E63" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <LinearGradient
          colors={['#E91E63', '#C2185B']}
          style={styles.header}
        >
          <View style={styles.logoContainer}>
            <Icon name="shield-check" size={80} color="white" />
            <Text style={styles.appName}>SafeHer</Text>
            <Text style={styles.appTagline}>Join Your Safety Network</Text>
          </View>
        </LinearGradient>

        {/* Form */}
        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Create Account</Text>
          <Text style={styles.subtitleText}>Join SafeHer and stay protected</Text>

          {/* Full Name Input */}
          {renderInput('displayName', 'Full Name', 'account')}
          {errors.displayName ? <Text style={styles.errorText}>{errors.displayName}</Text> : null}

          {/* Email Input */}
          {renderInput('email', 'Email Address', 'email', 'email-address')}
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

          {/* Phone Number Input */}
          {renderInput('phoneNumber', 'Phone Number', 'phone', 'phone-pad')}
          {errors.phoneNumber ? <Text style={styles.errorText}>{errors.phoneNumber}</Text> : null}

          {/* Password Input */}
          {renderInput(
            'password', 
            'Password', 
            'lock', 
            'default', 
            !showPassword,
            true,
            showPassword,
            () => setShowPassword(!showPassword)
          )}
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

          {/* Confirm Password Input */}
          {renderInput(
            'confirmPassword', 
            'Confirm Password', 
            'lock-check', 
            'default', 
            !showConfirmPassword,
            true,
            showConfirmPassword,
            () => setShowConfirmPassword(!showConfirmPassword)
          )}
          {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

          {/* Guardian Email Input */}
          {renderInput('guardianEmail', 'Guardian Email (Optional)', 'shield-account', 'email-address')}
          {errors.guardianEmail ? <Text style={styles.errorText}>{errors.guardianEmail}</Text> : null}

          {/* Terms and Conditions */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By creating an account, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.signupButton, loading && styles.signupButtonDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#E91E63', '#C2185B']}
              style={styles.signupButtonGradient}
            >
              {loading ? (
                <Text style={styles.signupButtonText}>Creating Account...</Text>
              ) : (
                <Text style={styles.signupButtonText}>Create Account</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  passwordToggle: {
    padding: 8,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginBottom: 16,
    marginLeft: 4,
  },
  termsContainer: {
    marginBottom: 24,
  },
  termsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: '#E91E63',
    fontWeight: '600',
  },
  signupButton: {
    height: 56,
    borderRadius: 28,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonGradient: {
    flex: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
  },
  socialButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  loginText: {
    fontSize: 16,
    color: '#666',
  },
  loginLink: {
    fontSize: 16,
    color: '#E91E63',
    fontWeight: '600',
  },
});

export default SignupScreen;
