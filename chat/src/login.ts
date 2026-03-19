interface FormFields {
  email: HTMLInputElement;
  password: HTMLInputElement;
}

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

function validate({ email, password }: FormFields): boolean {
  const emailError = getElement<HTMLElement>("email-error");
  const passwordError = getElement<HTMLElement>("password-error");

  let valid = true;

  clearError(email, emailError);
  clearError(password, passwordError);

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

  return valid;
}

function init(): void {
  const form = getElement<HTMLFormElement>("login-form");
  const fields: FormFields = {
    email: getElement<HTMLInputElement>("email"),
    password: getElement<HTMLInputElement>("password"),
  };
  const success = getElement<HTMLElement>("success");

  const registerBtn = getElement<HTMLButtonElement>("register-btn");
  registerBtn.addEventListener("click", () => {
    window.location.href = "/register";
  });

  form.addEventListener("submit", (e: Event) => {
    e.preventDefault();
    if (validate(fields)) {
      form.style.display = "none";
      success.style.display = "block";
    }
  });
}

init();
