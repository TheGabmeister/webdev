// ── Clear button logic (works on both pages) ──────────────────────────
const inputs = document.querySelectorAll(".search-input");
inputs.forEach((input) => {
  const box = input.closest(".search-box");
  const clearBtn = box?.querySelector(".clear-btn");
  if (!clearBtn) return;

  const update = () => {
    clearBtn.hidden = input.value.length === 0;
  };

  input.addEventListener("input", update);
  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.hidden = true;
    input.focus();
  });

  update();
});

// ── Results page ──────────────────────────────────────────────────────
const resultsList = document.getElementById("results-list");
if (resultsList) {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("q")?.trim() ?? "";

  // Populate the search input with the current query
  const resultsInput = document.getElementById("results-input");
  if (resultsInput && query) {
    resultsInput.value = query;
    resultsInput.dispatchEvent(new Event("input")); // update clear button
  }

  // Update page title
  if (query) document.title = `${query} — Search`;

  // Display results
  if (!query) {
    resultsList.innerHTML = `
      <div class="state-empty">
        <strong>No query entered</strong>
        <a href="index.html">Go back to search</a>
      </div>`;
  } else {
    showResults(query);
  }
}

async function showResults(query) {
  const meta = document.getElementById("results-meta");
  const list = document.getElementById("results-list");

  if (list) list.innerHTML = `<p class="results-meta">Searching…</p>`;

  const start = Date.now();
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);

  if (!res.ok) {
    if (list) list.innerHTML = `<div class="state-empty"><strong>Something went wrong</strong>Try again in a moment.</div>`;
    return;
  }

  const { results } = await res.json();
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);

  if (meta) {
    meta.textContent = `${results.length} results (${elapsed} seconds)`;
  }

  renderResults(results);
}

function renderResults(results) {
  const list = document.getElementById("results-list");
  if (!list) return;

  if (results.length === 0) {
    list.innerHTML = `
      <div class="state-empty">
        <strong>No results found</strong>
        Try different keywords.
      </div>`;
    return;
  }

  list.innerHTML = results.map((r) => {
    const domain = (() => {
      try { return new URL(r.url).hostname; } catch { return r.url; }
    })();
    return `
      <div class="result-card">
        <div class="result-site">
          <img class="result-favicon"
               src="https://www.google.com/s2/favicons?sz=32&domain=${domain}"
               alt="" width="16" height="16" />
          <span class="result-domain">${escHtml(domain)}</span>
        </div>
        <a class="result-title" href="${escAttr(r.url)}">${escHtml(r.title)}</a>
        <div class="result-url">${escHtml(r.url)}</div>
        <p class="result-snippet">${escHtml(r.snippet)}</p>
      </div>`;
  }).join("");
}

// ── HTML escaping helpers ─────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escAttr(str) {
  return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
