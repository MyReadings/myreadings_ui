// The source page can have more records even when remote books were deleted.
export async function fetchAllPages<T>(fetchPage: (page: number, size: number) => Promise<{
  data: T[]; headers: { [key: string]: unknown }
}>): Promise<T[]> {
  const result: T[] = []
  for (let page = 0; ; page++) {
    const response = await fetchPage(page, 100)
    result.push(...(response.data ?? []))
    const more = String(response.headers['x-has-more'])
    if (more !== 'true' && more !== 'false') throw new Error('Missing collection pagination metadata')
    if (more === 'false') return result
  }
}

export async function fetchIdBatches<T>(ids: string[], fetchBatch: (ids: string[]) => Promise<T[]>): Promise<T[]> {
  const result: T[] = []
  const unique = [...new Set(ids)]
  for (let start = 0; start < unique.length; start += 500) {
    result.push(...await fetchBatch(unique.slice(start, start + 500)))
  }
  return result
}
