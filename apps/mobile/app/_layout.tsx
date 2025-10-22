import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, Text } from "react-native";
import * as Linking from "expo-linking";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import {
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { FONT_FAMILY } from "../constants/Typography";
import { AuthProvider } from "./_contexts/auth-context";
import { DataProvider } from "./_contexts/data-context";
import { PreferencesProvider } from "./_contexts/preferences-context";
import { SyncManagerInitializer } from "./_components/SyncManagerInitializer";
import { WorkoutFlowProvider } from "./_contexts/workout-flow-context";
import { UnsavedChangesModal } from "./_components/workout/UnsavedChangesModal";
import Toast from 'react-native-toast-message';

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
      console.log("Deep link received:", event.url);
      try {
        // Parse the URL to see what it contains
        const parsedUrl = Linking.parse(event.url);
        console.log("Parsed deep link:", parsedUrl);
      } catch (error) {
        console.error("Error parsing deep link:", error);
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Check if app was opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("App opened from deep link:", url);
        try {
          const parsedUrl = Linking.parse(url);
          console.log("Parsed initial deep link:", parsedUrl);
        } catch (error) {
          console.error("Error parsing initial deep link:", error);
        }
      }
    }).catch((error) => {
      console.error("Error getting initial URL:", error);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return null; // Return null to show splash screen while fonts load
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <PreferencesProvider>
            <DataProvider>
              <WorkoutFlowProvider>
                <StatusBar style="light" />
                <SyncManagerInitializer />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="login"
                    options={{ headerShown: false, presentation: "modal" }}
                  />
                  <Stack.Screen
                    name="history"
                    options={{ headerShown: true, title: "Workout History" }}
                  />
                  <Stack.Screen
                    name="workout-detail"
                    options={{ headerShown: true, title: "Workout Details" }}
                  />
                  <Stack.Screen
                    name="exercise-picker"
                    options={{ headerShown: true, title: "Select Exercise" }}
                  />
                  <Stack.Screen
                    name="templates"
                    options={{ headerShown: true, title: "Templates" }}
                  />
                  <Stack.Screen
                    name="measurements"
                    options={{ headerShown: true, title: "Body Measurements" }}
                  />
                  <Stack.Screen
                    name="measurements-history"
                    options={{ headerShown: true, title: "Measurements History" }}
                  />
                  <Stack.Screen
                    name="gyms"
                    options={{ headerShown: true, title: "My Gyms" }}
                  />
                  <Stack.Screen
                    name="goals-list"
                    options={{ headerShown: true, title: "Goals" }}
                  />
                  <Stack.Screen
                    name="create-goal"
                    options={{ headerShown: true, title: "Create Goal" }}
                  />
                  <Stack.Screen
                    name="gym-photo-analyzer"
                    options={{ headerShown: true, title: "Analyze Gym" }}
                  />
                  <Stack.Screen
                    name="ai-program-generator"
                    options={{ headerShown: true, title: "AI Program Generator" }}
                  />
                </Stack>
                <UnsavedChangesModal />
                <Toast
                  config={{
                    success: (props) => (
                      <View style={{
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
                      }}>
                        <Text style={{
                          color: '#FFFFFF',
                          fontFamily: 'Poppins_500Medium',
                          fontSize: 14,
                          fontWeight: '500',
                        }}>
                          {props.text1}
                        </Text>
                        {props.text2 && (
                          <Text style={{
                            color: '#FFFFFF',
                            fontFamily: 'Poppins_400Regular',
                            fontSize: 12,
                            marginTop: 2,
                          }}>
                            {props.text2}
                          </Text>
                        )}
                      </View>
                    ),
                    info: (props) => (
                      <View style={{
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
                      }}>
                        <Text style={{
                          color: '#FFFFFF',
                          fontFamily: 'Poppins_500Medium',
                          fontSize: 14,
                          fontWeight: '500',
                        }}>
                          {props.text1}
                        </Text>
                        {props.text2 && (
                          <Text style={{
                            color: '#FFFFFF',
                            fontFamily: 'Poppins_400Regular',
                            fontSize: 12,
                            marginTop: 2,
                          }}>
                            {props.text2}
                          </Text>
                        )}
                      </View>
                    ),
                  }}
                />
              </WorkoutFlowProvider>
            </DataProvider>
          </PreferencesProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
