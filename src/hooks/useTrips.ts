import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Trip, TripStatus } from '@/types/database'

export interface TripFormData {
  name: string
  date_start: string
  date_end: string
  radius_km: number
}

export interface TripWithCount extends Trip {
  student_count: number
}

export const STATUS_LABELS: Record<TripStatus, string> = {
  draft: 'Bozza',
  active: 'Attiva',
  completed: 'Completata',
  cancelled: 'Annullata',
}

export const STATUS_COLORS: Record<TripStatus, string> = {
  draft: 'bg-slate-200 text-slate-600',
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-600',
  cancelled: 'bg-red-100 text-red-500',
}

export function validateTrip(data: TripFormData): string | null {
  if (!data.name.trim()) return 'Il nome della gita è obbligatorio'
  if (!data.date_start) return 'La data di inizio è obbligatoria'
  if (!data.date_end) return 'La data di fine è obbligatoria'
  if (new Date(data.date_end) <= new Date(data.date_start))
    return 'La data di fine deve essere successiva alla data di inizio'
  if (data.radius_km < 0.1 || data.radius_km > 5)
    return 'Il raggio deve essere tra 100m e 5km'
  return null
}

export function useTrips(teacherId: string | undefined) {
  const [trips, setTrips] = useState<TripWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrips = useCallback(async () => {
    if (!teacherId) return
    setLoading(true)

    // Fetch trips with student count in one query
    const { data, error } = await supabase
      .from('trips')
      .select('*, students(count)')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      const enriched: TripWithCount[] = (data ?? []).map((t) => ({
        ...t,
        student_count: (t.students as unknown as { count: number }[])[0]?.count ?? 0,
      }))
      setTrips(enriched)
    }
    setLoading(false)
  }, [teacherId])

  useEffect(() => {
    fetchTrips()
  }, [fetchTrips])

  const createTrip = useCallback(
    async (formData: TripFormData) => {
      const validationError = validateTrip(formData)
      if (validationError) throw new Error(validationError)
      if (!teacherId) throw new Error('Non autenticato')

      const { data, error } = await supabase
        .from('trips')
        .insert({ ...formData, teacher_id: teacherId, status: 'draft' as TripStatus })
        .select()
        .single()
      if (error) throw new Error(error.message)
      const newTrip: TripWithCount = { ...data, student_count: 0 }
      setTrips((prev) => [newTrip, ...prev])
      return newTrip
    },
    [teacherId],
  )

  const updateTrip = useCallback(
    async (id: string, updates: Partial<TripFormData & { status: TripStatus }>) => {
      const { data, error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      setTrips((prev) =>
        prev.map((t) =>
          t.id === id ? { ...data, student_count: t.student_count } : t,
        ),
      )
      return data
    },
    [],
  )

  const deleteTrip = useCallback(async (id: string) => {
    const { error } = await supabase.from('trips').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setTrips((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { trips, loading, error, createTrip, updateTrip, deleteTrip, refetch: fetchTrips }
}
