import { fetchJson } from "../../utils/api-client.js";

const STORY_MODE = "Seccion_Creativa";
const STORY_QUERY_KEY = "creativeStoryId";

const elements = {
  list: document.getElementById("creative-story-list"),
  newMain: document.getElementById("creative-new-story"),
  newAside: document.getElementById("creative-sidebar-new"),
};

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

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("es-CO");
};

const goToCanvas = (storyId) => {
  const url = new URL("./canvas_creative.html", window.location.href);
  url.searchParams.set(STORY_QUERY_KEY, String(storyId));
  window.location.href = url.toString();
};

const promptStoryTitle = (currentValue = "") => {
  const value = window.prompt("Titulo del lienzo", currentValue || "Mi historia creativa");
  return value ? value.trim() : "";
};

const loadStories = async () => {
  const { ok, data } = await fetchJson("/api/v1/stories", { auth: true });
  if (!ok) {
    showToast(data.Mensaje || "No fue posible cargar los relatos");
    return [];
  }

  return Array.isArray(data.relatos)
    ? data.relatos.filter((story) => story.modoOrigen === STORY_MODE)
    : [];
};

const createStory = async () => {
  const title = promptStoryTitle();
  if (!title) {
    return;
  }

  const { ok, data } = await fetchJson("/api/v1/stories", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titulo: title,
      modoOrigen: STORY_MODE,
      descripcion: "",
      estanteriaId: null,
      modeloUsadoId: null,
    }),
  });

  if (!ok || !data.id) {
    showToast(data.Mensaje || "No fue posible crear el lienzo");
    return;
  }

  showToast(data.Mensaje || "Lienzo creado", "green");
  goToCanvas(data.id);
};

const renameStory = async (story) => {
  const nextTitle = promptStoryTitle(story.titulo);
  if (!nextTitle || nextTitle === story.titulo) {
    return;
  }

  const { ok, data } = await fetchJson(`/api/v1/stories/${story.id}`, {
    method: "PUT",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titulo: nextTitle,
      modoOrigen: story.modoOrigen,
      descripcion: story.descripcion ?? "",
      estanteriaId: story.estanteriaId ?? null,
      modeloUsadoId: story.modeloUsadoId ?? null,
    }),
  });

  if (!ok) {
    showToast(data.Mensaje || "No fue posible renombrar");
    return;
  }

  showToast(data.Mensaje || "Lienzo renombrado", "green");
  await renderStories();
};

const deleteStory = async (story) => {
  const confirmed = window.confirm(`Eliminar "${story.titulo || "este lienzo"}"?`);
  if (!confirmed) {
    return;
  }

  const { ok, data } = await fetchJson(`/api/v1/stories/${story.id}`, {
    method: "DELETE",
    auth: true,
  });

  if (!ok) {
    showToast(data.Mensaje || "No fue posible eliminar");
    return;
  }

  showToast(data.Mensaje || "Lienzo eliminado", "green");
  await renderStories();
};

const buildStoryCard = (story) => {
  const card = document.createElement("article");
  card.className = "creative-aside__chat";
  card.innerHTML = `
    <button type="button" class="creative-aside__chat-title creative-story-card__open">${story.titulo || "Sin titulo"}</button>
    <div class="creative-story-card__actions">
      <span class="creative-story-card__date">${formatDate(story.fechaModificacion || story.fechaCreacion)}</span>
      <button type="button" class="creative-aside__option creative-aside__option--rename">Renombrar</button>
      <button type="button" class="creative-aside__option creative-aside__option--delete">Eliminar</button>
    </div>
  `;

  card.querySelector(".creative-story-card__open")?.addEventListener("click", () => {
    goToCanvas(story.id);
  });
  card.querySelector(".creative-aside__option--rename")?.addEventListener("click", () => {
    renameStory(story);
  });
  card.querySelector(".creative-aside__option--delete")?.addEventListener("click", () => {
    deleteStory(story);
  });

  return card;
};

const renderStories = async () => {
  const stories = await loadStories();
  elements.list.innerHTML = "";

  if (!stories.length) {
    const empty = document.createElement("p");
    empty.className = "creative-aside__chat-title";
    empty.textContent = "Todavia no tienes lienzos manuales.";
    elements.list.appendChild(empty);
    return;
  }

  stories.forEach((story) => {
    elements.list.appendChild(buildStoryCard(story));
  });
};

document.addEventListener("DOMContentLoaded", async () => {
  elements.newMain?.addEventListener("click", createStory);
  elements.newAside?.addEventListener("click", createStory);
  await renderStories();
});
