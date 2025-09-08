"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bike, Run, Activity, CalendarDays, Clock, Gauge, Trophy } from 'lucide-react'; // ADDED: Run, Clock, Gauge icons
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { convertDistance, formatDistance, KM_TO_MILES } from '@/lib/unit-conversions';
import { cn } from '@/lib/utils'; // Import cn for conditional classes

type ActivityLog = Tables<'activity_logs'>;
type Profile = Tables<'profiles'>;

// Helper function to convert time string (e.g., "1h 30m", "90m", "1m 30s") to total seconds
const timeStringToTotalSeconds = (timeStr: string | null): number | null => {
  if (!timeStr) return null;
  let totalSeconds = 0;
  const hoursMatch = timeStr.match(/(\d+)h/);
  const minutesMatch = timeStr.match(/(\d+)m/);
  const secondsMatch = timeStr.match(/(\d+)s/);

  if (hoursMatch) {
    totalSeconds += parseInt(hoursMatch[1]) * 3600;
  }
  if (minutesMatch) {
    totalSeconds += parseInt(minutesMatch[1]) * 60;
  }
  if (secondsMatch) {
    totalSeconds += parseInt(secondsMatch[1]);
  }
  return totalSeconds;
};

// Helper to format total seconds into MM:SS
const formatSecondsToMMSS = (totalSeconds: number | null): string => {
  if (totalSeconds === null || isNaN(totalSeconds)) return '-';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Helper to format average time (seconds per km/mile)
const formatAvgTime = (avgTimeSeconds: number | null, unit: 'km' | 'miles'): string => {
  if (avgTimeSeconds === null || isNaN(avgTimeSeconds) || avgTimeSeconds === 0) return '-';
  const minutes = Math.floor(avgTimeSeconds / 60);
  const seconds = Math.round(avgTimeSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} / ${unit}`;
};


export default function ActivityLogsPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
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
    if (!session) {
      router.push('/login');
      return;
    }

    const fetchActivityLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('id, activity_type, is_pb, log_date, distance, time, avg_time, created_at, user_id') // Specify all columns required by ActivityLog
          .eq('user_id', session.user.id)
          .order('log_date', { ascending: false });

        if (error) {
          throw new Error(error.message);
        }
        setActivityLogs(data as ActivityLog[] || []); // Explicitly cast
      } catch (err: any) {
        console.error("Failed to fetch activity logs:", err);
        setError(err.message || "Failed to load activity logs. Please try again.");
        toast.error(err.message || "Failed to load activity logs.");
      } finally {
        setLoading(false);
      }
    };

    fetchActivityLogs();
  }, [session, router, supabase]);

  const filterLogs = (type: string) => activityLogs.filter(log => log.activity_type === type);

  const renderLogCard = (log: ActivityLog) => {
    let displayDistance = log.distance;
    let displayAvgTime = '-';
    let IconComponent: React.ElementType = Activity;

    if (log.activity_type === 'Cycling' || log.activity_type === 'Running') {
      IconComponent = log.activity_type === 'Cycling' ? Bike : Run;
      if (log.distance) {
        const distanceMatch = log.distance.match(/^(\d+(\.\d+)?) km$/);
        if (distanceMatch) {
          const distanceInKm = parseFloat(distanceMatch[1]);
          displayDistance = formatDistance(convertDistance(distanceInKm, 'km', preferredDistanceUnit as 'km' | 'miles'), preferredDistanceUnit as 'km' | 'miles');
        }
      }
      displayAvgTime = formatAvgTime(log.avg_time, preferredDistanceUnit as 'km' | 'miles');
    } else if (log.activity_type === 'Swimming') {
      IconComponent = Activity; // Placeholder, could be a swim icon
    } else if (log.activity_type === 'Tennis') {
      IconComponent = Activity; // Placeholder, could be a tennis icon
    }

    const formattedTime = formatSecondsToMMSS(timeStringToTotalSeconds(log.time));

    return (
      <Card key={log.id} className="mb-3 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-grow">
          <IconComponent className="h-6 w-6 text-primary flex-shrink-0" />
          <div className="flex flex-col">
            <h3 className="font-semibold text-lg leading-tight flex items-center gap-2">
              {log.activity_type}
              {log.is_pb && <Trophy className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
            </h3>
            <p className="text-sm text-muted-foreground">{new Date(log.log_date).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:text-right sm:grid-cols-1">
          {displayDistance && displayDistance !== '-' && (
            <div className="flex items-center gap-1 sm:justify-end">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <span>{displayDistance}</span>
            </div>
          )}
          {log.time && formattedTime !== '-' && (
            <div className="flex items-center gap-1 sm:justify-end">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{formattedTime}</span>
            </div>
          )}
          {(log.activity_type === 'Cycling' || log.activity_type === 'Running') && displayAvgTime !== '-' && (
            <div className="flex items-center gap-1 sm:justify-end col-span-2 sm:col-span-1">
              <span className="font-medium text-primary">{displayAvgTime}</span>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-4">
      <header className="mb-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Activity Logs</h1>
        <Button variant="ghost" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </header>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="Running">Running</TabsTrigger> {/* ADDED: Running tab */}
          <TabsTrigger value="Cycling">Cycling</TabsTrigger>
          <TabsTrigger value="Swimming">Swimming</TabsTrigger>
          {/* <TabsTrigger value="Tennis">Tennis</TabsTrigger> Removed Tennis tab for space, can be re-added if needed */}
        </TabsList>
        <TabsContent value="all" className="mt-4">
          {activityLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No activities logged yet.</p>
          ) : (
            activityLogs.map(renderLogCard)
          )}
        </TabsContent>
        <TabsContent value="Running" className="mt-4"> {/* ADDED: Running content */}
          {filterLogs('Running').length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No running activities logged yet.</p>
          ) : (
            filterLogs('Running').map(renderLogCard)
          )}
        </TabsContent>
        <TabsContent value="Cycling" className="mt-4">
          {filterLogs('Cycling').length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No cycling activities logged yet.</p>
          ) : (
            filterLogs('Cycling').map(renderLogCard)
          )}
        </TabsContent>
        <TabsContent value="Swimming" className="mt-4">
          {filterLogs('Swimming').length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No swimming activities logged yet.</p>
          ) : (
            filterLogs('Swimming').map(renderLogCard)
          )}
        </TabsContent>
        {/* <TabsContent value="Tennis" className="mt-4">
          {filterLogs('Tennis').length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No tennis activities logged yet.</p>
          ) : (
            filterLogs('Tennis').map(renderLogCard)
          )}
        </TabsContent> */}
      </Tabs>
    </div>
  );
}