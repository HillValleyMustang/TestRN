import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { WeeklyTargetWidget } from '../../../components/dashboard/WeeklyTargetWidget';

const mockUserWorkouts = [
  {
    id: 'workout-1',
    name: 'Push',
    programme_type: 'ppl',
    is_completed: true,
    completed_at: '2025-12-29T23:02:15.245Z',
    goal_total: 3,
    start_of_week: '2025-12-29T00:00:00.000Z',
    end_of_week: '2026-01-04T23:59:59.999Z'
  },
  {
    id: 'workout-2',
    name: 'Pull',
    programme_type: 'ppl',
    is_completed: false,
    completed_at: null,
    goal_total: 3,
    start_of_week: '2025-12-29T00:00:00.000Z',
    end_of_week: '2026-01-04T23:59:59.999Z'
  },
  {
    id: 'workout-3',
    name: 'Legs',
    programme_type: 'ppl',
    is_completed: false,
    completed_at: null,
    goal_total: 3,
    start_of_week: '2025-12-29T00:00:00.000Z',
    end_of_week: '2026-01-04T23:59:59.999Z'
  },
];

const mockMultipleWorkouts = [
  ...mockUserWorkouts,
  {
    id: 'workout-4',
    name: 'Push',
    programme_type: 'ppl',
    is_completed: true,
    completed_at: '2025-12-28T10:30:00.000Z',
    goal_total: 3,
    start_of_week: '2025-12-29T00:00:00.000Z',
    end_of_week: '2026-01-04T23:59:59.999Z'
  },
  {
    id: 'workout-5',
    name: 'Push',
    programme_type: 'ppl',
    is_completed: true,
    completed_at: '2025-12-27T15:45:00.000Z',
    goal_total: 3,
    start_of_week: '2025-12-29T00:00:00.000Z',
    end_of_week: '2026-01-04T23:59:59.999Z'
  },
  {
    id: 'workout-6',
    name: 'Push',
    programme_type: 'ppl',
    is_completed: true,
    completed_at: '2025-12-26T08:20:00.000Z',
    goal_total: 3,
    start_of_week: '2025-12-29T00:00:00.000Z',
    end_of_week: '2026-01-04T23:59:59.999Z'
  },
  {
    id: 'workout-7',
    name: 'Push',
    programme_type: 'ppl',
    is_completed: true,
    completed_at: '2025-12-25T12:10:00.000Z',
    goal_total: 3,
    start_of_week: '2025-12-29T00:00:00.000Z',
    end_of_week: '2026-01-04T23:59:59.999Z'
  },
  {
    id: 'workout-8',
    name: 'Push',
    programme_type: 'ppl',
    is_completed: true,
    completed_at: '2025-12-24T18:30:00.000Z',
    goal_total: 3,
    start_of_week: '2025-12-29T00:00:00.000Z',
    end_of_week: '2026-01-04T23:59:59.999Z'
  },
];

describe('WeeklyTargetWidget', () => {
  const mockOnOpenWeeklyTargetModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with basic weekly target data', async () => {
    render(
      <WeeklyTargetWidget
        userWorkouts={mockUserWorkouts}
        onOpenWeeklyTargetModal={mockOnOpenWeeklyTargetModal}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Weekly Target')).toBeTruthy();
      expect(screen.getByText('1 / 3')).toBeTruthy();
    });
  });

  it('shows the main workout type count correctly', async () => {
    render(
      <WeeklyTargetWidget
        userWorkouts={mockUserWorkouts}
        onOpenWeeklyTargetModal={mockOnOpenWeeklyTargetModal}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });
  });

  it('displays the total sessions count in parentheses', async () => {
    render(
      <WeeklyTargetWidget
        userWorkouts={mockUserWorkouts}
        onOpenWeeklyTargetModal={mockOnOpenWeeklyTargetModal}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('(1 session)')).toBeTruthy();
    });
  });

  it('shows the additional workouts count when more than goal', async () => {
    render(
      <WeeklyTargetWidget
        userWorkouts={mockMultipleWorkouts}
        onOpenWeeklyTargetModal={mockOnOpenWeeklyTargetModal}
      />
    );

    await waitFor(() => {
      // Should show 5 total sessions, but only 1 unique workout
      expect(screen.getByText('1 / 3')).toBeTruthy();
      expect(screen.getByText('(5 sessions)')).toBeTruthy();
    });
  });

  it('opens modal when clicked', async () => {
    render(
      <WeeklyTargetWidget
        userWorkouts={mockUserWorkouts}
        onOpenWeeklyTargetModal={mockOnOpenWeeklyTargetModal}
      />
    );

    await waitFor(() => {
      const widget = screen.getByTestId('weekly-target-widget');
      fireEvent.press(widget);
      expect(mockOnOpenWeeklyTargetModal).toHaveBeenCalledTimes(1);
    });
  });

  it('handles empty workouts array gracefully', async () => {
    render(
      <WeeklyTargetWidget
        userWorkouts={[]}
        onOpenWeeklyTargetModal={mockOnOpenWeeklyTargetModal}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Weekly Target')).toBeTruthy();
      expect(screen.getByText('0 / 3')).toBeTruthy();
      expect(screen.getByText('(0 sessions)')).toBeTruthy();
    });
  });

  it('calculates completed workouts correctly for different programme types', async () => {
    const ulWorkouts = [
      {
        id: 'workout-1',
        name: 'Upper',
        programme_type: 'ul',
        is_completed: true,
        completed_at: '2025-12-29T23:02:15.245Z',
        goal_total: 2,
        start_of_week: '2025-12-29T00:00:00.000Z',
        end_of_week: '2026-01-04T23:59:59.999Z'
      },
      {
        id: 'workout-2',
        name: 'Lower',
        programme_type: 'ul',
        is_completed: false,
        completed_at: null,
        goal_total: 2,
        start_of_week: '2025-12-29T00:00:00.000Z',
        end_of_week: '2026-01-04T23:59:59.999Z'
      },
    ];

    render(
      <WeeklyTargetWidget
        userWorkouts={ulWorkouts}
        onOpenWeeklyTargetModal={mockOnOpenWeeklyTargetModal}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeTruthy();
    });
  });

  it('calculates additional circles correctly when total sessions exceed goal', async () => {
    const manyWorkouts = [
      ...mockMultipleWorkouts,
      {
        id: 'workout-9',
        name: 'Push',
        programme_type: 'ppl',
        is_completed: true,
        completed_at: '2025-12-23T16:15:00.000Z',
        goal_total: 3,
        start_of_week: '2025-12-29T00:00:00.000Z',
        end_of_week: '2026-01-04T23:59:59.999Z'
      },
      {
        id: 'workout-10',
        name: 'Push',
        programme_type: 'ppl',
        is_completed: true,
        completed_at: '2025-12-22T14:45:00.000Z',
        goal_total: 3,
        start_of_week: '2025-12-29T00:00:00.000Z',
        end_of_week: '2026-01-04T23:59:59.999Z'
      },
    ];

    render(
      <WeeklyTargetWidget
        userWorkouts={manyWorkouts}
        onOpenWeeklyTargetModal={mockOnOpenWeeklyTargetModal}
      />
    );

    await waitFor(() => {
      // 7 total sessions, but only 1 unique workout type
      expect(screen.getByText('1 / 3')).toBeTruthy();
      expect(screen.getByText('(7 sessions)')).toBeTruthy();
    });
  });
});