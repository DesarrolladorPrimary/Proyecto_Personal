import { fetchJson } from "../../utils/api-client.js";
import { getCurrentUserId } from "../../utils/auth-session.js";
import { showConfirm, showPrompt } from "../../utils/dialog-service.js";
import { createCreativeUserMenu } from "./creative-user-menu.js";

const STORY_MODE = "Seccion_Creativa";
const STORY_QUERY_KEY = "creativeStoryId";
const DEFAULT_TITLE = "Mi historia creativa";
const DEFAULT_TOOL_STATUS = "Selecciona texto o usa las ayudas para seguir escribiendo.";
const TITLE_MAX_LENGTH = 255;
const BODY_MAX_LENGTH = 20000;
const SHELF_NAME_MAX_LENGTH = 150;
const AUTOSAVE_DELAY_MS = 1400;
const HISTORY_LIMIT = 100;

const elements = {
  aside: document.getElementById("sidebar"),
  asideNav: document.querySelector(".header__nav"),
  asideToggle: document.getElementById("creative-aside-toggle"),
  asideClose: document.getElementById("creative-aside-close"),
  title: document.getElementById("creative-canvas-title"),
  counter: document.getElementById("creative-canvas-counter"),
  body: document.getElementById("creative-canvas-body"),
  saveButton: document.getElementById("creative-save-draft"),
  saveState: document.getElementById("creative-save-state"),
  exportForm: document.getElementById("creative-export-form"),
  exportModal: document.getElementById("canvasBookModal"),
  exportModalOverlay: document.querySelector(".canvas-book-modal__overlay"),
  exportModalClose: document.getElementById("canvas-book-modal-close"),
  exportTitle: document.getElementById("canvas-book-title"),
  exportShelf: document.getElementById("canvas-book-shelf"),
  exportShelfHint: document.getElementById("canvas-book-shelf-hint"),
  exportCreateShelf: document.getElementById("canvas-book-create-shelf"),
  exportSubmit: document.getElementById("canvas-book-submit"),
  openLibraryButton: document.getElementById("creative-open-library"),
  successModal: document.getElementById("canvasBookSuccess"),
  successModalOverlay: document.querySelector(".canvas-book-success__overlay"),
  successModalClose: document.getElementById("canvas-book-success-close"),
  successLibraryLink: document.getElementById("canvas-book-library-link"),
  newButton: document.getElementById("creative-canvas-new"),
  storyList: document.getElementById("creative-canvas-story-list"),
  toolPanel: document.getElementById("herramientas"),
  toolToggle: document.getElementById("creative-tools-toggle"),
  toolClose: document.getElementById("creative-tools-close"),
  toolButtons: Array.from(document.querySelectorAll(".canvas-main__marker")),
  toolStatus: document.getElementById("creative-tool-status"),
};

