/**
 * IndexedDB buffer for GPS positions accumulated while offline.
 * Records are stored in insertion order; on flush they are sent via
 * a caller-supplied callback and deleted on success.
 */

const DB_NAME = 'student-tracker'
const STORE_NAME = 'offline-positions'
const DB_VERSION = 1

export interface BufferedPosition {
  student_id: string
  trip_id: string
  lat: number
  lng: number
  accuracy: number | null
  battery_level: number | null
  recorded_at: string // ISO timestamp
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Append one position to the offline buffer. */
export async function bufferPosition(pos: BufferedPosition): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).add(pos)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/** Return how many positions are currently buffered. */
export async function countBuffered(): Promise<number> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).count()
    req.onsuccess = () => {
      db.close()
      resolve(req.result)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

/**
 * Send all buffered positions via `send`, deleting each one on success.
 * Stops at the first failure so partial progress is preserved.
 * Returns { sent, remaining }.
 */
export async function flushBuffer(
  send: (pos: BufferedPosition) => Promise<void>,
): Promise<{ sent: number; remaining: number }> {
  const db = await openDb()

  const records = await new Promise<{ key: IDBValidKey; value: BufferedPosition }[]>(
    (resolve, reject) => {
      const items: { key: IDBValidKey; value: BufferedPosition }[] = []
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).openCursor()
      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result
        if (cursor) {
          items.push({ key: cursor.key, value: cursor.value as BufferedPosition })
          cursor.continue()
        } else {
          resolve(items)
        }
      }
      req.onerror = () => reject(req.error)
    },
  )
  db.close()

  let sent = 0
  for (const { key, value } of records) {
    try {
      await send(value)
      sent++
      const db2 = await openDb()
      await new Promise<void>((resolve, reject) => {
        const tx = db2.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).delete(key)
        tx.oncomplete = () => {
          db2.close()
          resolve()
        }
        tx.onerror = () => {
          db2.close()
          reject(tx.error)
        }
      })
    } catch {
      break // preserve remaining records for next attempt
    }
  }

  return { sent, remaining: records.length - sent }
}
