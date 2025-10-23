import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';

interface Step4Data {
  gymName: string;
  equipmentMethod: 'photo' | 'skip' | null;
  consentGiven: boolean;
}

interface Step4Props {
  data: Step4Data;
  onDataChange: (data: Step4Data) => void;
  onNext: () => void;
  onBack: () => void;
  onSkipPhoto: () => void;
}

export default function Step4GymConsent({
  data,
  onDataChange,
  onNext,
  onBack,
  onSkipPhoto,
}: Step4Props) {
  const isValid =
    data.gymName.trim() !== '' && data.equipmentMethod && data.consentGiven;

  const handleContinue = () => {
    if (data.equipmentMethod === 'photo') {
      onNext();
    } else {
      onSkipPhoto();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Gym Setup & Consent</Text>
      <Text style={styles.subtitle}>
        Let's set up your gym equipment and confirm your consent
      </Text>

      <View style={styles.section}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>1</Text>
        </View>
        <Text style={styles.sectionTitle}>Your Gym's Name *</Text>
        <TextInput
          style={styles.input}
          value={data.gymName}
          onChangeText={text => onDataChange({ ...data, gymName: text })}
          placeholder="e.g., Home Gym, Fitness First"
          placeholderTextColor="#666"
        />
        <Text style={styles.hint}>Give your primary gym a name</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>2</Text>
        </View>
        <Text style={styles.sectionTitle}>Equipment Setup *</Text>
        <Text style={styles.description}>
          How would you like to set up your gym equipment?
        </Text>

        <TouchableOpacity
          style={[
            styles.methodCard,
            data.equipmentMethod === 'photo' && styles.methodCardActive,
          ]}
          onPress={() => onDataChange({ ...data, equipmentMethod: 'photo' })}
        >
          <View style={styles.methodHeader}>
            <Text style={styles.methodIcon}>📸</Text>
            <View style={styles.methodContent}>
              <Text
                style={[
                  styles.methodTitle,
                  data.equipmentMethod === 'photo' && styles.methodTitleActive,
                ]}
              >
                AI-Powered Photo Analysis
              </Text>
              <Text style={styles.methodDesc}>
                Upload photos, let AI identify your equipment
              </Text>
            </View>
            {data.equipmentMethod === 'photo' && (
              <View style={styles.radioSelected} />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.methodCard,
            data.equipmentMethod === 'skip' && styles.methodCardActive,
          ]}
          onPress={() => onDataChange({ ...data, equipmentMethod: 'skip' })}
        >
          <View style={styles.methodHeader}>
            <Text style={styles.methodIcon}>⏭️</Text>
            <View style={styles.methodContent}>
              <Text
                style={[
                  styles.methodTitle,
                  data.equipmentMethod === 'skip' && styles.methodTitleActive,
                ]}
              >
                Skip for Now
              </Text>
              <Text style={styles.methodDesc}>
                Use standard equipment, customize later
              </Text>
            </View>
            {data.equipmentMethod === 'skip' && (
              <View style={styles.radioSelected} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>3</Text>
        </View>
        <Text style={styles.sectionTitle}>Data Consent *</Text>
        <TouchableOpacity
          style={styles.consentRow}
          onPress={() =>
            onDataChange({ ...data, consentGiven: !data.consentGiven })
          }
        >
          <View
            style={[
              styles.checkbox,
              data.consentGiven && styles.checkboxActive,
            ]}
          >
            {data.consentGiven && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.consentText}>
            I consent to storing my data for personalized fitness
            recommendations
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
          onPress={handleContinue}
          disabled={!isValid}
        >
          <Text style={styles.nextButtonText}>
            {data.equipmentMethod === 'photo' ? 'Next' : 'Finish'}
          </Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 32,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#14B8A6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  numberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  description: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  methodCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
  },
  methodCardActive: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: '#0a1a14',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  methodTitleActive: {
    color: '#10B981',
  },
  methodDesc: {
    fontSize: 13,
    color: '#888',
  },
  radioSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#333',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  consentText: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
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
