import type { Book } from '@/models/Book'
import placeholder from '@/assets/no-cover.svg'

export function getCoverUrl(book: Book, size: 'S' | 'M' | 'L'): string {
  if (book.isbn) {
    return `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(book.isbn)}-${size}.jpg?default=false`
  } else if (book.coverImageId) {
    return `https://covers.openlibrary.org/b/id/${encodeURIComponent(book.coverImageId)}-${size}.jpg?default=false`
  }

  return placeholder
}
