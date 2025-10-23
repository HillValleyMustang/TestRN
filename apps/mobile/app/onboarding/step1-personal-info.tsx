import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';

interface Step1Data {
  fullName: string;
  heightCm: number | null;
  heightFt: number | null;
  heightIn: number | null;
  weight: number | null;
  bodyFatPct: number | null;
  heightUnit: 'cm' | 'ft';
  weightUnit: 'kg' | 'lbs';
}

interface Step1Props {
  data: Step1Data;
  onDataChange: (data: Step1Data) => void;
  onNext: () => void;
}

export default function Step1PersonalInfo({
  data,
  onDataChange,
  onNext,
}: Step1Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateData = (field: keyof Step1Data, value: any) => {
    onDataChange({ ...data, [field]: value });
  };

  useEffect(() => {
    if (data.heightUnit === 'cm' && data.heightFt && data.heightIn) {
      const totalInches = data.heightFt * 12 + (data.heightIn || 0);
      const cm = Math.round(totalInches * 2.54);
      onDataChange({ ...data, heightCm: cm });
    } else if (data.heightUnit === 'ft' && data.heightCm) {
      const totalInches = data.heightCm / 2.54;
      const ft = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      onDataChange({ ...data, heightFt: ft, heightIn: inches });
    }
  }, [data, onDataChange]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!data.fullName || data.fullName.trim() === '') {
      newErrors.fullName = 'Your name is required';
    }

    if (data.heightUnit === 'cm') {
      if (!data.heightCm || data.heightCm < 100 || data.heightCm > 250) {
        newErrors.height = 'Height must be between 100-250 cm';
      }
    } else {
      if (!data.heightFt || data.heightFt < 3 || data.heightFt > 8) {
        newErrors.height = 'Height must be between 3-8 feet';
      }
    }

    if (
      !data.weight ||
      data.weight < 30 ||
      (data.weightUnit === 'kg' && data.weight > 300) ||
      (data.weightUnit === 'lbs' && data.weight > 660)
    ) {
      newErrors.weight =
        data.weightUnit === 'kg'
          ? 'Weight must be between 30-300 kg'
          : 'Weight must be between 66-660 lbs';
    }

    if (data.bodyFatPct && (data.bodyFatPct < 5 || data.bodyFatPct > 50)) {
      newErrors.bodyFat = 'Body fat % must be between 5-50%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      let finalHeightCm = data.heightCm;
      let finalHeightUnit = data.heightUnit;
      if (data.heightUnit === 'ft' && data.heightFt) {
        const totalInches = data.heightFt * 12 + (data.heightIn || 0);
        finalHeightCm = Math.round(totalInches * 2.54);
        finalHeightUnit = 'cm';
      }

      let finalWeightKg = data.weight;
      let finalWeightUnit = data.weightUnit;
      if (data.weightUnit === 'lbs' && data.weight) {
        finalWeightKg = Math.round(data.weight / 2.205);
        finalWeightUnit = 'kg';
      }

      onDataChange({
        ...data,
        heightCm: finalHeightCm,
        heightUnit: finalHeightUnit,
        weight: finalWeightKg,
        weightUnit: finalWeightUnit,
      });
      onNext();
    }
  };

  const isValid =
    data.fullName.trim() !== '' &&
    data.weight !== null &&
    (data.heightUnit === 'cm'
      ? data.heightCm && data.heightCm >= 100 && data.heightCm <= 250
      : data.heightFt && data.heightFt >= 3 && data.heightFt <= 8);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Let's Get to Know You</Text>
      <Text style={styles.subtitle}>
        Your personal details help us tailor your experience
      </Text>

      <View style={styles.section}>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={[styles.input, errors.fullName && styles.inputError]}
          value={data.fullName}
          onChangeText={text => updateData('fullName', text)}
          placeholder="Enter your name"
          placeholderTextColor="#666"
        />
        {errors.fullName && (
          <Text style={styles.errorText}>{errors.fullName}</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.rowHeader}>
          <Text style={styles.label}>Height *</Text>
          <View style={styles.unitToggle}>
            <Text
              style={[
                styles.unitText,
                data.heightUnit === 'cm' && styles.unitTextActive,
              ]}
            >
              cm
            </Text>
            <Switch
              value={data.heightUnit === 'ft'}
              onValueChange={val => updateData('heightUnit', val ? 'ft' : 'cm')}
              trackColor={{ false: '#10B981', true: '#10B981' }}
              thumbColor="#fff"
            />
            <Text
              style={[
                styles.unitText,
                data.heightUnit === 'ft' && styles.unitTextActive,
              ]}
            >
              ft
            </Text>
          </View>
        </View>

        {data.heightUnit === 'cm' ? (
          <TextInput
            style={[styles.input, errors.height && styles.inputError]}
            value={data.heightCm?.toString() || ''}
            onChangeText={text =>
              updateData('heightCm', text ? parseInt(text, 10) : null)
            }
            placeholder="e.g., 175"
            placeholderTextColor="#666"
            keyboardType="numeric"
          />
        ) : (
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <TextInput
                style={[styles.input, errors.height && styles.inputError]}
                value={data.heightFt?.toString() || ''}
                onChangeText={text =>
                  updateData('heightFt', text ? parseInt(text, 10) : null)
                }
                placeholder="Feet"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfInput}>
              <TextInput
                style={[styles.input, errors.height && styles.inputError]}
                value={data.heightIn?.toString() || ''}
                onChangeText={text =>
                  updateData('heightIn', text ? parseInt(text, 10) : null)
                }
                placeholder="Inches"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>
          </View>
        )}
        {errors.height && <Text style={styles.errorText}>{errors.height}</Text>}
      </View>

      <View style={styles.section}>
        <View style={styles.rowHeader}>
          <Text style={styles.label}>Weight *</Text>
          <View style={styles.unitToggle}>
            <Text
              style={[
                styles.unitText,
                data.weightUnit === 'kg' && styles.unitTextActive,
              ]}
            >
              kg
            </Text>
            <Switch
              value={data.weightUnit === 'lbs'}
              onValueChange={val =>
                updateData('weightUnit', val ? 'lbs' : 'kg')
              }
              trackColor={{ false: '#10B981', true: '#10B981' }}
              thumbColor="#fff"
            />
            <Text
              style={[
                styles.unitText,
                data.weightUnit === 'lbs' && styles.unitTextActive,
              ]}
            >
              lbs
            </Text>
          </View>
        </View>
        <TextInput
          style={[styles.input, errors.weight && styles.inputError]}
          value={data.weight?.toString() || ''}
          onChangeText={text =>
            updateData('weight', text ? parseInt(text, 10) : null)
          }
          placeholder={`e.g., ${data.weightUnit === 'kg' ? '70' : '154'}`}
          placeholderTextColor="#666"
          keyboardType="numeric"
        />
        {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Body Fat % (Optional)</Text>
        <TextInput
          style={[styles.input, errors.bodyFat && styles.inputError]}
          value={data.bodyFatPct?.toString() || ''}
          onChangeText={text =>
            updateData('bodyFatPct', text ? parseInt(text, 10) : null)
          }
          placeholder="e.g., 15"
          placeholderTextColor="#666"
          keyboardType="numeric"
        />
        {errors.bodyFat && (
          <Text style={styles.errorText}>{errors.bodyFat}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
        onPress={handleNext}
        disabled={!isValid}
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  unitTextActive: {
    color: '#10B981',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  nextButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
