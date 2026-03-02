import { fetchJson } from "../utils/api-client.js";

const PASSWORD_COMPLEXITY = /[\d\W_]/;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form");
  const passwordInput = document.getElementById("contraseña");
  const confirmInput = document.getElementById("confirmar_contraseña");
  const token = new URLSearchParams(window.location.search).get("token");

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

  if (!token) {
    showToast("Token no válido. Solicita un nuevo enlace.");
    form.querySelector("button").disabled = true;
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const contraseña = passwordInput.value;
    const confirmacion = confirmInput.value;

    if (!contraseña || !confirmacion) {
      showToast("Completa todos los campos");
      return;
    }

    if (contraseña.length < 8) {
      showToast("La contraseña debe tener al menos 8 caracteres");
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
      const { ok, data } = await fetchJson("/api/v1/recuperar/nueva", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, contraseña }),
      });

      if (ok) {
        showToast(
          data.Mensaje || "Contraseña actualizada correctamente",
          "green",
          () => {
            window.location.href = "login.html";
          },
        );
        return;
      }

      showToast(data.Mensaje || "No fue posible actualizar la contraseña");
    } catch (error) {
      showToast("Error de conexión");
    }
  });
});
