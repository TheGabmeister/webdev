(() => {
  function getElement<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id) as T | null;
    if (!el) throw new Error(`Element #${id} not found`);
    return el;
  }

  function setError(input: HTMLInputElement, errorEl: HTMLElement, msg: string): void {
    input.classList.add("error");
    errorEl.textContent = msg;
  }

  function clearError(input: HTMLInputElement, errorEl: HTMLElement): void {
    input.classList.remove("error");
    errorEl.textContent = "";
  }

  const form = getElement<HTMLFormElement>("register-form");
  const email = getElement<HTMLInputElement>("email");
  const password = getElement<HTMLInputElement>("password");
  const confirm = getElement<HTMLInputElement>("confirm");
  const emailError = getElement<HTMLElement>("email-error");
  const passwordError = getElement<HTMLElement>("password-error");
  const confirmError = getElement<HTMLElement>("confirm-error");

  form.addEventListener("submit", async (e: Event) => {
    e.preventDefault();

    clearError(email, emailError);
    clearError(password, passwordError);
    clearError(confirm, confirmError);

    let valid = true;

    if (!email.value.trim()) {
      setError(email, emailError, "Email is required.");
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      setError(email, emailError, "Enter a valid email address.");
      valid = false;
    }

    if (!password.value) {
      setError(password, passwordError, "Password is required.");
      valid = false;
    } else if (password.value.length < 6) {
      setError(password, passwordError, "Password must be at least 6 characters.");
      valid = false;
    }

    if (password.value !== confirm.value) {
      setError(confirm, confirmError, "Passwords do not match.");
      valid = false;
    }

    if (!valid) return;

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value, password: password.value }),
    });

    if (res.ok) {
      window.location.href = "/dashboard";
    } else {
      const data = await res.json();
      setError(email, emailError, data.error);
    }
  });
})();
