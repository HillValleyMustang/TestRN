// require('@testing-library/jest-native/extend-expect');
// require('jest-expo');

// Mock React Native modules
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn(),
}));

jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn(() => ({ width: 375, height: 812 })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

jest.mock('react-native/Libraries/Utilities/PixelRatio', () => ({
  get: jest.fn(() => 2),
  getPixelSizeForLayoutSize: jest.fn((size) => size),
  roundToNearestPixel: jest.fn((value) => Math.round(value)),
  getFontScale: jest.fn(() => 1),
}));

// Mock StyleSheet
const mockStyleSheet = {
  create: jest.fn((styles) => styles),
  flatten: jest.fn((style) => style),
  compose: jest.fn(),
  setStyleAttributePreprocessor: jest.fn(),
  hairlineWidth: 1,
};

jest.mock('react-native/Libraries/StyleSheet/StyleSheet', () => mockStyleSheet);

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    manifest: {},
    platform: {
      ios: {},
      android: {},
    },
  },
}));

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(),
  isLoaded: jest.fn(() => true),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock react-native-youtube-iframe
jest.mock('react-native-youtube-iframe', () => 'YoutubePlayer');

// Mock react-native-popup-menu
jest.mock('react-native-popup-menu', () => ({
  Menu: 'Menu',
  MenuOptions: 'MenuOptions',
  MenuOption: 'MenuOption',
  MenuTrigger: 'MenuTrigger',
}));

// Mock react-native-toast-message
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  hide: jest.fn(),
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ error: null })),
      update: jest.fn(() => Promise.resolve({ error: null })),
      delete: jest.fn(() => Promise.resolve({ error: null })),
    })),
  })),
}));

// Mock auth context
jest.mock('./app/_contexts/auth-context', () => ({
  useAuth: () => ({
    userId: 'test-user-id',
    supabase: {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null })),
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        insert: jest.fn(() => Promise.resolve({ error: null })),
        update: jest.fn(() => Promise.resolve({ error: null })),
        delete: jest.fn(() => Promise.resolve({ error: null })),
      })),
    },
  }),
}));

// Global test utilities
global.fetch = jest.fn();