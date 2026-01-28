import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ManageGymsModal } from '../../../components/manage-exercises/ManageGymsModal';
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

const mockUserGyms = [
  { id: 'gym-1', name: 'Home Gym' },
  { id: 'gym-2', name: 'Commercial Gym' },
  { id: 'gym-3', name: 'Outdoor Park' },
];

describe('ManageGymsModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSaveSuccess = jest.fn();
  const initialSelectedGymIds = new Set(['gym-1']);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible with exercise data', () => {
    render(
      <ManageGymsModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        userGyms={mockUserGyms}
        initialSelectedGymIds={initialSelectedGymIds}
        onSaveSuccess={mockOnSaveSuccess}
      />
    );

    expect(screen.getByText('Manage Gyms for "Bench Press"')).toBeTruthy();
    expect(screen.getByText('Select the gyms where this exercise is available.')).toBeTruthy();
    expect(screen.getByText('Home Gym')).toBeTruthy();
    expect(screen.getByText('Commercial Gym')).toBeTruthy();
    expect(screen.getByText('Outdoor Park')).toBeTruthy();
  });

  it('does not render when exercise is null', () => {
    render(
      <ManageGymsModal
        visible={true}
        onClose={mockOnClose}
        exercise={null}
        userGyms={mockUserGyms}
        initialSelectedGymIds={initialSelectedGymIds}
        onSaveSuccess={mockOnSaveSuccess}
      />
    );

    expect(screen.queryByText('Manage Gyms for')).toBeNull();
  });

  it('does not render when not visible', () => {
    render(
      <ManageGymsModal
        visible={false}
        onClose={mockOnClose}
        exercise={mockExercise}
        userGyms={mockUserGyms}
        initialSelectedGymIds={initialSelectedGymIds}
        onSaveSuccess={mockOnSaveSuccess}
      />
    );

    expect(screen.queryByText('Manage Gyms for "Bench Press"')).toBeNull();
  });

  it('calls onClose when close button is pressed', () => {
    render(
      <ManageGymsModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        userGyms={mockUserGyms}
        initialSelectedGymIds={initialSelectedGymIds}
        onSaveSuccess={mockOnSaveSuccess}
      />
    );

    const closeButton = screen.getByTestId('close-button');
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when no gyms available', () => {
    render(
      <ManageGymsModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        userGyms={[]}
        initialSelectedGymIds={new Set()}
        onSaveSuccess={mockOnSaveSuccess}
      />
    );

    expect(screen.getByText('No gyms found')).toBeTruthy();
    expect(screen.getByText('You haven\'t created any gyms yet. Go to your profile settings to add one.')).toBeTruthy();
  });

  it('allows toggling gym selection', () => {
    render(
      <ManageGymsModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        userGyms={mockUserGyms}
        initialSelectedGymIds={initialSelectedGymIds}
        onSaveSuccess={mockOnSaveSuccess}
      />
    );

    // Initially Home Gym should be selected
    const homeGymItem = screen.getByText('Home Gym');
    expect(screen.getByTestId('checkbox-home-gym-selected')).toBeTruthy();

    // Click to deselect Home Gym
    fireEvent.press(homeGymItem);
    expect(screen.queryByTestId('checkbox-home-gym-selected')).toBeNull();

    // Click to select Commercial Gym
    const commercialGymItem = screen.getByText('Commercial Gym');
    fireEvent.press(commercialGymItem);
    expect(screen.getByTestId('checkbox-commercial-gym-selected')).toBeTruthy();
  });

  it('calls onClose when cancel button is pressed', () => {
    render(
      <ManageGymsModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        userGyms={mockUserGyms}
        initialSelectedGymIds={initialSelectedGymIds}
        onSaveSuccess={mockOnSaveSuccess}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('handles save changes successfully', async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        delete: jest.fn(() => Promise.resolve({ error: null })),
        insert: jest.fn(() => Promise.resolve({ error: null })),
      })),
    };

    jest.mock('../../../app/_contexts/auth-context', () => ({
      useAuth: () => ({
        userId: 'test-user-id',
        supabase: mockSupabase,
      }),
    }));

    render(
      <ManageGymsModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        userGyms={mockUserGyms}
        initialSelectedGymIds={initialSelectedGymIds}
        onSaveSuccess={mockOnSaveSuccess}
      />
    );

    const saveButton = screen.getByText('Save Changes');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockOnSaveSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('handles modal close request', () => {
    render(
      <ManageGymsModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        userGyms={mockUserGyms}
        initialSelectedGymIds={initialSelectedGymIds}
        onSaveSuccess={mockOnSaveSuccess}
      />
    );

    const modal = screen.getByTestId('manage-gyms-modal');
    fireEvent(modal, 'onRequestClose');

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('disables save button when no gyms available', () => {
    render(
      <ManageGymsModal
        visible={true}
        onClose={mockOnClose}
        exercise={mockExercise}
        userGyms={[]}
        initialSelectedGymIds={new Set()}
        onSaveSuccess={mockOnSaveSuccess}
      />
    );

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton.props.disabled).toBe(true);
  });
});