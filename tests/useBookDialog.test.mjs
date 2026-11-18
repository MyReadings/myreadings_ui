import { build } from 'esbuild'
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Bundle the real composable, replacing only its HTTP service boundary.
const bundle = await build({
  stdin: {
    contents: `export { useBookDialog } from './src/composables/useBookDialog.ts';
      export { calls, controls } from 'test-services';`,
    resolveDir: process.cwd(),
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'mock-services', setup(b) {
    b.onResolve({ filter: /^(?:@\/services\/serviceFactory|test-services)$/ }, () => ({ path: 'services', namespace: 'mock' }))
    b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `
      export const calls=[];
      export const controls={};
      const invoke=(name,args)=>{calls.push(name);return controls[name](...args)};
      export const reviewService={
        createOrUpdateReview:(...args)=>invoke('review',args),
        getReviewStats:(...args)=>invoke('stats',args),
        getMyReviewForBook:(...args)=>invoke('myReview',args)
      };
      export const readingListService={
        getReadingListContainingBook:(...args)=>invoke('containingList',args),
        getMyReadingLists:(...args)=>invoke('lists',args),
        moveBookBetweenReadingLists:(...args)=>invoke('move',args),
        addBookToReadingList:(...args)=>invoke('add',args),
        removeBookFromReadingList:(...args)=>invoke('remove',args)
      };` }))
  } }],
})
const { useBookDialog, calls, controls } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)

beforeEach(() => {
  calls.length = 0
  controls.stats = controls.myReview = controls.containingList = async () => null
  controls.lists = async () => []
  controls.review = async () => ({ reviewId: 'review-1' })
  controls.move = controls.add = controls.remove = async () => {}
})

async function open(listId = null) {
  const dialog = useBookDialog()
  await dialog.openBookDialog({ bookId: 'book-1' }, null, 0, null, null, listId)
  return dialog
}

test('failed save keeps the dialog open and exposes an error', async () => {
  const d = await open()
  controls.review = async () => { throw Error('offline') }
  await d.handleConfirmChanges({ bookId: 'book-1', newRating: 3 })
  assert.equal(d.showBookDetailsDialog.value, true)
  assert.match(d.saveError.value, /Could not save/)
  assert.equal(d.saving.value, false)
})

test('pending save blocks duplicate submission and closes after success', async () => {
  const d = await open()
  let finish
  controls.review = () => new Promise(resolve => { finish = resolve })
  const first = d.handleConfirmChanges({ bookId: 'book-1', newRating: 3 })
  await d.handleConfirmChanges({ bookId: 'book-1', newRating: 3 })
  assert.equal(d.saving.value, true)
  assert.equal(d.showBookDetailsDialog.value, true)
  assert.deepEqual(calls, ['review'])
  finish({ reviewId: 'review-1' })
  await first
  assert.equal(d.showBookDetailsDialog.value, false)
  assert.equal(d.saving.value, false)
})

test('retry after partial success does not create another review', async () => {
  const d = await open('old-list')
  controls.move = async () => { throw Error('offline') }
  const payload = { bookId: 'book-1', newRating: 3, selectedListId: 'new-list' }
  await d.handleConfirmChanges(payload)
  assert.equal(d.showBookDetailsDialog.value, true)
  assert.match(d.saveError.value, /Some changes were saved/)
  controls.move = async () => {}
  await d.handleConfirmChanges(payload)
  assert.deepEqual(calls, ['review', 'move', 'move'])
  assert.equal(d.showBookDetailsDialog.value, false)
})

test('clearing the selected collection removes the book', async () => {
  const d = await open('old-list')
  await d.handleConfirmChanges({ bookId: 'book-1', selectedListId: null })
  assert.deepEqual(calls, ['remove'])
  assert.equal(d.bookReadingListIdForSelectedBook.value, null)
})

test('failed detail load stays closed and exposes a retryable error', async () => {
  const d = useBookDialog()
  controls.stats = async () => { throw Error('offline') }
  await d.fetchAndOpenBookDialog({ bookId: 'book-1' })
  assert.equal(d.showBookDetailsDialog.value, false)
  assert.equal(d.loading.value, false)
  assert.match(d.loadError.value, /Could not load/)
})

test('a slow earlier book cannot replace the latest selection', async () => {
  const d = useBookDialog()
  let finish
  controls.stats = (id) => id === 'old' ? new Promise(resolve => { finish = resolve }) : Promise.resolve(null)
  const old = d.fetchAndOpenBookDialog({ bookId: 'old' })
  await d.fetchAndOpenBookDialog({ bookId: 'new' })
  finish(null)
  await old
  assert.equal(d.selectedBookForDetails.value.bookId, 'new')
  assert.equal(d.showBookDetailsDialog.value, true)
})
