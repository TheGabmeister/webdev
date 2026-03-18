function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
</head>
<body>
  <main class="container">
    ${body}
  </main>
</body>
</html>`;
}

export function homePage(error?: string): string {
  return layout(
    "URL Shortener",
    `<h1>URL Shortener</h1>
    <p>Paste a long URL to get a short, shareable link. Links expire after 30 days.</p>
    ${error ? `<p style="color:var(--pico-color-red-500)">${error}</p>` : ""}
    <form method="POST" action="/shorten">
      <input type="url" name="url" placeholder="https://example.com/very/long/url" required autofocus>
      <button type="submit">Shorten</button>
    </form>`
  );
}

export function successPage(shortUrl: string): string {
  return layout(
    "Link Created — URL Shortener",
    `<h1>Link Created</h1>
    <p>Your shortened URL is ready:</p>
    <fieldset role="group">
      <input type="text" id="short-url" value="${shortUrl}" readonly>
      <button id="copy-btn" type="button">Copy</button>
    </fieldset>
    <p><a href="/">Shorten another URL</a></p>
    <script>
      document.getElementById("copy-btn").addEventListener("click", () => {
        const url = document.getElementById("short-url").value;
        navigator.clipboard.writeText(url).then(() => {
          document.getElementById("copy-btn").textContent = "Copied!";
          setTimeout(() => document.getElementById("copy-btn").textContent = "Copy", 2000);
        });
      });
    </script>`
  );
}

export function expiredPage(): string {
  return layout(
    "Link Expired — URL Shortener",
    `<h1>This link has expired</h1>
    <p>Short links expire after 30 days.</p>
    <p><a href="/">Create a new short URL</a></p>`
  );
}

export function notFoundPage(): string {
  return layout(
    "Link Not Found — URL Shortener",
    `<h1>Link not found</h1>
    <p>This short link doesn't exist. It may have been removed.</p>
    <p><a href="/">Create a new short URL</a></p>`
  );
}
