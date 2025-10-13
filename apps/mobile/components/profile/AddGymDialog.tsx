/**
 * Add Gym Dialog - Settings Tab
 * Comprehensive gym creation with 4 source paths:
 * 1. AI Analysis (photo upload + OpenAI Vision detection)
 * 2. App Defaults (copy default equipment/exercises)
 * 3. Copy From Existing Gym (copy from user's existing gym)
 * 4. Start Empty (no equipment/exercises)
 * Reference: Profile_Settings_v1 playbook
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { useSettingsStrings } from '../../localization/useSettingsStrings';

type SourceOption = 'App Defaults' | 'Copy From Existing Gym' | 'Start Empty';

interface Gym {
  id: string;
  name: string;
}

interface AddGymDialogProps {
  visible: boolean;
  onClose: () => void;
  existingGyms: Gym[];
  onCreateGym: (gymData: {
    name: string;
    imageUri?: string;
    useAI: boolean;
    source: SourceOption;
    copyFromGymId?: string;
    setAsActive: boolean;
  }) => Promise<void>;
}

export function AddGymDialog({
  visible,
  onClose,
  existingGyms,
  onCreateGym,
}: AddGymDialogProps) {
  const strings = useSettingsStrings().my_gyms;
  
  const [name, setName] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(false);
  const [source, setSource] = useState<SourceOption>('App Defaults');
  const [copyFromGymId, setCopyFromGymId] = useState<string>('');
  const [setAsActive, setSetAsActive] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (visible) {
      // Reset form when dialog opens
      setName('');
      setImageUri(null);
      setUseAI(false);
      setSource('App Defaults');
      setCopyFromGymId('');
      setSetAsActive(false);
    }
  }, [visible]);

  const handleChooseImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Camera roll permission is required to choose an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleRemoveImage = () => {
    setImageUri(null);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a gym name.');
      return;
    }

    if (source === 'Copy From Existing Gym' && !copyFromGymId) {
      Alert.alert('Validation Error', 'Please select a gym to copy from.');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateGym({
        name: name.trim(),
        imageUri: imageUri || undefined,
        useAI,
        source,
        copyFromGymId: source === 'Copy From Existing Gym' ? copyFromGymId : undefined,
        setAsActive,
      });
      onClose();
    } catch (error) {
      console.error('[AddGymDialog] Create error:', error);
      Alert.alert('Error', 'Failed to create gym. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title}>{strings.create_title}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Name Input */}
          <View style={styles.field}>
            <Text style={styles.label}>{strings.name_label}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={strings.name_placeholder}
              placeholderTextColor={Colors.mutedForeground}
            />
          </View>

          {/* Gym Image */}
          <View style={styles.field}>
            <Text style={styles.label}>{strings.image_label}</Text>
            {strings.image_desc && (
              <Text style={styles.desc}>{strings.image_desc}</Text>
            )}
            {imageUri ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: imageUri }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                >
                  <Text style={styles.removeImageText}>{strings.image_remove}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.imagePicker} onPress={handleChooseImage}>
                <Ionicons name="camera" size={32} color={Colors.mutedForeground} />
                <Text style={styles.imagePickerText}>{strings.image_pick}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* AI Analyse Checkbox */}
          {imageUri && (
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setUseAI(!useAI)}
            >
              <View style={[styles.checkbox, useAI && styles.checkboxChecked]}>
                {useAI && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <View style={styles.checkboxLabel}>
                <Text style={styles.checkboxText}>{strings.ai_analyse_label}</Text>
                {strings.ai_analyse_desc && (
                  <Text style={styles.desc}>{strings.ai_analyse_desc}</Text>
                )}
              </View>
            </TouchableOpacity>
          )}

          {/* Starting Exercises Source */}
          <View style={styles.field}>
            <Text style={styles.label}>{strings.source_label}</Text>
            {strings.source_desc && (
              <Text style={styles.desc}>{strings.source_desc}</Text>
            )}
            {strings.source_options.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.radioRow}
                onPress={() => setSource(option as SourceOption)}
              >
                <View style={[styles.radio, source === option && styles.radioSelected]}>
                  {source === option && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.radioText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Copy From Picker (shown when "Copy From Existing Gym" selected) */}
          {source === 'Copy From Existing Gym' && existingGyms.length > 0 && (
            <View style={styles.field}>
              <Text style={styles.label}>{strings.copy_from_label}</Text>
              {existingGyms.map((gym) => (
                <TouchableOpacity
                  key={gym.id}
                  style={styles.radioRow}
                  onPress={() => setCopyFromGymId(gym.id)}
                >
                  <View style={[styles.radio, copyFromGymId === gym.id && styles.radioSelected]}>
                    {copyFromGymId === gym.id && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.radioText}>{gym.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Set as Active Checkbox */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setSetAsActive(!setAsActive)}
          >
            <View style={[styles.checkbox, setAsActive && styles.checkboxChecked]}>
              {setAsActive && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxText}>{strings.set_active_label}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
            disabled={isCreating}
          >
            <Text style={styles.cancelButtonText}>{strings.create_cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.createButton]}
            onPress={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonText}>{strings.create_confirm}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.foreground,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  field: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 8,
  },
  desc: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.foreground,
    backgroundColor: '#FFFFFF',
  },
  imagePicker: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  imagePickerText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginTop: 8,
  },
  imagePreview: {
    alignItems: 'center',
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.md,
  },
  removeImageButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.muted,
  },
  removeImageText: {
    fontSize: 14,
    color: Colors.foreground,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.blue600,
    borderColor: Colors.blue600,
  },
  checkboxLabel: {
    flex: 1,
  },
  checkboxText: {
    fontSize: 15,
    color: Colors.foreground,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.blue600,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.blue600,
  },
  radioText: {
    fontSize: 15,
    color: Colors.foreground,
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.muted,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  createButton: {
    backgroundColor: Colors.blue600,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
