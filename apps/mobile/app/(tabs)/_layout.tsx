import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/design-system";
import { useWorkoutFlow } from "../_contexts/workout-flow-context";

const tabBarOptions = {
  tabBarActiveTintColor: Colors.actionPrimary,
  tabBarInactiveTintColor: Colors.gray500,
  tabBarStyle: {
    backgroundColor: Colors.cardBackground,
    borderTopColor: Colors.cardBorder,
  },
  headerShown: false,
};

export default function TabsLayout() {
  const { hasUnsavedChanges, requestNavigation } = useWorkoutFlow();

  const withGuard = (routeName: string) => ({
    tabPress: (event: any) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        requestNavigation(() => {
          if (event?.navigation?.navigate) {
            event.navigation.navigate(routeName);
          }
        });
      }
    },
  });

  return (
    <Tabs screenOptions={tabBarOptions}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
        listeners={withGuard("dashboard")}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: "Workout",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell" size={size} color={color} />
          ),
        }}
        listeners={withGuard("workout")}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
        listeners={withGuard("progress")}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
        listeners={withGuard("settings")}
      />
    </Tabs>
  );
}
