import { fetchJson } from "../../utils/api-client.js";
import {
  clearToken,
  consumeAuthNotice,
  isAdminRole,
  parseTokenSafely,
} from "../../utils/auth-session.js";

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9._%+-]+\.[a-zA-Z]{2,100}$/;

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

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const correo = emailInput.value.trim();
    const contrasena = passwordInput.value;

    if (!EMAIL_PATTERN.test(correo)) {
      showToast("Ingresa un correo valido");
      emailInput.focus();
      return;
    }

    if (!contrasena) {
      showToast("Ingresa la contrasena");
      passwordInput.focus();
      return;
    }

    try {
      const { ok, data } = await fetchJson("/api/v1/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, contraseña: contrasena }),
      });

      if (!ok || !data.Token) {
        showToast(data.Mensaje || "No fue posible iniciar sesion");
        return;
      }

      localStorage.setItem("Token", data.Token);
      const payload = parseTokenSafely(data.Token);

      if (!isAdminRole(payload?.role)) {
        clearToken();
        showToast("La cuenta no tiene permisos de administrador");
        return;
      }

      showToast("Acceso administrador correcto", "green", () => {
        window.location.href = "/public/admin/dashboard-admin.html";
      });
    } catch (error) {
      showToast("Error de conexion");
    }
  });
});
