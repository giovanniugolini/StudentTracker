import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Student } from '@/types/database'

export interface StudentFormData {
  name: string
  phone: string
  emergency_contact: string
  consent_signed: boolean
}

export const EMPTY_STUDENT_FORM: StudentFormData = {
  name: '',
  phone: '',
  emergency_contact: '',
  consent_signed: false,
}

function validateStudent(data: StudentFormData): string | null {
  if (!data.name.trim()) return 'Il nome dello studente è obbligatorio'
  if (data.name.trim().split(' ').length < 2) return 'Inserisci nome e cognome'
  if (data.phone && !/^[+\d\s\-()]{6,20}$/.test(data.phone))
    return 'Numero di telefono non valido'
  return null
}

export function useStudents(tripId: string | undefined) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStudents = useCallback(async () => {
    if (!tripId) {
      setStudents([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('trip_id', tripId)
      .order('name', { ascending: true })
    if (error) setError(error.message)
    else setStudents(data ?? [])
    setLoading(false)
  }, [tripId])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const addStudent = useCallback(
    async (formData: StudentFormData) => {
      const validationError = validateStudent(formData)
      if (validationError) throw new Error(validationError)
      if (!tripId) throw new Error('Nessuna gita selezionata')

      const { data, error } = await supabase
        .from('students')
        .insert({
          trip_id: tripId,
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          emergency_contact: formData.emergency_contact.trim() || null,
          consent_signed: formData.consent_signed,
        })
        .select()
        .single()
      if (error) throw new Error(error.message)
      setStudents((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      return data
    },
    [tripId],
  )

  const updateStudent = useCallback(async (id: string, formData: Partial<StudentFormData>) => {
    const updates = {
      ...(formData.name !== undefined && { name: formData.name.trim() }),
      ...(formData.phone !== undefined && { phone: formData.phone.trim() || null }),
      ...(formData.emergency_contact !== undefined && {
        emergency_contact: formData.emergency_contact.trim() || null,
      }),
      ...(formData.consent_signed !== undefined && { consent_signed: formData.consent_signed }),
    }
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setStudents((prev) => prev.map((s) => (s.id === id ? data : s)))
    return data
  }, [])

  const removeStudent = useCallback(async (id: string) => {
    const { error } = await supabase.from('students').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setStudents((prev) => prev.filter((s) => s.id !== id))
  }, [])

  return {
    students,
    loading,
    error,
    addStudent,
    updateStudent,
    removeStudent,
    refetch: fetchStudents,
  }
}
