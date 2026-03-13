import { fetchJson } from "../../utils/api-client.js";
import { buildUploadedAssetUrl } from "../../utils/api-config.js";
import {
  getCurrentUserId,
  getToken,
  logoutAndRedirect,
} from "../../utils/auth-session.js";

const DEFAULT_PHOTO = "/assets/icons/image.png";

const showToast = (text, background = "red") => {
  window.Toastify?.({
    text,
    duration: 2600,
    gravity: "top",
    position: "center",
    stopOnFocus: true,
    style: { background },
  }).showToast();
};

export const createCreativeUserMenu = ({ onOpen } = {}) => {
  const elements = {
    logoUserButton: document.getElementById("logo_user_button"),
    logoUser: document.getElementById("logo_user"),
    userMenu: document.getElementById("user"),
    userName: document.getElementById("nombre_usuario"),
    userEmail: document.getElementById("correo_usuario"),
    userAiModel: document.getElementById("menu-user-ai-model"),
    userMenuPhoto: document.getElementById("profile_photo_user"),
    logoutButton: document.getElementById("logout"),
  };

  const setOpen = (nextValue) => {
    elements.userMenu?.classList.toggle("menu-user--visible", Boolean(nextValue));
  };

  const isOpen = () => elements.userMenu?.classList.contains("menu-user--visible") || false;

  const applyUserData = (user = {}) => {
    const photoSrc = user.FotoPerfil
      ? buildUploadedAssetUrl(user.FotoPerfil)
      : DEFAULT_PHOTO;

    if (elements.userName) {
      elements.userName.textContent = user.Nombre || "—";
    }

    if (elements.userEmail) {
      elements.userEmail.textContent = user.Correo || "—";
    }

    if (elements.logoUser) {
      elements.logoUser.src = photoSrc;
    }

    if (elements.userMenuPhoto) {
      elements.userMenuPhoto.src = photoSrc;
    }
  };

  const applyAiModelData = (versionData = {}) => {
    if (!elements.userAiModel) {
      return;
    }

    const modelLabel = [versionData.nombre, versionData.version]
      .filter(Boolean)
      .join(" ")
      .trim();

    elements.userAiModel.textContent = modelLabel || "No disponible";
    elements.userAiModel.title = versionData.changelog || elements.userAiModel.textContent;
  };

  const loadUser = async (userId) => {
    const { ok, status, data } = await fetchJson("/api/v1/usuarios/id", {
      params: { id: userId },
      auth: true,
    });

    if (!ok) {
      if (status === 401) {
        logoutAndRedirect();
        return;
      }

      showToast(data.Mensaje || "No fue posible cargar el perfil");
      return;
    }

    applyUserData(data);
  };

  const loadAiModel = async (userId) => {
    if (!elements.userAiModel) {
      return;
    }

    const { ok, data } = await fetchJson("/api/v1/settings/version-ia", {
      params: { id: userId },
      auth: true,
    });

    if (!ok) {
      elements.userAiModel.textContent = "No disponible";
      return;
    }

    applyAiModelData(data);
  };

  const handleDocumentClick = (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (
      !elements.userMenu?.contains(target) &&
      !elements.logoUserButton?.contains(target)
    ) {
      setOpen(false);
    }
  };

  const init = async () => {
    const userId = getCurrentUserId();
    const token = getToken();

    if (!userId || !token) {
      logoutAndRedirect();
      return;
    }

    elements.logoUserButton?.addEventListener("click", (event) => {
      event.stopPropagation();
      const nextVisible = !isOpen();
      setOpen(nextVisible);

      if (nextVisible) {
        onOpen?.();
      }
    });

    elements.logoutButton?.addEventListener("click", () => {
      showToast("Sesion cerrada", "red");
      window.setTimeout(() => {
        logoutAndRedirect();
      }, 450);
    });

    document.addEventListener("click", handleDocumentClick);

    await loadUser(userId);
    await loadAiModel(userId);
  };

  return {
    init,
    isOpen,
    close: () => setOpen(false),
  };
};
