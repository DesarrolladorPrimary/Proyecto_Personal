import { fetchJson } from "../../utils/api-client.js";
import { getCurrentUserId } from "../../utils/auth-session.js";

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.querySelector(".shelves-main");
  const userId = getCurrentUserId();
  const selectedId = new URLSearchParams(window.location.search).get("selected");

  const showToast = (text, background = "red") => {
    window.Toastify?.({
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

  const goToShelf = (shelf) => {
    window.location.href = `library.html?shelfId=${encodeURIComponent(shelf.id)}&shelfName=${encodeURIComponent(shelf.nombre)}`;
  };

  const createActionButton = (text, variant, onClick) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `shelf-card__action${variant ? ` shelf-card__action--${variant}` : ""}`;
    button.textContent = text;
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
        showToast(data.Mensaje || "No fue posible cargar las estanterias");
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
          row.classList.add("shelf-card--selected");
        }

        const content = document.createElement("div");
        content.className = "shelf-card__content";

        const name = document.createElement("button");
        name.type = "button";
        name.className = "shelf-card__name";
        name.textContent = shelf.nombre;
        name.addEventListener("click", () => goToShelf(shelf));

        const actions = document.createElement("div");
        actions.className = "shelf-card__actions";
        actions.append(
          createActionButton(t("shelves.open"), "open", () => goToShelf(shelf)),
          createActionButton(t("shelves.rename"), "", async () => {
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

            showToast(updateData.Mensaje || "Estanteria actualizada", "green");
            await renderShelves();
          }),
          createActionButton(t("shelves.delete"), "danger", async () => {
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

            showToast(removeData.Mensaje || "Estanteria eliminada", "green");
            await renderShelves();
          }),
        );

        content.append(name, actions);
        row.appendChild(content);
        container.appendChild(row);
      });
    } catch (error) {
      showToast("Error de conexion");
    }
  };

  await renderShelves();
});
