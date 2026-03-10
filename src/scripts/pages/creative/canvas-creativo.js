import { fetchJson } from "../../utils/api-client.js";

const STORY_MODE = "Seccion_Creativa";
const STORY_QUERY_KEY = "creativeStoryId";
const DEFAULT_TITLE = "Mi historia creativa";

const elements = {
  title: document.getElementById("creative-canvas-title"),
  counter: document.getElementById("creative-canvas-counter"),
  body: document.getElementById("creative-canvas-body"),
  saveButton: document.getElementById("creative-save-draft"),
  exportForm: document.getElementById("creative-export-form"),
  exportTitle: document.getElementById("canvas-book-title"),
  newButton: document.getElementById("creative-canvas-new"),
  storyList: document.getElementById("creative-canvas-story-list"),
};

const state = {
  storyId: null,
  stories: [],
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

const getWordCount = (text) =>
  text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;

const updateCounter = () => {
  const words = getWordCount(elements.body?.value || "");
  if (elements.counter) {
    elements.counter.textContent = `${words} palabras`;
  }
};

const getSelectedStoryId = () => {
  const url = new URL(window.location.href);
  const raw = url.searchParams.get(STORY_QUERY_KEY);
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const replaceStoryInUrl = (storyId) => {
  const url = new URL(window.location.href);
  url.searchParams.set(STORY_QUERY_KEY, String(storyId));
  window.history.replaceState({}, "", url);
};

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("es-CO");
};

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("No fue posible preparar el documento"));
    reader.readAsDataURL(blob);
  });