const state = {
  storyId: null,
  stories: [],
  shelves: [],
  userId: getCurrentUserId(),
  asideOpen: false,
  exportModalOpen: false,
  successModalOpen: false,
  assistantBusy: false,
  isDirty: false,
  isSaving: false,
  saveQueued: false,
  autosaveTimer: null,
  history: [],
  historyIndex: -1,
  applyingHistory: false,
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

const clampText = (value, maxLength) => String(value || "").slice(0, maxLength);

const normalizeTitle = (value) =>
  clampText(String(value || "").replace(/\s+/g, " ").trim(), TITLE_MAX_LENGTH) || DEFAULT_TITLE;

const buildStoryExcerpt = (value, maxLength = 88) => {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Sin texto todavia.";
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
};

const getCurrentTimestamp = () => new Date().toISOString();

const getStoryTimestamp = (story) => {
  const rawValue = story?.fechaModificacion || story?.fechaCreacion || 0;
  const parsed = new Date(rawValue).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortStoriesByRecency = (stories) =>
  [...stories].sort((left, right) => getStoryTimestamp(right) - getStoryTimestamp(left));

const getStoryFromState = (storyId) => state.stories.find((story) => story.id === storyId) || null;
const getShelfById = (shelfId) =>
  state.shelves.find((shelf) => String(shelf.id) === String(shelfId)) || null;

const buildLibraryUrl = (shelfId) => {
  const basePath = "../biblioteca/library.html";
  const shelf = getShelfById(shelfId);

  if (!shelf) {
    return basePath;
  }

  const params = new URLSearchParams({
    shelfId: String(shelf.id),
    shelfName: shelf.nombre,
  });
  return `${basePath}?${params.toString()}`;
};

const setToolStatus = (text) => {
  if (elements.toolStatus) {
    elements.toolStatus.textContent = text;
  }
};

const syncLibraryLink = (shelfId = "") => {
  if (!elements.successLibraryLink) {
    return;
  }

  elements.successLibraryLink.href = buildLibraryUrl(shelfId);
};

const syncAsideState = () => {
  if (!elements.aside || !elements.asideToggle) {
    return;
  }

  elements.aside.classList.toggle("canvas-sidebar--open", state.asideOpen);
  elements.aside.setAttribute("aria-hidden", String(!state.asideOpen));
  elements.asideToggle.setAttribute("aria-expanded", String(state.asideOpen));
  elements.asideNav?.classList.toggle("header__nav--hidden", state.asideOpen);
};

const setAsideOpen = (nextValue) => {
  state.asideOpen = Boolean(nextValue);
  syncAsideState();
};

const syncExportModalState = () => {
  if (!elements.exportModal) {
    return;
  }

  elements.exportModal.classList.toggle("canvas-book-modal--open", state.exportModalOpen);
  elements.exportModal.setAttribute("aria-hidden", String(!state.exportModalOpen));
};

const setExportModalOpen = (nextValue) => {
  state.exportModalOpen = Boolean(nextValue);
  syncExportModalState();
};

const syncSuccessModalState = () => {
  if (!elements.successModal) {
    return;
  }

  elements.successModal.classList.toggle("canvas-book-success--open", state.successModalOpen);
  elements.successModal.setAttribute("aria-hidden", String(!state.successModalOpen));
};

const setSuccessModalOpen = (nextValue) => {
  state.successModalOpen = Boolean(nextValue);
  syncSuccessModalState();
};

const isToolPanelOpen = () => elements.toolPanel?.classList.contains("canvas-main__markers--open");

const closeToolPanel = () => {
  if (!elements.toolPanel) {
    return;
  }

  elements.toolPanel.classList.remove("canvas-main__markers--open");
  elements.toolPanel.setAttribute("aria-hidden", "true");
  elements.toolToggle?.setAttribute("aria-expanded", "false");
};

const openToolPanel = () => {
  if (!elements.toolPanel) {
    return;
  }

  elements.toolPanel.classList.add("canvas-main__markers--open");
  elements.toolPanel.setAttribute("aria-hidden", "false");
  elements.toolToggle?.setAttribute("aria-expanded", "true");
};

const toggleToolPanel = () => {
  if (isToolPanelOpen()) {
    closeToolPanel();
    return;
  }

  openToolPanel();
};

const setSaveState = (text, tone = "neutral") => {
  if (!elements.saveState) {
    return;
  }

  elements.saveState.textContent = text;
  elements.saveState.className = `canvas-main__save-state canvas-main__save-state--${tone}`;
};

const getWordCount = (text) =>
  text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;

const updateCounter = () => {
  const words = getWordCount(elements.body?.value || "");
  if (elements.counter) {
    elements.counter.textContent = `${words} palabras`;
  }
};

const focusBody = () => {
  elements.body?.focus();
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

const renderExportShelfOptions = (preferredShelfId = null) => {
  if (!elements.exportShelf) {
    return;
  }

  const preferredValue = preferredShelfId != null ? String(preferredShelfId) : String(elements.exportShelf.value || "");
  const hasShelves = state.shelves.length > 0;

  elements.exportShelf.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = hasShelves
    ? "Selecciona una estanteria"
    : "No tienes estanterias creadas";
  elements.exportShelf.appendChild(placeholder);

  state.shelves.forEach((shelf) => {
    const option = document.createElement("option");
    option.value = String(shelf.id);
    option.textContent = shelf.nombre;
    elements.exportShelf.appendChild(option);
  });

  const preferredShelf = getShelfById(preferredValue);
  elements.exportShelf.value = preferredShelf ? String(preferredShelf.id) : "";
  elements.exportShelf.disabled = !hasShelves;

  const selectedShelf = getShelfById(elements.exportShelf.value);
  if (elements.exportSubmit) {
    elements.exportSubmit.disabled = !selectedShelf || state.isSaving;
  }

  if (elements.exportShelfHint) {
    if (!hasShelves) {
      elements.exportShelfHint.textContent =
        "No tienes estanterias creadas. Crea una ahora para poder guardar este borrador en biblioteca.";
    } else if (!selectedShelf) {
      elements.exportShelfHint.textContent =
        "Selecciona una estanteria existente para continuar.";
    } else {
      elements.exportShelfHint.textContent =
        `Este borrador se guardara en la estanteria ${selectedShelf.nombre}.`;
    }
  }
};

const loadShelves = async (preferredShelfId = null) => {
  if (!state.userId) {
    state.shelves = [];
    renderExportShelfOptions(preferredShelfId);
    return;
  }

  const { ok, status, data } = await fetchJson("/api/v1/estanterias", {
    params: { id: state.userId },
    auth: true,
  });

  if (!ok) {
    state.shelves = [];
    renderExportShelfOptions(preferredShelfId);
    if (status !== 401) {
      showToast(data.Mensaje || "No fue posible cargar las estanterias");
    }
    return;
  }

  state.shelves = Array.isArray(data)
    ? data.filter((item) => item && typeof item === "object" && item.id)
    : [];
  renderExportShelfOptions(preferredShelfId);
};

const createShelfFromExportFlow = async () => {
  if (!state.userId) {
    return null;
  }

  const suggestedName = clampText(
    elements.exportTitle?.value.trim() || elements.title?.textContent?.trim() || "",
    SHELF_NAME_MAX_LENGTH,
  );
  const shelfName = (await showPrompt({
    title: "Nueva estanteria",
    inputLabel: "Nombre de la estanteria",
    inputValue: suggestedName,
    inputPlaceholder: "Mi estanteria",
    inputAttributes: {
      maxlength: String(SHELF_NAME_MAX_LENGTH),
    },
  }))?.trim();

  if (!shelfName) {
    return null;
  }

  const { ok, data } = await fetchJson("/api/v1/estanterias", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      usuarioId: state.userId,
      nombre: shelfName,
    }),
  });

  if (!ok) {
    showToast(data.Mensaje || "No fue posible crear la estanteria");
    return null;
  }

  const createdShelfId = Number(data.id || 0);

  if (createdShelfId > 0) {
    state.shelves = [
      ...state.shelves.filter((shelf) => Number(shelf.id) !== createdShelfId),
      { id: createdShelfId, nombre: shelfName },
    ];
    renderExportShelfOptions(createdShelfId);
  } else {
    await loadShelves();
    const createdShelf = state.shelves.find((shelf) => shelf.nombre === shelfName);
    renderExportShelfOptions(createdShelf?.id ?? null);
  }

  showToast(data.Mensaje || "Estanteria creada", "green");
  elements.exportShelf?.focus();
  return createdShelfId || null;
};

