import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AddToTPathModal } from '../../../components/manage-exercises/AddToTPathModal';
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

const mockUserWorkouts = [
  { id: 'workout-1', template_name: 'Upper Body Strength', is_bonus: true, parent_t_path_id: 'tpath-1' },
  { id: 'workout-2', template_name: 'Lower Body Power', is_bonus: true, parent_t_path_id: 'tpath-1' },
];

describe('AddToTPathModal', () => {
  const mockOnClose = jest.fn();
  const mockOnAddSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible with exercise data', async () => {
    render(
      <AddToTPathModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        onAddSuccess={mockOnAddSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Add to Workout')).toBeTruthy();
      expect(screen.getByText('"Bench Press"')).toBeTruthy();
      expect(screen.getByText('Select one of your personalised workouts to add this exercise to.')).toBeTruthy();
    });
  });

  it('does not render when exercise is null', () => {
    render(
      <AddToTPathModal
        visible={true}
        onClose={mockOnClose}
        exercise={null}
        onAddSuccess={mockOnAddSuccess}
      />
    );

    expect(screen.queryByText('Add to Workout')).toBeNull();
  });

  it('does not render when not visible', () => {
    render(
      <AddToTPathModal
        visible={false}
        onClose={mockOnClose}
        exercise={mockExercise}
        onAddSuccess={mockOnAddSuccess}
      />
    );

    expect(screen.queryByText('Add to Workout')).toBeNull();
  });

  it('calls onClose when close button is pressed', async () => {
    render(
      <AddToTPathModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        onAddSuccess={mockOnAddSuccess}
      />
    );

    await waitFor(() => {
      const closeButton = screen.getByTestId('close-button');
      fireEvent.press(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows loading state initially', async () => {
    render(
      <AddToTPathModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        onAddSuccess={mockOnAddSuccess}
      />
    );

    expect(screen.getByText('Loading your workouts...')).toBeTruthy();
  });

  it('shows empty state when no workouts available', async () => {
    // Mock the supabase call to return no workouts
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: { active_t_path_id: 'tpath-1' }, error: null })),
          })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    };

    // Override the mock in jest.setup.js
    jest.mock('../../../app/_contexts/auth-context', () => ({
      useAuth: () => ({
        userId: 'test-user-id',
        supabase: mockSupabase,
      }),
    }));

    render(
      <AddToTPathModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        onAddSuccess={mockOnAddSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No workouts available')).toBeTruthy();
      expect(screen.getByText('You don\'t have any workouts in your active Transformation Path.')).toBeTruthy();
    });
  });

  it('shows workouts list when workouts are available', async () => {
    // Mock the supabase call to return workouts
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: { active_t_path_id: 'tpath-1' }, error: null })),
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ data: mockUserWorkouts, error: null })),
            })),
          })),
        })),
      })),
    };

    jest.mock('../../../app/_contexts/auth-context', () => ({
      useAuth: () => ({
        userId: 'test-user-id',
        supabase: mockSupabase,
      }),
    }));

    render(
      <AddToTPathModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        onAddSuccess={mockOnAddSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Upper Body Strength')).toBeTruthy();
      expect(screen.getByText('Lower Body Power')).toBeTruthy();
    });
  });

  it('allows selecting a workout', async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: { active_t_path_id: 'tpath-1' }, error: null })),
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ data: mockUserWorkouts, error: null })),
            })),
          })),
        })),
      })),
    };

    jest.mock('../../../app/_contexts/auth-context', () => ({
      useAuth: () => ({
        userId: 'test-user-id',
        supabase: mockSupabase,
      }),
    }));

    render(
      <AddToTPathModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        onAddSuccess={mockOnAddSuccess}
      />
    );

    await waitFor(() => {
      const workoutItem = screen.getByText('Upper Body Strength');
      fireEvent.press(workoutItem);
      // Check if selection is indicated (checkmark should appear)
      expect(screen.getByTestId('checkmark-upper-body')).toBeTruthy();
    });
  });

  it('handles modal close request', async () => {
    render(
      <AddToTPathModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        onAddSuccess={mockOnAddSuccess}
      />
    );

    await waitFor(() => {
      const modal = screen.getByTestId('add-to-tpath-modal');
      fireEvent(modal, 'onRequestClose');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});