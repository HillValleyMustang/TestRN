import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/Theme';
import { FontSize } from '../../constants/Typography';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../app/_lib/supabase';
import { useData } from '../../app/_contexts/data-context';
// Removed date picker import to avoid compatibility issues

type ActivityType = "Cycling" | "Swimming" | "Tennis" | "Squash" | "Padel" | "Badminton" | "Basketball" | "Soccer" | "Yoga" | "Running";
type ActivityCategory = "racket" | "individual";

interface ActivityLoggingModalProps {
  visible: boolean;
  onClose: () => void;
  onLogActivity?: (activity: any) => void;
}

const getActivityColor = (activity: string) => {
  const colors = {
    Running: '#E57373',
    Cycling: '#4DB6AC',
    Swimming: '#42A5F5',
    'Racket Sports': '#FFAB91',
    Basketball: '#FF9800',
    Soccer: '#66BB6A',
    Yoga: '#AB47BC',
    Tennis: '#FFD54F',
    Squash: '#EF5350',
    Padel: '#81C784',
    Badminton: '#BA68C8',
  };
  return colors[activity as keyof typeof colors] || Colors.primary;
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

// Form components with modern date picker
const LogRunningForm = ({ onLogSuccess, setTempStatusMessage }: {
  onLogSuccess: (newLog: any) => void;
  setTempStatusMessage: (message: any) => void;
}) => {
  const { userId } = useData();
  const [preferredDistanceUnit, setPreferredDistanceUnit] = useState<'km' | 'miles'>('km');
  const [distance, setDistance] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [logDate, setLogDate] = useState(new Date());
  const [isLogging, setIsLogging] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
          .eq('activity_type', 'Running')
          .order('log_date', { ascending: false });

        isPB = previousLogs?.every(log => log.avg_time === null || avgTimePerKm < log.avg_time) ?? false;
      }

      const { data: insertedData } = await supabase.from('activity_logs').insert([{
        user_id: userId,
        activity_type: 'Running',
        distance: `${distanceInKm} km`,
        time: timeString,
        avg_time: avgTimePerKm,
        is_pb: isPB,
        log_date: logDate.toISOString().split('T')[0],
      }]).select().single();

      setTempStatusMessage({ message: "Added!", type: 'success' });
      setDistance('');
      setMinutes('');
      setSeconds('');
      onLogSuccess(insertedData);
    } catch (error) {
      Alert.alert('Error', 'Failed to log running activity');
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <View style={styles.form}>
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Distance ({preferredDistanceUnit})</Text>
        <View style={styles.quickSelect}>
          <Button size="sm" variant="outline" onPress={() => setDistance('5')} style={[styles.quickButton, distance === '5' && { backgroundColor: getActivityColor("Running") }]}>5km</Button>
          <Button size="sm" variant="outline" onPress={() => setDistance('10')} style={[styles.quickButton, distance === '10' && { backgroundColor: getActivityColor("Running") }]}>10km</Button>
          <Button size="sm" variant="outline" onPress={() => setDistance('20')} style={[styles.quickButton, distance === '20' && { backgroundColor: getActivityColor("Running") }]}>20km</Button>
        </View>
        <TextInput
          style={styles.input}
          value={distance}
          onChangeText={setDistance}
          placeholder={`or enter custom in ${preferredDistanceUnit}`}
          keyboardType="numeric"
        />
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
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Date</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="calendar-outline" size={20} color={getActivityColor("Running")} style={styles.dateIcon} />
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            value={logDate.toISOString().split('T')[0]}
            onChangeText={(text) => {
              const date = new Date(text);
              if (!isNaN(date.getTime())) {
                setLogDate(date);
              }
            }}
            placeholder="YYYY-MM-DD"
            keyboardType="numeric"
          />
        </View>
      </Card>

      <Button onPress={handleSubmit} disabled={isLogging} style={[styles.submitButton, { backgroundColor: '#E57373' }]}>
        {isLogging ? "Logging..." : "Log Running"}
      </Button>
    </View>
  );
};

