import type { Book } from '@/models/Book'
import placeholder from '@/assets/no-cover.svg'
import config from './config'

export function getCoverUrl(book: Book, size: 'S' | 'M' | 'L'): string {
  if (book.isbn) {
    return `${config.coverBaseUrl}/isbn/${encodeURIComponent(book.isbn)}-${size}.jpg?default=false`
  } else if (book.coverImageId) {
    return `${config.coverBaseUrl}/id/${encodeURIComponent(book.coverImageId)}-${size}.jpg?default=false`
  }

  return placeholder
}
