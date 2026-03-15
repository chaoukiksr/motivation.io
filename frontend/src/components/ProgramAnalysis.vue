<template>
  <div class="flex flex-col gap-4">

    <!-- Detected Profile -->
    <div v-if="analysis.extractedGoals?.length" class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Detected from your CV</p>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="goal in analysis.extractedGoals"
          :key="goal"
          class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
        >
          {{ goal }}
        </span>
      </div>
    </div>

    <!-- Fit Score -->
    <div class="flex items-center gap-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <!-- Circular gauge -->
      <div class="relative shrink-0 flex items-center justify-center" style="width:88px;height:88px">
        <svg width="88" height="88" viewBox="0 0 88 88" class="-rotate-90">
          <circle cx="44" cy="44" r="36" fill="none" stroke="#e5e7eb" stroke-width="8" />
          <circle
            cx="44" cy="44" r="36" fill="none"
            :stroke="gaugeColor"
            stroke-width="8"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="dashOffset"
            style="transition: stroke-dashoffset 0.6s ease"
          />
        </svg>
        <span class="absolute text-lg font-bold" :class="scoreTextClass">{{ analysis.fitScore }}%</span>
      </div>
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Profile Fit</p>
        <p class="mt-1 text-sm text-gray-700 leading-snug">{{ analysis.fitSummary }}</p>
      </div>
    </div>

    <!-- Program Overview -->
    <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Program Overview</p>
      <p class="text-sm text-gray-700 leading-relaxed">{{ analysis.overview }}</p>
    </div>

    <!-- Skills to Acquire -->
    <div v-if="analysis.skillsToAcquire?.length" class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Skills You'll Acquire</p>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="skill in analysis.skillsToAcquire"
          :key="skill"
          class="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700"
        >
          {{ skill }}
        </span>
      </div>
    </div>

    <!-- Key Learnings -->
    <div v-if="analysis.keyLearnings?.length" class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Key Learnings</p>
      <ul class="space-y-2">
        <li
          v-for="item in analysis.keyLearnings"
          :key="item"
          class="flex items-start gap-2 text-sm text-gray-700"
        >
          <svg class="mt-0.5 h-4 w-4 shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4" />
          </svg>
          {{ item }}
        </li>
      </ul>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  analysis: { type: Object, required: true },
})

const circumference = 2 * Math.PI * 36  // r = 36

const dashOffset = computed(() =>
  circumference * (1 - props.analysis.fitScore / 100)
)

const gaugeColor = computed(() => {
  const s = props.analysis.fitScore
  if (s >= 70) return '#10b981'  // emerald-500
  if (s >= 45) return '#f59e0b'  // amber-500
  return '#ef4444'               // red-500
})

const scoreTextClass = computed(() => {
  const s = props.analysis.fitScore
  if (s >= 70) return 'text-emerald-600'
  if (s >= 45) return 'text-amber-500'
  return 'text-red-500'
})
</script>
