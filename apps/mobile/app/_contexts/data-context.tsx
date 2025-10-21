import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { database, addToSyncQueue } from "../_lib/database";
import { useSyncQueueProcessor } from "@data/hooks/use-sync-queue-processor";
import { useAuth } from "./auth-context";
import type {
  WorkoutSession,
  SetLog,
  WorkoutTemplate,
  TPath,
  TPathExercise,
  TPathProgress,
  TPathWithExercises,
  Gym,
} from "@data/storage/models";
import NetInfo from "@react-native-community/netinfo";

interface WorkoutStats {
  totalWorkouts: number;
  totalVolume: number;
  averageVolume: number;
  currentStreak: number;
  longestStreak: number;
}

interface BodyMeasurement {
  id: string;
  user_id: string;
  measurement_date: string;
  weight_kg?: number;
  body_fat_percentage?: number;
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  left_arm_cm?: number;
  right_arm_cm?: number;
  left_thigh_cm?: number;
  right_thigh_cm?: number;
  notes?: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  goal_type: string;
  target_value: number;
  current_value?: number;
  start_date: string;
  target_date?: string;
  status: string;
  exercise_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  progress_value?: number;
}

type ProgrammeType = "ppl" | "ulul";

interface ProfileRow {
  id: string;
  active_t_path_id: string | null;
  programme_type: string | null;
  preferred_session_length: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface WorkoutSessionRow {
  id: string;
  user_id: string;
  session_date: string;
  template_name: string | null;
  completed_at: string | null;
  rating: number | null;
  duration_string: string | null;
  t_path_id: string | null;
  created_at: string;
}

interface SetLogRow {
  id: string;
  session_id: string;
  exercise_id: string;
  weight_kg: number | null;
  reps: number | null;
  reps_l: number | null;
  reps_r: number | null;
  time_seconds: number | null;
  is_pb: boolean | null;
  created_at: string;
}

interface GymRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  equipment: string[] | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface TPathRow {
  id: string;
  user_id: string | null;
  template_name: string;
  description: string | null;
  parent_t_path_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_bonus?: boolean | null;
}

export interface DashboardProfile {
  id: string;
  active_t_path_id: string | null;
  programme_type: ProgrammeType;
  preferred_session_length: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface DashboardWorkoutSummary {
  id: string;
  template_name: string | null;
  session_date: string;
  completed_at: string | null;
  duration_string: string | null;
  exercise_count: number;
}

export interface DashboardVolumePoint {
  date: string;
  volume: number;
}

export interface DashboardWeeklySummary {
  completed_workouts: Array<{ id: string; name: string; sessionId: string }>;
  goal_total: number;
  programme_type: ProgrammeType;
}

export interface DashboardProgram {
  id: string;
  template_name: string;
  description: string | null;
  parent_t_path_id: string | null;
}

export interface DashboardSnapshot {
  profile: DashboardProfile | null;
  gyms: Gym[];
  activeGym: Gym | null;
  weeklySummary: DashboardWeeklySummary;
  volumeHistory: DashboardVolumePoint[];
  recentWorkouts: DashboardWorkoutSummary[];
  activeTPath: DashboardProgram | null;
  tPathWorkouts: DashboardProgram[];
  nextWorkout: DashboardProgram | null;
}

interface DataContextType {
  addWorkoutSession: (session: WorkoutSession) => Promise<void>;
  addSetLog: (setLog: SetLog) => Promise<void>;
  getWorkoutSessions: (userId: string) => Promise<WorkoutSession[]>;
  getSetLogs: (sessionId: string) => Promise<SetLog[]>;
  getPersonalRecord: (userId: string, exerciseId: string) => Promise<number>;
  saveTemplate: (template: WorkoutTemplate) => Promise<void>;
  getTemplates: (userId: string) => Promise<WorkoutTemplate[]>;
  getTemplate: (templateId: string) => Promise<WorkoutTemplate | null>;
  deleteTemplate: (templateId: string) => Promise<void>;
  getWorkoutStats: (userId: string, days?: number) => Promise<WorkoutStats>;
  getWorkoutFrequency: (
    userId: string,
    days?: number,
  ) => Promise<Array<{ date: string; count: number }>>;
  getVolumeHistory: (
    userId: string,
    days?: number,
  ) => Promise<Array<{ date: string; volume: number }>>;
  getPRHistory: (
    userId: string,
    exerciseId: string,
  ) => Promise<Array<{ date: string; weight: number }>>;
  saveBodyMeasurement: (measurement: BodyMeasurement) => Promise<void>;
  getBodyMeasurements: (userId: string) => Promise<BodyMeasurement[]>;
  getWeightHistory: (
    userId: string,
    days?: number,
  ) => Promise<Array<{ date: string; weight: number }>>;
  deleteBodyMeasurement: (measurementId: string) => Promise<void>;
  saveGoal: (goal: Goal) => Promise<void>;
  getGoals: (userId: string, status?: string) => Promise<Goal[]>;
  getGoal: (goalId: string) => Promise<Goal | null>;
  updateGoalProgress: (
    goalId: string,
    currentValue: number,
    status?: string,
  ) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  unlockAchievement: (achievement: UserAchievement) => Promise<void>;
  getUserAchievements: (userId: string) => Promise<UserAchievement[]>;
  hasAchievement: (userId: string, achievementId: string) => Promise<boolean>;
  checkAndUnlockAchievements: (userId: string) => Promise<void>;
  addTPath: (tPath: TPath) => Promise<void>;
  getTPath: (tPathId: string) => Promise<TPathWithExercises | null>;
  getTPaths: (userId: string, mainProgramsOnly?: boolean) => Promise<TPath[]>;
  getTPathsByParent: (parentId: string) => Promise<TPath[]>;
  updateTPath: (tPathId: string, updates: Partial<TPath>) => Promise<void>;
  deleteTPath: (tPathId: string) => Promise<void>;
  addTPathExercise: (exercise: TPathExercise) => Promise<void>;
  getTPathExercises: (tPathId: string) => Promise<TPathExercise[]>;
  deleteTPathExercise: (exerciseId: string) => Promise<void>;
  updateTPathProgress: (progress: TPathProgress) => Promise<void>;
  getTPathProgress: (
    userId: string,
    tPathId: string,
  ) => Promise<TPathProgress | null>;
  getAllTPathProgress: (userId: string) => Promise<TPathProgress[]>;
  addGym: (gym: Gym) => Promise<void>;
  getGym: (gymId: string) => Promise<Gym | null>;
  getGyms: (userId: string) => Promise<Gym[]>;
  getActiveGym: (userId: string) => Promise<Gym | null>;
  updateGym: (gymId: string, updates: Partial<Gym>) => Promise<void>;
  setActiveGym: (userId: string, gymId: string) => Promise<void>;
  deleteGym: (gymId: string) => Promise<void>;
  isSyncing: boolean;
  queueLength: number;
  isOnline: boolean;
  loadDashboardSnapshot: () => Promise<DashboardSnapshot>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const { supabase, userId } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [profileCache, setProfileCache] = useState<DashboardProfile | null>(
    null,
  );

