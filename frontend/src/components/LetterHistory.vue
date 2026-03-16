<template>
  <div class="mt-6">
    <button
      class="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition hover:bg-gray-50"
      @click="toggle"
    >
      <span class="text-sm font-semibold text-gray-700">Letter History</span>
      <svg
        class="h-4 w-4 text-gray-400 transition-transform"
        :class="{ 'rotate-180': open }"
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div v-if="open" class="card mt-1 space-y-3">

      <div v-if="loading" class="space-y-2 animate-pulse">
        <div v-for="n in 3" :key="n" class="h-12 rounded bg-gray-100" />
      </div>

      <p v-else-if="!letters.length" class="text-sm text-gray-400">
        No letters generated yet.
      </p>

      <div v-else class="divide-y divide-gray-100">
        <div
          v-for="letter in letters"
          :key="letter.id"
          class="py-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-gray-800">
                {{ letter.university_name || 'Unknown university' }}
                <span v-if="letter.master_acronym" class="ml-1 text-gray-400">· {{ letter.master_acronym }}</span>
              </p>
              <p class="mt-0.5 text-xs text-gray-400">
                {{ formatDate(letter.created_at) }} · {{ letter.settings?.language ?? 'English' }} · {{ letter.settings?.text_length ?? 'medium' }}
              </p>
            </div>
            <button
              class="shrink-0 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
              @click="toggle === letter.id ? (expanded = null) : (expanded = letter.id)"
            >
              {{ expanded === letter.id ? 'Hide' : 'View' }}
            </button>
          </div>

          <!-- Expanded letter -->
          <div
            v-if="expanded === letter.id"
            class="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm leading-relaxed whitespace-pre-wrap text-gray-700"
          >
            {{ letter.letter_text }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getLetters } from '@/services/letterService'

const open     = ref(false)
const loading  = ref(false)
const letters  = ref([])
const expanded = ref(null)

async function toggle() {
  open.value = !open.value
  if (open.value && !letters.value.length) {
    loading.value = true
    try { letters.value = await getLetters() }
    finally { loading.value = false }
  }
}

// Reload after a new letter is generated
async function reload() {
  if (!open.value) return
  letters.value = await getLetters()
}

defineExpose({ reload })

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>
