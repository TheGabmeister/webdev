import express from "express";
import path from "path";
import "dotenv/config";

const app = express();
const PORT = process.env["PORT"] ?? 3000;

// Serve the frontend
app.use(express.static(path.join(process.cwd(), "public")));

// Search API — proxies to Brave Search so the API key stays server-side
app.get("/api/search", async (req, res) => {
  const query = req.query["q"];

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: 'Missing query parameter "q"' });
    return;
  }

  const apiKey = process.env["BRAVE_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "BRAVE_API_KEY is not set in .env" });
    return;
  }

  const url =
    `https://api.search.brave.com/res/v1/web/search` +
    `?q=${encodeURIComponent(query)}&count=10`;

  const response = await fetch(url, {
    headers: {
      "X-Subscription-Token": apiKey,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    res.status(response.status).json({ error: "Brave Search API error" });
    return;
  }

  const data = (await response.json()) as {
    web?: { results?: { title: string; url: string; description?: string }[] };
  };

  const results = (data.web?.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.description ?? "",
  }));

  res.json({ results });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
