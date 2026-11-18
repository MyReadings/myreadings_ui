import { getCurrentScope, onScopeDispose, ref, type Ref } from 'vue'

// Only the latest selection may update the screen, including its loading/error state.
export function useLatestData<T>(initial: T) {
  const data = ref(initial) as Ref<T>
  const loading = ref(false)
  const error = ref('')
  let generation = 0
  const clear = () => {
    generation++
    data.value = initial
    loading.value = false
    error.value = ''
  }
  const load = async (fetch: () => Promise<T>, message: string) => {
    const request = ++generation
    loading.value = true
    error.value = ''
    try {
      const result = await fetch()
      if (request === generation) data.value = result
    } catch (cause) {
      if (request === generation) {
        data.value = initial
        error.value = message
        console.error(message, cause)
      }
    } finally {
      if (request === generation) loading.value = false
    }
  }
  if (getCurrentScope()) onScopeDispose(clear)
  return { data, loading, error, load, clear }
}
