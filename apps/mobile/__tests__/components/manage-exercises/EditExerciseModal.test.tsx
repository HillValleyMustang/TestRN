import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { View, Pressable, Text } from 'react-native';
import { EditExerciseModal } from '../../../components/manage-exercises/EditExerciseModal';
import { FetchedExerciseDefinition } from '../../../../../packages/data/src/types/exercise';

const mockExercise: FetchedExerciseDefinition = {
  id: '1',
  name: 'Bench Press',
  main_muscle: 'Chest',
  type: 'strength',
  category: 'Compound',
  description: 'A compound exercise targeting the chest muscles.',
  pro_tip: 'Keep your core tight throughout the movement.',
  video_url: null,
  user_id: 'user-1',
  library_id: null,
  created_at: '2023-01-01T00:00:00Z',
  is_favorite: false,
  is_favorited_by_current_user: false,
  icon_url: null,
  movement_type: null,
  movement_pattern: null,
};

describe('EditExerciseModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSaveSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible with exercise data', () => {
    render(
      <EditExerciseModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        onSaveSuccess={mockOnSaveSuccess}
      />
    );

    expect(screen.getByText('Edit "Bench Press"')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('renders add mode when exercise is null', () => {
    render(
      <EditExerciseModal
        visible={true}
        onClose={mockOnClose}
        exercise={null}
        onSaveSuccess={mockOnSaveSuccess}
      />
    );

    expect(screen.getByText('Add New Exercise')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    render(
      <EditExerciseModal
        visible={false}
        onClose={mockOnClose}
        exercise={mockExercise}
        onSaveSuccess={mockOnSaveSuccess}
      />
    );

    expect(screen.queryByText('Edit "Bench Press"')).toBeNull();
  });

  it('calls onClose when close button is pressed', () => {
    render(
      <EditExerciseModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        onSaveSuccess={mockOnSaveSuccess}
      />
    );

    const closeButton = screen.getByTestId('close-button');
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('handles modal close request', () => {
    render(
      <EditExerciseModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        onSaveSuccess={mockOnSaveSuccess}
      />
    );

    const modal = screen.getByTestId('edit-exercise-modal');
    fireEvent(modal, 'onRequestClose');

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSaveSuccess and onClose when form save is successful', () => {
    // Mock the ExerciseForm component
    jest.mock('../../../components/manage-exercises/ExerciseForm', () => ({
      ExerciseForm: ({ onSaveSuccess }: any) => (
        <View data-testid="exercise-form">
          <Pressable
            data-testid="save-button"
            onPress={() => onSaveSuccess()}
          >
            <Text>Save</Text>
          </Pressable>
        </View>
      ),
    }));

    render(
      <EditExerciseModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        onSaveSuccess={mockOnSaveSuccess}
      />
    );

    const saveButton = screen.getByTestId('save-button');
    fireEvent.press(saveButton);

    expect(mockOnSaveSuccess).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('passes exercise data to ExerciseForm', () => {
    render(
      <EditExerciseModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        onSaveSuccess={mockOnSaveSuccess}
      />
    );

    // Verify that the ExerciseForm receives the correct props
    const exerciseForm = screen.getByTestId('exercise-form');
    expect(exerciseForm).toBeTruthy();
  });
});