const buildWordBlob = (title, content) => {
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><h1>${title}</h1><p>${content.replace(/\n/g, "</p><p>")}</p></body></html>`;
  return new Blob(["\ufeff", html], {
    type: "application/msword",
  });
};

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const loadStories = async () => {
  const { ok, data } = await fetchJson("/api/v1/stories", { auth: true });
  if (!ok) {
    showToast(data.Mensaje || "No fue posible cargar los lienzos");
    return [];
  }

  return Array.isArray(data.relatos)
    ? data.relatos.filter((story) => story.modoOrigen === STORY_MODE)
    : [];
};

const selectStory = async (storyId) => {
  const { ok, data } = await fetchJson(`/api/v1/stories/${storyId}`, { auth: true });
  if (!ok || !data.relato) {
    showToast(data.Mensaje || "No fue posible cargar el lienzo");
    return;
  }

  const story = data.relato;
  state.storyId = story.id;
  replaceStoryInUrl(story.id);
  elements.title.textContent = story.titulo || DEFAULT_TITLE;
  elements.exportTitle.value = story.titulo || DEFAULT_TITLE;
  elements.body.value = story.descripcion || "";
  updateCounter();
};

const persistStory = async () => {
  if (!state.storyId) {
    showToast("Primero crea o selecciona un lienzo");
    return false;
  }

  const current = state.stories.find((story) => story.id === state.storyId);
  const payload = {
    titulo: elements.title.textContent?.trim() || DEFAULT_TITLE,
    modoOrigen: STORY_MODE,
    descripcion: elements.body.value || "",
    estanteriaId: current?.estanteriaId ?? null,
    modeloUsadoId: current?.modeloUsadoId ?? null,
  };

  const { ok, data } = await fetchJson(`/api/v1/stories/${state.storyId}`, {
    method: "PUT",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!ok) {
    showToast(data.Mensaje || "No fue posible guardar el borrador");
    return false;
  }

  elements.exportTitle.value = payload.titulo;
  showToast(data.Mensaje || "Borrador guardado", "green");
  state.stories = await loadStories();
  renderStoryList();
  return true;
};

const createStory = async () => {
  const { ok, data } = await fetchJson("/api/v1/stories", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titulo: DEFAULT_TITLE,
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

  state.stories = await loadStories();
  renderStoryList();
  await selectStory(data.id);
  showToast(data.Mensaje || "Lienzo creado", "green");
};

const renameStory = async (story) => {
  const nextTitle = window.prompt("Nuevo titulo", story.titulo || DEFAULT_TITLE)?.trim();
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

  state.stories = await loadStories();
  renderStoryList();

  if (state.storyId === story.id) {
    elements.title.textContent = nextTitle;
    elements.exportTitle.value = nextTitle;
  }

  showToast(data.Mensaje || "Lienzo renombrado", "green");
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

  state.stories = await loadStories();
  renderStoryList();
  showToast(data.Mensaje || "Lienzo eliminado", "green");

  if (state.storyId === story.id) {
    const nextStory = state.stories[0];
    if (nextStory) {
      await selectStory(nextStory.id);
    } else {
      state.storyId = null;
      elements.title.textContent = DEFAULT_TITLE;
      elements.exportTitle.value = DEFAULT_TITLE;
      elements.body.value = "";
      replaceStoryInUrl("new");
      updateCounter();
    }
  }
};

const buildStoryItem = (story) => {
  const item = document.createElement("article");
  item.className = "canvas-sidebar__item";
  item.innerHTML = `
    <button type="button" class="canvas-sidebar__item-title creative-canvas__open">${story.titulo || DEFAULT_TITLE}</button>
    <div class="creative-canvas__actions">
      <span class="creative-canvas__date">${formatDate(story.fechaModificacion || story.fechaCreacion)}</span>
      <button type="button" class="canvas-sidebar__option canvas-sidebar__option--rename">Renombrar</button>
      <button type="button" class="canvas-sidebar__option canvas-sidebar__option--delete">Eliminar</button>
    </div>
  `;

  item.querySelector(".creative-canvas__open")?.addEventListener("click", async () => {
    await selectStory(story.id);
  });
  item.querySelector(".canvas-sidebar__option--rename")?.addEventListener("click", async () => {
    await renameStory(story);
  });
  item.querySelector(".canvas-sidebar__option--delete")?.addEventListener("click", async () => {
    await deleteStory(story);
  });

  return item;
};

const renderStoryList = () => {
  elements.storyList.innerHTML = "";

  if (!state.stories.length) {
    const empty = document.createElement("p");
    empty.className = "canvas-sidebar__item-title";
    empty.textContent = "Todavia no tienes lienzos.";
    elements.storyList.appendChild(empty);
    return;
  }

  state.stories.forEach((story) => {
    elements.storyList.appendChild(buildStoryItem(story));
  });
};

const exportStory = async (event) => {
  event.preventDefault();

  if (!(await persistStory())) {
    return;
  }

  const title = elements.exportTitle.value.trim() || elements.title.textContent?.trim() || DEFAULT_TITLE;
  const content = elements.body.value.trim();
  if (!content) {
    showToast("Todavia no hay contenido para exportar");
    return;
  }

  const wordBlob = buildWordBlob(title, content);
  const { ok, data } = await fetchJson(`/api/v1/stories/${state.storyId}/export`, {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titulo: title,
      contenido: content,
      formato: "word",
      nombreArchivo: `${title.replace(/[^\w\-]+/g, "_")}.doc`,
      tipoArchivo: "DOC",
      archivoBase64: await blobToBase64(wordBlob),
    }),
  });

  if (!ok) {
    showToast(data.Mensaje || "No fue posible exportar el libro");
    return;
  }

  downloadBlob(wordBlob, `${title.replace(/[^\w\-]+/g, "_")}.doc`);
  showToast(data.Mensaje || "Libro exportado", "green");
  window.location.hash = "#canvasBookSuccess";
};

document.addEventListener("DOMContentLoaded", async () => {
  elements.body?.addEventListener("input", updateCounter);
  elements.title?.addEventListener("input", () => {
    elements.exportTitle.value = elements.title.textContent?.trim() || DEFAULT_TITLE;
  });
  elements.saveButton?.addEventListener("click", persistStory);
  elements.exportForm?.addEventListener("submit", exportStory);
  elements.newButton?.addEventListener("click", createStory);

  state.stories = await loadStories();
  renderStoryList();

  const selectedStoryId = getSelectedStoryId();
  if (selectedStoryId) {
    await selectStory(selectedStoryId);
    return;
  }

  if (state.stories[0]) {
    await selectStory(state.stories[0].id);
    return;
  }

  await createStory();
});
