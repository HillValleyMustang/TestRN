import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/Theme';
import { FontSize } from '../../constants/Typography';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../app/_lib/supabase';
import { useData } from '../../app/_contexts/data-context';
import { TempStatusMessage } from '../../hooks/useRollingStatus';

type ActivityType = "Cycling" | "Swimming" | "Tennis" | "Squash" | "Padel" | "Badminton" | "Basketball" | "Football" | "Yoga" | "Pilates" | "Running";
type ActivityCategory = "racket" | "individual";

interface ActivityLoggingModalProps {
  visible: boolean;
  onClose: () => void;
  onLogActivity?: (activity: any) => void;
  setTempStatusMessage?: (message: TempStatusMessage | null) => void;
}

const getActivityColor = (activity: string) => {
  const colors = {
    Running: '#E57373',
    Cycling: '#4DB6AC',
    Swimming: '#42A5F5',
    'Racket Sports': '#FFAB91',
    Basketball: '#FF9800',
    Football: '#66BB6A',
    Yoga: '#AB47BC',
    Pilates: '#F06292',
    Tennis: '#FFD54F',
    Squash: '#EF5350',
    Padel: '#81C784',
    Badminton: '#BA68C8',
  };
  return colors[activity as keyof typeof colors] || Colors.primary;
};

// Performance-based gradient backgrounds
const getPerformanceGradient = (paceRatio: number | null): string => {
  if (!paceRatio) return 'linear-gradient(135deg, rgba(255,107,107,0.1) 0%, rgba(238,90,36,0.15) 100%)';

  if (paceRatio <= 1.0) return 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,165,0,0.2) 100%)'; // Gold for PB
  if (paceRatio <= 1.05) return 'linear-gradient(135deg, rgba(0,255,135,0.15) 0%, rgba(96,239,255,0.2) 100%)'; // Green-cyan excellent
  if (paceRatio <= 1.10) return 'linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.2) 100%)'; // Blue-purple good
  return 'linear-gradient(135deg, rgba(255,107,107,0.15) 0%, rgba(238,90,36,0.2) 100%)'; // Red-orange slower
};

// Activity icons mapping
const getActivityIcon = (activityType: string): string => {
  const icons: { [key: string]: string } = {
    Running: 'walk',
    Cycling: 'bicycle',
    Swimming: 'water',
    Tennis: 'tennisball',
    Squash: 'tennisball',
    Padel: 'tennisball',
    Badminton: 'tennisball',
    Basketball: 'basketball',
    Football: 'football',
    Yoga: 'body',
    Pilates: 'body'
  };
  return icons[activityType] || 'fitness';
};

// Helper function to convert time string to seconds
const timeStringToSeconds = (timeStr: string): number => {
  let totalSeconds = 0;
  const hoursMatch = timeStr.match(/(\d+)h/);
  const minutesMatch = timeStr.match(/(\d+)m/);
  const secondsMatch = timeStr.match(/(\d+)s/);

  if (hoursMatch) {
    totalSeconds += parseInt(hoursMatch[1]) * 3600;
  }
  if (minutesMatch) {
    totalSeconds += parseInt(minutesMatch[1]) * 60;
  }
  if (secondsMatch) {
    totalSeconds += parseInt(secondsMatch[1]);
  }
  return totalSeconds;
};

// Helper to format minutes and seconds for storage
const formatMinutesAndSecondsForStorage = (minutes: number, seconds: number): string => {
  const totalMinutes = minutes + Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (totalMinutes === 0 && remainingSeconds === 0) return "";
  if (totalMinutes === 0) return `${remainingSeconds}s`;
  if (remainingSeconds === 0) return `${totalMinutes}m`;
  return `${totalMinutes}m ${remainingSeconds}s`;
};

// Unit conversion helper
const convertDistance = (distance: number, fromUnit: 'km' | 'miles', toUnit: 'km' | 'miles'): number | null => {
  if (fromUnit === toUnit) return distance;
  if (fromUnit === 'miles' && toUnit === 'km') return distance * 1.60934;
  if (fromUnit === 'km' && toUnit === 'miles') return distance / 1.60934;
  return null;
};

// Helper function to format pace as MM:SS
const formatPace = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Helper function to format activity date for display
const formatActivityDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Helper function to format date for input field (dd-mm-yyyy)
const formatDateForInput = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

// Helper function to format distance string
const formatDistance = (distance: string | null): string => {
  if (!distance) return '';
  return distance;
};

// Helper function to find PB pace for a specific distance
const getPBForDistance = (distance: number, activities: any[]): number | null => {
  if (!activities || activities.length === 0) return null;
  
  // Filter activities with similar distances (±10% tolerance)
  const tolerance = distance * 0.1;
  const similarActivities = activities.filter(activity => {
    if (!activity.avg_time) return false;
    const activityDistance = parseFloat(activity.distance?.match(/^([\d.]+)/)?.[1] || '0');
    return Math.abs(activityDistance - distance) <= tolerance;
  });
  
  if (similarActivities.length === 0) return null;
  
  // Find the best (lowest) pace
  const bestPace = Math.min(...similarActivities.map(a => a.avg_time).filter(Boolean));
  return bestPace;
};

