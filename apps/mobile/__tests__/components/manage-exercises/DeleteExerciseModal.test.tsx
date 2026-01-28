import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import DeleteExerciseModal from '../../../components/manage-exercises/DeleteExerciseModal';
import { FetchedExerciseDefinition } from '../../../../../packages/data/src/types/exercise';

const mockExercise: FetchedExerciseDefinition = {
  id: '1',
  name: 'Bench Press',
  main_muscle: 'Pectorals',
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

describe('DeleteExerciseModal', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirmDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible with exercise data', () => {
    render(
      <DeleteExerciseModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        onConfirmDelete={mockOnConfirmDelete}
      />
    );

    expect(screen.getByText('Delete Exercise')).toBeTruthy();
    expect(screen.getByText('Are you sure you want to delete "Bench Press"? This action cannot be undone.')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('does not render when exercise is null', () => {
    render(
      <DeleteExerciseModal
        visible={true}
        onClose={mockOnClose}
        exercise={null}
        onConfirmDelete={mockOnConfirmDelete}
      />
    );

    expect(screen.queryByText('Delete Exercise')).toBeNull();
  });

  it('does not render when not visible', () => {
    render(
      <DeleteExerciseModal
        visible={false}
        onClose={mockOnClose}
        exercise={mockExercise}
        onConfirmDelete={mockOnConfirmDelete}
      />
    );

    expect(screen.queryByText('Delete Exercise')).toBeNull();
  });

  it('calls onClose when cancel button is pressed', () => {
    render(
      <DeleteExerciseModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        onConfirmDelete={mockOnConfirmDelete}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnConfirmDelete).not.toHaveBeenCalled();
  });

  it('calls onConfirmDelete and onClose when delete button is pressed', async () => {
    mockOnConfirmDelete.mockResolvedValue(undefined);

    render(
      <DeleteExerciseModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        onConfirmDelete={mockOnConfirmDelete}
      />
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.press(deleteButton);

    expect(mockOnConfirmDelete).toHaveBeenCalledWith(mockExercise);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when deleting', () => {
    render(
      <DeleteExerciseModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        onConfirmDelete={mockOnConfirmDelete}
        loading={true}
      />
    );

    expect(screen.getByText('Cancel')).toBeTruthy();
    // The delete button should show loading indicator instead of text
    expect(screen.queryByText('Delete')).toBeNull();
  });

  it('disables buttons when loading', () => {
    render(
      <DeleteExerciseModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        onConfirmDelete={mockOnConfirmDelete}
        loading={true}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    const deleteButton = screen.getByTestId('delete-button');

    expect(cancelButton.props.disabled).toBe(true);
    expect(deleteButton.props.disabled).toBe(true);
  });

  it('handles modal close request', () => {
    render(
      <DeleteExerciseModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        onConfirmDelete={mockOnConfirmDelete}
      />
    );

    const modal = screen.getByTestId('delete-exercise-modal');
    fireEvent(modal, 'onRequestClose');

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('handles delete error gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockOnConfirmDelete.mockRejectedValue(new Error('Delete failed'));

    render(
      <DeleteExerciseModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        onConfirmDelete={mockOnConfirmDelete}
      />
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.press(deleteButton);

    expect(mockOnConfirmDelete).toHaveBeenCalledWith(mockExercise);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Delete failed:', expect.any(Error));
    // Modal should stay open on error
    expect(mockOnClose).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});