const syncBodyState = () => {
  updateCounter();
  elements.body?.dispatchEvent(new Event("input", { bubbles: true }));
};

const getSelectionInfo = () => {
  const textarea = elements.body;
  const value = textarea?.value || "";
  const start = textarea?.selectionStart ?? 0;
  const end = textarea?.selectionEnd ?? 0;

  return {
    value,
    start,
    end,
    selectedText: value.slice(start, end),
    hasSelection: end > start,
  };
};

const setSelection = (start, end = start) => {
  elements.body?.setSelectionRange(start, end);
  focusBody();
};

const replaceRange = (start, end, text, selectionMode = "end") => {
  if (!elements.body) {
    return;
  }

  elements.body.setRangeText(text, start, end, selectionMode);
  syncBodyState();
  focusBody();
};

const replaceCurrentSelection = (text, selectionMode = "end") => {
  const { start, end } = getSelectionInfo();
  replaceRange(start, end, text, selectionMode);
};

const getExpandedLineRange = () => {
  const { value, start, end } = getSelectionInfo();
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const lineEndIndex = value.indexOf("\n", end);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;

  return {
    start: lineStart,
    end: lineEnd,
    text: value.slice(lineStart, lineEnd),
  };
};

const transformSelectedLines = (transformer) => {
  const { start, end, text } = getExpandedLineRange();
  const lines = text.split("\n");
  const nextText = transformer(lines).join("\n");
  replaceRange(start, end, nextText, "select");
};

const toggleInlineWrap = (token) => {
  const { selectedText, start } = getSelectionInfo();

  if (!selectedText) {
    replaceCurrentSelection(`${token}${token}`, "end");
    setSelection(start + token.length, start + token.length);
    return;
  }

  if (selectedText.startsWith(token) && selectedText.endsWith(token)) {
    replaceCurrentSelection(selectedText.slice(token.length, selectedText.length - token.length), "select");
    return;
  }

  replaceCurrentSelection(`${token}${selectedText}${token}`, "select");
};

const insertAtCursor = (text) => {
  replaceCurrentSelection(text, "end");
};

const toggleList = () => {
  transformSelectedLines((lines) => {
    const normalized = lines.filter((line) => line.trim());

    if (normalized.length && normalized.every((line) => /^\d+\.\s/.test(line))) {
      return lines.map((line) => line.replace(/^\d+\.\s/, ""));
    }

    if (normalized.length && normalized.every((line) => line.startsWith("- "))) {
      let index = 1;
      return lines.map((line) => {
        if (!line.trim()) {
          return line;
        }

        const cleaned = line.replace(/^- /, "");
        const numbered = `${index}. ${cleaned}`;
        index += 1;
        return numbered;
      });
    }

    return lines.map((line) => (line.trim() ? `- ${line.replace(/^\d+\.\s/, "").replace(/^- /, "")}` : line));
  });
};

