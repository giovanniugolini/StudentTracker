export type TripStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type AlertType = 'out_of_zone' | 'low_battery' | 'gps_lost' | 'disconnected'

export interface Teacher {
  id: string
  email: string
  name: string
  school_name: string | null
  device_token: string | null
  created_at: string
}

export interface Trip {
  id: string
  teacher_id: string
  name: string
  date_start: string
  date_end: string
  radius_km: number
  status: TripStatus
  created_at: string
}

export interface Student {
  id: string
  trip_id: string
  name: string
  phone: string | null
  emergency_contact: string | null
  consent_signed: boolean
  token: string
  device_token: string | null
  created_at: string
}

export interface Position {
  id: number
  student_id: string
  trip_id: string
  lat: number
  lng: number
  accuracy: number | null
  battery_level: number | null
  timestamp: string
}

export interface Alert {
  id: number
  student_id: string
  trip_id: string
  type: AlertType
  distance_km: number | null
  resolved: boolean
  resolved_at: string | null
  timestamp: string
}

// Generic Database type for Supabase client
export type Database = {
  public: {
    Functions: {
      get_student_by_token: {
        Args: { p_token: string }
        Returns: { student: Student; trip: Trip }
      }
    }
    Tables: {
      teachers: { Row: Teacher; Insert: Omit<Teacher, 'created_at'>; Update: Partial<Teacher> }
      trips: { Row: Trip; Insert: Omit<Trip, 'id' | 'created_at'>; Update: Partial<Trip> }
      students: {
        Row: Student
        Insert: Omit<Student, 'id' | 'token' | 'created_at'>
        Update: Partial<Student>
      }
      positions: {
        Row: Position
        Insert: Omit<Position, 'id' | 'timestamp'>
        Update: Partial<Position>
      }
      alerts: {
        Row: Alert
        Insert: Omit<Alert, 'id' | 'timestamp'>
        Update: Partial<Alert>
      }
    }
    Enums: {
      trip_status: TripStatus
      alert_type: AlertType
    }
  }
}
