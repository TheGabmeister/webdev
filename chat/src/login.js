"use strict";
(() => {
    function getElement(id) {
        const el = document.getElementById(id);
        if (!el)
            throw new Error(`Element #${id} not found`);
        return el;
    }
    function setError(input, errorEl, msg) {
        input.classList.add("error");
        errorEl.textContent = msg;
    }
    function clearError(input, errorEl) {
        input.classList.remove("error");
        errorEl.textContent = "";
    }
    function validate({ email, password }) {
        const emailError = getElement("email-error");
        const passwordError = getElement("password-error");
        let valid = true;
        clearError(email, emailError);
        clearError(password, passwordError);
        if (!email.value.trim()) {
            setError(email, emailError, "Email is required.");
            valid = false;
        }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
            setError(email, emailError, "Enter a valid email address.");
            valid = false;
        }
        if (!password.value) {
            setError(password, passwordError, "Password is required.");
            valid = false;
        }
        else if (password.value.length < 6) {
            setError(password, passwordError, "Password must be at least 6 characters.");
            valid = false;
        }
        return valid;
    }
    const form = getElement("login-form");
    const fields = {
        email: getElement("email"),
        password: getElement("password"),
    };
    const registerBtn = getElement("register-btn");
    registerBtn.addEventListener("click", () => {
        window.location.href = "/register";
    });
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!validate(fields))
            return;
        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: fields.email.value,
                password: fields.password.value,
            }),
        });
        if (res.ok) {
            window.location.href = "/dashboard";
        }
        else {
            const data = await res.json();
            setError(fields.email, getElement("email-error"), data.error);
        }
    });
})();
