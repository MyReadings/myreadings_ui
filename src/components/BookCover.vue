<template>
  <v-img v-bind="$attrs" :src="src">
    <template #error>
      <img :src="placeholder" alt="No cover available" class="fallback-cover" />
    </template>
    <slot />
  </v-img>
</template>

<script setup lang="ts">
import placeholder from '@/assets/no-cover.svg'
defineOptions({ inheritAttrs: false })
defineProps<{ src?: string }>()
</script>

<style scoped>
.fallback-cover { width: 100%; height: 100%; object-fit: contain; background: #eee; }
</style>
