export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_status: {
        Row: {
          error_message: string | null
          last_run_at: string | null
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          error_message?: string | null
          last_run_at?: string | null
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          error_message?: string | null
          last_run_at?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_status_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: true
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_versions: {
        Row: {
          force_update_below_this: boolean
          is_supported: boolean
          platform: string
          release_notes: string | null
          released_at: string
          version: string
        }
        Insert: {
          force_update_below_this?: boolean
          is_supported?: boolean
          platform: string
          release_notes?: string | null
          released_at?: string
          version: string
        }
        Update: {
          force_update_below_this?: boolean
          is_supported?: boolean
          platform?: string
          release_notes?: string | null
          released_at?: string
          version?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
          timestamp: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          timestamp?: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      current_state: {
        Row: {
          latest_metrics: Json
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          latest_metrics?: Json
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          latest_metrics?: Json
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "current_state_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: true
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_events: {
        Row: {
          device_id: string
          event_type: string
          id: string
          payload: Json
          timestamp: string
        }
        Insert: {
          device_id: string
          event_type: string
          id?: string
          payload?: Json
          timestamp?: string
        }
        Update: {
          device_id?: string
          event_type?: string
          id?: string
          payload?: Json
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_push_tokens: {
        Row: {
          created_at: string
          id: string
          last_used_at: string | null
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      device_wifi_credentials: {
        Row: {
          added_at: string
          device_id: string
          encrypted_password: string
          id: string
          priority: number
          ssid: string
        }
        Insert: {
          added_at?: string
          device_id: string
          encrypted_password: string
          id?: string
          priority?: number
          ssid: string
        }
        Update: {
          added_at?: string
          device_id?: string
          encrypted_password?: string
          id?: string
          priority?: number
          ssid?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_wifi_credentials_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          claimed_at: string | null
          claimed_by_user_id: string | null
          created_at: string
          device_secret: string
          firmware_version: string | null
          hardware_revision: string | null
          id: string
          last_seen_at: string | null
          last_sync_at: string | null
          status: string
          target_firmware_version: string | null
        }
        Insert: {
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          device_secret: string
          firmware_version?: string | null
          hardware_revision?: string | null
          id?: string
          last_seen_at?: string | null
          last_sync_at?: string | null
          status?: string
          target_firmware_version?: string | null
        }
        Update: {
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          device_secret?: string
          firmware_version?: string | null
          hardware_revision?: string | null
          id?: string
          last_seen_at?: string | null
          last_sync_at?: string | null
          status?: string
          target_firmware_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_claimed_by_user_id_fkey"
            columns: ["claimed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_feedback: {
        Row: {
          comment: string | null
          created_at: string
          diagnostic_id: string
          id: string
          rating: string
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          diagnostic_id: string
          id?: string
          rating: string
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          diagnostic_id?: string
          id?: string
          rating?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_feedback_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_outputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_outputs: {
        Row: {
          agent_version: string
          category: string
          confidence: number
          explanation: string
          generated_at: string
          id: string
          recommended_action: string | null
          referenced_drive_id: string | null
          referenced_dtc_ids: string[]
          referenced_telemetry_ids: string[]
          severity: string
          status: string
          summary: string
          title: string
          urgency: string
          vehicle_id: string
        }
        Insert: {
          agent_version: string
          category: string
          confidence: number
          explanation: string
          generated_at?: string
          id?: string
          recommended_action?: string | null
          referenced_drive_id?: string | null
          referenced_dtc_ids?: string[]
          referenced_telemetry_ids?: string[]
          severity: string
          status?: string
          summary: string
          title: string
          urgency: string
          vehicle_id: string
        }
        Update: {
          agent_version?: string
          category?: string
          confidence?: number
          explanation?: string
          generated_at?: string
          id?: string
          recommended_action?: string | null
          referenced_drive_id?: string | null
          referenced_dtc_ids?: string[]
          referenced_telemetry_ids?: string[]
          severity?: string
          status?: string
          summary?: string
          title?: string
          urgency?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_outputs_referenced_drive_id_fkey"
            columns: ["referenced_drive_id"]
            isOneToOne: false
            referencedRelation: "drives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_outputs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      drives: {
        Row: {
          average_speed_kph: number | null
          distance_km: number | null
          duration_seconds: number | null
          ended_at: string | null
          has_anomaly: boolean
          id: string
          peak_metrics: Json
          started_at: string
          summary_metrics: Json
          sync_session_id: string | null
          vehicle_id: string
        }
        Insert: {
          average_speed_kph?: number | null
          distance_km?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          has_anomaly?: boolean
          id?: string
          peak_metrics?: Json
          started_at: string
          summary_metrics?: Json
          sync_session_id?: string | null
          vehicle_id: string
        }
        Update: {
          average_speed_kph?: number | null
          distance_km?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          has_anomaly?: boolean
          id?: string
          peak_metrics?: Json
          started_at?: string
          summary_metrics?: Json
          sync_session_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drives_sync_session_id_fkey"
            columns: ["sync_session_id"]
            isOneToOne: false
            referencedRelation: "sync_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drives_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      dtcs: {
        Row: {
          cleared_at: string | null
          cleared_by_user_id: string | null
          code: string
          description: string | null
          first_seen_at: string
          id: string
          is_active: boolean
          last_seen_at: string
          severity_raw: string | null
          sync_session_id: string | null
          vehicle_id: string
        }
        Insert: {
          cleared_at?: string | null
          cleared_by_user_id?: string | null
          code: string
          description?: string | null
          first_seen_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          severity_raw?: string | null
          sync_session_id?: string | null
          vehicle_id: string
        }
        Update: {
          cleared_at?: string | null
          cleared_by_user_id?: string | null
          code?: string
          description?: string | null
          first_seen_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          severity_raw?: string | null
          sync_session_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dtcs_cleared_by_user_id_fkey"
            columns: ["cleared_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dtcs_sync_session_id_fkey"
            columns: ["sync_session_id"]
            isOneToOne: false
            referencedRelation: "sync_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dtcs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          event_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          app_version: string | null
          created_at: string
          device_info: Json
          id: string
          message: string
          type: string
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_info?: Json
          id?: string
          message: string
          type: string
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_info?: Json
          id?: string
          message?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      firmware_versions: {
        Row: {
          binary_url: string
          checksum: string
          created_at: string
          is_active: boolean
          release_notes: string | null
          version: string
        }
        Insert: {
          binary_url: string
          checksum: string
          created_at?: string
          is_active?: boolean
          release_notes?: string | null
          version: string
        }
        Update: {
          binary_url?: string
          checksum?: string
          created_at?: string
          is_active?: boolean
          release_notes?: string | null
          version?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_sessions: {
        Row: {
          bytes_uploaded: number
          completed_at: string | null
          device_id: string
          error_message: string | null
          id: string
          row_count: number
          started_at: string
          status: string
          vehicle_id: string
        }
        Insert: {
          bytes_uploaded?: number
          completed_at?: string | null
          device_id: string
          error_message?: string | null
          id?: string
          row_count?: number
          started_at?: string
          status?: string
          vehicle_id: string
        }
        Update: {
          bytes_uploaded?: number
          completed_at?: string | null
          device_id?: string
          error_message?: string | null
          id?: string
          row_count?: number
          started_at?: string
          status?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_sessions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry: {
        Row: {
          id: string
          metrics: Json
          sync_session_id: string | null
          timestamp: string
          vehicle_id: string
        }
        Insert: {
          id?: string
          metrics?: Json
          sync_session_id?: string | null
          timestamp: string
          vehicle_id: string
        }
        Update: {
          id?: string
          metrics?: Json
          sync_session_id?: string | null
          timestamp?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_sync_session_id_fkey"
            columns: ["sync_session_id"]
            isOneToOne: false
            referencedRelation: "sync_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          notification_severity_threshold: string
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          timezone: string
          units_preference: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          notification_severity_threshold?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string
          units_preference?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          notification_severity_threshold?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string
          units_preference?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          locale: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vehicle_modifications: {
        Row: {
          created_at: string
          id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_modifications_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          device_id: string | null
          ecu_type: string | null
          id: string
          make: string | null
          model: string | null
          modifications: Json
          nickname: string | null
          owner_user_id: string
          vin: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          ecu_type?: string | null
          id?: string
          make?: string | null
          model?: string | null
          modifications?: Json
          nickname?: string | null
          owner_user_id: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          ecu_type?: string | null
          id?: string
          make?: string | null
          model?: string | null
          modifications?: Json
          nickname?: string | null
          owner_user_id?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      notify_agent: {
        Args: { p_session_id: string; p_vehicle_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
