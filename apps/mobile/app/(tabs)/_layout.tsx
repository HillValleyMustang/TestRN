import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Theme";
import { useWorkoutFlow } from "../_contexts/workout-flow-context";

const tabBarOptions = {
  tabBarActiveTintColor: Colors.actionPrimary,
  tabBarInactiveTintColor: Colors.mutedForeground,
  tabBarStyle: {
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '500' as const,
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
          title: "Dashboard",
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
        name="exercises"
        options={{
          title: "Exercises",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
        listeners={withGuard("exercises")}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
        listeners={withGuard("progress")}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
        listeners={withGuard("profile")}
      />
    </Tabs>
  );
}
