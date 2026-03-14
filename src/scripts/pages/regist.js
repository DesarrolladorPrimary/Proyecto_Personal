import { fetchJson } from "../utils/api-client.js";
import { bindFieldValidation, validateFields } from "../utils/form-feedback.js";

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

  const fieldBindings = [
    {
      input: userInput,
      ...bindFieldValidation(
        userInput,
        (value) => {
          const nombre = value.trim();
          if (!nombre) {
            return { valid: false, message: "Escribe tu nombre de usuario." };
          }

          if (nombre.length < 3) {
            return { valid: false, message: "Debe tener al menos 3 caracteres." };
          }

          return { valid: true, message: "Nombre válido." };
        },
        { validateOnInput: true },
      ),
    },
    {
      input: emailInput,
      ...bindFieldValidation(
        emailInput,
        (value) => {
          const correo = value.trim();
          if (!correo) {
            return { valid: false, message: "Ingresa tu correo." };
          }

          if (!EMAIL_PATTERN.test(correo)) {
            return { valid: false, message: "Usa un correo con formato válido." };
          }

          return { valid: true, message: "Correo válido." };
        },
        { validateOnInput: true },
      ),
    },
    {
      input: passwordInput,
      ...bindFieldValidation(
        passwordInput,
        (value) => {
          if (!value) {
            return { valid: false, message: "Crea una contraseña." };
          }

          if (value.length < 8) {
            return { valid: false, message: "Debe tener mínimo 8 caracteres." };
          }

          if (!PASSWORD_COMPLEXITY.test(value)) {
            return { valid: false, message: "Incluye al menos un número o símbolo." };
          }

          return { valid: true, message: "Contraseña válida." };
        },
        { validateOnInput: true },
      ),
    },
    {
      input: confirmInput,
      ...bindFieldValidation(
        confirmInput,
        (value) => {
          if (!value) {
            return { valid: false, message: "Confirma tu contraseña." };
          }

          if (value !== passwordInput.value) {
            return { valid: false, message: "Debe coincidir con la contraseña." };
          }

          return { valid: true, message: "Las contraseñas coinciden." };
        },
        { validateOnInput: true },
      ),
    },
  ];

  passwordInput.addEventListener("input", () => {
    if (confirmInput.value) {
      fieldBindings[3].validate();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nombre = userInput.value.trim();
    const correo = emailInput.value.trim();
    const contraseña = passwordInput.value;

    if (!validateFields(fieldBindings)) {
      showToast("Revisa los campos marcados antes de continuar.");
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