const LogCyclingForm = ({ onLogSuccess, setTempStatusMessage }: {
  onLogSuccess: (newLog: any) => void;
  setTempStatusMessage: (message: any) => void;
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

      setTempStatusMessage({ message: "Added!", type: 'success' });
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

  return (
    <View style={styles.form}>
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Distance ({preferredDistanceUnit})</Text>
        <View style={styles.quickSelect}>
          <Button variant="outline" onPress={() => setDistance('5')} style={[styles.quickButton, distance === '5' && { backgroundColor: getActivityColor("Cycling") }]}>5km</Button>
          <Button variant="outline" onPress={() => setDistance('10')} style={[styles.quickButton, distance === '10' && { backgroundColor: getActivityColor("Cycling") }]}>10km</Button>
          <Button variant="outline" onPress={() => setDistance('21')} style={[styles.quickButton, distance === '21' && { backgroundColor: getActivityColor("Cycling") }]}>Half</Button>
          <Button variant="outline" onPress={() => setDistance('42')} style={[styles.quickButton, distance === '42' && { backgroundColor: getActivityColor("Cycling") }]}>Full</Button>
        </View>
        <TextInput
          style={styles.input}
          value={distance}
          onChangeText={setDistance}
          placeholder={`or enter custom in ${preferredDistanceUnit}`}
          keyboardType="numeric"
        />
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
        <View style={styles.inputContainer}>
          <Ionicons name="calendar-outline" size={20} color={getActivityColor("Cycling")} style={styles.dateIcon} />
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            value={logDate.toISOString().split('T')[0]}
            onChangeText={(text) => {
              const date = new Date(text);
              if (!isNaN(date.getTime())) {
                setLogDate(date);
              }
            }}
            placeholder="YYYY-MM-DD"
            keyboardType="numeric"
          />
        </View>
      </Card>

      <Button onPress={handleSubmit} disabled={isLogging} style={[styles.submitButton, { backgroundColor: '#4DB6AC' }]}>
        {isLogging ? "Logging..." : "Log Cycling"}
      </Button>
    </View>
  );
};

const LogSwimmingForm = ({ onLogSuccess, setTempStatusMessage }: {
  onLogSuccess: (newLog: any) => void;
  setTempStatusMessage: (message: any) => void;
}) => {
  const { userId } = useData();
  const [lengths, setLengths] = useState('');
  const [poolSize, setPoolSize] = useState('');
  const [logDate, setLogDate] = useState(new Date());
  const [isLogging, setIsLogging] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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

      setTempStatusMessage({ message: "Added!", type: 'success' });
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
          <Button variant="outline" onPress={() => setLengths('20')} style={[styles.quickButton, lengths === '20' && { backgroundColor: getActivityColor("Swimming") }]}>20</Button>
          <Button variant="outline" onPress={() => setLengths('40')} style={[styles.quickButton, lengths === '40' && { backgroundColor: getActivityColor("Swimming") }]}>40</Button>
          <Button variant="outline" onPress={() => setLengths('60')} style={[styles.quickButton, lengths === '60' && { backgroundColor: getActivityColor("Swimming") }]}>60</Button>
          <Button variant="outline" onPress={() => setLengths('100')} style={[styles.quickButton, lengths === '100' && { backgroundColor: getActivityColor("Swimming") }]}>100</Button>
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
        <View style={styles.inputContainer}>
          <Ionicons name="calendar-outline" size={20} color={getActivityColor("Swimming")} style={styles.dateIcon} />
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            value={logDate.toISOString().split('T')[0]}
            onChangeText={(text) => {
              const date = new Date(text);
              if (!isNaN(date.getTime())) {
                setLogDate(date);
              }
            }}
            placeholder="YYYY-MM-DD"
            keyboardType="numeric"
          />
        </View>
      </Card>

      <Button onPress={handleSubmit} disabled={isLogging} style={[styles.submitButton, { backgroundColor: '#42A5F5' }]}>
        {isLogging ? "Logging..." : "Log Swimming"}
      </Button>
    </View>
  );
};

