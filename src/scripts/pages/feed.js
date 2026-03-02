import { fetchJson } from "../utils/api-client.js";
import { buildUploadedAssetUrl } from "../utils/api-config.js";
import {
  getCurrentUserId,
  getToken,
  logoutAndRedirect,
} from "../utils/auth-session.js";

document.addEventListener("DOMContentLoaded", async () => {
  const logoUser = document.getElementById("logo_user");
  const menuUser = document.getElementById("user");
  const aside = document.getElementById("sidebar");
  const headerAside = document.getElementById("header__nav");
  const buttonLogout = document.getElementById("logout");
  const fieldName = document.getElementById("nombre_usuario");
  const fieldEmail = document.getElementById("correo_usuario");
  const userId = getCurrentUserId();
  const token = getToken();

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

  if (!userId || !token) {
    logoutAndRedirect();
    return;
  }

  logoUser?.addEventListener("click", () => {
    menuUser?.classList.toggle("menu-user--visible");
  });

  headerAside?.addEventListener("click", () => {
    aside?.classList.toggle("aside--active");
  });

  buttonLogout?.addEventListener("click", () => {
    showToast("Sesión cerrada", "red", () => {
      logoutAndRedirect();
    });
  });

  window.addEventListener("click", (event) => {
    if (logoUser && menuUser && event.target !== logoUser && !menuUser.contains(event.target)) {
      menuUser.classList.remove("menu-user--visible");
    }

    if (
      headerAside &&
      aside &&
      !headerAside.contains(event.target) &&
      !aside.contains(event.target)
    ) {
      aside.classList.remove("aside--active");
    }
  });

  const applyUserData = (user) => {
    if (fieldName) {
      fieldName.textContent = user.Nombre || "";
    }

    if (fieldEmail) {
      fieldEmail.textContent = user.Correo || "";
    }

    const defaultPhoto = "../../assets/icons/image.png";
    const photoSrc = user.FotoPerfil
      ? buildUploadedAssetUrl(user.FotoPerfil)
      : defaultPhoto;

    const profileImage = document.getElementById("profile_photo_user");
    if (profileImage) {
      profileImage.src = photoSrc;
    }

    if (logoUser) {
      logoUser.src = photoSrc;
    }
  };

  const loadUser = async () => {
    try {
      const { ok, status, data } = await fetchJson("/api/v1/usuarios/id", {
        params: { id: userId },
        auth: true,
      });

      if (!ok) {
        if (status !== 401) {
          showToast(data.Mensaje || "No fue posible cargar el perfil");
        }
        return null;
      }

      applyUserData(data);
      return data;
    } catch (error) {
      showToast("Error de conexión");
      return null;
    }
  };

  const compressImage = (file, maxWidth = 512, maxHeight = 512, quality = 0.8) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (event) => {
        img.src = event.target.result;
      };

      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));

      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        context.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.onerror = () => reject(new Error("Formato de imagen no válido"));
      reader.readAsDataURL(file);
    });

  const setupProfilePhotoUpload = () => {
    const profileImage = document.getElementById("profile_photo_user");
    if (!profileImage) {
      return;
    }

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);

    profileImage.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        showToast("Selecciona una imagen válida", "orange");
        fileInput.value = "";
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        showToast("Máximo 8MB antes de comprimir", "orange");
        fileInput.value = "";
        return;
      }

      try {
        const imagen = await compressImage(file);
        const { ok, data } = await fetchJson("/api/v1/upload/perfil", {
          method: "POST",
          params: { id: userId },
          auth: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imagen }),
        });

        if (!ok) {
          showToast(data.Mensaje || "No fue posible actualizar la foto");
          return;
        }

        applyUserData({ FotoPerfil: data.ruta });
        showToast(data.Mensaje || "Foto actualizada", "green");
      } catch (error) {
        showToast("Error procesando imagen");
      } finally {
        fileInput.value = "";
      }
    });
  };

  await loadUser();
  setupProfilePhotoUpload();
});