const toggleQuote = () => {
  transformSelectedLines((lines) => {
    const normalized = lines.filter((line) => line.trim());
    const allQuoted = normalized.length && normalized.every((line) => line.startsWith("> "));

    return lines.map((line) => {
      if (!line.trim()) {
        return line;
      }

      return allQuoted ? line.replace(/^>\s/, "") : `> ${line}`;
    });
  });
};

const cycleHeading = () => {
  transformSelectedLines((lines) =>
    lines.map((line) => {
      if (!line.trim()) {
        return line;
      }

      if (line.startsWith("## ")) {
        return line.slice(3);
      }

      if (line.startsWith("# ")) {
        return `## ${line.slice(2)}`;
      }

      return `# ${line}`;
    }),
  );
};

const createSnapshot = () => ({
  title: normalizeTitle(elements.title?.textContent || DEFAULT_TITLE),
  body: clampText(elements.body?.value || "", BODY_MAX_LENGTH),
  selectionStart: elements.body?.selectionStart ?? 0,
  selectionEnd: elements.body?.selectionEnd ?? 0,
});

const snapshotsEqual = (left, right) =>
  left?.title === right?.title &&
  left?.body === right?.body &&
  left?.selectionStart === right?.selectionStart &&
  left?.selectionEnd === right?.selectionEnd;

const contentMatchesSnapshot = (snapshot) =>
  snapshot?.title === normalizeTitle(elements.title?.textContent || DEFAULT_TITLE) &&
  snapshot?.body === clampText(elements.body?.value || "", BODY_MAX_LENGTH);

const recordHistorySnapshot = () => {
  if (state.applyingHistory) {
    return;
  }

  const nextSnapshot = createSnapshot();
  const currentSnapshot = state.history[state.historyIndex];

  if (snapshotsEqual(currentSnapshot, nextSnapshot)) {
    return;
  }

  if (state.historyIndex < state.history.length - 1) {
    state.history = state.history.slice(0, state.historyIndex + 1);
  }

  state.history.push(nextSnapshot);
  if (state.history.length > HISTORY_LIMIT) {
    state.history.shift();
  }
  state.historyIndex = state.history.length - 1;
};

const resetHistory = () => {
  state.history = [];
  state.historyIndex = -1;
  recordHistorySnapshot();
};

const applySnapshot = (snapshot) => {
  if (!snapshot) {
    return;
  }

  state.applyingHistory = true;
  elements.title.textContent = snapshot.title;
  elements.exportTitle.value = snapshot.title;
  elements.body.value = snapshot.body;
  updateCounter();
  state.applyingHistory = false;
  setSelection(snapshot.selectionStart, snapshot.selectionEnd);
};

const queueAutosave = () => {
  if (!state.storyId) {
    return;
  }

  window.clearTimeout(state.autosaveTimer);
  state.autosaveTimer = window.setTimeout(() => {
    if (state.isSaving) {
      state.saveQueued = true;
      return;
    }

    void persistStory({ silent: true });
  }, AUTOSAVE_DELAY_MS);
};

const flagUnsavedChanges = () => {
  if (!state.storyId || state.applyingHistory) {
    return;
  }

  state.isDirty = true;
  setSaveState("Cambios sin guardar", "dirty");
  queueAutosave();
};

const setAssistantBusy = (busy, label = "") => {
  state.assistantBusy = busy;
  elements.toolButtons.forEach((button) => {
    button.disabled = busy;
    button.classList.toggle("canvas-main__marker--busy", busy);
  });

  if (busy && label) {
    setToolStatus(label);
  } else if (!busy) {
    setToolStatus(DEFAULT_TOOL_STATUS);
  }

  if (busy) {
    closeToolPanel();
  }
};

const requestAiTool = async (mensaje, instrucciones, loadingText) => {
  setAssistantBusy(true, loadingText);

  try {
    const { ok, data } = await fetchJson("/api/v1/generar-historias", {
      method: "POST",
      auth: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mensaje,
        instrucciones,
      }),
    });

    if (!ok || !data?.AI) {
      showToast(data?.Mensaje || "No fue posible obtener ayuda de la IA");
      return null;
    }

    return String(data.AI).trim();
  } catch (error) {
    showToast("Error de conexion al consultar la IA");
    return null;
  } finally {
    setAssistantBusy(false);
  }
};

const runCorrector = async () => {
  const { selectedText, value, hasSelection } = getSelectionInfo();
  const source = (hasSelection ? selectedText : value).trim();

  if (!source) {
    showToast("Escribe o selecciona texto para corregir");
    return;
  }

  const result = await requestAiTool(
    `Corrige este texto:\n\n${source}`,
    "Corrige ortografia, gramatica y puntuacion. Conserva el idioma, la intencion y el sentido. Devuelve solo el texto corregido, sin comentarios ni titulos.",
    "Corrigiendo texto...",
  );

  if (!result) {
    return;
  }

  if (hasSelection) {
    replaceCurrentSelection(result, "select");
  } else {
    elements.body.value = result;
    syncBodyState();
  }

  showToast("Texto corregido", "green");
};

