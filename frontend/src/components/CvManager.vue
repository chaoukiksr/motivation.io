<template>
  <div>
    <label class="label">CV / Resume <span class="text-red-500">*</span></label>

    <!-- CV already saved -->
    <div
      v-if="profile?.hasCv && !replacing"
      class="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
    >
      <div class="flex items-center gap-2 text-sm text-emerald-700">
        <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span class="font-medium">{{ profile.cvFilename }}</span>
        <span class="text-xs text-emerald-500">saved</span>
      </div>
      <button
        class="text-xs font-medium text-gray-400 hover:text-gray-600"
        @click="replacing = true"
      >
        Replace
      </button>
    </div>

    <!-- Upload zone -->
    <div
      v-else
      class="relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl
             border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center transition
             hover:border-primary-500 hover:bg-primary-50"
      :class="{ 'border-primary-500 bg-primary-50': isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="onDrop"
      @click="fileInput.click()"
    >
      <svg v-if="uploading" class="h-8 w-8 animate-spin text-primary-400" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
      <svg v-else class="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414
             5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>

      <div v-if="!uploading">
        <p class="text-sm font-medium text-gray-700">
          Drop your CV here or <span class="text-primary-600">browse</span>
        </p>
        <p class="mt-1 text-xs text-gray-400">PDF, DOC, DOCX — max 10 MB</p>
      </div>
      <p v-else class="text-sm text-primary-600">Uploading and parsing…</p>

      <input ref="fileInput" type="file" accept=".pdf,.doc,.docx" class="hidden" @change="onFileChange" />
    </div>

    <p v-if="uploadError" class="mt-1.5 text-xs text-red-500">{{ uploadError }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { uploadCv } from '@/services/letterService'
import { useAuthStore } from '@/stores/authStore'

const auth = useAuthStore()

const props    = defineProps({ profile: { type: Object, default: null } })
const fileInput  = ref(null)
const isDragging = ref(false)
const uploading  = ref(false)
const replacing  = ref(false)
const uploadError = ref('')

async function handleFile(file) {
  if (!file) return
  if (file.size > 10 * 1024 * 1024) { uploadError.value = 'File exceeds 10 MB.'; return }

  uploadError.value = ''
  uploading.value   = true
  try {
    await uploadCv(file)
    await auth.refreshProfile()
    replacing.value = false
  } catch (err) {
    uploadError.value = err.response?.data?.detail ?? 'Upload failed. Please try again.'
  } finally {
    uploading.value = false
  }
}

function onFileChange(e) { handleFile(e.target.files[0]) }
function onDrop(e)        { isDragging.value = false; handleFile(e.dataTransfer.files[0]) }
</script>
