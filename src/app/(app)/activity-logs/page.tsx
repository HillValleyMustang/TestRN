"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { convertDistance, formatDistance } from '@/lib/unit-conversions';

type ActivityLog = Tables<'activity_logs'>;
type Profile = Tables<'profiles'>;

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Loading activity logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  const filterLogs = (type: string) => activityLogs.filter(log => log.activity_type === type);

  const renderLogCard = (log: ActivityLog) => {
    let displayDistance = log.distance;
    if (log.activity_type === 'Cycling' && log.distance) {
      const distanceMatch = log.distance.match(/^(\d+(\.\d+)?) km$/);
      if (distanceMatch) {
        const distanceInKm = parseFloat(distanceMatch[1]);
        displayDistance = formatDistance(convertDistance(distanceInKm, 'km', preferredDistanceUnit as 'km' | 'miles'), preferredDistanceUnit as 'km' | 'miles');
      }
    }

    return (
      <Card key={log.id} className="mb-4">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            {log.activity_type}
            {log.is_pb && <span className="text-yellow-500 text-sm font-semibold">PB!</span>}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{new Date(log.log_date).toLocaleDateString()}</p>
        </CardHeader>
        <CardContent>
          {displayDistance && <p>Distance: {displayDistance}</p>}
          {log.time && <p>Time: {log.time}</p>}
          {log.avg_time && <p>Avg. Time: {log.avg_time}</p>}
          {/* Add more details based on activity type if needed */}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Activity Logs</h1>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </header>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="Cycling">Cycling</TabsTrigger>
          <TabsTrigger value="Swimming">Swimming</TabsTrigger>
          <TabsTrigger value="Tennis">Tennis</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          {activityLogs.length === 0 ? (
            <p className="text-muted-foreground">No activities logged yet.</p>
          ) : (
            activityLogs.map(renderLogCard)
          )}
        </TabsContent>
        <TabsContent value="Cycling" className="mt-4">
          {filterLogs('Cycling').length === 0 ? (
            <p className="text-muted-foreground">No cycling activities logged yet.</p>
          ) : (
            filterLogs('Cycling').map(renderLogCard)
          )}
        </TabsContent>
        <TabsContent value="Swimming" className="mt-4">
          {filterLogs('Swimming').length === 0 ? (
            <p className="text-muted-foreground">No swimming activities logged yet.</p>
          ) : (
            filterLogs('Swimming').map(renderLogCard)
          )}
        </TabsContent>
        <TabsContent value="Tennis" className="mt-4">
          {filterLogs('Tennis').length === 0 ? (
            <p className="text-muted-foreground">No tennis activities logged yet.</p>
          ) : (
            filterLogs('Tennis').map(renderLogCard)
          )}
        </TabsContent>
      </Tabs>

      <MadeWithDyad />
    </div>
  );
}