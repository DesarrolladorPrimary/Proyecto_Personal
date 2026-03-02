import { fetchJson } from "../utils/api-client.js";

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9._%+-]+\.[a-zA-Z]{2,100}$/;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form");
  const emailInput = document.getElementById("correo");

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

    if (!EMAIL_PATTERN.test(correo)) {
      showToast("Ingresa un correo válido");
      emailInput.focus();
      return;
    }

    try {
      const { ok, data } = await fetchJson("/api/v1/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo }),
      });

      if (ok) {
        showToast(
          "Correo enviado. Revisa tu bandeja de entrada.",
          "green",
          () => {
            window.location.href = "recovery_passwd_messaje.html";
          },
        );
        return;
      }

      showToast(data.Mensaje || "No fue posible procesar la solicitud");
    } catch (error) {
      showToast("Error de conexión");
    }
  });
});
