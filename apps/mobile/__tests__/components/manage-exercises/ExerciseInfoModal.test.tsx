import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import ExerciseInfoModal from '../../../components/manage-exercises/ExerciseInfoModal';
import { FetchedExerciseDefinition } from '../../../../../packages/data/src/types/exercise';

const mockExercise: FetchedExerciseDefinition = {
  id: '1',
  name: 'Bench Press',
  main_muscle: 'Chest',
  type: 'strength',
  category: 'Compound',
  description: 'A compound exercise targeting the chest muscles.',
  pro_tip: 'Keep your core tight throughout the movement.',
  video_url: 'https://www.youtube.com/watch?v=example',
  user_id: 'user-1',
  library_id: null,
  created_at: '2023-01-01T00:00:00Z',
  is_favorite: false,
  is_favorited_by_current_user: false,
  icon_url: null,
  movement_type: null,
  movement_pattern: null,
};

describe('ExerciseInfoModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible with exercise data', () => {
    render(
      <ExerciseInfoModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
      />
    );

    expect(screen.getByText('Bench Press Information')).toBeTruthy();
    expect(screen.getByText('Main Muscle')).toBeTruthy();
    expect(screen.getByText('Chest')).toBeTruthy();
    expect(screen.getByText('Category')).toBeTruthy();
    expect(screen.getByText('Compound')).toBeTruthy();
    expect(screen.getByText('Description')).toBeTruthy();
    expect(screen.getByText('A compound exercise targeting the chest muscles.')).toBeTruthy();
    expect(screen.getByText('Pro Tip')).toBeTruthy();
    expect(screen.getByText('Keep your core tight throughout the movement.')).toBeTruthy();
    expect(screen.getByText('Type')).toBeTruthy();
    expect(screen.getByText('strength')).toBeTruthy();
  });

  it('does not render when exercise is null', () => {
    render(
      <ExerciseInfoModal
        visible={true}
        onClose={mockOnClose}
        exercise={null}
      />
    );

    expect(screen.queryByText('Information')).toBeNull();
  });

  it('does not render when not visible', () => {
    render(
      <ExerciseInfoModal
        visible={false}
        onClose={mockOnClose}
        exercise={mockExercise}
      />
    );

    expect(screen.queryByText('Bench Press Information')).toBeNull();
  });

  it('calls onClose when close button is pressed', () => {
    render(
      <ExerciseInfoModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
      />
    );

    const closeButton = screen.getByTestId('close-button');
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders YouTube video when video_url is provided', () => {
    render(
      <ExerciseInfoModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
      />
    );

    // Since YoutubePlayer is mocked, we check for the container
    expect(screen.getByTestId('video-container')).toBeTruthy();
  });

  it('does not render video section when video_url is null', () => {
    const exerciseWithoutVideo = { ...mockExercise, video_url: null };

    render(
      <ExerciseInfoModal
        visible={true}
        onClose={mockOnClose}
        exercise={exerciseWithoutVideo}
      />
    );

    expect(screen.queryByTestId('video-container')).toBeNull();
  });

  it('handles modal close request', () => {
    render(
      <ExerciseInfoModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
      />
    );

    // Simulate hardware back press or other close requests
    const modal = screen.getByTestId('exercise-info-modal');
    fireEvent(modal, 'onRequestClose');

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders optional fields only when present', () => {
    const exerciseWithoutOptionals = {
      ...mockExercise,
      category: null,
      description: null,
      pro_tip: null,
    };

    render(
      <ExerciseInfoModal
        visible={true}
        onClose={mockOnClose}
        exercise={exerciseWithoutOptionals}
      />
    );

    expect(screen.queryByText('Category')).toBeNull();
    expect(screen.queryByText('Description')).toBeNull();
    expect(screen.queryByText('Pro Tip')).toBeNull();
    expect(screen.getByText('Main Muscle')).toBeTruthy();
    expect(screen.getByText('Type')).toBeTruthy();
  });
});