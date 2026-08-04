<script setup lang="ts">
import type { Question } from '@/features/assessment/types/question'

defineProps<{
  question: Question
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <fieldset class="question-card">
    <legend>{{ question.text }}</legend>
    <p v-if="question.help" class="question-card__help">{{ question.help }}</p>

    <label v-for="answer in question.answers" :key="answer.id" class="answer-option">
      <input
        type="radio"
        :name="question.id"
        :value="answer.id"
        :checked="modelValue === answer.id"
        @change="emit('update:modelValue', answer.id)"
      />
      <span>{{ answer.label }}</span>
    </label>
  </fieldset>
</template>
