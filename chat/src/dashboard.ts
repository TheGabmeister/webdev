(async () => {
  const res = await fetch("/api/me");
  if (!res.ok) {
    window.location.href = "/";
    return;
  }

  const { email } = await res.json();
  const emailEl = document.getElementById("email");
  if (emailEl) emailEl.textContent = email;

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await fetch("/api/logout", { method: "POST" });
      window.location.href = "/";
    });
  }
})();
