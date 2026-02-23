import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { bufferPosition, countBuffered, flushBuffer } from '@/lib/positionBuffer'
import type { BufferedPosition } from '@/lib/positionBuffer'

const sample: BufferedPosition = {
  student_id: 'student-1',
  trip_id: 'trip-1',
  lat: 41.9028,
  lng: 12.4964,
  accuracy: 10,
  battery_level: 80,
  recorded_at: new Date().toISOString(),
}

beforeEach(async () => {
  // Reset IndexedDB between tests by deleting the DB
  indexedDB.deleteDatabase('student-tracker')
})

describe('positionBuffer', () => {
  it('starts empty', async () => {
    expect(await countBuffered()).toBe(0)
  })

  it('buffers a position', async () => {
    await bufferPosition(sample)
    expect(await countBuffered()).toBe(1)
  })

  it('buffers multiple positions', async () => {
    await bufferPosition(sample)
    await bufferPosition({ ...sample, lat: 41.903 })
    await bufferPosition({ ...sample, lat: 41.904 })
    expect(await countBuffered()).toBe(3)
  })

  it('flushBuffer sends all records and empties the store', async () => {
    await bufferPosition(sample)
    await bufferPosition({ ...sample, lat: 41.903 })

    const sent: BufferedPosition[] = []
    const { sent: sentCount, remaining } = await flushBuffer(async (pos) => {
      sent.push(pos)
    })

    expect(sentCount).toBe(2)
    expect(remaining).toBe(0)
    expect(sent[0].lat).toBe(41.9028)
    expect(sent[1].lat).toBe(41.903)
    expect(await countBuffered()).toBe(0)
  })

  it('flushBuffer stops and preserves remaining records on error', async () => {
    await bufferPosition(sample)
    await bufferPosition({ ...sample, lat: 41.903 })
    await bufferPosition({ ...sample, lat: 41.904 })

    let calls = 0
    const { sent, remaining } = await flushBuffer(async () => {
      calls++
      if (calls === 2) throw new Error('network error')
    })

    expect(sent).toBe(1)       // first succeeded
    expect(remaining).toBe(2)  // second + third preserved
    expect(await countBuffered()).toBe(2)
  })

  it('flushBuffer on empty store returns 0/0', async () => {
    const { sent, remaining } = await flushBuffer(async () => {})
    expect(sent).toBe(0)
    expect(remaining).toBe(0)
  })
})