const runStyleImprover = async () => {
  const { selectedText, value, hasSelection } = getSelectionInfo();
  const source = (hasSelection ? selectedText : value).trim();

  if (!source) {
    showToast("Escribe o selecciona texto para mejorar");
    return;
  }

  const result = await requestAiTool(
    `Mejora el estilo del siguiente fragmento:\n\n${source}`,
    "Mejora el estilo narrativo del texto, haciendolo mas claro, fluido y literario. Conserva la idea original. Devuelve solo el texto mejorado, sin explicaciones.",
    "Mejorando estilo...",
  );

  if (!result) {
    return;
  }

  if (hasSelection) {
    replaceCurrentSelection(result, "select");
  } else {
    elements.body.value = result;
    syncBodyState();
  }

  showToast("Estilo mejorado", "green");
};

const runContinueAssistant = async () => {
  const { value, start } = getSelectionInfo();
  const title = normalizeTitle(elements.title?.textContent?.trim() || DEFAULT_TITLE);
  const context = value.slice(Math.max(0, start - 1800), start).trim();

  const prompt = context
    ? `Titulo: ${title}\n\nContinua este relato a partir de este contexto:\n${context}`
    : `Titulo: ${title}\n\nEscribe un primer parrafo atractivo para comenzar este relato.`;

  const result = await requestAiTool(
    prompt,
    "Redacta un unico fragmento nuevo en espanol, coherente con el contexto dado. No expliques lo que haces, no uses titulos y no repitas literalmente el texto previo.",
    "Pidiendo continuacion...",
  );

  if (!result) {
    return;
  }

  const prefix = value.trim() ? "\n\n" : "";
  insertAtCursor(`${prefix}${result}`);
  showToast("Continuacion anadida", "green");
};

const stepHistory = (direction) => {
  const nextIndex = state.historyIndex + direction;
  if (nextIndex < 0 || nextIndex >= state.history.length) {
    return;
  }

  state.historyIndex = nextIndex;
  applySnapshot(state.history[state.historyIndex]);
  flagUnsavedChanges();
};

const handleToolAction = async (action) => {
  if (!elements.body) {
    return;
  }

  switch (action) {
    case "undo":
      stepHistory(-1);
      break;
    case "redo":
      stepHistory(1);
      break;
    case "heading":
      cycleHeading();
      break;
    case "bold":
      toggleInlineWrap("**");
      break;
    case "italic":
      toggleInlineWrap("*");
      break;
    case "underline":
      toggleInlineWrap("__");
      break;
    case "list":
      toggleList();
      break;
    case "quote":
      toggleQuote();
      break;
    case "separator":
      insertAtCursor("\n---\n");
      break;
    case "emdash":
      insertAtCursor(" -- ");
      break;
    case "scene":
      insertAtCursor("\n* * *\n");
      break;
    case "correct":
      await runCorrector();
      break;
    case "style":
      await runStyleImprover();
      break;
    case "continue":
      await runContinueAssistant();
      break;
    default:
      break;
  }
};

const loadStories = async () => {
  const { ok, data } = await fetchJson("/api/v1/stories", { auth: true });
  if (!ok) {
    showToast(data.Mensaje || "No fue posible cargar los lienzos");
    return [];
  }

  const stories = Array.isArray(data.relatos)
    ? data.relatos.filter((story) => story.modoOrigen === STORY_MODE)
    : [];

  return sortStoriesByRecency(stories);
};

const buildStoryPayload = (story = getStoryFromState(state.storyId), overrides = {}) => {
  const isCurrentStory = story?.id === state.storyId;

  return {
    titulo: overrides.titulo ?? (isCurrentStory ? normalizeTitle(elements.title?.textContent) : normalizeTitle(story?.titulo)),
    modoOrigen: STORY_MODE,
    descripcion: overrides.descripcion ?? (isCurrentStory ? clampText(elements.body?.value || "", BODY_MAX_LENGTH) : story?.descripcion ?? ""),
    estanteriaId: overrides.estanteriaId ?? story?.estanteriaId ?? null,
    modeloUsadoId: overrides.modeloUsadoId ?? story?.modeloUsadoId ?? null,
  };
};

const upsertStoryInState = (storyPatch) => {
  const nextStories = state.stories.filter((story) => story.id !== storyPatch.id);
  nextStories.push(storyPatch);
  state.stories = sortStoriesByRecency(nextStories);
};

