<template>
  <v-dialog
    :model-value="modelValue"
    :persistent="saving"
    @update:model-value="!saving && emit('update:modelValue', $event)"
    max-width="500px"
  >
    <v-card>
      <v-card-title class="headline">Create New Reading List</v-card-title>
      <v-card-text>
        <v-alert v-if="saveError" type="error" variant="tonal" class="mb-4">{{ saveError }}</v-alert>
        <v-text-field
          v-model="name"
          :disabled="saving"
          maxlength="30"
          label="List Name"
          required
          :rules="[(v) => !!v || 'Name is required']"
        ></v-text-field>
        <v-textarea v-model="description" :disabled="saving" maxlength="200" label="Description (Optional)" rows="3"></v-textarea>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey-darken-1" text :disabled="saving" @click="handleClose">Cancel</v-btn>
        <v-btn color="primary" variant="flat" @click="handleCreate" :disabled="saving || !name.trim()" :loading="saving">Create</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { VTextarea } from 'vuetify/components'
import { VTextField } from 'vuetify/components'
import { VDialog } from 'vuetify/components'
import { ref } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  saving: Boolean,
  saveError: String,
})

const emit = defineEmits(['update:modelValue', 'create-list'])

const name = ref('')
const description = ref('')

const handleClose = () => {
  if (!props.saving) emit('update:modelValue', false)
}

const handleCreate = () => {
  if (name.value.trim() && !props.saving) {
    emit('create-list', { name: name.value.trim(), description: description.value })
  }
}
</script>
