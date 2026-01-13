import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Theme';
import { useWorkoutFlow } from '../_contexts/workout-flow-context';
import { AppHeader } from '../../components/AppHeader';

// Wrapper component to ensure context is available
function HeaderWrapper() {
  return <AppHeader />;
}

const tabBarOptions = {
  tabBarActiveTintColor: Colors.foreground, // Black icons when active
  tabBarInactiveTintColor: Colors.mutedForeground, // Gray icons when inactive
  tabBarShowLabel: false, // Hide text labels for cleaner look
  tabBarStyle: {
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 83, // 15% increase from 72px for better spacing
    paddingBottom: 16, // More padding for breathing room
    paddingTop: 12,
  },
  headerShown: true,
  header: () => <HeaderWrapper />,
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
        name="index"
        options={{
          href: null, // Hide the index route from tab bar
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={20} color={color} />
          ),
        }}
        listeners={withGuard('dashboard')}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color }) => (
            <Ionicons name="barbell" size={20} color={color} />
          ),
        }}
        listeners={withGuard('workout')}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercises',
          tabBarIcon: ({ color }) => (
            <Ionicons name="book" size={20} color={color} />
          ),
        }}
        listeners={withGuard('exercises')}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => (
            <Ionicons name="bar-chart" size={20} color={color} />
          ),
        }}
        listeners={withGuard('progress')}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={20} color={color} />
          ),
        }}
        listeners={withGuard('profile')}
      />
    </Tabs>
  );
}
