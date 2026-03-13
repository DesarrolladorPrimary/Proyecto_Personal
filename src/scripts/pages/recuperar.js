import { fetchJson } from "../utils/api-client.js";
import { bindFieldValidation, setFieldState, validateFields } from "../utils/form-feedback.js";

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

  const fieldBindings = [
    {
      input: emailInput,
      ...bindFieldValidation(
        emailInput,
        (value) => {
          const correo = value.trim();
          if (!correo) {
            return { valid: false, message: "Ingresa el correo asociado a tu cuenta." };
          }

          if (!EMAIL_PATTERN.test(correo)) {
            return { valid: false, message: "Usa un correo con formato valido." };
          }

          return { valid: true, message: "Correo listo para enviar." };
        },
        { validateOnInput: true },
      ),
    },
  ];

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const correo = emailInput.value.trim();

    if (!validateFields(fieldBindings)) {
      showToast("Revisa el correo antes de continuar.");
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

      setFieldState(emailInput, {
        state: "error",
        message: data.Mensaje || "No fue posible procesar el correo ingresado.",
      });
      showToast(data.Mensaje || "No fue posible procesar la solicitud");
    } catch (error) {
      showToast("Error de conexion");
    }
  });
});
