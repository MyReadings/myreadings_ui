// Small process-local cache for demo artwork. Never forwards credentials or arbitrary URLs.
function createCoverCache({ fetchCover = fetch, maxBytes = 8 * 1024 * 1024, maxEntries = 64,
  maxImageBytes = 1024 * 1024, maxPending = 32, timeoutMs = 2000 } = {}) {
  const cache = new Map()
  const pending = new Map()
  let bytes = 0
  return async function getCover(type, id, size) {
    if (!['isbn', 'id'].includes(type) || !/^[0-9Xx-]{1,20}$/.test(id) || !['S', 'M', 'L'].includes(size)) {
      throw new Error('Invalid cover identifier')
    }
    const key = `${type}/${id}-${size}.jpg`
    if (cache.has(key)) {
      const hit = cache.get(key)
      cache.delete(key)
      cache.set(key, hit)
      return hit
    }
    if (pending.has(key)) return pending.get(key)
    if (pending.size >= maxPending) throw new Error('Cover fetch capacity reached')
    const request = (async () => {
      const response = await fetchCover(`https://covers.openlibrary.org/b/${key}?default=false`, {
        signal: AbortSignal.timeout(timeoutMs), redirect: 'error',
      })
      if (!response.ok || !/^image\/(jpeg|png|webp)(;|$)/i.test(response.headers.get('content-type') || '')) {
        await response.body?.cancel()
        throw new Error('Cover unavailable')
      }
      const reader = response.body.getReader()
      const chunks = []
      let length = 0
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          length += value.length
          if (length > maxImageBytes) throw new Error('Cover exceeds size limit')
          chunks.push(Buffer.from(value))
        }
      } catch (error) {
        await reader.cancel()
        throw error
      } finally { reader.releaseLock() }
      const cover = { body: Buffer.concat(chunks), type: response.headers.get('content-type') }
      if (length <= maxBytes) {
        while (cache.size && (bytes + length > maxBytes || cache.size >= maxEntries)) {
          const oldest = cache.keys().next().value
          bytes -= cache.get(oldest).body.length
          cache.delete(oldest)
        }
        cache.set(key, cover)
        bytes += length
      }
      return cover
    })()
    pending.set(key, request)
    try { return await request } finally { pending.delete(key) }
  }
}
module.exports = { createCoverCache }
