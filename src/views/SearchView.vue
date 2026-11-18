<template>
  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col cols="12">
        <v-text-field
          v-model="searchQuery"
          label="Search for books..."
          append-inner-icon="mdi-magnify"
          variant="outlined"
          clearable
          @click:append-inner="performSearch"
          @keyup.enter="performSearch"
          @click:clear="clearSearch"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-progress-linear v-if="loadingDetails" indeterminate color="primary" />
    <v-alert v-if="loadError || searchError" type="error" variant="tonal" class="mb-4">{{ loadError || searchError }}</v-alert>

    <v-row v-if="loadingResults" class="justify-center">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <p class="mt-2">Loading search results...</p>
      </v-col>
    </v-row>

    <v-row v-else-if="searchResults.length === 0 && hasSearched && !searchError">
      <v-col cols="12" class="text-center">
        <v-alert type="info" variant="tonal" class="mx-auto" max-width="400">
          No books found matching your search.
        </v-alert>
      </v-col>
    </v-row>

    <v-row v-else-if="searchResults.length > 0">
      <v-col v-if="!display.xs.value" cols="12">
        <v-row>
          <v-col
            v-for="book in searchResults"
            :key="book.bookId"
            cols="12"
            sm="6"
            md="4"
            lg="3"
            class="d-flex flex-column"
          >
            <BookCard
              :genre="book.genre"
              :coverUrl="getCoverUrl(book, 'L')"
              :title="book.title"
              :description="book.description"
              @bookCardClicked="fetchAndOpenBookDialog(book)"
            />
          </v-col>
        </v-row>
      </v-col>

      <v-col v-else cols="12">
        <v-list>
          <template v-for="(book, index) in searchResults" :key="book.bookId">
            <v-list-item @click="fetchAndOpenBookDialog(book)" link>
              <template v-slot:prepend>
                <v-img
                  :src="getCoverUrl(book, 'M')"
                  :alt="book.title"
                  width="60"
                  height="90"
                  aspect-ratio="2/3"
                  contain
                  class="rounded mr-4"
                ></v-img>
              </template>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">{{ book.title }}</v-list-item-title>
                <v-list-item-subtitle>{{ book.publisher || 'N/A' }}</v-list-item-subtitle>
              </v-list-item>
            </v-list-item>
            <v-divider v-if="index < searchResults.length - 1"></v-divider>
          </template>
        </v-list>
      </v-col>
    </v-row>

    <v-row v-if="totalPages > 1" class="mt-4">
      <v-col cols="12" class="d-flex justify-center">
        <v-pagination
          v-model="currentPage"
          :length="totalPages"
          :total-visible="display.xs.value ? 5 : 7"
          rounded="circle"
          color="primary"
          @update:model-value="onPageChange"
        ></v-pagination>
      </v-col>
    </v-row>

    <BookDialog :saving="saving" :save-error="saveError"
      :model-value="showBookDetailsDialog"
      @update:model-value="showBookDetailsDialog = $event"
      :book="selectedBookForDetails"
      :select-options="readingLists"
      :review-stats="selectedBookForDetails?.reviewStats"
      :user-rating="userRatingForSelectedBook"
      :book-reading-list-id="bookReadingListIdForSelectedBook"
      @confirm-changes="handleConfirmChanges"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDisplay } from 'vuetify'
import type { Book } from '@/models/Book'
import BookCard from '@/components/BookCard.vue'
import BookDialog from '@/components/BookDialog.vue'
import { useBookDialog } from '@/composables/useBookDialog'
import { getCoverUrl } from '@/utils/coverUtils'
import { bookService } from '@/services/serviceFactory'
import { useLatestData } from '@/composables/useLatestData'

const display = useDisplay()

const searchQuery = ref('')
const { data: results, loading: loadingResults, error: searchError, load, clear } = useLatestData<Awaited<ReturnType<typeof bookService.searchBooks>> | null>(null)
const searchResults = computed(() => results.value?.content ?? [])
const hasSearched = ref(false)

const currentPage = ref(1)
const pageSize = 12
const totalPages = computed(() => results.value?.totalPages ?? 0)

const {
  loading: loadingDetails,
  loadError,
  saving,
  saveError,
  showBookDetailsDialog,
  selectedBookForDetails,
  userRatingForSelectedBook,
  bookReadingListIdForSelectedBook,
  readingLists,
  fetchAndOpenBookDialog,
  handleConfirmChanges,
} = useBookDialog()

const performSearch = async () => {
  const query = (searchQuery.value ?? '').trim()
  if (!query) {
    clearSearch()
    return
  }
  hasSearched.value = true
  const page = currentPage.value - 1
  await load(() => bookService.searchBooks(query, page, pageSize), 'Could not load search results. Please try again.')
}

const onPageChange = (newPage: number) => {
  currentPage.value = newPage
  performSearch()
}

const clearSearch = () => {
  searchQuery.value = ''
  hasSearched.value = false
  currentPage.value = 1
  clear()
}

watch(searchQuery, (newQuery, oldQuery) => {
  if ((newQuery ?? '').trim() !== (oldQuery ?? '').trim()) {
    currentPage.value = 1
    hasSearched.value = false
    clear()
  }
}, { flush: 'sync' })
</script>
<style scoped>
.v-text-field {
  max-width: 600px;
  margin: 0 auto;
}

.v-list-item-content {
  flex-grow: 1;
}

.v-list-item-title {
  white-space: normal;
  line-height: 1.2;
}

.v-list-item-subtitle {
  white-space: normal;
}
</style>