const selectStory = async (storyId, { skipGuard = false } = {}) => {
  if (!storyId) {
    return false;
  }

  if (state.storyId === storyId) {
    return true;
  }

  if (!skipGuard) {
    const canContinue = await ensureStoryTransition("abrir otro lienzo");
    if (!canContinue) {
      return false;
    }
  }

  const { ok, data } = await fetchJson(`/api/v1/stories/${storyId}`, { auth: true });
  if (!ok || !data.relato) {
    showToast(data.Mensaje || "No fue posible cargar el lienzo");
    return false;
  }

  const story = data.relato;
  state.storyId = story.id;
  setAsideOpen(false);
  replaceStoryInUrl(story.id);
  elements.title.textContent = normalizeTitle(story.titulo);
  elements.exportTitle.value = normalizeTitle(story.titulo);
  elements.body.value = clampText(story.descripcion || "", BODY_MAX_LENGTH);
  updateCounter();
  setToolStatus(DEFAULT_TOOL_STATUS);
  state.isDirty = false;
  setSaveState("Todo guardado", "saved");
  upsertStoryInState({
    ...getStoryFromState(story.id),
    ...story,
  });
  resetHistory();
  renderStoryList();
  return true;
};

const persistStory = async ({ silent = false, overrides = {} } = {}) => {
  if (!state.storyId) {
    if (!silent) {
      showToast("Primero crea o selecciona un lienzo");
    }
    return false;
  }

  if (state.isSaving) {
    state.saveQueued = true;
    return false;
  }

  if (silent && !state.isDirty) {
    return true;
  }

  if (!silent && !state.isDirty) {
    setSaveState("Todo guardado", "saved");
    showToast("No hay cambios pendientes por guardar", "green");
    return true;
  }

  const payload = buildStoryPayload(undefined, overrides);
  const snapshotAtSaveStart = createSnapshot();
  let saveCompleted = false;
  let changedDuringSave = false;

  window.clearTimeout(state.autosaveTimer);
  state.autosaveTimer = null;
  state.saveQueued = false;
  state.isSaving = true;
  elements.saveButton.disabled = true;
  if (elements.openLibraryButton) {
    elements.openLibraryButton.disabled = true;
  }
  if (elements.exportSubmit) {
    elements.exportSubmit.disabled = true;
  }
  setSaveState("Guardando...", "saving");

  try {
    const { ok, data } = await fetchJson(`/api/v1/stories/${state.storyId}`, {
      method: "PUT",
      auth: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!ok) {
      setSaveState("No se pudo guardar", "error");
      if (!silent) {
        showToast(data.Mensaje || "No fue posible guardar el borrador");
      }
      state.isDirty = true;
      return false;
    }

    const currentStory = getStoryFromState(state.storyId);
    const now = getCurrentTimestamp();
    upsertStoryInState({
      ...currentStory,
      ...payload,
      id: state.storyId,
      usuarioId: currentStory?.usuarioId,
      fechaCreacion: currentStory?.fechaCreacion || now,
      fechaModificacion: now,
    });

    changedDuringSave = !contentMatchesSnapshot(snapshotAtSaveStart);
    state.isDirty = changedDuringSave;
    elements.exportTitle.value = payload.titulo;
    renderStoryList();
    saveCompleted = true;

    if (changedDuringSave) {
      setSaveState("Cambios sin guardar", "dirty");
      return true;
    }

    setSaveState(data.version ? `Guardado · v${data.version}` : "Todo guardado", "saved");
    if (!silent) {
      showToast(
        data.version
          ? `${data.Mensaje || "Borrador guardado"} · Version ${data.version}`
          : data.Mensaje || "Borrador guardado",
        "green",
      );
    }

    return true;
  } finally {
    state.isSaving = false;
    elements.saveButton.disabled = false;
    if (elements.openLibraryButton) {
      elements.openLibraryButton.disabled = false;
    }
    renderExportShelfOptions(payload.estanteriaId ?? null);

    if (state.saveQueued || (saveCompleted && changedDuringSave && state.isDirty)) {
      queueAutosave();
    }
  }
};

const ensureStoryTransition = async (actionLabel) => {
  if (!state.isDirty) {
    return true;
  }

  const saved = await persistStory({ silent: true });
  if (saved && !state.isDirty) {
    return true;
  }

  return showConfirm({
    title: "Hay cambios sin guardar",
    text: `No se pudieron guardar automaticamente. ¿Quieres ${actionLabel} y descartar los cambios pendientes?`,
  });
};

const createStory = async ({ skipGuard = false } = {}) => {
  if (!skipGuard) {
    const canContinue = await ensureStoryTransition("crear un lienzo nuevo");
    if (!canContinue) {
      return;
    }
  }

  const { ok, data } = await fetchJson("/api/v1/stories", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titulo: DEFAULT_TITLE,
      modoOrigen: STORY_MODE,
      descripcion: "",
    }),
  });

  if (!ok || !data.id) {
    showToast(data.Mensaje || "No fue posible crear el lienzo");
    return;
  }

  state.stories = await loadStories();
  renderStoryList();
  await selectStory(data.id, { skipGuard: true });
  setAsideOpen(false);
  showToast(data.Mensaje || "Lienzo creado", "green");
};

