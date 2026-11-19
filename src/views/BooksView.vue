<template>

  <v-container fluid class="pa-4">
    <v-alert v-if="collectionsError || booksError" type="error" variant="tonal" class="mb-4">{{ collectionsError || booksError }}</v-alert>

    <v-row v-if="!display.xs.value">

      <v-col cols="12" md="3">

        <h2 class="text-h6 mb-4">My Collections</h2>

        <v-list nav>

          <v-list-item v-for="collection in collections" :key="collection.readingListId"
            @click="handleCollectionClick(collection)"
            :active="selectedCollection?.readingListId === collection.readingListId" link>
            <v-list-item-title>{{ collection.name }}</v-list-item-title>
            <v-list-item-subtitle>{{ collection.description }}</v-list-item-subtitle>
          </v-list-item>

          <v-list-item v-if="collections.length === 0 && !loadingCollections && !collectionsError">
            <v-list-item-title>No collections found.</v-list-item-title>
          </v-list-item>

          <v-list-item v-if="loadingCollections">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <span class="ml-2">Loading collections...</span>
          </v-list-item>

        </v-list>

        <v-btn color="primary" variant="tonal" block class="mt-4" @click="showCreateListDialog = true">
          <v-icon left>$plus</v-icon>
          Create New List
        </v-btn>

      </v-col>

      <v-col cols="12" md="9">
        <h2 class="text-h6 mb-4">{{ desktopHeaderText }}</h2>

        <v-data-table :headers="desktopHeaders" :items="booksInCollection" item-value="bookId" class="elevation-0"
          :loading="loadingBooks" :no-data-text="booksError ? 'Books could not be loaded.' : 'No books in this collection.'">

          <template v-slot:item.cover="{ item }">
            <BookCover :src="getCoverUrl(item, 'M')" :alt="item.title" width="50" height="75" aspect-ratio="2/3" contain
              class="my-2 rounded"></BookCover>
          </template>

          <template v-slot:item.title="{ item }">
            <a @click="handleBookClick(item)" class="text-decoration-underline book-title-link">{{ item.title }}</a>
          </template>

          <template v-slot:item.averageRating="{ item }">
            <v-rating :model-value="item.reviewStats?.averageRating ?? 0" length="5" size="18" active-color="primary"
              readonly half-increments density="compact" />
            <span class="text-body-2 ms-1">({{ item.reviewStats?.averageRating?.toFixed(1) || 'N/A' }})</span>
          </template>

          <template v-slot:item.userRating="{ item }">
            <v-rating :model-value="item.userRating ?? 0" length="5" size="18" active-color="secondary" readonly
              half-increments density="compact" />
          </template>

        </v-data-table>
      </v-col>

    </v-row>

    <v-row v-else>
      <v-col cols="12">
        <div class="d-flex align-center mb-4">
          <v-btn v-if="viewingCollectionBooks" icon size="small" class="mr-2" @click="
            viewingCollectionBooks = false;
          selectedCollection = null;
          ">
            <v-icon>$arrowLeft</v-icon>
          </v-btn>
          <h2 class="text-h6">{{ mobileHeaderText }}</h2>
        </div>

        <v-btn v-if="!viewingCollectionBooks" color="primary" variant="tonal" block class="mt-4 mb-4"
          @click="showCreateListDialog = true">
          <v-icon left>$plus</v-icon>
          Create New List
        </v-btn>

        <v-list v-if="!viewingCollectionBooks" nav>
          <template v-for="(collection, index) in collections" :key="collection.readingListId">
            <v-list-item @click="handleCollectionClick(collection, true)" link>
              <template v-slot:prepend>
                <v-avatar color="grey-lighten-2">
                  <v-icon>$bookshelf</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title>{{ collection.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ collection.description }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider v-if="index < collections.length - 1"></v-divider>
          </template>

          <v-list-item v-if="collections.length === 0 && !loadingCollections && !collectionsError">
            <v-list-item-title>No collections found.</v-list-item-title>
          </v-list-item>

          <v-list-item v-if="loadingCollections">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <span class="ml-2">Loading collections...</span>
          </v-list-item>
        </v-list>

        <v-list v-else nav>
          <template v-for="(book, index) in booksInCollection" :key="book.bookId">
            <v-list-item @click="handleBookClick(book)" link>
              <template v-slot:prepend>
                <BookCover :src="getCoverUrl(book, 'M')" :alt="book.title" width="60" height="90" aspect-ratio="2/3" contain
                  class="rounded mr-2"></BookCover>
              </template>
              <v-list-item-title>{{ book.title }}</v-list-item-title>
              <v-list-item-subtitle>{{ book.publisher || 'N/A' }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider v-if="index < booksInCollection.length - 1"></v-divider>
          </template>

          <v-list-item v-if="booksInCollection.length === 0 && !loadingBooks && !booksError">
            <v-list-item-title>No books in this collection.</v-list-item-title>
          </v-list-item>

          <v-list-item v-if="loadingBooks">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <span class="ml-2">Loading books...</span>
          </v-list-item>
        </v-list>
      </v-col>
    </v-row>

    <BookDialog :saving="saving" :save-error="saveError" :model-value="showBookDetailsDialog" @update:model-value="showBookDetailsDialog = $event"
      :book="selectedBookForDetails" :select-options="collections" :review-stats="selectedBookForDetails?.reviewStats"
      :user-rating="userRatingForSelectedBook" :book-reading-list-id="bookReadingListIdForSelectedBook"
      @confirm-changes="confirmBookDialogChanges" />

    <CreateReadingListDialog :saving="creatingList" :save-error="createListError" :model-value="showCreateListDialog" @update:model-value="showCreateListDialog = $event"
      @create-list="handleCreateList" />

  </v-container>

</template>



<script setup lang="ts">
import { VRating } from 'vuetify/components'
import BookCover from '@/components/BookCover.vue'

import { ref, onMounted, computed } from 'vue'
import { useDisplay } from 'vuetify'
import { VDataTable } from 'vuetify/components'
import type { BookWithDetails } from '@/models/Book'
import type { ReadingList } from '@/models/ReadingList'
import { useBookDialog } from '@/composables/useBookDialog'
import BookDialog from '@/components/BookDialog.vue'
import CreateReadingListDialog from '@/components/CreateReadingListDialog.vue'
import { getCoverUrl } from '@/utils/coverUtils'
import { bookService, readingListService } from '@/services/serviceFactory'
import { useLatestData } from '@/composables/useLatestData'

const display = useDisplay()

const { data: collections, loading: loadingCollections, error: collectionsError, load: loadCollections } = useLatestData<ReadingList[]>([])
const selectedCollection = ref<ReadingList | null>(null)
const { data: booksInCollection, loading: loadingBooks, error: booksError, load: loadBooks, clear: clearBooks } = useLatestData<BookWithDetails[]>([])
const viewingCollectionBooks = ref(false)
const showCreateListDialog = ref(false)
const creatingList = ref(false)
const createListError = ref('')

const {
  saving,
  saveError,
  showBookDetailsDialog,
  selectedBookForDetails,
  userRatingForSelectedBook,
  bookReadingListIdForSelectedBook,
  openBookDialog,
  handleConfirmChanges,
} = useBookDialog()

const desktopHeaders = [
  { title: 'Cover', key: 'cover', sortable: false },
  { title: 'Title', key: 'title' },
  { title: 'Average Rating', key: 'averageRating' },
  { title: 'Your Rating', key: 'userRating' },
]

const desktopHeaderText = computed(() => {
  return selectedCollection.value
    ? `Books in "${selectedCollection.value.name}"`
    : 'Select a collection'
})

const mobileHeaderText = computed(() => {
  return viewingCollectionBooks.value
    ? `Books in "${selectedCollection.value?.name || ''}"`
    : 'My Collections'
})

const fetchCollections = () => loadCollections(
  () => readingListService.getMyReadingLists(), 'Could not load collections. Please reload to try again.',
)

const fetchBooksInCollection = (readingListId: string) => {
  clearBooks()
  return loadBooks(() => bookService.getBooksInReadingListWithDetails(readingListId), 'Could not load this collection. Please select it to try again.')
}

const handleCollectionClick = (collection: ReadingList, isMobile: boolean = false) => {
  selectedCollection.value = collection
  if (isMobile) viewingCollectionBooks.value = true
  return fetchBooksInCollection(collection.readingListId)
}

async function handleBookClick(book: BookWithDetails) {
  await openBookDialog(
    book,
    book.reviewStats,
    book.userRating,
    book.userReviewId,
    book.reviewText,
    book.readingListId,
  )
}

const confirmBookDialogChanges = async (payload: {
  bookId: string
  newRating?: number
  selectedListId?: string | null
}) => {
  await handleConfirmChanges(
    payload,
    (updatedBook) => {
      const index = booksInCollection.value.findIndex((b) => b.bookId === updatedBook.bookId)
      if (index !== -1) {
        Object.assign(booksInCollection.value[index], updatedBook)
      }
    },
    async () => {
      if (selectedCollection.value) {
        await fetchBooksInCollection(selectedCollection.value.readingListId)
      }
    },
  )
}

const handleCreateList = async (listDetails: { name: string; description: string }) => {
  if (creatingList.value) return
  creatingList.value = true
  createListError.value = ''
  try {
    await readingListService.createReadingList(listDetails)
    showCreateListDialog.value = false
    await fetchCollections()
  } catch (error) {
    console.error('Error creating list:', error)
    createListError.value = 'Could not create the collection. Please try again.'
  } finally {
    creatingList.value = false
  }
}

onMounted(() => {
  fetchCollections()
})

</script>



<style scoped>
.v-img.rounded {
  border-radius: 4px;
}

.v-data-table {
  width: 100%;
}

.v-data-table.elevation-0 {
  box-shadow: none !important;
}

a {
  color: inherit;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
  cursor: pointer;
}

@media (max-width: 599px) {
  .d-flex.align-center.mb-4 {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
  }

  .d-flex.align-center.mb-4 .v-btn {
    margin-right: 8px;
  }

  .d-flex.align-center.mb-4 .text-h6 {
    flex-grow: 1;
  }
}
</style>
