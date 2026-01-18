import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { View } from 'react-native';
import { database } from '../_lib/database';
import { useAuth } from './auth-context';
import { Skeleton } from '../_components/ui/Skeleton';

type UnitSystem = 'metric' | 'imperial';
type Theme = 'dark' | 'light';

interface PreferencesContextType {
  unitSystem: UnitSystem;
  theme: Theme;
  setUnitSystem: (system: UnitSystem) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  loading: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(
  undefined
);

const PreferencesProviderInner = ({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string | null;
}) => {
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>('metric');
  const [theme, setThemeState] = useState<Theme>('dark');
  const [loading, setLoading] = useState(true);
  const [isDbReady, setIsDbReady] = useState(false);

  // Database initialization is now handled by DataProvider
  // Wait for database to be ready before accessing it
  useEffect(() => {
    const checkDbReady = async () => {
      try {
        // First, ensure database is initialized
        if (!database.isInitialized()) {
          // If not initialized, wait for it
          await database.init();
        }
        setIsDbReady(true);
      } catch (err) {
        // If initialization fails, retry after a delay
        console.error('[Preferences] Database initialization check failed:', err);
        setTimeout(checkDbReady, 200);
      }
    };

    if (userId) {
      checkDbReady();
    } else {
      setIsDbReady(true); // No user, no need for DB
    }
  }, [userId]);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!isDbReady) {
        return;
      }

      if (!userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const prefs = await database.getUserPreferences(userId);
        if (prefs) {
          setUnitSystemState(prefs.unit_system as UnitSystem);
          setThemeState(prefs.theme as Theme);
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [userId, isDbReady]);

  const setUnitSystem = useCallback(
    async (system: UnitSystem) => {
      if (!userId) {
        return;
      }

      setUnitSystemState(system);
      try {
        await database.saveUserPreferences(userId, { unit_system: system });
      } catch (error) {
        console.error('Failed to save unit system:', error);
      }
    },
    [userId]
  );

  const setTheme = useCallback(
    async (newTheme: Theme) => {
      if (!userId) {
        return;
      }

      setThemeState(newTheme);
      try {
        await database.saveUserPreferences(userId, { theme: newTheme });
      } catch (error) {
        console.error('Failed to save theme:', error);
      }
    },
    [userId]
  );

  const value = useMemo(
    () => ({
      unitSystem,
      theme,
      setUnitSystem,
      setTheme,
      loading,
    }),
    [loading, setTheme, setUnitSystem, theme, unitSystem]
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Skeleton height={40} width={200} />
        <Skeleton height={20} width={150} style={{ marginTop: 10 }} />
      </View>
    );
  }

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const PreferencesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { userId } = useAuth();
  return (
    <PreferencesProviderInner key={userId || 'no-user'} userId={userId}>
      {children}
    </PreferencesProviderInner>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
};

export default PreferencesProvider;
