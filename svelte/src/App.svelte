<script lang="ts">
  // --- STATE ---
  // `$state` makes a variable reactive.
  // When it changes, the DOM updates automatically.
  let count = $state(0)
  let name = $state('World')

  // --- DERIVED STATE ---
  // `$derived` recomputes whenever its dependencies change.
  let doubled = $derived(count * 2)

  // --- FUNCTIONS ---
  function increment() {
    count++
  }

  function reset() {
    count = 0
  }
</script>

<!-- The HTML template lives right here in the same file -->

<main>
  <h1>Hello, {name}!</h1>

  <!-- Two-way binding: typing in the input updates `name` immediately -->
  <input bind:value={name} placeholder="Enter your name" />

  <hr />

  <h2>Counter: {count}</h2>
  <p>Doubled: {doubled}</p>

  <!-- Event handlers use onclick, oninput, etc. -->
  <button onclick={increment}>Click me</button>
  <button onclick={reset}>Reset</button>

  <!-- Conditional rendering -->
  {#if count >= 5}
    <p class="milestone">You reached {count}! 🎉</p>
  {/if}

  <!-- List rendering -->
  {#if count > 0}
    <ul>
      {#each Array.from({ length: count }, (_, i) => i + 1) as n}
        <li>Item {n}</li>
      {/each}
    </ul>
  {/if}
</main>

<!-- Scoped styles: these ONLY apply to this component -->
<style>
  main {
    font-family: sans-serif;
    max-width: 500px;
    margin: 2rem auto;
    padding: 1rem;
  }

  input {
    padding: 0.4rem;
    font-size: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  button {
    margin: 0.25rem;
    padding: 0.5rem 1rem;
    font-size: 1rem;
    cursor: pointer;
    border: none;
    border-radius: 4px;
    background: #5a67d8;
    color: white;
  }

  button:hover {
    background: #434190;
  }

  .milestone {
    color: green;
    font-weight: bold;
  }
</style>
