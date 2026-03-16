<template>
  <div class="card mt-6">
    <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
      Token Log
    </h2>

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
            <th class="pb-2 pr-4">Operation</th>
            <th class="pb-2 pr-4 text-center">Status</th>
            <th class="pb-2 pr-4 text-right">Input tokens</th>
            <th class="pb-2 text-right">Output tokens</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="row in rows" :key="row.label" class="text-gray-700">
            <td class="py-2 pr-4 font-medium">{{ row.label }}</td>
            <td class="py-2 pr-4 text-center">
              <span
                class="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="row.fromCache
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'"
              >
                {{ row.fromCache ? 'CACHED' : 'API CALL' }}
              </span>
            </td>
            <td class="py-2 pr-4 text-right tabular-nums">
              {{ row.inputTokens !== null ? row.inputTokens.toLocaleString() : '—' }}
            </td>
            <td class="py-2 text-right tabular-nums">
              {{ row.outputTokens !== null ? row.outputTokens.toLocaleString() : '—' }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="border-t border-gray-200 font-semibold text-gray-900">
            <td class="pt-2 pr-4">Total</td>
            <td class="pt-2 pr-4 text-center text-xs text-gray-400">
              {{ apiCallCount }} API call{{ apiCallCount !== 1 ? 's' : '' }}
            </td>
            <td class="pt-2 pr-4 text-right tabular-nums">{{ totalInput.toLocaleString() }}</td>
            <td class="pt-2 text-right tabular-nums">{{ totalOutput.toLocaleString() }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  log: { type: Object, required: true },
})

const rows = computed(() => {
  const all = [
    {
      label:        'Offer scraping',
      fromCache:    props.log.offerScraping?.fromCache ?? false,
      inputTokens:  null,
      outputTokens: null,
    },
    props.log.fitAnalysis ? {
      label:        'Fit analysis (Haiku)',
      fromCache:    props.log.fitAnalysis.fromCache,
      inputTokens:  props.log.fitAnalysis.inputTokens,
      outputTokens: props.log.fitAnalysis.outputTokens,
    } : null,
    props.log.programInfo ? {
      label:        'Program info (Haiku)',
      fromCache:    props.log.programInfo.fromCache,
      inputTokens:  props.log.programInfo.inputTokens,
      outputTokens: props.log.programInfo.outputTokens,
    } : null,
    props.log.letterGeneration ? {
      label:        'Letter generation (Opus)',
      fromCache:    props.log.letterGeneration.fromCache,
      inputTokens:  props.log.letterGeneration.inputTokens,
      outputTokens: props.log.letterGeneration.outputTokens,
    } : null,
  ]
  return all.filter(Boolean)
})

const totalInput  = computed(() => rows.value.reduce((s, r) => s + (r.inputTokens  ?? 0), 0))
const totalOutput = computed(() => rows.value.reduce((s, r) => s + (r.outputTokens ?? 0), 0))
const apiCallCount = computed(() => rows.value.filter(r => !r.fromCache).length)
</script>