  useEffect(() => {
    database.init().then(() => setIsInitialized(true));
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  const { isSyncing, queueLength } = useSyncQueueProcessor({
    supabase,
    store: database.syncQueue,
    isOnline,
    enabled: isInitialized && !!userId,
  });

  const mapProgrammeType = (programme?: string | null): ProgrammeType =>
    programme === "ulul" ? "ulul" : "ppl";

  const mapTPathToProgram = (tPath: TPath): DashboardProgram => ({
    id: tPath.id,
    template_name: tPath.template_name,
    description: tPath.description,
    parent_t_path_id: tPath.parent_t_path_id,
  });

  const ensureIsoString = (value: string | null | undefined) =>
    value ?? new Date().toISOString();

  const formatDurationFromRange = (
    durationString: string | null,
    firstSetAt: string | null,
    lastSetAt: string | null,
  ): string | null => {
    if (durationString) {
      return durationString;
    }

    if (!firstSetAt || !lastSetAt) {
      return null;
    }

    const start = new Date(firstSetAt);
    const end = new Date(lastSetAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }

    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) {
      return null;
    }

    const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

    if (diffMinutes >= 60) {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      if (minutes === 0) {
        return `${hours}h`;
      }
      return `${hours}h ${minutes}m`;
    }

    return `${diffMinutes} min`;
  };

  const buildVolumePoints = (
    raw: Array<{ date: string; volume: number }>,
  ): DashboardVolumePoint[] => {
    const map = new Map(
      raw.map((entry) => [entry.date.split("T")[0], entry.volume || 0]),
    );
    const today = new Date();
    const points: DashboardVolumePoint[] = [];

    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = date.toISOString().split("T")[0];
      points.push({
        date: key,
        volume: Math.max(0, Number(map.get(key) ?? 0)),
      });
    }

    return points;
  };

