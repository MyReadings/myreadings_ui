<template>
  <v-progress-linear v-if="loadingDetails" indeterminate color="primary" />
  <v-alert v-if="homeError || loadError" type="error" variant="tonal" class="ma-4">{{ homeError || loadError }}</v-alert>
  <v-progress-linear v-if="loadingHome" indeterminate color="primary" />
  <div class="new-releases">
    <h3>New Releases</h3>
    <p>Newly released books spanning various genres.</p>
    <swiper-container :breakpoints="swiperBreakpoints" speed="500" loop>
      <swiper-slide v-for="book in recentBooks" :key="book.bookId">
        <BookCard
          :genre="book.genre"
          :coverUrl="getCoverUrl(book, 'L')"
          :title="book.title"
          :description="book.description"
          @bookCardClicked="fetchAndOpenBookDialog(book)"
        />
      </swiper-slide>
    </swiper-container>
  </div>
  <div class="recommended">
    <h3>Recommended for you</h3>
    <p>Handpicked based on your reading preferences.</p>
    <swiper-container :breakpoints="swiperBreakpoints" speed="500" loop>
      <swiper-slide v-for="book in recommendedBooks" :key="book.bookId">
        <BookCard
          :genre="book.genre"
          :coverUrl="getCoverUrl(book, 'L')"
          :title="book.title"
          :description="book.description"
          @bookCardClicked="fetchAndOpenBookDialog(book)"
        />
      </swiper-slide>
    </swiper-container>
  </div>

  <BookDialog :saving="saving" :save-error="saveError"
    v-if="selectedBookForDetails"
    :model-value="showBookDetailsDialog"
    @update:model-value="showBookDetailsDialog = $event"
    :book="selectedBookForDetails"
    :select-options="readingLists"
    :review-stats="selectedBookForDetails?.reviewStats"
    :user-rating="userRatingForSelectedBook"
    :book-reading-list-id="bookReadingListIdForSelectedBook"
    @confirm-changes="handleConfirmChanges"
  />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { Book } from '@/models/Book'
import BookCard from '@/components/BookCard.vue'
import BookDialog from '@/components/BookDialog.vue'
import { getCoverUrl } from '@/utils/coverUtils'
import { useBookDialog } from '@/composables/useBookDialog'
import { bookService } from '@/services/serviceFactory'

const homeError = ref('')
const loadingHome = ref(false)
const recentBooks = ref<Book[]>([])
const recommendedBooks = ref<Book[]>([])

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

const swiperBreakpoints = {
  320: { slidesPerView: 1, spaceBetween: 10 },
  640: { slidesPerView: 2, spaceBetween: 15 },
  768: { slidesPerView: 3, spaceBetween: 20 },
  1024: { slidesPerView: 4, spaceBetween: 25 },
  1280: { slidesPerView: 4, spaceBetween: 25 },
}

onMounted(async () => {
  loadingHome.value = true
  try {
    const [recent, recommended] = await Promise.all([
      bookService.getNewReleases(10),
      bookService.getRecommended(6),
    ])
    recentBooks.value = recent
    recommendedBooks.value = recommended
  } catch (error) {
    console.error('Error fetching initial data for Home:', error)
    homeError.value = 'Could not load books. Please reload to try again.'
  } finally {
    loadingHome.value = false
  }
})
</script>

<style scoped>
h3 {
  font-weight: bold;
}

.new-releases,
.recommended {
  padding-left: 15px;
  padding-top: 15px;
}
</style>