// Form components with modern date picker
const LogRunningForm = ({ onLogSuccess }: {
  onLogSuccess: (newLog: any) => void;
}) => {
  const { userId } = useData();
  const [preferredDistanceUnit, setPreferredDistanceUnit] = useState<'km' | 'miles'>('km');
  const [distance, setDistance] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [logDate, setLogDate] = useState(new Date());
  const [isLogging, setIsLogging] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Real-time calculation states
  const [calculatedPace, setCalculatedPace] = useState<string>('');
  const [distanceInMiles, setDistanceInMiles] = useState<number | null>(null);
  const [isPotentialPB, setIsPotentialPB] = useState<boolean>(false);
  const [paceComparison, setPaceComparison] = useState<string | null>(null);
  const [pbPace, setPbPace] = useState<number | null>(null);
  const [previousActivities, setPreviousActivities] = useState<any[]>([]);
  const [checkingPB, setCheckingPB] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;
      const { data: profileData } = await supabase
        .from('profiles')
        .select('preferred_distance_unit')
        .eq('id', userId)
        .single();

      if (profileData?.preferred_distance_unit) {
        setPreferredDistanceUnit(profileData.preferred_distance_unit);
      }
    };
    fetchUserProfile();
  }, [userId]);

  // Fetch previous activities for PB comparison
  useEffect(() => {
    const fetchPreviousActivities = async () => {
      if (!userId) return;
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('activity_type', 'Running')
        .order('log_date', { ascending: false });
      setPreviousActivities(data || []);
    };
    fetchPreviousActivities();
  }, [userId]);

  // Real-time pace calculation
  useEffect(() => {
    const dist = parseFloat(distance) || 0;
    const totalSeconds = (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
    
    if (dist > 0 && totalSeconds > 0) {
      const distanceInKm = convertDistance(dist, preferredDistanceUnit, 'km');
      if (distanceInKm && distanceInKm > 0) {
        const paceSeconds = totalSeconds / distanceInKm;
        setCalculatedPace(formatPace(paceSeconds));
      } else {
        setCalculatedPace('');
      }
    } else {
      setCalculatedPace('');
    }
  }, [distance, minutes, seconds, preferredDistanceUnit]);

  // Real-time km to miles conversion
  useEffect(() => {
    const dist = parseFloat(distance) || 0;
    if (dist > 0) {
      const miles = convertDistance(dist, preferredDistanceUnit, 'miles');
      setDistanceInMiles(miles);
    } else {
      setDistanceInMiles(null);
    }
  }, [distance, preferredDistanceUnit]);

  // Real-time PB detection with debouncing
  useEffect(() => {
    const checkForPotentialPB = async () => {
      if (!userId || !distance || !minutes || previousActivities.length === 0) {
        setIsPotentialPB(false);
        setPaceComparison(null);
        setPbPace(null);
        return;
      }

      const dist = parseFloat(distance);
      const totalSeconds = (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
      
      if (dist <= 0 || totalSeconds <= 0) {
        setIsPotentialPB(false);
        setPaceComparison(null);
        setPbPace(null);
        return;
      }

      setCheckingPB(true);
      
      // Debounce: wait 500ms before checking
      const timeoutId = setTimeout(async () => {
        try {
          const distanceInKm = convertDistance(dist, preferredDistanceUnit, 'km');
          if (!distanceInKm || distanceInKm <= 0) {
            setIsPotentialPB(false);
            setPaceComparison(null);
            setPbPace(null);
            setCheckingPB(false);
            return;
          }

          const avgTimePerKm = totalSeconds / distanceInKm;
          
          // Check if this would be a PB (faster than all previous runs)
          const hasFasterRun = previousActivities.some(log => 
            log.avg_time !== null && log.avg_time < avgTimePerKm
          );
          
          setIsPotentialPB(!hasFasterRun);
          
          // Show pace comparison for distances > 1km
          if (distanceInKm > 1) {
            const bestPace = getPBForDistance(distanceInKm, previousActivities);
            if (bestPace) {
              setPbPace(bestPace);
              const diff = avgTimePerKm - bestPace;
              const diffMinutes = Math.floor(Math.abs(diff) / 60);
              const diffSeconds = Math.round(Math.abs(diff) % 60);
              const sign = diff > 0 ? '+' : '-';
              setPaceComparison(`${sign}${diffMinutes}:${diffSeconds.toString().padStart(2, '0')} p/km ${diff > 0 ? 'slower' : 'faster'}`);
            } else if (previousActivities.length > 0) {
              // Has previous runs but no comparable distance - show vs average
              const avgPace = previousActivities.reduce((sum, activity) => sum + (activity.avg_time || 0), 0) / previousActivities.length;
              if (avgPace > 0) {
                setPbPace(avgPace);
                const diff = avgTimePerKm - avgPace;
                const diffMinutes = Math.floor(Math.abs(diff) / 60);
                const diffSeconds = Math.round(Math.abs(diff) % 60);
                const sign = diff > 0 ? '+' : '-';
                setPaceComparison(`${sign}${diffMinutes}:${diffSeconds.toString().padStart(2, '0')} p/km vs avg ${diff > 0 ? 'slower' : 'faster'}`);
              } else {
                setPaceComparison("First run at this pace!");
                setPbPace(null);
              }
            } else {
              setPaceComparison("Your first logged run!");
              setPbPace(null);
            }
          } else {
            setPaceComparison(null);
            setPbPace(null);
          }
        } catch (error) {
          console.error('Error checking PB:', error);
        } finally {
          setCheckingPB(false);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    };

    checkForPotentialPB();
  }, [distance, minutes, seconds, preferredDistanceUnit, userId, previousActivities]);

  const handleSubmit = async () => {
    if (!userId || !distance || !minutes) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLogging(true);
    try {
      const distanceInKm = convertDistance(parseFloat(distance), preferredDistanceUnit, 'km');
      if (distanceInKm === null) {
        Alert.alert('Error', 'Invalid distance value');
        return;
      }

      const totalSeconds = (parseInt(minutes) * 60) + (parseInt(seconds) || 0);
      const timeString = formatMinutesAndSecondsForStorage(parseInt(minutes), parseInt(seconds) || 0);
      const avgTimePerKm = distanceInKm > 0 ? totalSeconds / distanceInKm : null;

      // Use the already calculated isPotentialPB
      const isPB = isPotentialPB;

      const { data: insertedData } = await supabase.from('activity_logs').insert([{
        user_id: userId,
        activity_type: 'Running',
        distance: `${distanceInKm} km`,
        time: timeString,
        avg_time: avgTimePerKm,
        is_pb: isPB,
        log_date: logDate.toISOString().split('T')[0],
      }]).select().single();

      setDistance('');
      setMinutes('');
      setSeconds('');
      setCalculatedPace('');
      setDistanceInMiles(null);
      setIsPotentialPB(false);
      setPaceComparison(null);
      setPbPace(null);
      onLogSuccess(insertedData);
    } catch (error) {
      Alert.alert('Error', 'Failed to log running activity');
    } finally {
      setIsLogging(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setLogDate(selectedDate);
    }
  };

  const setToday = () => {
    setLogDate(new Date());
  };

  const setYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setLogDate(yesterday);
  };

  const runningColor = getActivityColor("Running");

  // Calculate pace ratio for gradient
  const paceRatio = pbPace && calculatedPace ?
    (parseFloat(calculatedPace.split(':')[0]) * 60 + parseFloat(calculatedPace.split(':')[1])) / pbPace :
    null;

  return (
    <View style={[styles.form, { background: getPerformanceGradient(paceRatio) }]}>
      <Card style={[styles.section, styles.firstSection]}>
        <Text style={styles.sectionTitle}>Distance ({preferredDistanceUnit})</Text>
        <View style={styles.quickSelect}>
          <Button size="sm" variant="default" onPress={() => setDistance('5')} style={[styles.quickButton, distance === '5' && { backgroundColor: runningColor }]}>
            <Text style={[styles.quickButtonText, distance === '5' && { color: Colors.card }]}>5km</Text>
          </Button>
          <Button size="sm" variant="default" onPress={() => setDistance('10')} style={[styles.quickButton, distance === '10' && { backgroundColor: runningColor }]}>
            <Text style={[styles.quickButtonText, distance === '10' && { color: Colors.card }]}>10km</Text>
          </Button>
          <Button size="sm" variant="default" onPress={() => setDistance('20')} style={[styles.quickButton, distance === '20' && { backgroundColor: runningColor }]}>
            <Text style={[styles.quickButtonText, distance === '20' && { color: Colors.card }]}>20km</Text>
          </Button>
        </View>
        <TextInput
          style={styles.input}
          value={distance}
          onChangeText={setDistance}
          placeholder={`or enter custom in ${preferredDistanceUnit}`}
          keyboardType="numeric"
        />
        {distanceInMiles !== null && (
          <Text style={styles.conversionText}>
            = {distanceInMiles.toFixed(2)} miles
          </Text>
        )}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Time</Text>
        <View style={styles.timeInputs}>
          <TextInput
            style={[styles.input, styles.timeInput]}
            value={minutes}
            onChangeText={setMinutes}
            placeholder="Minutes"
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.timeInput]}
            value={seconds}
            onChangeText={setSeconds}
            placeholder="Seconds"
            keyboardType="numeric"
          />
        </View>
        {calculatedPace && (
          <View style={styles.paceContainer}>
            <View style={styles.paceRow}>
              <Ionicons name={isPotentialPB ? "trophy" : "time-outline"} size={20} color={isPotentialPB ? '#FFD700' : runningColor} />
              <Text style={[styles.paceDisplay, isPotentialPB && styles.pacePB]}>
                {calculatedPace}
              </Text>
              <Text style={styles.paceUnit}>min/km</Text>
            </View>
            {paceComparison && (
              <Text style={styles.paceComparisonText}>
                vs PB: {paceComparison}
              </Text>
            )}
            {checkingPB && (
              <ActivityIndicator size="small" color={runningColor} style={styles.checkingPBIndicator} />
            )}
          </View>
        )}
        {isPotentialPB && (
          <View style={styles.pbBadge}>
            <Ionicons name="trophy" size={20} color="#000000" />
            <Text style={styles.pbText}>PERSONAL BEST!</Text>
          </View>
        )}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Date</Text>
        <View style={styles.dateQuickSelect}>
          <Button size="sm" variant="default" onPress={setToday} style={[styles.quickButton, formatDateForInput(logDate) === formatDateForInput(new Date()) && { backgroundColor: runningColor }]}>
            <Text style={[styles.quickButtonText, formatDateForInput(logDate) === formatDateForInput(new Date()) && { color: Colors.card }]}>Today</Text>
          </Button>
          <Button size="sm" variant="default" onPress={setYesterday} style={[styles.quickButton]}>
            <Text style={[styles.quickButtonText]}>Yday</Text>
          </Button>
          <Button size="sm" variant="default" onPress={() => setShowDatePicker(true)} style={styles.quickButton}>
            <Ionicons name="calendar" size={16} color={runningColor} />
          </Button>
        </View>
        <TextInput
          style={styles.input}
          value={formatDateForInput(logDate)}
          onChangeText={(text) => {
            // Try parsing dd-mm-yyyy format
            const parts = text.split('-');
            if (parts.length === 3) {
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
              const year = parseInt(parts[2]);
              const date = new Date(year, month, day);
              if (!isNaN(date.getTime())) {
                setLogDate(date);
                return;
              }
            }
            // Fallback to standard date parsing
            const date = new Date(text);
            if (!isNaN(date.getTime())) {
              setLogDate(date);
            }
          }}
          placeholder="DD-MM-YYYY"
          keyboardType="numeric"
        />
        {showDatePicker && (
          <DateTimePicker
            value={logDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </Card>

      <Button onPress={handleSubmit} disabled={isLogging} style={[styles.submitButton, { backgroundColor: runningColor }]}>
        {isLogging ? "Logging..." : "Log Running"}
      </Button>
    </View>
  );
};

// Activity History Page Component
const ActivityHistoryPage = ({ userId, onClose }: { userId: string; onClose: () => void }) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const fetchActivityHistory = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('activity_logs')
        .select('id, activity_type, distance, time, avg_time, log_date, is_pb, created_at')
        .eq('user_id', userId)
        .order('log_date', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('activity_type', filter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError('Failed to load activities');
        console.error('Error fetching activities:', fetchError);
      } else {
        setActivities(data || []);
      }
    } catch (err) {
      setError('Failed to load activities');
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, filter]);

  useEffect(() => {
    fetchActivityHistory();
  }, [fetchActivityHistory]);

  const activityTypes: (ActivityType | 'all')[] = [
    'all',
    'Running',
    'Cycling',
    'Swimming',
    'Tennis',
    'Squash',
    'Padel',
    'Badminton',
    'Basketball',
    'Football',
    'Yoga',
    'Pilates'
  ];

  // Create shorter display names for filter buttons
  const getActivityDisplayName = (activityType: ActivityType | 'all'): string => {
    const displayNames: { [key: string]: string } = {
      'all': 'All',
      'Running': 'Run',
      'Cycling': 'Bike',
      'Swimming': 'Swim',
      'Tennis': 'Tennis',
      'Squash': 'Squash',
      'Padel': 'Padel',
      'Badminton': 'Badminton',
      'Basketball': 'Basketball',
      'Football': 'Football',
      'Yoga': 'Yoga',
      'Pilates': 'Pilates'
    };
    return displayNames[activityType] || activityType;
  };

  return (
    <View style={styles.historyContainer}>
      {/* Quick Filter Buttons */}
      <View style={styles.quickFilterContainer}>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onPress={() => setFilter('all')}
          style={[
            styles.quickFilterButton,
            filter === 'all' && { backgroundColor: Colors.primary }
          ]}
          size="sm"
        >
          All
        </Button>
        <Button
          variant={filter === 'Running' ? 'default' : 'outline'}
          onPress={() => setFilter('Running')}
          style={[
            styles.quickFilterButton,
            filter === 'Running' && { backgroundColor: getActivityColor('Running') }
          ]}
          size="sm"
        >
          Run
        </Button>
        <Button
          variant={filter === 'Cycling' ? 'default' : 'outline'}
          onPress={() => setFilter('Cycling')}
          style={[
            styles.quickFilterButton,
            filter === 'Cycling' && { backgroundColor: getActivityColor('Cycling') }
          ]}
          size="sm"
        >
          Bike
        </Button>
        <Button
          variant={filter === 'Swimming' ? 'default' : 'outline'}
          onPress={() => setFilter('Swimming')}
          style={[
            styles.quickFilterButton,
            filter === 'Swimming' && { backgroundColor: getActivityColor('Swimming') }
          ]}
          size="sm"
        >
          Swim
        </Button>

        {/* Filter Icon Button */}
        <Pressable
          onPress={() => setShowFilterModal(true)}
          style={styles.filterIconButton}
        >
          <Ionicons name="filter" size={20} color={Colors.foreground} />
        </Pressable>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContainer}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter Activities</Text>
              <Pressable onPress={() => setShowFilterModal(false)} style={styles.filterModalClose}>
                <Ionicons name="close" size={24} color={Colors.foreground} />
              </Pressable>
            </View>
            <ScrollView style={styles.filterModalContent}>
              <View style={styles.filterOptionsGrid}>
                {activityTypes.map((activityType) => (
                  <Button
                    key={activityType}
                    variant={filter === activityType ? 'default' : 'outline'}
                    onPress={() => {
                      setFilter(activityType);
                      setShowFilterModal(false);
                    }}
                    style={[
                      styles.filterOptionButton,
                      filter === activityType && { backgroundColor: activityType === 'all' ? Colors.primary : getActivityColor(activityType) }
                    ]}
                    size="sm"
                  >
                    {activityType === 'all' ? 'All Sports' : activityType}
                  </Button>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading activities...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle" size={48} color={Colors.mutedForeground} />
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : activities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="list-outline" size={48} color={Colors.mutedForeground} />
          <Text style={styles.emptyText}>
            {filter === 'all' 
              ? 'No activities logged yet' 
              : `No ${filter} activities found`}
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.historyList}
          contentContainerStyle={styles.historyListContent}
        >
          {activities.map((activity, index) => (
            <Card key={activity.id} style={[styles.historyItem, { backgroundColor: getActivityColor(activity.activity_type) + '08' }]}>
              <View style={styles.historyItemGradient}>
                <View style={styles.historyItemHeader}>
                  <View style={styles.activityIconContainer}>
                    <Ionicons
                      name={getActivityIcon(activity.activity_type)}
                      size={24}
                      color={getActivityColor(activity.activity_type)}
                    />
                  </View>
                  <View style={styles.activityInfo}>
                    <View style={styles.activityTitleContainer}>
                      <Text style={[styles.activityTypeText, { color: getActivityColor(activity.activity_type) }]}>
                        {activity.activity_type}
                      </Text>
                      {activity.is_pb && (
                        <View style={styles.pbBadgeSmall}>
                          <Ionicons name="trophy" size={14} color="#FFD700" />
                          <Text style={styles.pbTextSmall}>PB</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.historyDateText}>
                    {formatActivityDate(activity.log_date)}
                  </Text>
                </View>
                <View style={styles.historyItemContent}>
                  <View style={styles.metricRow}>
                    <View style={styles.metricItem}>
                      <Ionicons name="map" size={16} color={Colors.mutedForeground} />
                      <Text style={styles.metricText}>
                        {formatDistance(activity.distance)}
                      </Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Ionicons name="time" size={16} color={Colors.mutedForeground} />
                      <Text style={styles.metricText}>
                        {activity.time || 'N/A'}
                      </Text>
                    </View>
                    {activity.avg_time && (
                      <View style={styles.metricItem}>
                        <Ionicons name="speedometer" size={16} color={Colors.mutedForeground} />
                        <Text style={styles.metricText}>
                          {formatPace(activity.avg_time)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const LogCyclingForm = ({ onLogSuccess }: {
  onLogSuccess: (newLog: any) => void;
}) => {
  const { userId } = useData();
  const [preferredDistanceUnit, setPreferredDistanceUnit] = useState<'km' | 'miles'>('km');
  const [distance, setDistance] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [logDate, setLogDate] = useState(new Date());
  const [isLogging, setIsLogging] = useState(false);
  const [avgPace, setAvgPace] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [distanceInMiles, setDistanceInMiles] = useState<number | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;
      const { data: profileData } = await supabase
        .from('profiles')
        .select('preferred_distance_unit')
        .eq('id', userId)
        .single();

      if (profileData?.preferred_distance_unit) {
        setPreferredDistanceUnit(profileData.preferred_distance_unit);
      }
    };
    fetchUserProfile();
  }, [userId]);

  useEffect(() => {
    const totalSeconds = (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
    const dist = parseFloat(distance) || 0;
    if (dist > 0 && totalSeconds > 0) {
      const paceSeconds = totalSeconds / dist;
      const paceMin = Math.floor(paceSeconds / 60);
      const paceSec = Math.round(paceSeconds % 60);
      setAvgPace(`${paceMin}:${paceSec.toString().padStart(2, '0')}`);
    } else {
      setAvgPace('');
    }
  }, [distance, minutes, seconds]);

  // Real-time km to miles conversion
  useEffect(() => {
    const dist = parseFloat(distance) || 0;
    if (dist > 0) {
      const miles = convertDistance(dist, preferredDistanceUnit, 'miles');
      setDistanceInMiles(miles);
    } else {
      setDistanceInMiles(null);
    }
  }, [distance, preferredDistanceUnit]);

  const handleSubmit = async () => {
    if (!userId || !distance || !minutes) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLogging(true);
    try {
      const distanceInKm = convertDistance(parseFloat(distance), preferredDistanceUnit, 'km');
      if (distanceInKm === null) {
        Alert.alert('Error', 'Invalid distance value');
        return;
      }

      const totalSeconds = (parseInt(minutes) * 60) + (parseInt(seconds) || 0);
      const timeString = formatMinutesAndSecondsForStorage(parseInt(minutes), parseInt(seconds) || 0);
      const avgTimePerKm = distanceInKm > 0 ? totalSeconds / distanceInKm : null;

      // Check for PB
      let isPB = false;
      if (avgTimePerKm !== null) {
        const { data: previousLogs } = await supabase
          .from('activity_logs')
          .select('avg_time')
          .eq('user_id', userId)
          .eq('activity_type', 'Cycling')
          .order('log_date', { ascending: false });

        isPB = previousLogs?.every(log => log.avg_time === null || avgTimePerKm < log.avg_time) ?? false;
      }

      const { data: insertedData } = await supabase.from('activity_logs').insert([{
        user_id: userId,
        activity_type: 'Cycling',
        distance: `${distanceInKm} km`,
        time: timeString,
        avg_time: avgTimePerKm,
        is_pb: isPB,
        log_date: logDate.toISOString().split('T')[0],
      }]).select().single();

      setDistance('');
      setMinutes('');
      setSeconds('');
      onLogSuccess(insertedData);
    } catch (error) {
      Alert.alert('Error', 'Failed to log cycling activity');
    } finally {
      setIsLogging(false);
    }
  };

  const setToday = () => {
    setLogDate(new Date());
  };

  const setYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setLogDate(yesterday);
  };

  return (
    <View style={styles.form}>
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Distance ({preferredDistanceUnit})</Text>
        <View style={styles.quickSelect}>
          <Button variant="default" onPress={() => setDistance('5')} style={[styles.quickButton, distance === '5' && { backgroundColor: getActivityColor("Cycling") }]}>
            <Text style={[styles.quickButtonTextSmall, distance === '5' && { color: Colors.card }]}>
              5{'\n'}km
            </Text>
          </Button>
          <Button variant="default" onPress={() => setDistance('10')} style={[styles.quickButton, distance === '10' && { backgroundColor: getActivityColor("Cycling") }]}>
            <Text style={[styles.quickButtonTextSmall, distance === '10' && { color: Colors.card }]}>
              10{'\n'}km
            </Text>
          </Button>
          <Button variant="default" onPress={() => setDistance('20')} style={[styles.quickButton, distance === '20' && { backgroundColor: getActivityColor("Cycling") }]}>
            <Text style={[styles.quickButtonTextSmall, distance === '20' && { color: Colors.card }]}>
              20{'\n'}km
            </Text>
          </Button>
          <Button variant="default" onPress={() => setDistance('30')} style={[styles.quickButton, distance === '30' && { backgroundColor: getActivityColor("Cycling") }]}>
            <Text style={[styles.quickButtonTextSmall, distance === '30' && { color: Colors.card }]}>
              30{'\n'}km
            </Text>
          </Button>
        </View>
        <TextInput
          style={styles.input}
          value={distance}
          onChangeText={setDistance}
          placeholder={`or enter custom in ${preferredDistanceUnit}`}
          keyboardType="numeric"
        />
        {distanceInMiles !== null && (
          <Text style={styles.conversionText}>
            = {distanceInMiles.toFixed(2)} miles
          </Text>
        )}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Time</Text>
        <View style={styles.timeInputs}>
          <TextInput
            style={[styles.input, styles.timeInput]}
            value={minutes}
            onChangeText={setMinutes}
            placeholder="Minutes"
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.timeInput]}
            value={seconds}
            onChangeText={setSeconds}
            placeholder="Seconds"
            keyboardType="numeric"
          />
        </View>
        {avgPace ? <Text style={[styles.paceText, { color: getActivityColor("Cycling") }]}>Avg Pace: {avgPace} min/km</Text> : null}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Date</Text>
        <View style={styles.dateQuickSelect}>
          <Button variant="default" onPress={setToday} style={[styles.quickButton, formatDateForInput(logDate) === formatDateForInput(new Date()) && { backgroundColor: getActivityColor("Cycling") }]}>
            <Text style={[styles.quickButtonText, formatDateForInput(logDate) === formatDateForInput(new Date()) && { color: Colors.card }]}>Today</Text>
          </Button>
          <Button variant="default" onPress={setYesterday} style={[styles.quickButton]}>
            <Text style={[styles.quickButtonText]}>Yday</Text>
          </Button>
          <Button variant="default" onPress={() => setShowDatePicker(true)} style={styles.quickButton}>
            <Ionicons name="calendar" size={16} color={getActivityColor("Cycling")} />
          </Button>
        </View>
        <TextInput
          style={styles.input}
          value={formatDateForInput(logDate)}
          onChangeText={(text) => {
            // Try parsing dd-mm-yyyy format
            const parts = text.split('-');
            if (parts.length === 3) {
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
              const year = parseInt(parts[2]);
              const date = new Date(year, month, day);
              if (!isNaN(date.getTime())) {
                setLogDate(date);
                return;
              }
            }
            // Fallback to standard date parsing
            const date = new Date(text);
            if (!isNaN(date.getTime())) {
              setLogDate(date);
            }
          }}
          placeholder="DD-MM-YYYY"
          keyboardType="numeric"
        />
        {showDatePicker && (
          <DateTimePicker
            value={logDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              if (Platform.OS === 'android') {
                setShowDatePicker(false);
              }
              if (selectedDate) {
                setLogDate(selectedDate);
              }
            }}
            maximumDate={new Date()}
          />
        )}
      </Card>

      <Button onPress={handleSubmit} disabled={isLogging} style={[styles.submitButton, { backgroundColor: '#4DB6AC' }]}>
        {isLogging ? "Logging..." : "Log Cycling"}
      </Button>
    </View>
  );
};

const LogSwimmingForm = ({ onLogSuccess }: {
  onLogSuccess: (newLog: any) => void;
}) => {
  const { userId } = useData();
  const [lengths, setLengths] = useState('');
  const [poolSize, setPoolSize] = useState('');
  const [logDate, setLogDate] = useState(new Date());
  const [isLogging, setIsLogging] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setLogDate(selectedDate);
    }
  };

  const setToday = () => {
    setLogDate(new Date());
  };

  const setYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setLogDate(yesterday);
  };

  const handleSubmit = async () => {
    if (!userId || !lengths || !poolSize) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLogging(true);
    try {
      const totalLengths = parseInt(lengths);

      // Check for PB
      let isPB = false;
      const { data: previousLogs } = await supabase
        .from('activity_logs')
        .select('distance')
        .eq('user_id', userId)
        .eq('activity_type', 'Swimming')
        .order('log_date', { ascending: false });

      const previousLengths = previousLogs?.map(log => {
        const match = log.distance?.match(/^(\d+) lengths/);
        return match ? parseInt(match[1]) : 0;
      }) ?? [];

      isPB = previousLengths.every(prevLen => totalLengths > prevLen);

      const { data: insertedData } = await supabase.from('activity_logs').insert([{
        user_id: userId,
        activity_type: 'Swimming',
        distance: `${lengths} lengths (${poolSize}m pool)`,
        time: null,
        avg_time: null,
        is_pb: isPB,
        log_date: logDate.toISOString().split('T')[0],
      }]).select().single();

      setLengths('');
      setPoolSize('');
      onLogSuccess(insertedData);
    } catch (error) {
      Alert.alert('Error', 'Failed to log swimming activity');
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <View style={styles.form}>
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Lengths</Text>
        <View style={styles.quickSelect}>
          <Button variant="default" onPress={() => setLengths('20')} style={[styles.quickButton, lengths === '20' && { backgroundColor: getActivityColor("Swimming") }]}>
            <Text style={[styles.quickButtonTextExtraSmall, lengths === '20' && { color: Colors.card }]}>20</Text>
          </Button>
          <Button variant="default" onPress={() => setLengths('40')} style={[styles.quickButton, lengths === '40' && { backgroundColor: getActivityColor("Swimming") }]}>
            <Text style={[styles.quickButtonTextExtraSmall, lengths === '40' && { color: Colors.card }]}>40</Text>
          </Button>
          <Button variant="default" onPress={() => setLengths('60')} style={[styles.quickButton, lengths === '60' && { backgroundColor: getActivityColor("Swimming") }]}>
            <Text style={[styles.quickButtonTextExtraSmall, lengths === '60' && { color: Colors.card }]}>60</Text>
          </Button>
          <Button variant="default" onPress={() => setLengths('100')} style={[styles.quickButton, lengths === '100' && { backgroundColor: getActivityColor("Swimming") }]}>
            <Text style={[styles.quickButtonTextExtraSmall, lengths === '100' && { color: Colors.card }]}>100</Text>
          </Button>
        </View>
        <TextInput
          style={styles.input}
          value={lengths}
          onChangeText={setLengths}
          placeholder="or enter custom number"
          keyboardType="numeric"
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Pool Size (meters)</Text>
        <TextInput
          style={styles.input}
          value={poolSize}
          onChangeText={setPoolSize}
          placeholder="Pool length in meters"
          keyboardType="numeric"
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Date</Text>
        <View style={styles.dateQuickSelect}>
          <Button size="sm" variant="default" onPress={setToday} style={[styles.quickButton, formatDateForInput(logDate) === formatDateForInput(new Date()) && { backgroundColor: getActivityColor("Swimming") }]}>
            <Text style={[styles.quickButtonText, formatDateForInput(logDate) === formatDateForInput(new Date()) && { color: Colors.card }]}>Today</Text>
          </Button>
          <Button size="sm" variant="default" onPress={setYesterday} style={[styles.quickButton]}>
            <Text style={[styles.quickButtonText]}>Yday</Text>
          </Button>
          <Button size="sm" variant="default" onPress={() => setShowDatePicker(true)} style={styles.quickButton}>
            <Ionicons name="calendar" size={16} color={getActivityColor("Swimming")} />
          </Button>
        </View>
        <TextInput
          style={styles.input}
          value={formatDateForInput(logDate)}
          onChangeText={(text) => {
            // Try parsing dd-mm-yyyy format
            const parts = text.split('-');
            if (parts.length === 3) {
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
              const year = parseInt(parts[2]);
              const date = new Date(year, month, day);
              if (!isNaN(date.getTime())) {
                setLogDate(date);
                return;
              }
            }
            // Fallback to standard date parsing
            const date = new Date(text);
            if (!isNaN(date.getTime())) {
              setLogDate(date);
            }
          }}
          placeholder="DD-MM-YYYY"
          keyboardType="numeric"
        />
        {showDatePicker && (
          <DateTimePicker
            value={logDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </Card>

      <Button onPress={handleSubmit} disabled={isLogging} style={[styles.submitButton, { backgroundColor: '#42A5F5' }]}>
        {isLogging ? "Logging..." : "Log Swimming"}
      </Button>
    </View>
  );
};

const LogRacketForm = ({ onLogSuccess }: {
  onLogSuccess: (newLog: any) => void;
}) => {
  const { userId } = useData();
  const [selectedSport, setSelectedSport] = useState<ActivityType | null>(null);
  const [duration, setDuration] = useState('');
  const [logDate, setLogDate] = useState(new Date());
  const [isLogging, setIsLogging] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setLogDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!userId || !selectedSport || !duration) {
      Alert.alert('Error', 'Please select a sport and fill in all required fields');
      return;
    }

    setIsLogging(true);
    try {
      const durationMinutes = timeStringToSeconds(duration) / 60;

      // Check for PB
      let isPB = false;
      const { data: previousLogs } = await supabase
        .from('activity_logs')
        .select('time')
        .eq('user_id', userId)
        .eq('activity_type', selectedSport)
        .order('log_date', { ascending: false });

      const previousDurations = previousLogs?.map(log => timeStringToSeconds(log.time || '0m') / 60) ?? [];
      isPB = previousDurations.every(prevDur => durationMinutes > prevDur);

      const { data: insertedData } = await supabase.from('activity_logs').insert([{
        user_id: userId,
        activity_type: selectedSport,
        distance: null,
        time: duration,
        avg_time: null,
        is_pb: isPB,
        log_date: logDate.toISOString().split('T')[0],
      }]).select().single();

      setSelectedSport(null);
      setDuration('');
      onLogSuccess(insertedData);
    } catch (error) {
      Alert.alert('Error', `Failed to log ${selectedSport.toLowerCase()} activity`);
    } finally {
      setIsLogging(false);
    }
  };

  const racketSports: ActivityType[] = ["Tennis", "Squash", "Padel", "Badminton"];

  return (
    <View style={styles.form}>
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Select Sport</Text>
        <View style={styles.sportSelection}>
          {racketSports.map((sport) => (
            <Button
              key={sport}
              variant={selectedSport === sport ? "default" : "outline"}
              onPress={() => setSelectedSport(sport)}
              style={[
                styles.sportButton,
                selectedSport === sport && { backgroundColor: getActivityColor(sport) }
              ]}
              icon={<Ionicons name="tennisball" size={24} color={selectedSport === sport ? Colors.card : getActivityColor(sport)} />}
            >
              {sport}
            </Button>
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Duration</Text>
        <View style={styles.quickSelect}>
          <Button variant="default" onPress={() => setDuration('30m')} style={[styles.quickButton, duration === '30m' && selectedSport && { backgroundColor: getActivityColor(selectedSport) }]}>
            <Text style={[styles.quickButtonTextSmall, duration === '30m' && selectedSport && { color: Colors.card }]}>30m</Text>
          </Button>
          <Button variant="default" onPress={() => setDuration('45m')} style={[styles.quickButton, duration === '45m' && selectedSport && { backgroundColor: getActivityColor(selectedSport) }]}>
            <Text style={[styles.quickButtonTextSmall, duration === '45m' && selectedSport && { color: Colors.card }]}>45m</Text>
          </Button>
          <Button variant="default" onPress={() => setDuration('1h')} style={[styles.quickButton, duration === '1h' && selectedSport && { backgroundColor: getActivityColor(selectedSport) }]}>
            <Text style={[styles.quickButtonTextSmall, duration === '1h' && selectedSport && { color: Colors.card }]}>1h</Text>
          </Button>
          <Button variant="default" onPress={() => setDuration('2h')} style={[styles.quickButton, duration === '2h' && selectedSport && { backgroundColor: getActivityColor(selectedSport) }]}>
            <Text style={[styles.quickButtonTextSmall, duration === '2h' && selectedSport && { color: Colors.card }]}>2h</Text>
          </Button>
        </View>
        <View style={styles.inputContainer}>
          <Ionicons name="time-outline" size={20} color={selectedSport ? getActivityColor(selectedSport) : Colors.muted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            value={duration}
            onChangeText={setDuration}
            placeholder="or enter custom: 1h 30m"
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Date</Text>
        <View style={styles.quickSelect}>
          <Button variant="default" onPress={() => setLogDate(new Date())} style={[styles.quickButton, formatDateForInput(logDate) === formatDateForInput(new Date()) && selectedSport && { backgroundColor: getActivityColor(selectedSport) }]}>
            <Text style={[styles.quickButtonText, formatDateForInput(logDate) === formatDateForInput(new Date()) && selectedSport && { color: Colors.card }]}>Today</Text>
          </Button>
          <Button variant="default" onPress={() => { const d = new Date(); d.setDate(d.getDate()-1); setLogDate(d); }} style={[styles.quickButton, (() => { const d = new Date(); d.setDate(d.getDate()-1); return formatDateForInput(logDate) === formatDateForInput(d); })() && selectedSport && { backgroundColor: getActivityColor(selectedSport) }]}>
            <Text style={[styles.quickButtonText, (() => { const d = new Date(); d.setDate(d.getDate()-1); return formatDateForInput(logDate) === formatDateForInput(d); })() && selectedSport && { color: Colors.card }]}>Yday</Text>
          </Button>
          <Button variant="default" onPress={() => setShowDatePicker(true)} style={[styles.quickButton, showDatePicker && selectedSport && { backgroundColor: getActivityColor(selectedSport) }]}>
            <Ionicons name="calendar" size={16} color={showDatePicker && selectedSport ? Colors.card : selectedSport ? getActivityColor(selectedSport) : Colors.foreground} />
          </Button>
        </View>
        <TextInput
          style={styles.input}
          value={formatDateForInput(logDate)}
          onChangeText={(text) => {
            // Try parsing dd-mm-yyyy format
            const parts = text.split('-');
            if (parts.length === 3) {
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
              const year = parseInt(parts[2]);
              const date = new Date(year, month, day);
              if (!isNaN(date.getTime())) {
                setLogDate(date);
                return;
              }
            }
            // Fallback to standard date parsing
            const date = new Date(text);
            if (!isNaN(date.getTime())) {
              setLogDate(date);
            }
          }}
          placeholder="DD-MM-YYYY"
          keyboardType="numeric"
        />
        {showDatePicker && (
          <DateTimePicker
            value={logDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </Card>

      <Button onPress={handleSubmit} disabled={isLogging || !selectedSport} style={[styles.submitButton, selectedSport && { backgroundColor: getActivityColor(selectedSport) }]} icon={<Ionicons name="checkmark" size={20} color={Colors.card} />}>
        {isLogging ? "Logging..." : selectedSport ? `Log ${selectedSport}` : "Select a sport"}
      </Button>
    </View>
  );
};

const LogDurationForm = ({ activityType, onLogSuccess }: {
  activityType: ActivityType;
  onLogSuccess: (newLog: any) => void;
}) => {
  const { userId } = useData();
  const [duration, setDuration] = useState('');
  const [logDate, setLogDate] = useState(new Date());
  const [isLogging, setIsLogging] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setLogDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!userId || !duration) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLogging(true);
    try {
      const durationMinutes = timeStringToSeconds(duration) / 60;

      // Check for PB
      let isPB = false;
      const { data: previousLogs } = await supabase
        .from('activity_logs')
        .select('time')
        .eq('user_id', userId)
        .eq('activity_type', activityType)
        .order('log_date', { ascending: false });

      const previousDurations = previousLogs?.map(log => timeStringToSeconds(log.time || '0m') / 60) ?? [];
      isPB = previousDurations.every(prevDur => durationMinutes > prevDur);

      const { data: insertedData } = await supabase.from('activity_logs').insert([{
        user_id: userId,
        activity_type: activityType,
        distance: null,
        time: duration,
        avg_time: null,
        is_pb: isPB,
        log_date: logDate.toISOString().split('T')[0],
      }]).select().single();

      setDuration('');
      onLogSuccess(insertedData);
    } catch (error) {
      Alert.alert('Error', `Failed to log ${activityType.toLowerCase()} activity`);
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <View style={styles.form}>
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Duration</Text>
        <View style={styles.quickSelect}>
          <Button variant="default" onPress={() => setDuration('30m')} style={[styles.quickButton, duration === '30m' && { backgroundColor: getActivityColor(activityType) }]}>
            <Text style={[styles.quickButtonTextSmall, duration === '30m' && { color: Colors.card }]}>30m</Text>
          </Button>
          <Button variant="default" onPress={() => setDuration('45m')} style={[styles.quickButton, duration === '45m' && { backgroundColor: getActivityColor(activityType) }]}>
            <Text style={[styles.quickButtonTextSmall, duration === '45m' && { color: Colors.card }]}>45m</Text>
          </Button>
          <Button variant="default" onPress={() => setDuration('1h')} style={[styles.quickButton, duration === '1h' && { backgroundColor: getActivityColor(activityType) }]}>
            <Text style={[styles.quickButtonTextSmall, duration === '1h' && { color: Colors.card }]}>1h</Text>
          </Button>
          <Button variant="default" onPress={() => setDuration('2h')} style={[styles.quickButton, duration === '2h' && { backgroundColor: getActivityColor(activityType) }]}>
            <Text style={[styles.quickButtonTextSmall, duration === '2h' && { color: Colors.card }]}>2h</Text>
          </Button>
        </View>
        <View style={styles.inputContainer}>
          <Ionicons name="time-outline" size={20} color={getActivityColor(activityType)} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            value={duration}
            onChangeText={setDuration}
            placeholder="or enter custom: 1h 30m"
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Date</Text>
        <View style={styles.quickSelect}>
          <Button variant="default" onPress={() => setLogDate(new Date())} style={[styles.quickButton, formatDateForInput(logDate) === formatDateForInput(new Date()) && { backgroundColor: getActivityColor(activityType) }]}>
            <Text style={[styles.quickButtonText, formatDateForInput(logDate) === formatDateForInput(new Date()) && { color: Colors.card }]}>Today</Text>
          </Button>
          <Button variant="default" onPress={() => { const d = new Date(); d.setDate(d.getDate()-1); setLogDate(d); }} style={[styles.quickButton, (() => { const d = new Date(); d.setDate(d.getDate()-1); return formatDateForInput(logDate) === formatDateForInput(d); })() && { backgroundColor: getActivityColor(activityType) }]}>
            <Text style={[styles.quickButtonText, (() => { const d = new Date(); d.setDate(d.getDate()-1); return formatDateForInput(logDate) === formatDateForInput(d); })() && { color: Colors.card }]}>Yday</Text>
          </Button>
          <Button variant="default" onPress={() => setShowDatePicker(true)} style={[styles.quickButton, showDatePicker && { backgroundColor: getActivityColor(activityType) }]}>
            <Ionicons name="calendar" size={16} color={showDatePicker ? Colors.card : getActivityColor(activityType)} />
          </Button>
        </View>
        <TextInput
          style={styles.input}
          value={formatDateForInput(logDate)}
          onChangeText={(text) => {
            // Try parsing dd-mm-yyyy format
            const parts = text.split('-');
            if (parts.length === 3) {
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
              const year = parseInt(parts[2]);
              const date = new Date(year, month, day);
              if (!isNaN(date.getTime())) {
                setLogDate(date);
                return;
              }
            }
            // Fallback to standard date parsing
            const date = new Date(text);
            if (!isNaN(date.getTime())) {
              setLogDate(date);
            }
          }}
          placeholder="DD-MM-YYYY"
          keyboardType="numeric"
        />
        {showDatePicker && (
          <DateTimePicker
            value={logDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </Card>

      <Button onPress={handleSubmit} disabled={isLogging} style={[styles.submitButton, { backgroundColor: getActivityColor(activityType) }]} icon={<Ionicons name="checkmark" size={20} color={Colors.card} />}>
        {isLogging ? "Logging..." : `Log ${activityType}`}
      </Button>
    </View>
  );
};

export function ActivityLoggingModal_new({
  visible,
  onClose,
  onLogActivity,
  setTempStatusMessage: globalSetTempStatusMessage
}: ActivityLoggingModalProps) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | null>(null);
  const [currentView, setCurrentView] = useState<'selection' | 'logging' | 'history'>('selection');
  const [tempStatusMessage, setTempStatusMessage] = useState<TempStatusMessage | null>(null);
  const { userId } = useData();


  // Reset view when modal closes
  useEffect(() => {
    if (!visible) {
      setCurrentView('selection');
      setSelectedActivity(null);
      setSelectedCategory(null);
      setTempStatusMessage(null);
    }
  }, [visible]);

  const handleBackToSelection = () => {
    if (currentView === 'history') {
      setCurrentView('selection');
    } else if (selectedCategory === "racket") {
      setSelectedCategory(null);
      setCurrentView('selection');
    } else {
      setSelectedActivity(null);
      setCurrentView('selection');
    }
  };

  const handleLogSuccess = (newLog: any) => {
    setSelectedActivity(null);
    setSelectedCategory(null);
    setCurrentView('selection');
    // Show success message
    setTempStatusMessage({ message: "Activity Logged!", type: 'success' });
    // Also call global setTempStatusMessage if provided (for backward compatibility)
    if (globalSetTempStatusMessage) {
      globalSetTempStatusMessage({ message: "Activity Logged!", type: 'success' });
    }
    // Call the parent's onLogActivity if provided
    if (onLogActivity) {
      onLogActivity(newLog);
    }
    onClose();
  };

  const handleActivitySelect = (activity: ActivityType) => {
    setSelectedActivity(activity);
    setCurrentView('logging');
  };

  const handleCategorySelect = (category: ActivityCategory) => {
    setSelectedCategory(category);
    setCurrentView('logging');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose}></Pressable>
        <View style={styles.modalContainer}>
          <View style={styles.vignetteOverlay} />
          <View style={styles.innerContainer}>
            <View style={styles.header}>
              {currentView !== 'selection' && (
                <Pressable onPress={handleBackToSelection} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
                </Pressable>
              )}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={styles.title}>
                  {currentView === 'selection' && "Log New Activity"}
                  {currentView === 'history' && "Activity History"}
                  {currentView === 'logging' && selectedCategory === "racket" && "Log Racket Sport"}
                  {currentView === 'logging' && selectedActivity && `Log ${selectedActivity}`}
                </Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.foreground} />
              </Pressable>
            </View>

            <View style={{ flex: 1 }}>
              {currentView === 'selection' && (
              <ScrollView style={styles.activitySelectionScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.activitySelection}>
                  <Button
                    variant="default"
                    onPress={() => handleActivitySelect("Running")}
                    style={[styles.activityButton, { backgroundColor: getActivityColor("Running") }]}
                    icon={<Ionicons name="walk" size={24} color={Colors.card} />}
                  >
                    Running
                  </Button>
                  <Button
                    variant="default"
                    onPress={() => handleActivitySelect("Cycling")}
                    style={[styles.activityButton, { backgroundColor: getActivityColor("Cycling") }]}
                    icon={<Ionicons name="bicycle" size={24} color={Colors.card} />}
                  >
                    Cycling
                  </Button>
                  <Button
                    variant="default"
                    onPress={() => handleActivitySelect("Swimming")}
                    style={[styles.activityButton, { backgroundColor: getActivityColor("Swimming") }]}
                    icon={<Ionicons name="water" size={24} color={Colors.card} />}
                  >
                    Swimming
                  </Button>
                  <Button
                    variant="default"
                    onPress={() => handleCategorySelect("racket")}
                    style={[styles.activityButton, { backgroundColor: getActivityColor("Racket Sports") }]}
                    icon={<Ionicons name="tennisball" size={24} color={Colors.card} />}
                  >
                    Racket Sports
                  </Button>
                  <Button
                    variant="default"
                    onPress={() => handleActivitySelect("Basketball")}
                    style={[styles.activityButton, { backgroundColor: getActivityColor("Basketball") }]}
                    icon={<Ionicons name="basketball" size={24} color={Colors.card} />}
                  >
                    Basketball
                  </Button>
                  <Button
                    variant="default"
                    onPress={() => handleActivitySelect("Football")}
                    style={[styles.activityButton, { backgroundColor: getActivityColor("Football") }]}
                    icon={<Ionicons name="football" size={24} color={Colors.card} />}
                  >
                    Football
                  </Button>
                  <Button
                    variant="default"
                    onPress={() => handleActivitySelect("Yoga")}
                    style={[styles.activityButton, { backgroundColor: getActivityColor("Yoga") }]}
                    icon={<Ionicons name="body" size={24} color={Colors.card} />}
                  >
                    Yoga
                  </Button>
                  <Button
                    variant="default"
                    onPress={() => handleActivitySelect("Pilates")}
                    style={[styles.activityButton, { backgroundColor: getActivityColor("Pilates") }]}
                    icon={<Ionicons name="body" size={24} color={Colors.card} />}
                  >
                    Pilates
                  </Button>
                </View>
                <View style={styles.historyButtonContainer}>
                  <Button
                    variant="outline"
                    onPress={() => setCurrentView('history')}
                    style={[styles.historyButton]}
                    icon={<Ionicons name="list" size={24} color={Colors.foreground} />}
                  >
                    View Activity History
                  </Button>
                </View>
              </ScrollView>
            )}
            {currentView === 'history' && userId && (
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <ActivityHistoryPage userId={userId} onClose={handleBackToSelection} />
              </ScrollView>
            )}
            {currentView === 'logging' && selectedCategory === "racket" ? (
              <ScrollView style={[styles.content, { backgroundColor: getActivityColor("Racket Sports") + '10' }]} showsVerticalScrollIndicator={false}>
                <LogRacketForm onLogSuccess={handleLogSuccess} />
              </ScrollView>
            ) : currentView === 'logging' && (
              <ScrollView
                style={[styles.content, { backgroundColor: selectedActivity ? getActivityColor(selectedActivity) + '10' : Colors.card }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                bounces={true}
                contentContainerStyle={{ paddingBottom: Spacing.lg }}
              >
                {selectedActivity === "Running" && <LogRunningForm onLogSuccess={handleLogSuccess} />}
                {selectedActivity === "Cycling" && <LogCyclingForm onLogSuccess={handleLogSuccess} />}
                {selectedActivity === "Swimming" && <LogSwimmingForm onLogSuccess={handleLogSuccess} />}
                {(selectedActivity === "Tennis" || selectedActivity === "Squash" || selectedActivity === "Padel" ||
                  selectedActivity === "Badminton" || selectedActivity === "Basketball" || selectedActivity === "Football" || selectedActivity === "Yoga" || selectedActivity === "Pilates") &&
                  <LogDurationForm activityType={selectedActivity} onLogSuccess={handleLogSuccess} />}
                </ScrollView>
              )}
            </View>

            {tempStatusMessage && (
              <View style={[styles.statusMessage, tempStatusMessage.type === 'success' ? styles.successMessage : styles.errorMessage]}>
                <Text style={styles.statusText}>{tempStatusMessage.message}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    height: '75%',
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
    // Subtle texture overlay
    backgroundImage: `
      radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0),
      linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)
    `,
    backgroundSize: '20px 20px, 100% 100%',
    // Vignette effect for depth
    position: 'relative',
    zIndex: 1,
  },
  vignetteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at center, transparent 60%, rgba(0,0,0,0.05) 100%)',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    pointerEvents: 'none',
  },
  innerContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    color: Colors.foreground,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  activitySelectionScroll: {
    flex: 1,
  },
  activitySelection: {
    padding: Spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  historyButtonContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  activityButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    minHeight: 90,
    width: '48%', // For 2-column grid
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  activityIcon: {
    marginBottom: Spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  formTitle: {
    fontSize: 20,
    color: Colors.foreground,
    fontFamily: 'Poppins-SemiBold',
  },
  backButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  form: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingBottom: Spacing.xl * 2, // Extra bottom padding for scroll accessibility
  },
  section: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  firstSection: {
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.foreground,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Poppins-Regular',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  timeInputs: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  timeInput: {
    flex: 1,
  },
  submitButton: {
    marginTop: Spacing.md,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  statusMessage: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  successMessage: {
    backgroundColor: Colors.success,
  },
  errorMessage: {
    backgroundColor: Colors.destructive,
  },
  statusText: {
    color: Colors.white,
    fontFamily: 'Poppins-SemiBold',
  },
  inputContainer: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: Spacing.md,
    top: '50%',
    marginTop: -10,
    zIndex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  inputWithIcon: {
    paddingLeft: Spacing.xl + Spacing.md,
  },
  quickSelect: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickButton: {
    flex: 1,
    minWidth: 60,
    marginHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickButtonText: {
    color: '#000000',
    fontFamily: 'Poppins-Regular',
  },
  quickButtonTextSmall: {
    color: '#000000',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    textAlign: 'center',
  },
  quickButtonTextExtraSmall: {
    color: '#000000',
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    textAlign: 'center',
  },
  sportSelection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  sportButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    minHeight: 80,
    width: '48%', // For 2-column grid
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondary, // Light grey background for depth
    ...Shadows.md, // Increased shadow for more depth
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: Colors.card,
  },
  dateIcon: {
    marginRight: Spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: Colors.foreground,
  },
  chevronIcon: {
    marginLeft: Spacing.sm,
  },
  paceDisplay: {
    fontSize: 36,
    fontFamily: 'Poppins-Light',
    letterSpacing: -1,
    color: Colors.foreground,
    textAlign: 'center',
    marginVertical: Spacing.xs,
  },
  paceUnit: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: Colors.mutedForeground,
  },
  paceText: {
    fontSize: 16,
    marginTop: Spacing.sm,
    fontFamily: 'Poppins-Regular',
    color: Colors.mutedForeground,
  },
  conversionText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginTop: Spacing.sm,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    opacity: 0.8,
  },
  paceContainer: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  paceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  paceDisplay: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.foreground,
  },
  pacePB: {
    color: '#FF6F00',
    fontFamily: 'Poppins-Black',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    fontSize: 18,
  },
  paceComparisonText: {
    fontSize: 12,
    color: Colors.foreground,
    marginTop: Spacing.xs,
    fontFamily: 'Poppins-Regular',
  },
  checkingPBIndicator: {
    marginTop: Spacing.xs,
  },
  pbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 3,
    borderColor: '#FFA000',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 16,
  },
  pbText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: 'Poppins-Black',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pbBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#FFA000',
    gap: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  pbTextSmall: {
    color: Colors.card,
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
  },
  dateQuickSelect: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.xs,
  },
  historyButton: {
    width: '70%',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyContainer: {
    flex: 1,
    paddingLeft: Spacing.xs,
    paddingRight: Spacing.md,
    paddingTop: Spacing.sm,
  },
  // Quick filter styles
  quickFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  quickFilterButton: {
    minWidth: 70,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  filterIconButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Filter modal styles
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  filterModalContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    maxHeight: '70%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterModalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.foreground,
  },
  filterModalClose: {
    padding: Spacing.xs,
  },
  filterModalContent: {
    padding: Spacing.lg,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterOptionButton: {
    minWidth: 100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins-Regular',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyText: {
    marginTop: Spacing.md,
    color: Colors.mutedForeground,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
  historyList: {
    flex: 1,
  },
  historyListContent: {
    paddingBottom: Spacing.lg,
  },
  historyItem: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    overflow: 'hidden',
  },
  historyItemGradient: {
    padding: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  historyItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginRight: Spacing.md,
  },
  activityInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityTypeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
  },
  activityTypeText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.2,
  },
  historyItemContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: 70,
    justifyContent: 'center',
  },
  metricText: {
    fontSize: 14,
    color: Colors.foreground,
    fontFamily: 'Poppins-Medium',
  },
  historyDateText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins-Regular',
  },
});