  const loadDashboardSnapshot = useCallback(async () => {
    if (!userId) {
      return {
        profile: null,
        gyms: [],
        activeGym: null,
        weeklySummary: {
          completed_workouts: [],
          goal_total: 3,
          programme_type: "ppl" as ProgrammeType,
        },
        volumeHistory: [],
        recentWorkouts: [],
        activeTPath: null,
        tPathWorkouts: [],
        nextWorkout: null,
      } satisfies DashboardSnapshot;
    }

    let latestProfile = profileCache;
    let remoteActiveTPath: DashboardProgram | null = null;
    let remoteChildWorkouts: DashboardProgram[] = [];

    if (isOnline && supabase) {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id, active_t_path_id, programme_type, preferred_session_length, full_name, first_name, last_name",
          )
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          console.warn("[DataContext] Failed to load profile", profileError);
        }

        if (profileData) {
          latestProfile = {
            id: profileData.id,
            active_t_path_id: profileData.active_t_path_id,
            programme_type: mapProgrammeType(profileData.programme_type),
            preferred_session_length: profileData.preferred_session_length,
            full_name: profileData.full_name,
            first_name: profileData.first_name,
            last_name: profileData.last_name,
          };
          setProfileCache(latestProfile);
        }

        const { data: gymsData, error: gymsError } = await supabase
          .from("gyms")
          .select("*")
          .eq("user_id", userId);

        if (gymsError) {
          console.warn("[DataContext] Failed to load gyms", gymsError);
        } else if (gymsData) {
          for (const gymRow of gymsData) {
            const gym: Gym = {
              id: gymRow.id,
              user_id: gymRow.user_id,
              name: gymRow.name,
              description: gymRow.description ?? null,
              equipment: Array.isArray(gymRow.equipment)
                ? gymRow.equipment
                : [],
              is_active: Boolean(gymRow.is_active),
              created_at: ensureIsoString(gymRow.created_at),
              updated_at: ensureIsoString(
                gymRow.updated_at ?? gymRow.created_at,
              ),
            };
            await database.addGym(gym);
          }
        }

        const { data: sessionsData, error: sessionsError } = await supabase
          .from("workout_sessions")
          .select(
            "id, user_id, session_date, template_name, completed_at, rating, duration_string, t_path_id, created_at",
          )
          .eq("user_id", userId)
          .order("session_date", { ascending: false })
          .limit(20);

        const sessionIds: string[] = [];

        if (sessionsError) {
          console.warn(
            "[DataContext] Failed to load workout sessions",
            sessionsError,
          );
        } else if (sessionsData) {
          for (const sessionRow of sessionsData) {
            sessionIds.push(sessionRow.id);
            const session: WorkoutSession = {
              id: sessionRow.id,
              user_id: sessionRow.user_id,
              session_date: sessionRow.session_date,
              template_name: sessionRow.template_name,
              completed_at: sessionRow.completed_at,
              rating: sessionRow.rating,
              duration_string: sessionRow.duration_string,
              t_path_id: sessionRow.t_path_id,
              created_at: sessionRow.created_at,
            };
            await database.addWorkoutSession(session);
          }
        }

        if (sessionIds.length > 0) {
          const { data: setLogsData, error: setLogsError } = await supabase
            .from("set_logs")
            .select(
              "id, session_id, exercise_id, weight_kg, reps, reps_l, reps_r, time_seconds, is_pb, created_at",
            )
            .in("session_id", sessionIds);

          if (setLogsError) {
            console.warn("[DataContext] Failed to load set logs", setLogsError);
          } else if (setLogsData) {
            const grouped = new Map<string, SetLog[]>();
            for (const logRow of setLogsData) {
              const log: SetLog = {
                id: logRow.id,
                session_id: logRow.session_id,
                exercise_id: logRow.exercise_id,
                weight_kg: logRow.weight_kg,
                reps: logRow.reps,
                reps_l: logRow.reps_l,
                reps_r: logRow.reps_r,
                time_seconds: logRow.time_seconds,
                is_pb: logRow.is_pb ?? null,
                created_at: logRow.created_at,
              };
              if (!grouped.has(log.session_id)) {
                grouped.set(log.session_id, []);
              }
              grouped.get(log.session_id)!.push(log);
            }

            for (const [sessionId, logs] of grouped) {
              await database.replaceSetLogsForSession(sessionId, logs);
            }
          }
        }

        if (latestProfile?.active_t_path_id) {
          const { data: activeTPathData, error: activeTPathError } =
            await supabase
              .from("t_paths")
              .select(
                "id, template_name, parent_t_path_id, user_id, created_at, is_bonus",
              )
              .eq("id", latestProfile.active_t_path_id)
              .maybeSingle();

          if (activeTPathError) {
            console.warn(
              "[DataContext] Failed to load active t_path",
              activeTPathError,
            );
          } else if (activeTPathData) {
            remoteActiveTPath = {
              id: activeTPathData.id,
              template_name: activeTPathData.template_name,
              description: null,
              parent_t_path_id: activeTPathData.parent_t_path_id,
            };

            const tPathRecord: TPath = {
              id: activeTPathData.id,
              user_id: activeTPathData.user_id ?? userId,
              template_name: activeTPathData.template_name,
              description: null,
              is_main_program: !activeTPathData.parent_t_path_id,
              parent_t_path_id: activeTPathData.parent_t_path_id,
              order_index: null,
              is_ai_generated: false,
              ai_generation_params: null,
              created_at: ensureIsoString(activeTPathData.created_at),
              updated_at: ensureIsoString(activeTPathData.created_at),
            };
            await database.addTPath(tPathRecord);
          }

          const { data: childWorkoutsData, error: childWorkoutsError } =
            await supabase
              .from("t_paths")
              .select(
                "id, template_name, parent_t_path_id, user_id, created_at, is_bonus",
              )
              .eq("parent_t_path_id", latestProfile.active_t_path_id)
              .order("template_name", { ascending: true });

          if (childWorkoutsError) {
            console.warn(
              "[DataContext] Failed to load child workouts",
              childWorkoutsError,
            );
          } else if (childWorkoutsData) {
            remoteChildWorkouts = childWorkoutsData.map((row) => ({
              id: row.id,
              template_name: row.template_name,
              description: null,
              parent_t_path_id: row.parent_t_path_id,
            }));

            for (const child of childWorkoutsData) {
              const childRecord: TPath = {
                id: child.id,
                user_id: child.user_id ?? userId,
                template_name: child.template_name,
                description: null,
                is_main_program: !child.parent_t_path_id,
                parent_t_path_id: child.parent_t_path_id,
                order_index: null,
                is_ai_generated: Boolean(child.is_bonus),
                ai_generation_params: null,
                created_at: ensureIsoString(child.created_at),
                updated_at: ensureIsoString(child.created_at),
              };
              await database.addTPath(childRecord);
            }
          }
        }
      } catch (error) {
        console.warn("[DataContext] Dashboard snapshot refresh failed", error);
      }
    }

