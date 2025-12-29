export interface SyncQueueItem {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  table: 'workout_sessions' | 'set_logs';
  payload: { id: string; [key: string]: any };
  timestamp: number;
  attempts: number;
  error?: string;
  priority?: number; // Higher number = higher priority
}

export interface SyncQueueStore {
  getAll(): Promise<SyncQueueItem[]>;
  add(item: Omit<SyncQueueItem, 'id'>): Promise<number>;
  remove(id: number): Promise<void>;
  incrementAttempts(id: number, error: string): Promise<void>;
  clear(): Promise<void>;
}
