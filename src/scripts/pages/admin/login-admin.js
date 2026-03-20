import { fetchJson } from "../../utils/api-client.js";
import {
  clearToken,
  consumeAuthNotice,
  isAdminRole,
  parseTokenSafely,
} from "../../utils/auth-session.js";
import { bindFieldValidation, setFieldState, validateFields } from "../../utils/form-feedback.js";

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9._%+-]+\.[a-zA-Z]{2,100}$/;
const EMAIL_MAX_LENGTH = 120;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("admin-login-form");
  const emailInput = document.getElementById("admin_email");
  const passwordInput = document.getElementById("admin_password");

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
            return { valid: false, message: "Ingresa el correo de tu cuenta administradora." };
          }

          if (correo.length > EMAIL_MAX_LENGTH) {
            return { valid: false, message: "Hazlo más corto: el correo puede tener hasta 120 caracteres." };
          }

          if (!EMAIL_PATTERN.test(correo)) {
            return { valid: false, message: "Escríbelo con formato correo@dominio.com." };
          }

          return { valid: true, message: "Correo listo para validar acceso admin." };
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
            return { valid: false, message: "Ingresa la contraseña de tu cuenta administradora." };
          }

          return { valid: true, message: "Contraseña ingresada." };
        },
        { validateOnInput: true },
      ),
    },
  ];

  form?.addEventListener("submit", async (event) => {
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

        if (!isAdminRole(payload?.role)) {
          clearToken();
          setFieldState(passwordInput, {
            state: "error",
            message: "La cuenta existe, pero no tiene permisos de administrador.",
          });
          showToast("La cuenta no tiene permisos de administrador");
          return;
        }

        showToast("Acceso administrador correcto", "green", () => {
          window.location.href = "/public/admin/dashboard-admin.html";
        });
        return;
      }

      if (status === 403) {
        setFieldState(emailInput, {
          state: "error",
          message: "La cuenta existe, pero primero debes verificar el correo registrado.",
        });
        showToast(data.Mensaje || "Debes verificar tu correo", "orange");
        return;
      }

      setFieldState(passwordInput, {
        state: "error",
        message: "Revisa las credenciales o confirma que tu cuenta sí sea administradora.",
      });
      showToast(data.Mensaje || "No fue posible iniciar sesión");
    } catch (error) {
      showToast("Error de conexión");
    }
  });
});
