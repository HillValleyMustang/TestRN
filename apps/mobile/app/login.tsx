import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from './_contexts/auth-context';
import { useRouter } from 'expo-router';
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  ButtonStyles,
} from '../constants/design-system';
// Define types inline since supabase types aren't available
interface Profile {
  id: string;
}

interface TPath {
  id: string;
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { supabase, session, loading: authLoading } = useAuth();
  const router = useRouter();

  // The login component no longer handles navigation - that's done by index.tsx
  // This prevents navigation conflicts

  const handleAuth = async () => {
    console.log('[Login] handleAuth called - isSignUp:', isSignUp, 'email:', email);
    if (!email || !password) {
      console.log('[Login] Missing email or password');
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        console.log('[Login] Attempting sign up...');
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          // Don't log raw error here - let custom error handling in catch block handle it
          throw error;
        }
        console.log('[Login] Sign up successful - showing confirmation alert');
        Alert.alert(
          'Account Created!',
          'Please check your email and click the verification link to complete your account setup.',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('[Login] User acknowledged sign-up confirmation');
                // Clear the form and switch to sign-in mode
                setEmail('');
                setPassword('');
                setIsSignUp(false);
              }
            }
          ]
        );
      } else {
        console.log('[Login] Attempting sign in...');
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Don't log raw error here - let custom error handling in catch block handle it
          throw error;
        }
        console.log('[Login] Sign in successful, navigation will be handled by useEffect');
        // Navigation is now handled by the useEffect above
      }
    } catch (error: any) {
      console.log('[Login] ======== HANDLING AUTH ERROR ========');
      
      // More comprehensive error checking
      const errorMessage = error.message || error.toString() || '';
      const errorCode = error.code || '';
      
      console.log('[Login] Error type detected:', errorCode || 'unknown');
      
      // Handle specific authentication errors with user-friendly messages
      if (errorMessage.includes('Email not confirmed') ||
          errorMessage.includes('email_not_confirmed') ||
          errorCode === 'email_not_confirmed') {
        console.log('[Login] Email verification required - showing user-friendly alert');
        Alert.alert(
          'Email Verification Required',
          'Please check your email and click the verification link before signing in. If you didn\'t receive the email, check your spam folder or try signing up again.',
          [
            { text: 'OK', style: 'default' },
            { text: 'Sign Up Again', onPress: () => {
              console.log('[Login] User chose to sign up again');
              setIsSignUp(true);
            }}
          ]
        );
      } else if (errorMessage.includes('Invalid login credentials') || errorCode === 'invalid_credentials') {
        console.log('[Login] Invalid credentials - showing user-friendly alert');
        Alert.alert('Invalid Credentials', 'Please check your email and password and try again.');
      } else if (errorMessage.includes('User already registered') || errorCode === 'user_already_registered') {
        console.log('[Login] User already exists - showing user-friendly alert');
        Alert.alert('Account Exists', 'An account with this email already exists. Please sign in instead.');
        setIsSignUp(false);
      } else {
        console.log('[Login] Generic error - showing user-friendly alert');
        Alert.alert('Error', errorMessage || 'Authentication failed');
      }
      
      console.log('[Login] ======== ERROR HANDLING COMPLETE ========');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>My Fitness Trainer</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.gray500}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.gray500}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.switchText}>
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing['2xl'],
  },
  title: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.bold,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.lg,
    color: Colors.gray400,
    marginBottom: Spacing['3xl'],
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    color: Colors.foreground,
    fontSize: Typography.base,
  },
  button: {
    ...ButtonStyles.primary,
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.foreground,
    fontSize: Typography.base,
    fontWeight: Typography.bold,
  },
  switchText: {
    color: Colors.actionPrimary,
    textAlign: 'center',
    marginTop: Spacing.lg,
    fontSize: Typography.sm,
  },
});
