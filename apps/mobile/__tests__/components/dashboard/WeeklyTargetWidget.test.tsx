import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { WeeklyTargetWidget } from '../../../components/dashboard/WeeklyTargetWidget';

const mockCompletedWorkouts = [
  {
    id: 'workout-1',
    name: 'Push',
    sessionId: 'session-1',
    completedAt: '2025-12-29T23:02:15.245Z',
  },
];

const mockSessionsByWorkoutType = {
  push: [
    {
      id: 'session-1',
      name: 'Push',
      completedAt: '2025-12-29T23:02:15.245Z',
    },
    {
      id: 'session-2',
      name: 'Push',
      completedAt: '2025-12-30T10:30:00.000Z',
    },
  ],
};

describe('WeeklyTargetWidget', () => {
  const mockOnViewWorkoutSummary = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with basic weekly target data', async () => {
    render(
      <WeeklyTargetWidget
        completedWorkouts={mockCompletedWorkouts}
        goalTotal={3}
        programmeType="ppl"
        onViewWorkoutSummary={mockOnViewWorkoutSummary}
      />
    );

    expect(screen.getByText('Weekly Target')).toBeTruthy();
    expect(screen.getByText('1 / 3 T-Path Workouts Completed This Week')).toBeTruthy();
  });

  it('calls onViewWorkoutSummary directly when there is only one session', async () => {
    render(
      <WeeklyTargetWidget
        completedWorkouts={mockCompletedWorkouts}
        sessionsByWorkoutType={{
          push: [mockCompletedWorkouts[0]]
        }}
        goalTotal={3}
        programmeType="ppl"
        onViewWorkoutSummary={mockOnViewWorkoutSummary}
      />
    );

    // Push is index 0 in PPL
    const pushCircle = screen.getByTestId('core-circle-0');
    fireEvent.press(pushCircle);

    expect(mockOnViewWorkoutSummary).toHaveBeenCalledWith('session-1');
  });

  it('shows selector modal when there are multiple sessions of the same type', async () => {
    render(
      <WeeklyTargetWidget
        completedWorkouts={mockCompletedWorkouts}
        sessionsByWorkoutType={mockSessionsByWorkoutType}
        goalTotal={3}
        programmeType="ppl"
        onViewWorkoutSummary={mockOnViewWorkoutSummary}
      />
    );

    const pushCircle = screen.getByTestId('core-circle-0');
    fireEvent.press(pushCircle);

    // Should NOT call onViewWorkoutSummary immediately
    expect(mockOnViewWorkoutSummary).not.toHaveBeenCalled();

    // Should show the selector modal
    expect(screen.getByText('Select Workout')).toBeTruthy();
    expect(screen.getByText('Push')).toBeTruthy();
  });
});