const LogRacketForm = ({ onLogSuccess, setTempStatusMessage }: {
  onLogSuccess: (newLog: any) => void;
  setTempStatusMessage: (message: any) => void;
}) => {
  const { userId } = useData();
  const [selectedSport, setSelectedSport] = useState<ActivityType | null>(null);
  const [duration, setDuration] = useState('');
  const [logDate, setLogDate] = useState(new Date());
  const [isLogging, setIsLogging] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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

      setTempStatusMessage({ message: "Added!", type: 'success' });
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
          <Button variant="outline" onPress={() => setDuration('30m')} style={[styles.quickButton, duration === '30m' && selectedSport && { backgroundColor: getActivityColor(selectedSport) }]}>30m</Button>
          <Button variant="outline" onPress={() => setDuration('45m')} style={[styles.quickButton, duration === '45m' && selectedSport && { backgroundColor: getActivityColor(selectedSport) }]}>45m</Button>
          <Button variant="outline" onPress={() => setDuration('1h')} style={[styles.quickButton, duration === '1h' && selectedSport && { backgroundColor: getActivityColor(selectedSport) }]}>1h</Button>
          <Button variant="outline" onPress={() => setDuration('2h')} style={[styles.quickButton, duration === '2h' && selectedSport && { backgroundColor: getActivityColor(selectedSport) }]}>2h</Button>
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
          <Button variant="outline" onPress={() => setLogDate(new Date())} style={[styles.quickButton, logDate.toDateString() === new Date().toDateString() && selectedSport && { backgroundColor: getActivityColor(selectedSport) }]}>Today</Button>
          <Button variant="outline" onPress={() => { const d = new Date(); d.setDate(d.getDate()-1); setLogDate(d); }} style={[styles.quickButton, (() => { const d = new Date(); d.setDate(d.getDate()-1); return logDate.toDateString() === d.toDateString(); })() && selectedSport && { backgroundColor: getActivityColor(selectedSport) }]}>Yday</Button>
          <Button variant="outline" onPress={() => { const d = new Date(); d.setDate(d.getDate()-7); setLogDate(d); }} style={[styles.quickButton, (() => { const d = new Date(); d.setDate(d.getDate()-7); return logDate.toDateString() === d.toDateString(); })() && selectedSport && { backgroundColor: getActivityColor(selectedSport) }]}>Last Week</Button>
        </View>
        <View style={styles.inputContainer}>
          <Ionicons name="calendar-outline" size={20} color={selectedSport ? getActivityColor(selectedSport) : Colors.muted} style={styles.dateIcon} />
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            value={logDate.toISOString().split('T')[0]}
            onChangeText={(text) => {
              const date = new Date(text);
              if (!isNaN(date.getTime())) {
                setLogDate(date);
              }
            }}
            placeholder="YYYY-MM-DD"
            keyboardType="numeric"
          />
        </View>
      </Card>

      <Button onPress={handleSubmit} disabled={isLogging || !selectedSport} style={[styles.submitButton, selectedSport && { backgroundColor: getActivityColor(selectedSport) }]} icon={<Ionicons name="checkmark" size={20} color={Colors.card} />}>
        {isLogging ? "Logging..." : selectedSport ? `Log ${selectedSport}` : "Select a sport"}
      </Button>
    </View>
  );
};

