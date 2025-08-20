"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSession } from '@/components/session-context-provider';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { convertDistance, formatDistance, formatTime } from '@/lib/unit-conversions';

type ActivityLog = Tables<'activity_logs'>;
type Profile = Tables<'profiles'>;

interface ChartData {
  date: string;
  cyclingDistance: number;
  swimmingLengths: number;
  tennisDuration: number; // in minutes
}

export const ActivityChart = () => {
  const { session, supabase } = useSession();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferredDistanceUnit, setPreferredDistanceUnit] = useState<Profile['preferred_distance_unit']>('km');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session) return;
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('preferred_distance_unit')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching user profile for distance unit:", profileError);
      } else if (profileData) {
        setPreferredDistanceUnit(profileData.preferred_distance_unit || 'km');
      }
    };
    fetchUserProfile();
  }, [session, supabase]);

  useEffect(() => {
    const fetchActivityData = async () => {
      if (!session) return;

      setLoading(true);
      setError(null);
      try {
        const { data: activityLogs, error: fetchError } = await supabase
          .from('activity_logs')
          .select('log_date, activity_type, distance, time') // Specify columns
          .eq('user_id', session.user.id)
          .order('log_date', { ascending: true });

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        const weeklyActivityMap = new Map<string, { cyclingDistance: number, swimmingLengths: number, tennisDuration: number }>();

        (activityLogs || []).forEach(log => {
          const date = new Date(log.log_date);
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - (date.getDay() + 6) % 7); // Adjust to Monday
          startOfWeek.setHours(0, 0, 0, 0);
          const weekKey = startOfWeek.toISOString().split('T')[0];

          let currentWeekData = weeklyActivityMap.get(weekKey) || { cyclingDistance: 0, swimmingLengths: 0, tennisDuration: 0 };

          if (log.activity_type === 'Cycling' && log.distance) {
            const distanceMatch = log.distance.match(/^(\d+(\.\d+)?) km$/);
            if (distanceMatch) {
              const distanceInKm = parseFloat(distanceMatch[1]);
              currentWeekData.cyclingDistance += convertDistance(distanceInKm, 'km', preferredDistanceUnit as 'km' | 'miles') || 0;
            }
          } else if (log.activity_type === 'Swimming' && log.distance) {
            const lengthsMatch = log.distance.match(/^(\d+) lengths/);
            if (lengthsMatch) {
              currentWeekData.swimmingLengths += parseInt(lengthsMatch[1]);
            }
          } else if (log.activity_type === 'Tennis' && log.time) {
            let totalMinutes = 0;
            const hoursMatch = log.time.match(/(\d+)h/);
            const minutesMatch = log.time.match(/(\d+)m/);
            if (hoursMatch) totalMinutes += parseInt(hoursMatch[1]) * 60;
            if (minutesMatch) totalMinutes += parseInt(minutesMatch[1]);
            currentWeekData.tennisDuration += totalMinutes;
          }
          weeklyActivityMap.set(weekKey, currentWeekData);
        });

        const sortedChartData = Array.from(weeklyActivityMap.entries())
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setChartData(sortedChartData);

      } catch (err: any) {
        console.error("Failed to fetch activity data for chart:", err);
        setError(err.message || "Failed to load activity chart.");
        toast.error(err.message || "Failed to load activity chart.");
      } finally {
        setLoading(false);
      }
    };

    fetchActivityData();
  }, [session, supabase, preferredDistanceUnit]);

  if (loading) {
    return (
      <Card className="h-[350px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading activity data...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[350px] flex items-center justify-center">
        <p className="text-destructive">Error: {error}</p>
      </Card>
    );
  }

  const hasData = chartData.some(d => d.cyclingDistance > 0 || d.swimmingLengths > 0 || d.tennisDuration > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Activity Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            No activity data available. Log some activities to see your progress!
          </div>
        ) : (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 10,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                <YAxis />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'Cycling Distance') return [`${formatDistance(value, preferredDistanceUnit as 'km' | 'miles')}`, name];
                    if (name === 'Swimming Lengths') return [`${value} lengths`, name];
                    if (name === 'Tennis Duration') return [`${formatTime(value * 60)}`, name]; // Convert minutes back to formatted time
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar dataKey="cyclingDistance" fill="hsl(var(--chart-1))" name={`Cycling Distance (${preferredDistanceUnit})`} />
                <Bar dataKey="swimmingLengths" fill="hsl(var(--chart-2))" name="Swimming Lengths" />
                <Bar dataKey="tennisDuration" fill="hsl(var(--chart-3))" name="Tennis Duration (min)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};