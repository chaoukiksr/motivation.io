<template>
  <div class="space-y-5">
    <!-- Language -->
    <div>
      <label class="label">Letter Language</label>
      <select
        class="input-field"
        :value="modelValue.language"
        @change="emit('update:modelValue', { ...modelValue, language: $event.target.value })"
      >
        <option v-for="lang in languages" :key="lang.value" :value="lang.value">
          {{ lang.flag }} {{ lang.label }}
        </option>
      </select>
    </div>

    <!-- Text length -->
    <div>
      <label class="label">Letter Length</label>
      <div class="flex gap-3">
        <button
          v-for="opt in lengthOptions"
          :key="opt.value"
          type="button"
          class="flex-1 rounded-lg border py-2 text-sm font-medium transition"
          :class="
            modelValue.textLength === opt.value
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
          "
          @click="emit('update:modelValue', { ...modelValue, textLength: opt.value })"
        >
          {{ opt.label }}
        </button>
      </div>
      <p class="mt-1 text-xs text-gray-400">{{ currentHint }}</p>
    </div>

    <!-- Personal notes -->
    <div>
      <label class="label">Personal Notes</label>
      <textarea
        class="input-field min-h-[120px] resize-y"
        placeholder="Add any extra context: specific skills to highlight, tone preferences, achievements to mention…"
        :value="modelValue.personalNote"
        @input="emit('update:modelValue', { ...modelValue, personalNote: $event.target.value })"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ language: 'English', textLength: 'medium', personalNote: '' }),
  },
})
const emit = defineEmits(['update:modelValue'])

const languages = [
  { value: 'English',    label: 'English',    flag: '🇬🇧' },
  { value: 'French',     label: 'French',     flag: '🇫🇷' },
  { value: 'German',     label: 'German',     flag: '🇩🇪' },
  { value: 'Spanish',    label: 'Spanish',    flag: '🇪🇸' },
  { value: 'Italian',    label: 'Italian',    flag: '🇮🇹' },
  { value: 'Portuguese', label: 'Portuguese', flag: '🇵🇹' },
  { value: 'Dutch',      label: 'Dutch',      flag: '🇳🇱' },
  { value: 'Arabic',     label: 'Arabic',     flag: '🇸🇦' },
  { value: 'Chinese',    label: 'Chinese',    flag: '🇨🇳' },
  { value: 'Japanese',   label: 'Japanese',   flag: '🇯🇵' },
]

const lengthOptions = [
  { value: 'short',  label: 'Short',  hint: '~200 words — concise and punchy' },
  { value: 'medium', label: 'Medium', hint: '~350 words — balanced and detailed' },
  { value: 'long',   label: 'Long',   hint: '~500 words — comprehensive coverage' },
]

const currentHint = computed(
  () => lengthOptions.find(o => o.value === props.modelValue.textLength)?.hint ?? ''
)
</script>
