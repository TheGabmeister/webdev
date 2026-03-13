type ThemeName = "sunrise" | "night";

const storageKey = "sunbeam-theme";
const root = document.documentElement;
const themeToggle = document.getElementById("theme-toggle");
const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

const readStoredTheme = (): ThemeName | null => {
  try {
    const storedTheme = window.localStorage.getItem(storageKey);

    if (storedTheme === "sunrise" || storedTheme === "night") {
      return storedTheme;
    }
  } catch {
    return null;
  }

  return null;
};

const getPreferredTheme = (): ThemeName => {
  const storedTheme = readStoredTheme();

  if (storedTheme) {
    return storedTheme;
  }

  return mediaQuery.matches ? "night" : "sunrise";
};

if (themeToggle instanceof HTMLButtonElement) {
  const applyTheme = (theme: ThemeName): void => {
    root.dataset.theme = theme;
    themeToggle.setAttribute("aria-pressed", String(theme === "night"));
    themeToggle.textContent =
      theme === "night" ? "Switch to day" : "Switch to night";
  };

  let activeTheme = getPreferredTheme();
  applyTheme(activeTheme);

  themeToggle.addEventListener("click", () => {
    activeTheme = activeTheme === "night" ? "sunrise" : "night";
    applyTheme(activeTheme);

    try {
      window.localStorage.setItem(storageKey, activeTheme);
    } catch {
      // Ignore browsers that block local storage for local files.
    }
  });

  mediaQuery.addEventListener("change", (event) => {
    if (readStoredTheme()) {
      return;
    }

    activeTheme = event.matches ? "night" : "sunrise";
    applyTheme(activeTheme);
  });
}
