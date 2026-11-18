import { build } from 'esbuild'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const bundle = await build({ stdin: { contents: "export { useLatestData } from './src/composables/useLatestData.ts'; export { watchEffect, nextTick } from 'vue';", resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'esm' })
const { useLatestData, watchEffect, nextTick } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

test('out-of-order responses preserve the latest selection and its loading state', async () => {
  const resource = useLatestData([])
  const first = deferred(), second = deferred()
  const a = resource.load(() => first.promise, 'first error')
  const b = resource.load(() => second.promise, 'second error')
  first.resolve(['old'])
  await a
  assert.equal(resource.loading.value, true)
  assert.deepEqual(resource.data.value, [])
  second.resolve(['new'])
  await b
  assert.equal(resource.loading.value, false)
  assert.deepEqual(resource.data.value, ['new'])
})

test('a stale failure cannot erase successful results', async () => {
  const resource = useLatestData([])
  const first = deferred()
  const old = resource.load(() => first.promise, 'old error')
  await resource.load(async () => ['new'], 'new error')
  first.reject(Error('offline'))
  await old
  assert.deepEqual(resource.data.value, ['new'])
  assert.equal(resource.error.value, '')
})

test('clearing a query invalidates its pending response', async () => {
  const resource = useLatestData([])
  const request = deferred()
  const pending = resource.load(() => request.promise, 'error')
  resource.clear()
  request.resolve(['old'])
  await pending
  assert.deepEqual(resource.data.value, [])
  assert.equal(resource.loading.value, false)
})

test('current failure shows an error and a successful retry clears it', async () => {
  const resource = useLatestData([])
  await resource.load(async () => { throw Error('offline') }, 'Please try again')
  assert.equal(resource.error.value, 'Please try again')
  assert.equal(resource.loading.value, false)
  await resource.load(async () => ['recovered'], 'error')
  assert.equal(resource.error.value, '')
  assert.deepEqual(resource.data.value, ['recovered'])
})

test('saved edits to loaded book details remain reactive for the view', async () => {
  const resource = useLatestData([])
  await resource.load(async () => [{ userRating: 1 }], 'error')
  let displayedRating
  const stop = watchEffect(() => { displayedRating = resource.data.value[0].userRating })
  try {
    Object.assign(resource.data.value[0], { userRating: 4 })
    await nextTick()
    assert.equal(displayedRating, 4)
  } finally { stop() }
})
