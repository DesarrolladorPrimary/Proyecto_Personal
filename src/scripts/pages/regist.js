import { fetchJson } from "../utils/api-client.js";
import { bindFieldValidation, validateFields } from "../utils/form-feedback.js";

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9._%+-]+\.[a-zA-Z]{2,100}$/;
const PASSWORD_COMPLEXITY = /[\d\W_]/;
const NAME_PATTERN = /^[\p{L}][\p{L}' -]*$/u;
const NAME_SANITIZE_PATTERN = /[^\p{L}' -]+/gu;
const EMAIL_MAX_LENGTH = 120;
const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 25;

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
            return { valid: false, message: "Escribe el nombre que quieres mostrar en tu cuenta." };
          }

          if (nombre.length < NAME_MIN_LENGTH) {
            return { valid: false, message: "Usa al menos 3 letras para que podamos identificar tu cuenta." };
          }

          if (nombre.length > NAME_MAX_LENGTH) {
            return { valid: false, message: "Hazlo más corto: el nombre puede tener hasta 25 caracteres." };
          }

          if (!NAME_PATTERN.test(nombre)) {
            return { valid: false, message: "Usa solo letras, espacios, apóstrofes o guiones." };
          }

          return { valid: true, message: "Perfecto, ese nombre se puede usar." };
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
            return { valid: false, message: "Ingresa un correo al que sí tengas acceso." };
          }

          if (correo.length > EMAIL_MAX_LENGTH) {
            return { valid: false, message: "Hazlo más corto: el correo puede tener hasta 120 caracteres." };
          }

          if (!EMAIL_PATTERN.test(correo)) {
            return { valid: false, message: "Escríbelo con formato correo@dominio.com." };
          }

          return { valid: true, message: "Bien. Te enviaremos la verificación a ese correo." };
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
            return { valid: false, message: "Crea una contraseña para proteger tu cuenta." };
          }

          if (value.length < 8) {
            return { valid: false, message: "Hazla un poco más fuerte: usa mínimo 8 caracteres." };
          }

          if (!PASSWORD_COMPLEXITY.test(value)) {
            return { valid: false, message: "Agrega al menos un número o símbolo para que sea más segura." };
          }

          return { valid: true, message: "Contraseña lista." };
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
            return { valid: false, message: "Repite tu contraseña para confirmar que quedó bien escrita." };
          }

          if (value !== passwordInput.value) {
            return { valid: false, message: "No coincide todavía. Revisa ambas contraseñas." };
          }

          return { valid: true, message: "Listo, ambas contraseñas coinciden." };
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

  userInput.addEventListener("input", () => {
    const sanitized = userInput.value.replace(NAME_SANITIZE_PATTERN, "");
    const trimmedToMax = sanitized.slice(0, NAME_MAX_LENGTH);
    if (trimmedToMax !== userInput.value) {
      userInput.value = trimmedToMax;
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nombre = userInput.value.trim();
    const correo = emailInput.value.trim();
    const contraseña = passwordInput.value;

    if (!validateFields(fieldBindings)) {
      showToast("Revisa los campos marcados y corrige lo necesario antes de continuar.");
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
