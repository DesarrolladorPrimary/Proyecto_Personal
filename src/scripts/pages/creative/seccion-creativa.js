import { fetchJson } from "../../utils/api-client.js";
import { showConfirm, showPrompt } from "../../utils/dialog-service.js";
import { createCreativeUserMenu } from "./creative-user-menu.js";

const STORY_MODE = "Seccion_Creativa";
const STORY_QUERY_KEY = "creativeStoryId";
const DEFAULT_TITLE = "Mi historia creativa";

const elements = {
  aside: document.getElementById("sidebar"),
  asideNav: document.querySelector(".header__nav"),
  asideToggle: document.getElementById("creative-aside-toggle"),
  asideClose: document.getElementById("creative-aside-close"),
  list: document.getElementById("creative-story-list"),
  newMain: document.getElementById("creative-new-story"),
  newAside: document.getElementById("creative-sidebar-new"),
  openLatest: document.getElementById("creative-open-latest"),
  summaryTitle: document.getElementById("creative-summary-title"),
  summaryText: document.getElementById("creative-summary-text"),
  storyCount: document.getElementById("creative-story-count"),
  lastUpdate: document.getElementById("creative-last-update"),
};

const state = {
  asideOpen: false,
};

const userMenu = createCreativeUserMenu({
  onOpen: () => setAsideOpen(false),
});

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

const getStoryTimestamp = (story) => {
  const rawValue = story?.fechaModificacion || story?.fechaCreacion || 0;
  const parsed = new Date(rawValue).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortStoriesByRecency = (stories) =>
  [...stories].sort((left, right) => getStoryTimestamp(right) - getStoryTimestamp(left));

const buildStoryExcerpt = (value, maxLength = 90) => {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Sin texto todavia.";
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
};

const goToCanvas = (storyId) => {
  setAsideOpen(false);
  const url = new URL("./canvas_creative.html", window.location.href);
  url.searchParams.set(STORY_QUERY_KEY, String(storyId));
  window.location.href = url.toString();
};

const syncAsideState = () => {
  if (!elements.aside || !elements.asideToggle) {
    return;
  }

  elements.aside.classList.toggle("creative-aside--open", state.asideOpen);
  elements.aside.setAttribute("aria-hidden", String(!state.asideOpen));
  elements.asideToggle.setAttribute("aria-expanded", String(state.asideOpen));
  elements.asideNav?.classList.toggle("header__nav--hidden", state.asideOpen);
};

const setAsideOpen = (nextValue) => {
  state.asideOpen = Boolean(nextValue);
  syncAsideState();
};

const promptStoryTitle = async (currentValue = "") => {
  const value = await showPrompt({
    title: "Nuevo lienzo",
    inputLabel: "Titulo del lienzo",
    inputValue: currentValue || DEFAULT_TITLE,
  });
  return value ? value.trim() : "";
};

const loadStories = async () => {
  const { ok, data } = await fetchJson("/api/v1/stories", { auth: true });
  if (!ok) {
    showToast(data.Mensaje || "No fue posible cargar los relatos");
    return [];
  }

  const stories = Array.isArray(data.relatos)
    ? data.relatos.filter((story) => story.modoOrigen === STORY_MODE)
    : [];

  return sortStoriesByRecency(stories);
};

const createStory = async () => {
  const title = await promptStoryTitle();
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
  const nextTitle = await promptStoryTitle(story.titulo);
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
  const confirmed = await showConfirm({
    title: "Eliminar lienzo",
    text: `¿Eliminar "${story.titulo || "este lienzo"}"?`,
  });
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

const updateSummary = (stories) => {
  const count = stories.length;
  const latest = stories[0] || null;

  if (elements.storyCount) {
    elements.storyCount.textContent = String(count);
  }

  if (elements.lastUpdate) {
    elements.lastUpdate.textContent = latest
      ? formatDate(latest.fechaModificacion || latest.fechaCreacion) || "Hoy"
      : "Sin actividad";
  }

  if (elements.summaryTitle) {
    elements.summaryTitle.textContent = latest
      ? latest.titulo || DEFAULT_TITLE
      : "Crea tu primer lienzo";
  }

  if (elements.summaryText) {
    elements.summaryText.textContent = latest
      ? buildStoryExcerpt(latest.descripcion)
      : "Empieza un borrador manual y vuelve a el cuando quieras.";
  }

  if (elements.openLatest) {
    elements.openLatest.disabled = !latest;
  }
};

const buildStoryCard = (story) => {
  const card = document.createElement("article");
  card.className = "creative-aside__chat";
  card.innerHTML = `
    <div class="creative-story-card__content">
      <button type="button" class="creative-aside__chat-title creative-story-card__open">${story.titulo || "Sin titulo"}</button>
      <p class="creative-story-card__excerpt">${buildStoryExcerpt(story.descripcion)}</p>
    </div>
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
  updateSummary(stories);

  if (!stories.length) {
    const empty = document.createElement("p");
    empty.className = "creative-aside__chat-title";
    empty.textContent = "Todavia no tienes lienzos manuales.";
    elements.list.appendChild(empty);
    return stories;
  }

  stories.forEach((story) => {
    elements.list.appendChild(buildStoryCard(story));
  });

  return stories;
};

document.addEventListener("DOMContentLoaded", async () => {
  elements.asideToggle?.addEventListener("click", () => {
    userMenu.close();
    setAsideOpen(!state.asideOpen);
  });

  elements.asideClose?.addEventListener("click", () => {
    setAsideOpen(false);
  });

  elements.newMain?.addEventListener("click", createStory);
  elements.newAside?.addEventListener("click", createStory);
  elements.openLatest?.addEventListener("click", async () => {
    const stories = await loadStories();
    if (!stories[0]) {
      showToast("Primero crea un lienzo");
      return;
    }

    goToCanvas(stories[0].id);
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (!elements.aside?.contains(target) && !elements.asideToggle?.contains(target)) {
      setAsideOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && userMenu.isOpen()) {
      userMenu.close();
    }
  });

  await userMenu.init();
  await renderStories();
});
