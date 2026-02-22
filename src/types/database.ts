export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      alerts: {
        Row: {
          distance_km: number | null
          id: number
          resolved: boolean
          resolved_at: string | null
          student_id: string
          timestamp: string
          trip_id: string
          type: Database["public"]["Enums"]["alert_type"]
        }
        Insert: {
          distance_km?: number | null
          id?: never
          resolved?: boolean
          resolved_at?: string | null
          student_id: string
          timestamp?: string
          trip_id: string
          type: Database["public"]["Enums"]["alert_type"]
        }
        Update: {
          distance_km?: number | null
          id?: never
          resolved?: boolean
          resolved_at?: string | null
          student_id?: string
          timestamp?: string
          trip_id?: string
          type?: Database["public"]["Enums"]["alert_type"]
        }
        Relationships: [
          {
            foreignKeyName: "alerts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          accuracy: number | null
          battery_level: number | null
          id: number
          lat: number
          lng: number
          student_id: string
          timestamp: string
          trip_id: string
        }
        Insert: {
          accuracy?: number | null
          battery_level?: number | null
          id?: never
          lat: number
          lng: number
          student_id: string
          timestamp?: string
          trip_id: string
        }
        Update: {
          accuracy?: number | null
          battery_level?: number | null
          id?: never
          lat?: number
          lng?: number
          student_id?: string
          timestamp?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          consent_signed: boolean
          created_at: string
          device_token: string | null
          emergency_contact: string | null
          id: string
          name: string
          phone: string | null
          token: string
          trip_id: string
        }
        Insert: {
          consent_signed?: boolean
          created_at?: string
          device_token?: string | null
          emergency_contact?: string | null
          id?: string
          name: string
          phone?: string | null
          token?: string
          trip_id: string
        }
        Update: {
          consent_signed?: boolean
          created_at?: string
          device_token?: string | null
          emergency_contact?: string | null
          id?: string
          name?: string
          phone?: string | null
          token?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string
          device_token: string | null
          email: string
          id: string
          name: string
          school_name: string | null
        }
        Insert: {
          created_at?: string
          device_token?: string | null
          email: string
          id: string
          name: string
          school_name?: string | null
        }
        Update: {
          created_at?: string
          device_token?: string | null
          email?: string
          id?: string
          name?: string
          school_name?: string | null
        }
        Relationships: []
      }
      trips: {
        Row: {
          created_at: string
          date_end: string
          date_start: string
          id: string
          name: string
          radius_km: number
          status: Database["public"]["Enums"]["trip_status"]
          teacher_id: string
        }
        Insert: {
          created_at?: string
          date_end: string
          date_start: string
          id?: string
          name: string
          radius_km?: number
          status?: Database["public"]["Enums"]["trip_status"]
          teacher_id: string
        }
        Update: {
          created_at?: string
          date_end?: string
          date_start?: string
          id?: string
          name?: string
          radius_km?: number
          status?: Database["public"]["Enums"]["trip_status"]
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_student_by_token: {
        Args: { p_token: string }
        Returns: Json
      }
      upsert_position: {
        Args: {
          p_student_id: string
          p_trip_id: string
          p_lat: number
          p_lng: number
          p_accuracy?: number
          p_battery?: number
        }
        Returns: undefined
      }
    }
    Enums: {
      alert_type: "out_of_zone" | "low_battery" | "gps_lost" | "disconnected"
      trip_status: "draft" | "active" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      alert_type: ["out_of_zone", "low_battery", "gps_lost", "disconnected"],
      trip_status: ["draft", "active", "completed", "cancelled"],
    },
  },
} as const

// ─── Convenience type aliases ────────────────────────────────────────────────
export type Teacher  = Database['public']['Tables']['teachers']['Row']
export type Trip     = Database['public']['Tables']['trips']['Row']
export type Student  = Database['public']['Tables']['students']['Row']
export type Position = Database['public']['Tables']['positions']['Row']
export type Alert    = Database['public']['Tables']['alerts']['Row']
export type TripStatus = Database['public']['Enums']['trip_status']
export type AlertType  = Database['public']['Enums']['alert_type']
