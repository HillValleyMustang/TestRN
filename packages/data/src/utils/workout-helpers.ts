export function getMaxMinutes(sessionLength: string | null | undefined): number {
  switch (sessionLength) {
    case '15-30': return 30;
    case '30-45': return 45;
    case '45-60': return 60;
    case '60-90': return 90;
    default: return 90;
  }
}

export function getExerciseCounts(sessionLength: string | null | undefined): { main: number; bonus: number } {
  switch (sessionLength) {
    case '15-30': return { main: 3, bonus: 3 };
    case '30-45': return { main: 5, bonus: 3 };
    case '45-60': return { main: 7, bonus: 2 };
    case '60-90': return { main: 10, bonus: 2 };
    default: return { main: 5, bonus: 3 };
  }
}

export function formatTimeAgo(date: Date | null): string {
  if (!date) return 'Never';
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
}

export function getLevelFromPoints(points: number): { level: string; color: string } {
  if (points < 50) return { level: 'Rookie', color: 'text-gray-500' };
  if (points < 150) return { level: 'Warrior', color: 'text-blue-500' };
  if (points < 300) return { level: 'Champion', color: 'text-purple-500' };
  if (points < 500) return { level: 'Legend', color: 'text-yellow-500' };
  return { level: 'Titan', color: 'text-red-500' };
}

export function formatAthleteName(fullName: string | null): string {
  if (!fullName) return 'Athlete';
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return `Athlete ${parts[0][0] || ''}`;
  const initials = parts.map(part => part[0] || '').join('');
  return `Athlete ${initials}`;
}
