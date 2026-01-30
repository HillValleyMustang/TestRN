import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text } from 'react-native';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import {
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { FONT_FAMILY } from '../constants/Typography';
import { AuthProvider } from './_contexts/auth-context';
import { DataProvider } from './_contexts/data-context';
import { GymProvider } from './_contexts/gym-context';
import { PreferencesProvider } from './_contexts/preferences-context';

import { WorkoutFlowProvider } from './_contexts/workout-flow-context';
import { QueryProvider } from './_components/QueryProvider';
import { UnsavedChangesModal } from './_components/workout/UnsavedChangesModal';
import Toast from 'react-native-toast-message';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { MenuProvider } from 'react-native-popup-menu';
import { AppHeader } from '../components/AppHeader';

export default function RootLayout() {
  // Load Poppins fonts - matches FONT_FAMILY constant in Typography.ts
  const [fontsLoaded] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      try {
        // Parse the URL to see what it contains
        const parsedUrl = Linking.parse(event.url);
      } catch (error) {
        console.error('Error parsing deep link:', error);
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened from a deep link
    Linking.getInitialURL()
      .then(url => {
        if (url) {
          try {
            const parsedUrl = Linking.parse(url);
          } catch (error) {
            console.error('Error parsing initial deep link:', error);
          }
        }
      })
      .catch(error => {
        console.error('Error getting initial URL:', error);
      });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return null; // Return null to show splash screen while fonts load
  }

  return (
    <ErrorBoundary>
      <QueryProvider>
        <MenuProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
              <DataProvider>
                <AuthProvider>
                  <PreferencesProvider>
                    <GymProvider>
                    <WorkoutFlowProvider>
                  <StatusBar style="light" />
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen
                      name="index"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="(tabs)"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="login"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="workout-history"
                      options={{
                        headerShown: true,
                        header: () => <AppHeader />,
                      }}
                    />
                    <Stack.Screen
                      name="exercise-picker"
                      options={{ headerShown: true, title: 'Select Exercise' }}
                    />
                    <Stack.Screen
                      name="templates"
                      options={{ headerShown: true, title: 'Templates' }}
                    />
                    <Stack.Screen
                      name="measurements"
                      options={{ headerShown: true, title: 'Body Measurements' }}
                    />
                    <Stack.Screen
                      name="measurements-history"
                      options={{
                        headerShown: true,
                        title: 'Measurements History',
                      }}
                    />
                    <Stack.Screen
                      name="gyms"
                      options={{ headerShown: true, title: 'My Gyms' }}
                    />
                    <Stack.Screen
                      name="goals-list"
                      options={{ headerShown: true, title: 'Goals' }}
                    />
                    <Stack.Screen
                      name="create-goal"
                      options={{ headerShown: true, title: 'Create Goal' }}
                    />
                    <Stack.Screen
                      name="gym-photo-analyzer"
                      options={{ headerShown: true, title: 'Analyze Gym' }}
                    />
                    <Stack.Screen
                      name="ai-program-generator"
                      options={{
                        headerShown: true,
                        title: 'AI Program Generator',
                      }}
                    />
                    <Stack.Screen
                      name="onboarding"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="manage-t-paths"
                      options={{ headerShown: true, title: 'Manage Your T-Path' }}
                    />
                  </Stack>
                  <UnsavedChangesModal />
                    <Toast
                      config={{
                        success: props => (
                          <View
                            style={{
                              backgroundColor: '#10B981',
                              borderRadius: 12,
                              paddingHorizontal: 16,
                              paddingVertical: 12,
                              marginHorizontal: 16,
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.25,
                              shadowRadius: 4,
                              elevation: 5,
                            }}
                          >
                            <Text
                              style={{
                                color: '#FFFFFF',
                                fontFamily: 'Poppins_500Medium',
                                fontSize: 14,
                                fontWeight: '500',
                              }}
                            >
                              {props.text1}
                            </Text>
                            {props.text2 && (
                              <Text
                                style={{
                                  color: '#FFFFFF',
                                  fontFamily: 'Poppins_400Regular',
                                  fontSize: 12,
                                  marginTop: 2,
                                }}
                              >
                                {props.text2}
                              </Text>
                            )}
                          </View>
                        ),
                        info: props => (
                          <View
                            style={{
                              backgroundColor: '#3B82F6',
                              borderRadius: 12,
                              paddingHorizontal: 16,
                              paddingVertical: 12,
                              marginHorizontal: 16,
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.25,
                              shadowRadius: 4,
                              elevation: 5,
                            }}
                          >
                            <Text
                              style={{
                                color: '#FFFFFF',
                                fontFamily: 'Poppins_500Medium',
                                fontSize: 14,
                                fontWeight: '500',
                              }}
                            >
                              {props.text1}
                            </Text>
                            {props.text2 && (
                              <Text
                                style={{
                                  color: '#FFFFFF',
                                  fontFamily: 'Poppins_400Regular',
                                  fontSize: 12,
                                  marginTop: 2,
                                }}
                              >
                                {props.text2}
                              </Text>
                            )}
                          </View>
                        ),
                      }}
                    />
                    </WorkoutFlowProvider>
                    </GymProvider>
                  </PreferencesProvider>
                </AuthProvider>
              </DataProvider>
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </MenuProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
