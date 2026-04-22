<script setup lang="ts">
const title = 'Wizard bootstrap ready'
const description =
  'Nuxt 4 проект и базовая инфраструктура готовы. Реализация шагов onboarding будет добавлена на следующих этапах.'
</script>

<template>
  <main :class="$style.page">
    <section :class="$style.card">
      <p :class="$style.eyebrow">Nuxt 4 + Vue 3 + TypeScript</p>
      <h1 :class="$style.title">{{ title }}</h1>
      <p :class="$style.description">
        {{ description }}
      </p>
    </section>
  </main>
</template>

<style module src="./index.module.scss"></style>
