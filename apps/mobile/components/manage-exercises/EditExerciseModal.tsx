import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { FetchedExerciseDefinition } from '../../../../packages/data/src/types/exercise';
import { ExerciseForm } from './ExerciseForm';

interface EditExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  exercise: FetchedExerciseDefinition | null;
  onSaveSuccess: () => void;
}

export const EditExerciseModal: React.FC<EditExerciseModalProps> = ({
  visible,
  onClose,
  exercise,
  onSaveSuccess,
}) => {
  const handleCancelEdit = () => {
    onClose();
  };

  const handleSaveSuccessAndClose = () => {
    onSaveSuccess();
    onClose();
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
          <Text style={styles.title}>
            {exercise ? `Edit "${exercise.name}"` : "Add New Exercise"}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <ExerciseForm
              editingExercise={exercise}
              onCancelEdit={handleCancelEdit}
              onSaveSuccess={handleSaveSuccessAndClose}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  title: {
    ...TextStyles.h3,
    color: Colors.foreground,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32, // Same width as close button for centering
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
});

export default EditExerciseModal;