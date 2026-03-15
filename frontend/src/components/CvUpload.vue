<template>
  <div>
    <label class="label">CV / Resume <span class="text-red-500">*</span></label>

    <!-- Drop zone -->
    <div
      class="relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl
             border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center transition
             hover:border-primary-500 hover:bg-primary-50"
      :class="{ 'border-primary-500 bg-primary-50': isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="onDrop"
      @click="fileInput.click()" 
    >
      <svg class="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414
             5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>

      <div v-if="!modelValue">
        <p class="text-sm font-medium text-gray-700">Drop your CV here or <span class="text-primary-600">browse</span></p>
        <p class="mt-1 text-xs text-gray-400">PDF, DOC, DOCX — max 10 MB</p>
      </div>

      <div v-else class="flex items-center gap-2 text-sm font-medium text-primary-700">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        {{ modelValue.name }}
        <button
          class="ml-2 rounded-full p-0.5 text-gray-400 hover:text-red-500"
          @click.stop="clear"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept=".pdf,.doc,.docx"
        class="hidden"
        @change="onFileChange"
      />
    </div>

    <p v-if="sizeError" class="mt-1.5 text-xs text-red-500">{{ sizeError }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props   = defineProps({ modelValue: { type: File, default: null } })
const emit    = defineEmits(['update:modelValue'])
const fileInput = ref(null)
const isDragging  = ref(false)
const sizeError   = ref('')

const MAX_MB = 10

function validate(file) {
  sizeError.value = ''
  if (file.size > MAX_MB * 1024 * 1024) {
    sizeError.value = `File exceeds ${MAX_MB} MB.`
    return false
  }
  return true
}

function onFileChange(e) {
  const file = e.target.files[0]
  if (file && validate(file)) emit('update:modelValue', file)
}

function onDrop(e) {
  isDragging.value = false
  const file = e.dataTransfer.files[0]
  if (file && validate(file)) emit('update:modelValue', file)
}

function clear() {
  emit('update:modelValue', null)
  if (fileInput.value) fileInput.value.value = ''
}
</script>