    const [gyms, activeGym, volumeHistoryRaw, recentWorkoutsRaw] =
      await Promise.all([
        database.getGyms(userId),
        database.getActiveGym(userId),
        database.getVolumeHistory(userId, 7),
        database.getRecentWorkoutSummaries(userId, 5),
      ]);

    const volumeHistory = buildVolumePoints(volumeHistoryRaw);

    const recentWorkouts: DashboardWorkoutSummary[] = recentWorkoutsRaw.map(
      ({ session, exercise_count, first_set_at, last_set_at }) => ({
        id: session.id,
        template_name: session.template_name,
        session_date: session.session_date,
        completed_at: session.completed_at,
        duration_string: formatDurationFromRange(
          session.duration_string,
          first_set_at,
          last_set_at,
        ),
        exercise_count,
      }),
    );

    const programmeType = mapProgrammeType(latestProfile?.programme_type);
    const weeklySummary: DashboardWeeklySummary = {
      completed_workouts: recentWorkouts.slice(0, 3).map((workout) => ({
        id: workout.id,
        name: workout.template_name ?? "Ad Hoc",
        sessionId: workout.id,
      })),
      goal_total: programmeType === "ulul" ? 4 : 3,
      programme_type: programmeType,
    };

    const activeTPathRecord = latestProfile?.active_t_path_id
      ? await database.getTPath(latestProfile.active_t_path_id)
      : null;

