import { fetchJson } from "../utils/api-client.js";

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9._%+-]+\.[a-zA-Z]{2,100}$/;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form");
  const emailInput = document.getElementById("login_email");
  const passwordInput = document.getElementById("login_password");

  const showToast = (text, background = "red", callback) => {
    Toastify({
      text,
      duration: 3000,
      gravity: "top",
      position: "center",
      stopOnFocus: true,
      style: { background },
      callback,
    }).showToast();
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const correo = emailInput.value.trim();
    const contraseña = passwordInput.value;

    if (!EMAIL_PATTERN.test(correo)) {
      showToast("Ingresa un correo válido");
      emailInput.focus();
      return;
    }

    if (!contraseña) {
      showToast("Ingresa tu contraseña");
      passwordInput.focus();
      return;
    }

    try {
      const { ok, status, data } = await fetchJson("/api/v1/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, contraseña }),
      });

      if (ok && data.Token) {
        localStorage.setItem("Token", data.Token);
        showToast(
          data.Mensaje || "Inicio de sesión correcto",
          "green",
          () => {
            window.location.href = "../feed/feed-main.html";
          },
        );
        return;
      }

      if (status === 403) {
        showToast(data.Mensaje || "Debes verificar tu correo", "orange");
        return;
      }

      showToast(data.Mensaje || "No fue posible iniciar sesión");
    } catch (error) {
      showToast("Error de conexión");
    }
  });
});
