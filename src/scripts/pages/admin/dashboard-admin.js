import { fetchJson } from "../../utils/api-client.js";
import { buildUploadedAssetUrl } from "../../utils/api-config.js";
import {
  getCurrentUserId,
  getCurrentUserRole,
  logoutAndRedirect,
} from "../../utils/auth-session.js";

document.addEventListener("DOMContentLoaded", async () => {
  const userId = getCurrentUserId();
  const role = getCurrentUserRole();

  const showToast = (text, background = "red", callback) => {
    Toastify({
      text,
      duration: 2500,
      gravity: "top",
      position: "center",
      stopOnFocus: true,
      style: { background },
      callback,
    }).showToast();
  };

  if (!userId || role.toLowerCase() !== "admin") {
    logoutAndRedirect("/public/admin/login-admin.html", {
      text: "Debes iniciar sesion como administrador.",
      background: "red",
    });
    return;
  }

  const buttonLogout = document.getElementById("admin_logout");

  buttonLogout?.addEventListener("click", () => {
    showToast("Sesion cerrada", "red", () => {
      logoutAndRedirect("/public/admin/login-admin.html");
    });
  });

  try {
    const { ok, data } = await fetchJson("/api/v1/usuarios/id", {
      params: { id: userId },
      auth: true,
    });

    if (!ok) {
      showToast(data.Mensaje || "No fue posible cargar el perfil");
      return;
    }

    document.getElementById("admin_name").textContent = data.Nombre || "";
    document.getElementById("admin_id").textContent = String(data.PK_UsuarioID || userId);
    document.getElementById("admin_email").textContent = data.Correo || "";
    document.getElementById("admin_role").textContent = data.Rol || "Admin";

    if (data.FotoPerfil) {
      const profilePhoto = document.getElementById("admin_profile_photo");
      const logo = document.getElementById("admin_logo");
      profilePhoto.src = buildUploadedAssetUrl(data.FotoPerfil);
      logo.src = profilePhoto.src;
    }
  } catch (error) {
    showToast("Error de conexion");
  }
});
