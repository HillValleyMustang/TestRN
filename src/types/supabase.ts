export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_logs: {
        Row: {
          activity_type: string
          avg_time: number | null
          created_at: string | null
          distance: string | null
          id: string
          is_pb: boolean | null
          log_date: string
          time: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          avg_time?: number | null
          created_at?: string | null
          distance?: string | null
          id?: string
          is_pb?: boolean | null
          log_date: string
          time?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          avg_time?: number | null
          created_at?: string | null
          distance?: string | null
          id?: string
          is_pb?: boolean | null
          log_date?: string
          time?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_definitions: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          main_muscle: string
          name: string
          pro_tip: string | null
          type: string
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          main_muscle: string
          name: string
          pro_tip?: string | null
          type?: string
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          main_muscle?: string
          name?: string
          pro_tip?: string | null
          type?: string
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_definitions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          body_fat_pct: number | null
          created_at: string | null
          first_name: string | null
          full_name: string | null
          health_notes: string | null
          height_cm: number | null
          id: string
          last_name: string | null
          primary_goal: string | null
          preferred_muscles: string | null
          target_date: string | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          body_fat_pct?: number | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          health_notes?: string | null
          height_cm?: number | null
          id: string
          last_name?: string | null
          primary_goal?: string | null
          preferred_muscles?: string | null
          target_date?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          body_fat_pct?: number | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          health_notes?: string | null
          height_cm?: number | null
          id?: string
          last_name?: string | null
          primary_goal?: string | null
          preferred_muscles?: string | null
          target_date?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      set_logs: {
        Row: {
          created_at: string | null
          exercise_id: string | null
          id: string
          is_pb: boolean | null
          reps: number | null
          reps_l: number | null
          reps_r: number | null
          session_id: string | null
          time_seconds: number | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          is_pb?: boolean | null
          reps?: number | null
          reps_l?: number | null
          reps_r?: number | null
          session_id?: string | null
          time_seconds?: number | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          is_pb?: boolean | null
          reps?: number | null
          reps_l?: number | null
          reps_r?: number | null
          session_id?: string | null
          time_seconds?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      template_exercises: {
        Row: {
          created_at: string | null
          exercise_id: string
          id: string
          order_index: number
          template_id: string
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          id?: string
          order_index: number
          template_id: string
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          id?: string
          order_index?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_exercises_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          created_at: string | null
          duration_string: string | null
          id: string
          session_date: string
          template_name: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_string?: string | null
          id?: string
          session_date: string
          template_name?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_string?: string | null
          id?: string
          session_date?: string
          template_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          created_at: string | null
          id: string
          is_bonus: boolean | null
          template_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_bonus?: boolean | null
          template_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_bonus?: boolean | null
          template_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName] // Fixed: Use EnumName here
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never