const renameStory = async (story) => {
  const nextTitle = (await showPrompt({
    title: "Renombrar lienzo",
    inputLabel: "Nuevo titulo",
    inputValue: story.titulo || DEFAULT_TITLE,
  }))?.trim();

  if (!nextTitle || nextTitle === story.titulo) {
    return;
  }

  const payload = buildStoryPayload(story, { titulo: normalizeTitle(nextTitle) });
  const { ok, data } = await fetchJson(`/api/v1/stories/${story.id}`, {
    method: "PUT",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!ok) {
    showToast(data.Mensaje || "No fue posible renombrar");
    return;
  }

  const currentStory = getStoryFromState(story.id);
  upsertStoryInState({
    ...currentStory,
    ...payload,
    id: story.id,
    usuarioId: currentStory?.usuarioId,
    fechaCreacion: currentStory?.fechaCreacion || story.fechaCreacion || getCurrentTimestamp(),
    fechaModificacion: getCurrentTimestamp(),
  });
  renderStoryList();

  if (state.storyId === story.id) {
    elements.title.textContent = payload.titulo;
    elements.exportTitle.value = payload.titulo;
    state.isDirty = false;
    setSaveState("Todo guardado", "saved");
    resetHistory();
  }

  showToast(data.Mensaje || "Lienzo renombrado", "green");
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

  state.stories = state.stories.filter((entry) => entry.id !== story.id);
  renderStoryList();
  showToast(data.Mensaje || "Lienzo eliminado", "green");

  if (state.storyId !== story.id) {
    return;
  }

  const nextStory = state.stories[0];
  if (nextStory) {
    await selectStory(nextStory.id, { skipGuard: true });
    return;
  }

  state.storyId = null;
  elements.title.textContent = DEFAULT_TITLE;
  elements.exportTitle.value = DEFAULT_TITLE;
  elements.body.value = "";
  replaceStoryInUrl("new");
  updateCounter();
  state.isDirty = false;
  setSaveState("Sin cambios", "neutral");
  setToolStatus(DEFAULT_TOOL_STATUS);
  resetHistory();
};

const buildStoryItem = (story) => {
  const item = document.createElement("article");
  const isActive = story.id === state.storyId;
  item.className = `canvas-sidebar__item${isActive ? " canvas-sidebar__item--active" : ""}`;
  item.setAttribute("aria-current", isActive ? "true" : "false");

  const statusLabel = isActive && state.isDirty
    ? "Sin guardar"
    : formatDate(story.fechaModificacion || story.fechaCreacion);

  item.innerHTML = `
    <div class="creative-canvas__content">
      <button type="button" class="canvas-sidebar__item-title creative-canvas__open">${story.titulo || DEFAULT_TITLE}</button>
      <p class="creative-canvas__excerpt">${buildStoryExcerpt(story.descripcion)}</p>
    </div>
    <div class="creative-canvas__actions">
      <span class="creative-canvas__date">${statusLabel}</span>
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
  if (!elements.storyList) {
    return;
  }

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

const openLibraryModal = async () => {
  const content = clampText(elements.body?.value.trim() || "", BODY_MAX_LENGTH);
  if (!content) {
    showToast("Escribe algo antes de enviarlo a biblioteca");
    return;
  }

  if (state.isDirty && !(await persistStory({ silent: true }))) {
    showToast("Primero guarda el borrador para abrir la biblioteca");
    return;
  }

  elements.exportTitle.value = normalizeTitle(elements.title?.textContent || DEFAULT_TITLE);
  const activeStory = getStoryFromState(state.storyId);
  await loadShelves(activeStory?.estanteriaId ?? null);
  syncLibraryLink(activeStory?.estanteriaId ?? "");
  userMenu.close();
  closeToolPanel();
  setAsideOpen(false);
  setSuccessModalOpen(false);
  setExportModalOpen(true);
};

const exportStory = async (event) => {
  event.preventDefault();

  const title = normalizeTitle(elements.exportTitle.value.trim() || elements.title.textContent?.trim() || DEFAULT_TITLE);
  const content = clampText(elements.body.value.trim(), BODY_MAX_LENGTH);
  const selectedShelfId = Number(elements.exportShelf?.value || 0);
  const selectedShelf = getShelfById(selectedShelfId);

  if (!content) {
    showToast("Todavia no hay contenido para guardar en biblioteca");
    return;
  }

  if (!selectedShelfId || !selectedShelf) {
    showToast("Debes seleccionar una estanteria existente antes de guardar este borrador");
    elements.exportShelf?.focus();
    renderExportShelfOptions();
    return;
  }

  elements.title.textContent = title;
  elements.exportTitle.value = title;
  recordHistorySnapshot();
  flagUnsavedChanges();

  if (!(await persistStory({ overrides: { titulo: title, estanteriaId: selectedShelfId } }))) {
    return;
  }

  showToast("Borrador listo en biblioteca", "green");
  syncLibraryLink(selectedShelfId);
  setExportModalOpen(false);
  setSuccessModalOpen(true);
};

document.addEventListener("DOMContentLoaded", async () => {
  elements.body?.setAttribute("maxlength", String(BODY_MAX_LENGTH));
  elements.exportTitle?.setAttribute("maxlength", String(TITLE_MAX_LENGTH));
  setToolStatus(DEFAULT_TOOL_STATUS);
  setSaveState("Sin cambios", "neutral");
  renderExportShelfOptions();
  syncLibraryLink();

  elements.body?.addEventListener("input", () => {
    if (elements.body.value.length > BODY_MAX_LENGTH) {
      elements.body.value = clampText(elements.body.value, BODY_MAX_LENGTH);
    }
    updateCounter();
    recordHistorySnapshot();
    flagUnsavedChanges();
  });

  elements.title?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  });

  elements.title?.addEventListener("paste", (event) => {
    event.preventDefault();
    const pasted = normalizeTitle(event.clipboardData?.getData("text") || "");
    if (!document.execCommand?.("insertText", false, pasted)) {
      elements.title.textContent = normalizeTitle(`${elements.title.textContent || ""} ${pasted}`);
    }
  });

  elements.title?.addEventListener("input", () => {
    const nextTitle = normalizeTitle(elements.title.textContent || DEFAULT_TITLE);
    if (elements.title.textContent !== nextTitle) {
      elements.title.textContent = nextTitle;
      const selection = window.getSelection();
      selection?.selectAllChildren(elements.title);
      selection?.collapseToEnd();
    }
    elements.exportTitle.value = nextTitle;
    recordHistorySnapshot();
    flagUnsavedChanges();
    renderStoryList();
  });

  elements.saveButton?.addEventListener("click", async () => {
    await persistStory();
  });

  elements.exportForm?.addEventListener("submit", exportStory);
  elements.exportShelf?.addEventListener("change", () => {
    renderExportShelfOptions(elements.exportShelf?.value || null);
  });
  elements.exportCreateShelf?.addEventListener("click", async () => {
    await createShelfFromExportFlow();
  });
  elements.exportModalClose?.addEventListener("click", () => {
    setExportModalOpen(false);
  });
  elements.exportModalOverlay?.addEventListener("click", () => {
    setExportModalOpen(false);
  });
  elements.openLibraryButton?.addEventListener("click", async () => {
    await openLibraryModal();
  });
  elements.successModalClose?.addEventListener("click", () => {
    setSuccessModalOpen(false);
  });
  elements.successModalOverlay?.addEventListener("click", () => {
    setSuccessModalOpen(false);
  });
  elements.newButton?.addEventListener("click", async () => {
    await createStory();
  });
  elements.asideToggle?.addEventListener("click", () => {
    userMenu.close();
    closeToolPanel();
    setAsideOpen(!state.asideOpen);
  });
  elements.asideClose?.addEventListener("click", () => {
    setAsideOpen(false);
  });
  elements.toolButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      await handleToolAction(button.dataset.tool || "");
      closeToolPanel();
    });
  });

  elements.toolToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleToolPanel();
  });

  elements.toolClose?.addEventListener("click", () => {
    closeToolPanel();
  });

  elements.toolPanel?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("keydown", async (event) => {
    if (event.key === "Escape") {
      if (isToolPanelOpen()) {
        closeToolPanel();
        return;
      }

      if (state.successModalOpen) {
        setSuccessModalOpen(false);
        return;
      }

      if (state.exportModalOpen) {
        setExportModalOpen(false);
        return;
      }

      if (state.asideOpen) {
        setAsideOpen(false);
        return;
      }

      if (userMenu.isOpen()) {
        userMenu.close();
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      await persistStory();
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (isToolPanelOpen() && !elements.toolPanel?.contains(target) && !elements.toolToggle?.contains(target)) {
      closeToolPanel();
    }

    if (!elements.aside?.contains(target) && !elements.asideToggle?.contains(target)) {
      setAsideOpen(false);
    }
  });

  window.addEventListener("beforeunload", (event) => {
    if (!state.isDirty) {
      return;
    }

    event.preventDefault();
    event.returnValue = "";
  });

  await userMenu.init();
  state.stories = await loadStories();
  renderStoryList();

  const selectedStoryId = getSelectedStoryId();
  if (selectedStoryId) {
    await selectStory(selectedStoryId, { skipGuard: true });
    return;
  }

  if (state.stories[0]) {
    await selectStory(state.stories[0].id, { skipGuard: true });
    return;
  }

  await createStory({ skipGuard: true });
});
