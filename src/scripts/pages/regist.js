import { fetchJson } from "../utils/api-client.js";

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9._%+-]+\.[a-zA-Z]{2,100}$/;
const PASSWORD_COMPLEXITY = /[\d\W_]/;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form");
  const userInput = document.getElementById("user_regist");
  const emailInput = document.getElementById("correo_regist");
  const passwordInput = document.getElementById("password_regist");
  const confirmInput = document.getElementById("password_registVery");

  const showToast = (text, background = "red", callback) => {
    Toastify({
      text,
      duration: 3000,
      gravity: "bottom",
      position: "center",
      stopOnFocus: true,
      style: { background },
      callback,
    }).showToast();
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nombre = userInput.value.trim();
    const correo = emailInput.value.trim();
    const contraseña = passwordInput.value;
    const confirmacion = confirmInput.value;

    if (nombre.length < 3) {
      showToast("El nombre debe tener al menos 3 caracteres");
      userInput.focus();
      return;
    }

    if (!EMAIL_PATTERN.test(correo)) {
      showToast("Ingresa un correo válido");
      emailInput.focus();
      return;
    }

    if (contraseña.length < 8) {
      showToast("La contraseña debe tener mínimo 8 caracteres");
      passwordInput.focus();
      return;
    }

    if (!PASSWORD_COMPLEXITY.test(contraseña)) {
      showToast("La contraseña debe incluir un número o símbolo");
      passwordInput.focus();
      return;
    }

    if (contraseña !== confirmacion) {
      showToast("Las contraseñas no coinciden");
      confirmInput.focus();
      return;
    }

    try {
      const { ok, data } = await fetchJson("/api/v1/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, correo, contraseña }),
      });

      if (ok) {
        showToast(
          data.Mensaje || "Usuario registrado correctamente",
          "green",
          () => {
            window.location.href = "../auth/login.html";
          },
        );
        return;
      }

      showToast(data.Mensaje || "No fue posible registrar el usuario");
    } catch (error) {
      showToast("Error de conexión");
    }
  });
});
