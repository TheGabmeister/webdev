<script setup lang="ts">
import { ref, computed } from 'vue'

// ref() makes a value reactive — Vue tracks changes and re-renders the UI
const count = ref(0)

// computed() derives a value from reactive state; updates automatically
const isEven = computed(() => count.value % 2 === 0)

function increment() {
  count.value++
}

function decrement() {
  count.value--
}

function reset() {
  count.value = 0
}
</script>

<template>
  <div class="counter">
    <h2>Counter</h2>

    <!--
      {{ count }} is Vue's template syntax — it renders the value of `count`.
      Because count is reactive (ref), the DOM updates automatically when it changes.
    -->
    <p class="value">{{ count }}</p>
    <p class="label">{{ isEven ? 'Even' : 'Odd' }}</p>

    <div class="buttons">
      <!-- @click is shorthand for v-on:click — attaches an event listener -->
      <button @click="decrement">-</button>
      <button @click="reset">Reset</button>
      <button @click="increment">+</button>
    </div>
  </div>
</template>

<style scoped>
/*
  scoped means these styles only apply to this component,
  so they won't accidentally affect other parts of the app.
*/
.counter {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
}

.value {
  font-size: 3rem;
  font-weight: bold;
  margin: 8px 0;
}

.label {
  color: #888;
  margin: 4px 0 16px;
}

.buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

button {
  padding: 8px 20px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  background: white;
}

button:hover {
  background: #f0f0f0;
}
</style>
