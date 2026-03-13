import { fetchJson } from "../utils/api-client.js";
import {
  consumeAuthNotice,
  getDefaultRouteForRole,
  parseTokenSafely,
} from "../utils/auth-session.js";
import { bindFieldValidation, setFieldState, validateFields } from "../utils/form-feedback.js";

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
            return { valid: false, message: "Ingresa tu correo." };
          }

          if (!EMAIL_PATTERN.test(correo)) {
            return { valid: false, message: "Usa un correo con formato valido." };
          }

          return { valid: true, message: "Correo valido." };
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
            return { valid: false, message: "Ingresa tu contraseña." };
          }

          return { valid: true, message: "Campo completo." };
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
      showToast("Revisa los campos marcados antes de continuar.");
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

        showToast(data.Mensaje || "Inicio de sesion correcto", "green", () => {
          window.location.href = getDefaultRouteForRole(payload?.role);
        });
        return;
      }

      if (status === 403) {
        setFieldState(emailInput, {
          state: "error",
          message: "Tu correo existe, pero aun no ha sido verificado.",
        });
        showToast(data.Mensaje || "Debes verificar tu correo", "orange");
        return;
      }

      setFieldState(passwordInput, {
        state: "error",
        message: "Verifica tus credenciales e intentalo otra vez.",
      });
      showToast(data.Mensaje || "No fue posible iniciar sesion");
    } catch (error) {
      showToast("Error de conexion");
    }
  });
});
