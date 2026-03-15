<template>
  <div class="flex flex-col gap-4">
    <!-- Toolbar -->
    <div class="flex items-center justify-between">
      <h2 class="text-base font-semibold text-gray-800">Generated Letter</h2>
      <div class="flex gap-2">
        <button class="btn-secondary text-xs" @click="copyToClipboard">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6
                 4h8a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2v-6z" />
          </svg>
          {{ copied ? 'Copied!' : 'Copy' }}
        </button>
        <button class="btn-primary text-xs" @click="emit('download-pdf')">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0
                 0l-4-4m4 4V4" />
          </svg>
          PDF
        </button>
        <button class="btn-secondary text-xs" @click="emit('download-docx')">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586
                 a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Word
        </button>
      </div>
    </div>

    <!-- Letter body (this element is captured for PDF export) -->
    <div
      id="letter-content"
      class="rounded-xl border border-gray-200 bg-white p-8 font-serif text-[15px]
             leading-relaxed text-gray-800 shadow-inner"
    >
      <!-- Whitespace preserved so the LLM can return plain text with newlines -->
      <pre class="whitespace-pre-wrap font-serif">{{ letter }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({ letter: { type: String, required: true } })
const emit = defineEmits(['download-pdf', 'download-docx'])

const copied = ref(false)

async function copyToClipboard() {
  const text = document.getElementById('letter-content')?.innerText ?? ''
  await navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>
