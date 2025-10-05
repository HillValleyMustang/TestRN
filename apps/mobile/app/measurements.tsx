import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from './contexts/auth-context';
import { useData } from './contexts/data-context';
import { useUnitConversion } from './hooks/use-unit-conversion';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function MeasurementsScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { saveBodyMeasurement } = useData();
  const { displayWeight, parseWeight, weightUnit } = useUnitConversion();

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [leftArm, setLeftArm] = useState('');
  const [rightArm, setRightArm] = useState('');
  const [leftThigh, setLeftThigh] = useState('');
  const [rightThigh, setRightThigh] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!userId) return;

    if (!weight && !bodyFat && !chest && !waist && !hips && !leftArm && !rightArm && !leftThigh && !rightThigh) {
      Alert.alert('No Data', 'Please enter at least one measurement');
      return;
    }

    setSaving(true);
    try {
      const measurement = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        measurement_date: date.toISOString(),
        weight_kg: weight ? parseWeight(weight) : undefined,
        body_fat_percentage: bodyFat ? parseFloat(bodyFat) : undefined,
        chest_cm: chest ? parseFloat(chest) : undefined,
        waist_cm: waist ? parseFloat(waist) : undefined,
        hips_cm: hips ? parseFloat(hips) : undefined,
        left_arm_cm: leftArm ? parseFloat(leftArm) : undefined,
        right_arm_cm: rightArm ? parseFloat(rightArm) : undefined,
        left_thigh_cm: leftThigh ? parseFloat(leftThigh) : undefined,
        right_thigh_cm: rightThigh ? parseFloat(rightThigh) : undefined,
        notes: notes || undefined,
        created_at: new Date().toISOString(),
      };

      await saveBodyMeasurement(measurement);
      Alert.alert('Success', 'Measurements saved!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error saving measurement:', error);
      Alert.alert('Error', 'Failed to save measurement. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Measurements</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date</Text>
          <TouchableOpacity 
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.datePickerText}>{formatDisplayDate(date)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Body Composition</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Weight ({weightUnit})</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="0"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Body Fat (%)</Text>
            <TextInput
              style={styles.input}
              value={bodyFat}
              onChangeText={setBodyFat}
              placeholder="0"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Measurements (cm)</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Chest</Text>
            <TextInput
              style={styles.input}
              value={chest}
              onChangeText={setChest}
              placeholder="0"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Waist</Text>
            <TextInput
              style={styles.input}
              value={waist}
              onChangeText={setWaist}
              placeholder="0"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Hips</Text>
            <TextInput
              style={styles.input}
              value={hips}
              onChangeText={setHips}
              placeholder="0"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Left Arm</Text>
            <TextInput
              style={styles.input}
              value={leftArm}
              onChangeText={setLeftArm}
              placeholder="0"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Right Arm</Text>
            <TextInput
              style={styles.input}
              value={rightArm}
              onChangeText={setRightArm}
              placeholder="0"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Left Thigh</Text>
            <TextInput
              style={styles.input}
              value={leftThigh}
              onChangeText={setLeftThigh}
              placeholder="0"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Right Thigh</Text>
            <TextInput
              style={styles.input}
              value={rightThigh}
              onChangeText={setRightThigh}
              placeholder="0"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Measurements'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#0a0',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  inputRow: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
  },
  datePickerText: {
    color: '#fff',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#0a0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    backgroundColor: '#555',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
