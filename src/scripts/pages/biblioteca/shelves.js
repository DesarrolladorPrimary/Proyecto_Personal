import { fetchJson } from "../../utils/api-client.js";
import { getCurrentUserId } from "../../utils/auth-session.js";

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.querySelector(".shelves-main");
  const userId = getCurrentUserId();
  const selectedId = new URLSearchParams(window.location.search).get("selected");

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
  const t = (key) => window.languageManager?.translate(key) || key;

  if (!container || !userId) {
    return;
  }

  const createActionButton = (text, onClick) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.style.marginLeft = "0.5rem";
    button.addEventListener("click", onClick);
    return button;
  };

  const renderShelves = async () => {
    container.innerHTML = "";

    try {
      const { ok, data } = await fetchJson("/api/v1/estanterias", {
        params: { id: userId },
        auth: true,
      });

      if (!ok) {
        showToast(data.Mensaje || "No fue posible cargar las estanterías");
        return;
      }

      const shelves = Array.isArray(data)
        ? data.filter((item) => item && typeof item === "object" && item.id)
        : [];

      if (!shelves.length) {
        const emptyCard = document.createElement("div");
        emptyCard.className = "shelf-card";
        emptyCard.innerHTML = `<p class="shelf-card__name">${t("shelves.empty")}</p>`;
        container.appendChild(emptyCard);
        return;
      }

      shelves.forEach((shelf) => {
        const row = document.createElement("div");
        row.className = "shelf-card";
        if (selectedId && String(shelf.id) === selectedId) {
          row.style.outline = "2px solid #ffffff";
        }

        const name = document.createElement("p");
        name.className = "shelf-card__name";
        name.textContent = shelf.nombre;
        row.appendChild(name);

        const openLink = document.createElement("a");
        openLink.href = `library.html?shelfId=${encodeURIComponent(shelf.id)}&shelfName=${encodeURIComponent(shelf.nombre)}`;
        openLink.textContent = t("shelves.open");
        openLink.style.marginLeft = "0.5rem";
        row.appendChild(openLink);

        row.appendChild(
          createActionButton(t("shelves.rename"), async () => {
            const nuevoNombre = window.prompt(t("shelves.rename_prompt"), shelf.nombre);

            if (!nuevoNombre || !nuevoNombre.trim()) {
              return;
            }

            const { ok: updated, data: updateData } = await fetchJson("/api/v1/estanterias", {
              method: "PUT",
              params: { id: shelf.id },
              auth: true,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nombre: nuevoNombre.trim() }),
            });

            if (!updated) {
              showToast(updateData.Mensaje || "No fue posible renombrar");
              return;
            }

            showToast(updateData.Mensaje || "Estantería actualizada", "green");
            await renderShelves();
          }),
        );

        row.appendChild(
          createActionButton(t("shelves.delete"), async () => {
            const confirmed = window.confirm(t("shelves.delete_confirm"));
            if (!confirmed) {
              return;
            }

            const { ok: removed, data: removeData } = await fetchJson("/api/v1/estanterias", {
              method: "DELETE",
              params: { id: shelf.id },
              auth: true,
            });

            if (!removed) {
              showToast(removeData.Mensaje || "No fue posible eliminar");
              return;
            }

            showToast(removeData.Mensaje || "Estantería eliminada", "green");
            await renderShelves();
          }),
        );

        container.appendChild(row);
      });
    } catch (error) {
      showToast("Error de conexión");
    }
  };

  await renderShelves();
});
