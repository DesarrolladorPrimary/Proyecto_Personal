import { fetchJson } from "../utils/api-client.js";
import {
  consumeAuthNotice,
  getDefaultRouteForRole,
  parseTokenSafely,
} from "../utils/auth-session.js";
import { bindFieldValidation, setFieldState, validateFields } from "../utils/form-feedback.js";

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9._%+-]+\.[a-zA-Z]{2,100}$/;
const EMAIL_MAX_LENGTH = 120;

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

  const authNotice = consumeAuthNotice();
  if (authNotice?.text) {
    showToast(authNotice.text, authNotice.background || "orange");
  }

  const fieldBindings = [
    {
      input: emailInput,
      ...bindFieldValidation(
        emailInput,
        (value) => {
          const correo = value.trim();
          if (!correo) {
            return { valid: false, message: "Ingresa el correo con el que registraste tu cuenta." };
          }

          if (correo.length > EMAIL_MAX_LENGTH) {
            return { valid: false, message: "Hazlo más corto: el correo puede tener hasta 120 caracteres." };
          }

          if (!EMAIL_PATTERN.test(correo)) {
            return { valid: false, message: "Escríbelo con formato correo@dominio.com." };
          }

          return { valid: true, message: "Correo listo para iniciar sesión." };
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
            return { valid: false, message: "Ingresa la contraseña de tu cuenta." };
          }

          return { valid: true, message: "Contraseña ingresada." };
        },
        { validateOnInput: true },
      ),
    },
  ];

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const correo = emailInput.value.trim();
    const contrasena = passwordInput.value;

    if (!validateFields(fieldBindings)) {
      showToast("Revisa los campos marcados antes de intentar ingresar.");
      return;
    }

    try {
      const { ok, status, data } = await fetchJson("/api/v1/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, contraseña: contrasena }),
      });

      if (ok && data.Token) {
        localStorage.setItem("Token", data.Token);
        const payload = parseTokenSafely(data.Token);

        showToast(data.Mensaje || "Inicio de sesión correcto", "green", () => {
          window.location.href = getDefaultRouteForRole(payload?.role);
        });
        return;
      }

      if (status === 403 && data.correoEnviado) {
        setFieldState(emailInput, {
          state: "error",
          message: "Tu cuenta existe, pero primero debes verificar el correo que registraste.",
        });
        showToast(data.Mensaje || "Debes verificar tu correo", "orange");
        return;
      }

      if (status === 403) {
        setFieldState(emailInput, {
          state: "error",
          message: data.Mensaje || "La cuenta no esta disponible para iniciar sesion.",
        });
        showToast(data.Mensaje || "No fue posible iniciar sesion", "orange");
        return;
      }

      setFieldState(passwordInput, {
        state: "error",
        message: "Revisa tu correo y contraseña e inténtalo de nuevo.",
      });
      showToast(data.Mensaje || "No fue posible iniciar sesión");
    } catch (error) {
      showToast("Error de conexión");
    }
  });
});
