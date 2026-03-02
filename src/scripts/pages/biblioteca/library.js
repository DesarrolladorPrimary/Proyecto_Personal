import { fetchJson } from "../../utils/api-client.js";
import { getCurrentUserId } from "../../utils/auth-session.js";

document.addEventListener("DOMContentLoaded", async () => {
  const inputLibrary = document.getElementById("input_library");
  const createButton = document.getElementById("create-shelf");
  const storageFill = document.querySelector(".storage-bar__fill");
  const storageText = document.querySelector(".storage-bar__text");
  const userId = getCurrentUserId();
  const urlParams = new URLSearchParams(window.location.search);
  const selectedShelfId = urlParams.get("shelfId");
  const selectedShelfName = urlParams.get("shelfName");

  const showToast = (text, background = "red") => {
    Toastify({
      text,
      duration: 2500,
      gravity: "top",
      position: "center",
      stopOnFocus: true,
      style: { background },
    }).showToast();
  };

  if (!userId) {
    return;
  }

  if (selectedShelfName) {
    inputLibrary.value = selectedShelfName;
    sessionStorage.setItem(`activeShelf:${userId}`, selectedShelfName);
    sessionStorage.setItem(`activeShelfId:${userId}`, selectedShelfId || "");
  } else {
    const savedName = sessionStorage.getItem(`activeShelf:${userId}`);
    if (savedName) {
      inputLibrary.value = savedName;
    }
  }

  const loadSubscription = async () => {
    try {
      const { ok, data } = await fetchJson("/api/v1/settings/suscripcion", {
        params: { id: userId },
        auth: true,
      });

      if (!ok) {
        return;
      }

      const limit = Number(data.limiteAlmacenamientoMb ?? data.almacenamiento ?? 500);
      const used = Number(data.almacenamientoUsadoMb ?? 0);
      const percentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

      if (storageFill) {
        storageFill.style.width = `${percentage}%`;
      }

      if (storageText) {
        storageText.textContent = `${used}/${limit} MB`;
      }
    } catch (error) {
      // Si falla, dejamos el estado visual por defecto.
    }
  };

  createButton?.addEventListener("click", async () => {
    const nombre = inputLibrary.value.trim();

    if (!nombre) {
      showToast("Ingresa un nombre para la estantería");
      inputLibrary.focus();
      return;
    }

    try {
      const { ok, data } = await fetchJson("/api/v1/estanterias", {
        method: "POST",
        auth: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId: userId,
          nombre,
        }),
      });

      if (!ok) {
        showToast(data.Mensaje || "No fue posible crear la estantería");
        return;
      }

      sessionStorage.setItem(`activeShelf:${userId}`, nombre);
      if (data.id) {
        sessionStorage.setItem(`activeShelfId:${userId}`, String(data.id));
      }

      showToast(data.Mensaje || "Estantería creada correctamente", "green");
      window.location.href = `shelves.html?selected=${encodeURIComponent(data.id || "")}`;
    } catch (error) {
      showToast("Error de conexión");
    }
  });

  await loadSubscription();
});