const LogDurationForm = ({ activityType, onLogSuccess, setTempStatusMessage }: {
  activityType: ActivityType;
  onLogSuccess: (newLog: any) => void;
  setTempStatusMessage: (message: any) => void;
}) => {
  const { userId } = useData();
  const [duration, setDuration] = useState('');
  const [logDate, setLogDate] = useState(new Date());
  const [isLogging, setIsLogging] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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

      setTempStatusMessage({ message: "Added!", type: 'success' });
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
          <Button variant="outline" onPress={() => setDuration('30m')} style={[styles.quickButton, duration === '30m' && { backgroundColor: getActivityColor(activityType) }]}>30m</Button>
          <Button variant="outline" onPress={() => setDuration('45m')} style={[styles.quickButton, duration === '45m' && { backgroundColor: getActivityColor(activityType) }]}>45m</Button>
          <Button variant="outline" onPress={() => setDuration('1h')} style={[styles.quickButton, duration === '1h' && { backgroundColor: getActivityColor(activityType) }]}>1h</Button>
          <Button variant="outline" onPress={() => setDuration('2h')} style={[styles.quickButton, duration === '2h' && { backgroundColor: getActivityColor(activityType) }]}>2h</Button>
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
          <Button variant="outline" onPress={() => setLogDate(new Date())} style={[styles.quickButton, logDate.toDateString() === new Date().toDateString() && { backgroundColor: getActivityColor(activityType) }]}>Today</Button>
          <Button variant="outline" onPress={() => { const d = new Date(); d.setDate(d.getDate()-1); setLogDate(d); }} style={[styles.quickButton, (() => { const d = new Date(); d.setDate(d.getDate()-1); return logDate.toDateString() === d.toDateString(); })() && { backgroundColor: getActivityColor(activityType) }]}>Yday</Button>
          <Button variant="outline" onPress={() => { const d = new Date(); d.setDate(d.getDate()-7); setLogDate(d); }} style={[styles.quickButton, (() => { const d = new Date(); d.setDate(d.getDate()-7); return logDate.toDateString() === d.toDateString(); })() && { backgroundColor: getActivityColor(activityType) }]}>Last Week</Button>
        </View>
        <View style={styles.inputContainer}>
          <Ionicons name="calendar-outline" size={20} color={getActivityColor(activityType)} style={styles.dateIcon} />
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            value={logDate.toISOString().split('T')[0]}
            onChangeText={(text) => {
              const date = new Date(text);
              if (!isNaN(date.getTime())) {
                setLogDate(date);
              }
            }}
            placeholder="YYYY-MM-DD"
            keyboardType="numeric"
          />
        </View>
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
  onLogActivity
}: ActivityLoggingModalProps) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | null>(null);
  const [tempStatusMessage, setTempStatusMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { userId } = useData();

  // Clear temp message after timeout
  useEffect(() => {
    if (tempStatusMessage) {
      const timer = setTimeout(() => setTempStatusMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [tempStatusMessage]);

  const getCurrentStep = () => {
    if (!selectedActivity && !selectedCategory) return 1;
    return 2;
  };

  const handleActivitySelect = (activity: ActivityType) => {
    setSelectedActivity(activity);
  };

  const handleBackToSelection = () => {
    if (selectedCategory === "racket") {
      setSelectedCategory(null);
    } else {
      setSelectedActivity(null);
    }
  };

  const handleLogSuccess = (newLog: any) => {
    setSelectedActivity(null);
    setSelectedCategory(null);
    setTempStatusMessage({ message: "Added!", type: 'success' });
    // Call the parent's onLogActivity if provided
    if (onLogActivity) {
      onLogActivity(newLog);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.modalContainer}>
          <Pressable style={styles.innerContainer} onPress={(e: any) => e.stopPropagation()}>
            <View style={styles.header}>
              {(selectedActivity || selectedCategory) && (
                <Pressable onPress={handleBackToSelection} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
                </Pressable>
              )}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={styles.title}>
                  {!selectedActivity && !selectedCategory ? "Log New Activity" :
                   selectedCategory === "racket" ? "Log Racket Sport" :
                   `Log ${selectedActivity}`}
                </Text>
                <View style={styles.progressContainer}>
                  {[1,2,3].map(step => (
                    <View key={step} style={[styles.progressDot, step <= getCurrentStep() ? { backgroundColor: selectedActivity ? getActivityColor(selectedActivity) : Colors.primary } : styles.progressDotInactive]} />
                  ))}
                </View>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.foreground} />
              </Pressable>
            </View>

            {!selectedActivity && !selectedCategory ? (
              <View style={styles.activitySelection}>
                <Button
                  variant="default"
                  onPress={() => handleActivitySelect("Running")}
                  style={[styles.activityButton, { backgroundColor: getActivityColor("Running") }]}
                  icon={<Ionicons name="walk" size={32} color={Colors.card} />}
                >
                  Running
                </Button>
                <Button
                  variant="default"
                  onPress={() => handleActivitySelect("Cycling")}
                  style={[styles.activityButton, { backgroundColor: getActivityColor("Cycling") }]}
                  icon={<Ionicons name="bicycle" size={32} color={Colors.card} />}
                >
                  Cycling
                </Button>
                <Button
                  variant="default"
                  onPress={() => handleActivitySelect("Swimming")}
                  style={[styles.activityButton, { backgroundColor: getActivityColor("Swimming") }]}
                  icon={<Ionicons name="water" size={32} color={Colors.card} />}
                >
                  Swimming
                </Button>
                <Button
                  variant="default"
                  onPress={() => setSelectedCategory("racket")}
                  style={[styles.activityButton, { backgroundColor: getActivityColor("Racket Sports") }]}
                  icon={<Ionicons name="tennisball" size={32} color={Colors.card} />}
                >
                  Racket Sports
                </Button>
                <Button
                  variant="default"
                  onPress={() => handleActivitySelect("Basketball")}
                  style={[styles.activityButton, { backgroundColor: getActivityColor("Basketball") }]}
                  icon={<Ionicons name="basketball" size={32} color={Colors.card} />}
                >
                  Basketball
                </Button>
                <Button
                  variant="default"
                  onPress={() => handleActivitySelect("Soccer")}
                  style={[styles.activityButton, { backgroundColor: getActivityColor("Soccer") }]}
                  icon={<Ionicons name="football" size={32} color={Colors.card} />}
                >
                  Soccer
                </Button>
                <Button
                  variant="default"
                  onPress={() => handleActivitySelect("Yoga")}
                  style={[styles.activityButton, { backgroundColor: getActivityColor("Yoga") }]}
                  icon={<Ionicons name="body" size={32} color={Colors.card} />}
                >
                  Yoga
                </Button>
              </View>
            ) : selectedCategory === "racket" ? (
              <ScrollView style={[styles.content, { backgroundColor: getActivityColor("Racket Sports") + '10' }]} showsVerticalScrollIndicator={false}>
                <LogRacketForm onLogSuccess={handleLogSuccess} setTempStatusMessage={setTempStatusMessage} />
              </ScrollView>
            ) : (
              <ScrollView style={[styles.content, { backgroundColor: selectedActivity ? getActivityColor(selectedActivity) + '10' : Colors.card }]} showsVerticalScrollIndicator={false}>
                {selectedActivity === "Running" && <LogRunningForm onLogSuccess={handleLogSuccess} setTempStatusMessage={setTempStatusMessage} />}
                {selectedActivity === "Cycling" && <LogCyclingForm onLogSuccess={handleLogSuccess} setTempStatusMessage={setTempStatusMessage} />}
                {selectedActivity === "Swimming" && <LogSwimmingForm onLogSuccess={handleLogSuccess} setTempStatusMessage={setTempStatusMessage} />}
                {(selectedActivity === "Tennis" || selectedActivity === "Squash" || selectedActivity === "Padel" ||
                  selectedActivity === "Badminton" || selectedActivity === "Basketball" || selectedActivity === "Soccer" || selectedActivity === "Yoga") &&
                  <LogDurationForm activityType={selectedActivity} onLogSuccess={handleLogSuccess} setTempStatusMessage={setTempStatusMessage} />}
              </ScrollView>
            )}

            {tempStatusMessage && (
              <View style={[styles.statusMessage, tempStatusMessage.type === 'success' ? styles.successMessage : styles.errorMessage]}>
                <Text style={styles.statusText}>{tempStatusMessage.message}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    height: '85%',
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
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
  },
  closeButton: {
    padding: Spacing.xs,
  },
  activitySelection: {
    padding: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  activityButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    minHeight: 100,
    width: '48%', // For 2-column grid
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  activityIcon: {
    marginBottom: Spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
  },
  backButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  form: {
    gap: Spacing.sm,
  },
  section: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
    fontFamily: 'Poppins-Medium',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.foreground,
    backgroundColor: Colors.card,
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
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  progressDotInactive: {
    backgroundColor: Colors.muted,
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
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    minHeight: 100,
    width: '48%', // For 2-column grid
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
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
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: Colors.foreground,
  },
  chevronIcon: {
    marginLeft: Spacing.sm,
  },
  paceText: {
    fontSize: 14,
    marginTop: Spacing.sm,
    fontFamily: 'Poppins-Regular',
  },
});