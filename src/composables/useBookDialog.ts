import { ref, getCurrentScope, onScopeDispose } from 'vue'
import { reviewService, readingListService } from '@/services/serviceFactory'
import type { Book, BookWithDetails } from '@/models/Book'
import type { ReadingList } from '@/models/ReadingList'
import type { ReviewStats } from '@/models/Review'

export function useBookDialog() {
  const showBookDetailsDialog = ref(false)
  const selectedBookForDetails = ref<BookWithDetails | null>(null)
  const userRatingForSelectedBook = ref(0)
  const bookReadingListIdForSelectedBook = ref<string | null>(null)
  const readingLists = ref<ReadingList[]>([])
  const loadError = ref('')
  const loading = ref(false)
  let loadGeneration = 0
  if (getCurrentScope()) onScopeDispose(() => { loadGeneration++ })
  const saving = ref(false)
  const saveError = ref('')
  let readingListsLoaded = false

  const openBookDialog = async (
    bookBaseInfo: Book,
    fetchedReviewStats: ReviewStats | null,
    fetchedUserRating: number,
    fetchedUserReviewId: string | null,
    fetchedReviewText: string | null,
    currentReadingListId: string | null,
  ) => {
    saveError.value = ''
    selectedBookForDetails.value = {
      ...bookBaseInfo,
      reviewStats: fetchedReviewStats,
      userRating: fetchedUserRating,
      readingListId: currentReadingListId,
      userReviewId: fetchedUserReviewId,
      reviewText: fetchedReviewText,
    } as BookWithDetails

    userRatingForSelectedBook.value = fetchedUserRating
    bookReadingListIdForSelectedBook.value = currentReadingListId
    showBookDetailsDialog.value = true
  }

  const fetchAndOpenBookDialog = async (book: Book) => {
    if (saving.value) return
    const request = ++loadGeneration
    loadError.value = ''
    loading.value = true
    showBookDetailsDialog.value = false
    try {
      const [listInfo, stats, myReview, lists] = await Promise.all([
        readingListService.getReadingListContainingBook(book.bookId),
        reviewService.getReviewStats(book.bookId),
        reviewService.getMyReviewForBook(book.bookId),
        readingListsLoaded ? readingLists.value : readingListService.getMyReadingLists(),
      ])
      if (request !== loadGeneration) return
      readingLists.value = lists
      readingListsLoaded = true
      await openBookDialog(
        book, stats, myReview?.rating ?? 0, myReview?.reviewId ?? null,
        myReview?.reviewText ?? null, listInfo?.readingListId ?? null,
      )
    } catch (error) {
      if (request === loadGeneration) {
        console.error('Error loading book details:', error)
        loadError.value = 'Could not load book details. Please select the book to try again.'
      }
    } finally {
      if (request === loadGeneration) loading.value = false
    }
  }

  const handleConfirmChanges = async (
    payload: { bookId: string; newRating?: number; selectedListId?: string | null },
    onBookUpdatedInList?: (updatedBook: BookWithDetails) => void,
    onBookMoved?: () => Promise<void>,
  ) => {
    if (saving.value) return
    saving.value = true
    saveError.value = ''
    let changed = false
    try {
      if (payload.newRating !== undefined && payload.newRating !== userRatingForSelectedBook.value) {
        const review = await reviewService.createOrUpdateReview({
          bookId: payload.bookId,
          rating: payload.newRating,
          reviewText: selectedBookForDetails.value?.reviewText ?? undefined,
          reviewId: selectedBookForDetails.value?.userReviewId ?? null,
        })
        if (selectedBookForDetails.value) {
          selectedBookForDetails.value.userReviewId = review.reviewId
          selectedBookForDetails.value.userRating = payload.newRating
        }
        userRatingForSelectedBook.value = payload.newRating
        changed = true
      }
      if (payload.selectedListId !== undefined && payload.selectedListId !== bookReadingListIdForSelectedBook.value) {
        const previousListId = bookReadingListIdForSelectedBook.value
        const nextListId = payload.selectedListId
        if (previousListId && nextListId === null) {
          await readingListService.removeBookFromReadingList(previousListId, payload.bookId)
        } else if (previousListId && nextListId) {
          await readingListService.moveBookBetweenReadingLists(payload.bookId, previousListId, nextListId)
        } else if (nextListId) {
          await readingListService.addBookToReadingList(nextListId, payload.bookId)
        }
        if (selectedBookForDetails.value) selectedBookForDetails.value.readingListId = nextListId
        bookReadingListIdForSelectedBook.value = nextListId
        changed = true
        if (onBookMoved) await onBookMoved()
      }
      showBookDetailsDialog.value = false
    } catch (error) {
      console.error('Error saving book changes:', error)
      saveError.value = changed
        ? 'Some changes were saved, but the remaining changes or refresh failed. Please check and try again.'
        : 'Could not save your changes. Please try again.'
    } finally {
      try {
        if (changed && selectedBookForDetails.value && onBookUpdatedInList) {
          onBookUpdatedInList(selectedBookForDetails.value)
        }
      } catch (error) {
        console.error('Error refreshing saved book changes:', error)
        saveError.value = 'Changes were saved, but the display could not refresh. Please reopen the collection.'
        showBookDetailsDialog.value = true
      } finally {
        saving.value = false
      }
    }
  }

  return {
    loadError,
    loading,
    saving,
    saveError,
    showBookDetailsDialog,
    selectedBookForDetails,
    userRatingForSelectedBook,
    bookReadingListIdForSelectedBook,
    readingLists,
    openBookDialog,
    fetchAndOpenBookDialog,
    handleConfirmChanges,
  }
}