    const localChildWorkouts = latestProfile?.active_t_path_id
      ? await database.getTPathsByParent(latestProfile.active_t_path_id)
      : [];

    const activeTPath =
      remoteActiveTPath ??
      (activeTPathRecord ? mapTPathToProgram(activeTPathRecord) : null);

    const tPathWorkouts =
      remoteChildWorkouts.length > 0
        ? remoteChildWorkouts
        : localChildWorkouts.map(mapTPathToProgram);

    const nextWorkout = tPathWorkouts.length > 0 ? tPathWorkouts[0] : null;

    return {
      profile: latestProfile,
      gyms,
      activeGym,
      weeklySummary,
      volumeHistory,
      recentWorkouts,
      activeTPath,
      tPathWorkouts,
      nextWorkout,
    } satisfies DashboardSnapshot;
  }, [userId, profileCache, isOnline, supabase]);

  const addWorkoutSession = async (session: WorkoutSession): Promise<void> => {
    await database.addWorkoutSession(session);
    await addToSyncQueue("create", "workout_sessions", session);
  };

  const addSetLog = async (setLog: SetLog): Promise<void> => {
    await database.addSetLog(setLog);
    await addToSyncQueue("create", "set_logs", setLog);
  };

  const getWorkoutSessions = async (
    targetUserId: string,
  ): Promise<WorkoutSession[]> => {
    return await database.getWorkoutSessions(targetUserId);
  };

  const getSetLogs = async (sessionId: string): Promise<SetLog[]> => {
    return await database.getSetLogs(sessionId);
  };

  const getPersonalRecord = async (
    targetUserId: string,
    exerciseId: string,
  ): Promise<number> => {
    return await database.getPersonalRecord(targetUserId, exerciseId);
  };

  const saveTemplate = async (template: WorkoutTemplate): Promise<void> => {
    await database.saveTemplate(template);
  };

  const getTemplates = async (
    targetUserId: string,
  ): Promise<WorkoutTemplate[]> => {
    return await database.getTemplates(targetUserId);
  };

  const getTemplate = async (
    templateId: string,
  ): Promise<WorkoutTemplate | null> => {
    return await database.getTemplate(templateId);
  };

  const deleteTemplate = async (templateId: string): Promise<void> => {
    await database.deleteTemplate(templateId);
  };

  const getWorkoutStats = async (
    targetUserId: string,
    days: number = 30,
  ): Promise<WorkoutStats> => {
    return await database.getWorkoutStats(targetUserId, days);
  };

  const getWorkoutFrequency = async (
    targetUserId: string,
    days: number = 30,
  ): Promise<Array<{ date: string; count: number }>> => {
    return await database.getWorkoutFrequency(targetUserId, days);
  };

  const getVolumeHistory = async (
    targetUserId: string,
    days: number = 30,
  ): Promise<Array<{ date: string; volume: number }>> => {
    return await database.getVolumeHistory(targetUserId, days);
  };

  const getPRHistory = async (
    targetUserId: string,
    exerciseId: string,
  ): Promise<Array<{ date: string; weight: number }>> => {
    return await database.getPRHistory(targetUserId, exerciseId);
  };

  const saveBodyMeasurement = async (
    measurement: BodyMeasurement,
  ): Promise<void> => {
    await database.saveBodyMeasurement(measurement);
  };

  const getBodyMeasurements = async (
    targetUserId: string,
  ): Promise<BodyMeasurement[]> => {
    return await database.getBodyMeasurements(targetUserId);
  };

  const getWeightHistory = async (
    targetUserId: string,
    days?: number,
  ): Promise<Array<{ date: string; weight: number }>> => {
    return await database.getWeightHistory(targetUserId, days);
  };

  const deleteBodyMeasurement = async (
    measurementId: string,
  ): Promise<void> => {
    await database.deleteBodyMeasurement(measurementId);
  };

  const saveGoal = async (goal: Goal): Promise<void> => {
    await database.saveGoal(goal);
  };

  const getGoals = async (
    targetUserId: string,
    status?: string,
  ): Promise<Goal[]> => {
    return await database.getGoals(targetUserId, status);
  };

  const getGoal = async (goalId: string): Promise<Goal | null> => {
    return await database.getGoal(goalId);
  };

  const updateGoalProgress = async (
    goalId: string,
    currentValue: number,
    status?: string,
  ): Promise<void> => {
    await database.updateGoalProgress(goalId, currentValue, status);
  };

  const deleteGoal = async (goalId: string): Promise<void> => {
    await database.deleteGoal(goalId);
  };

  const unlockAchievement = async (
    achievement: UserAchievement,
  ): Promise<void> => {
    await database.unlockAchievement(achievement);
  };

  const getUserAchievements = async (
    targetUserId: string,
  ): Promise<UserAchievement[]> => {
    return await database.getUserAchievements(targetUserId);
  };

  const hasAchievement = async (
    targetUserId: string,
    achievementId: string,
  ): Promise<boolean> => {
    return await database.hasAchievement(targetUserId, achievementId);
  };

  const checkAndUnlockAchievements = async (
    targetUserId: string,
  ): Promise<void> => {
    const { ACHIEVEMENTS } = await import("@data/achievements");
    const stats = await database.getWorkoutStats(targetUserId);
    const unlockedAchievements =
      await database.getUserAchievements(targetUserId);
    const unlockedIds = new Set(
      unlockedAchievements.map((a) => a.achievement_id),
    );

    for (const achievement of ACHIEVEMENTS) {
      if (unlockedIds.has(achievement.id)) {
        continue;
      }

      let shouldUnlock = false;
      let progressValue = 0;

      switch (achievement.requirement.type) {
        case "workout_count":
          progressValue = stats.totalWorkouts;
          shouldUnlock = progressValue >= achievement.requirement.value;
          break;
        case "streak_days":
          progressValue = stats.currentStreak;
          shouldUnlock = progressValue >= achievement.requirement.value;
          break;
        case "total_volume":
          progressValue = stats.totalVolume;
          shouldUnlock = progressValue >= achievement.requirement.value;
          break;
        case "max_weight":
          if (achievement.requirement.exercise_id) {
            progressValue = await database.getPersonalRecord(
              targetUserId,
              achievement.requirement.exercise_id,
            );
            shouldUnlock = progressValue >= achievement.requirement.value;
          }
          break;
      }

      if (shouldUnlock) {
        await database.unlockAchievement({
          id: `${targetUserId}_${achievement.id}_${Date.now()}`,
          user_id: targetUserId,
          achievement_id: achievement.id,
          unlocked_at: new Date().toISOString(),
          progress_value: progressValue,
        });
      }
    }
  };

  const addTPath = async (tPath: TPath): Promise<void> => {
    await database.addTPath(tPath);
  };

  const getTPath = async (
    tPathId: string,
  ): Promise<TPathWithExercises | null> => {
    return await database.getTPath(tPathId);
  };

  const getTPaths = async (
    targetUserId: string,
    mainProgramsOnly?: boolean,
  ): Promise<TPath[]> => {
    return await database.getTPaths(targetUserId, mainProgramsOnly);
  };

  const getTPathsByParent = async (parentId: string): Promise<TPath[]> => {
    return await database.getTPathsByParent(parentId);
  };

  const updateTPath = async (
    tPathId: string,
    updates: Partial<TPath>,
  ): Promise<void> => {
    await database.updateTPath(tPathId, updates);
  };

  const deleteTPath = async (tPathId: string): Promise<void> => {
    await database.deleteTPath(tPathId);
  };

  const addTPathExercise = async (exercise: TPathExercise): Promise<void> => {
    await database.addTPathExercise(exercise);
  };

  const getTPathExercises = async (
    tPathId: string,
  ): Promise<TPathExercise[]> => {
    return await database.getTPathExercises(tPathId);
  };

  const deleteTPathExercise = async (exerciseId: string): Promise<void> => {
    await database.deleteTPathExercise(exerciseId);
  };

  const updateTPathProgress = async (
    progress: TPathProgress,
  ): Promise<void> => {
    await database.updateTPathProgress(progress);
  };

  const getTPathProgress = async (
    targetUserId: string,
    tPathId: string,
  ): Promise<TPathProgress | null> => {
    return await database.getTPathProgress(targetUserId, tPathId);
  };

  const getAllTPathProgress = async (
    targetUserId: string,
  ): Promise<TPathProgress[]> => {
    return await database.getAllTPathProgress(targetUserId);
  };

  const addGym = async (gym: Gym): Promise<void> => {
    await database.addGym(gym);
  };

  const getGym = async (gymId: string): Promise<Gym | null> => {
    return await database.getGym(gymId);
  };

  const getGyms = async (targetUserId: string): Promise<Gym[]> => {
    return await database.getGyms(targetUserId);
  };

  const getActiveGym = async (targetUserId: string): Promise<Gym | null> => {
    return await database.getActiveGym(targetUserId);
  };

  const updateGym = async (
    gymId: string,
    updates: Partial<Gym>,
  ): Promise<void> => {
    await database.updateGym(gymId, updates);
  };

  const setActiveGym = async (
    targetUserId: string,
    gymId: string,
  ): Promise<void> => {
    await database.setActiveGym(targetUserId, gymId);
  };

  const deleteGym = async (gymId: string): Promise<void> => {
    await database.deleteGym(gymId);
  };

  const value = useMemo(
    () => ({
      addWorkoutSession,
      addSetLog,
      getWorkoutSessions,
      getSetLogs,
      getPersonalRecord,
      saveTemplate,
      getTemplates,
      getTemplate,
      deleteTemplate,
      getWorkoutStats,
      getWorkoutFrequency,
      getVolumeHistory,
      getPRHistory,
      saveBodyMeasurement,
      getBodyMeasurements,
      getWeightHistory,
      deleteBodyMeasurement,
      saveGoal,
      getGoals,
      getGoal,
      updateGoalProgress,
      deleteGoal,
      unlockAchievement,
      getUserAchievements,
      hasAchievement,
      checkAndUnlockAchievements,
      addTPath,
      getTPath,
      getTPaths,
      getTPathsByParent,
      updateTPath,
      deleteTPath,
      addTPathExercise,
      getTPathExercises,
      deleteTPathExercise,
      updateTPathProgress,
      getTPathProgress,
      getAllTPathProgress,
      addGym,
      getGym,
      getGyms,
      getActiveGym,
      updateGym,
      setActiveGym,
      deleteGym,
      isSyncing,
      queueLength,
      isOnline,
      loadDashboardSnapshot,
    }),
    [isSyncing, queueLength, isOnline, loadDashboardSnapshot],
  );

  if (!isInitialized) {
    return null;
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

export default DataProvider;

export type {
  ProgrammeType,
};
