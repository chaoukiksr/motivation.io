<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-50 px-4 py-10">
    <div class="mx-auto max-w-5xl">

      <!-- Header -->
      <header class="mb-8 text-center">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900">
          Motivation Letter Generator
        </h1>
        <p class="mt-2 text-sm text-gray-500">
          Upload your CV, paste the offer link, and let AI craft your letter.
        </p>
      </header>

      <div class="grid gap-6 lg:grid-cols-2">

        <!-- ── Left column: form ───────────────────────────────────────────── -->
        <div class="space-y-5">

          <!-- CV Upload -->
          <div class="card">
            <CvUpload v-model="store.cvFile" />
          </div>

          <!-- Offer URL + metadata -->
          <div class="card space-y-4">
            <div>
              <label class="label">
                Master Offer URL <span class="text-red-500">*</span>
              </label>
              <input
                v-model="store.offerUrl"
                type="url"
                class="input-field"
                placeholder="https://example.com/master-program-offer"
              />
            </div>

            <div v-if="store.universityName || store.masterAcronym" class="grid grid-cols-2 gap-3">
              <div v-if="store.universityName">
                <label class="label">University</label>
                <p class="input-field bg-gray-50 text-gray-600 cursor-default select-text">{{ store.universityName }}</p>
              </div>
              <div v-if="store.masterAcronym">
                <label class="label">Program</label>
                <p class="input-field bg-gray-50 text-gray-600 cursor-default select-text">{{ store.masterAcronym }}</p>
              </div>
            </div>
          </div>

          <!-- Settings (only relevant for letter generation) -->
          <div class="card">
            <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Letter Settings
            </h2>
            <SettingsPanel
              :model-value="{ language: store.language, textLength: store.textLength, personalNote: store.personalNote }"
              @update:model-value="onSettingsUpdate"
            />
          </div>

          <!-- Error -->
          <div
            v-if="store.error"
            class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {{ store.error }}
          </div>

          <!-- Action buttons -->
          <div class="flex gap-3">

            <!-- Step 1: Analyze -->
            <button
              class="btn-primary flex-1 justify-center py-3"
              :disabled="store.isAnalyzing || store.isGenerating"
              @click="store.analyze()"
            >
              <svg v-if="store.isAnalyzing" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0
                     0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0
                     0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {{ store.isAnalyzing ? 'Analysing…' : 'Analyse Program' }}
            </button>

            <!-- Step 2: Generate letter (only once analysis is done) -->
            <button
              v-if="store.programAnalysis"
              class="btn-primary flex-1 justify-center py-3"
              :disabled="store.isGenerating || store.isAnalyzing"
              @click="store.generate()"
            >
              <svg v-if="store.isGenerating" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {{ store.isGenerating ? 'Generating…' : 'Generate Letter' }}
            </button>

            <!-- Reset -->
            <button
              v-if="store.programAnalysis || store.generatedLetter"
              class="btn-secondary"
              @click="store.reset()"
            >
              Reset
            </button>
          </div>
        </div>

        <!-- ── Right column: analysis + preview ──────────────────────────── -->
        <div class="card flex flex-col gap-4">

          <!-- Empty state -->
          <div
            v-if="!store.programAnalysis && !store.isAnalyzing && !store.isGenerating"
            class="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center"
          >
            <svg class="h-16 w-16 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293
                   l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-sm text-gray-400">
              Analyse a program to see your fit score, then generate your letter.
            </p>
          </div>

          <!-- Skeleton loader (analyse or generate in progress) -->
          <div v-else-if="store.isAnalyzing || store.isGenerating" class="space-y-3 py-4 animate-pulse">
            <div v-for="n in 14" :key="n"
              class="h-3 rounded bg-gray-200"
              :style="{ width: n % 3 === 0 ? '60%' : '100%' }"
            />
          </div>

          <!-- Results -->
          <template v-else>
            <!-- Tab switcher — only show Letter tab once the letter exists -->
            <div class="flex rounded-lg border border-gray-200 bg-gray-50 p-1 gap-1">
              <button
                class="flex-1 rounded-md py-1.5 text-sm font-medium transition"
                :class="activeTab === 'analysis'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'"
                @click="activeTab = 'analysis'"
              >
                Program Analysis
              </button>
              <button
                v-if="store.generatedLetter"
                class="flex-1 rounded-md py-1.5 text-sm font-medium transition"
                :class="activeTab === 'letter'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'"
                @click="activeTab = 'letter'"
              >
                Letter
              </button>
            </div>

            <!-- Analysis tab -->
            <ProgramAnalysis
              v-if="activeTab === 'analysis' && store.programAnalysis"
              :analysis="store.programAnalysis"
            />

            <!-- Letter tab -->
            <LetterPreview
              v-if="activeTab === 'letter' && store.generatedLetter"
              :letter="store.generatedLetter"
              @download-pdf="exportToPdf(pdfFilename)"
              @download-docx="exportToDocx(pdfFilename)"
            />
          </template>
        </div>
      </div>

      <!-- Token log — shown after every operation -->
      <TokenLog v-if="store.tokenLog" :log="store.tokenLog" />

    </div>
  </div>
</template>

<script setup>
import CvUpload        from '@/components/CvUpload.vue'
import SettingsPanel   from '@/components/SettingsPanel.vue'
import LetterPreview   from '@/components/LetterPreview.vue'
import ProgramAnalysis from '@/components/ProgramAnalysis.vue'
import TokenLog        from '@/components/TokenLog.vue'
import { computed, ref, watch } from 'vue'
import { useLetterStore }  from '@/stores/letterStore'
import { usePdfExport }    from '@/composables/usePdfExport'
import { useDocxExport }   from '@/composables/useDocxExport'

const store = useLetterStore()
const { exportToPdf }  = usePdfExport()
const { exportToDocx } = useDocxExport()

const activeTab = ref('analysis')

// Switch to letter tab automatically once the letter arrives
watch(() => store.generatedLetter, val => { if (val) activeTab.value = 'letter' })

// Build a clean filename: "motivation-letter_MIT_MSc-AI" (fallback to default)
const pdfFilename = computed(() => {
  const parts = ['motivation-letter']
  if (store.universityName.trim()) parts.push(store.universityName.trim())
  if (store.masterAcronym.trim())  parts.push(store.masterAcronym.trim())
  return parts.join('_').replace(/\s+/g, '-')
})

function onSettingsUpdate({ language, textLength, personalNote }) {
  store.language     = language
  store.textLength   = textLength
  store.personalNote = personalNote
}
</script>
