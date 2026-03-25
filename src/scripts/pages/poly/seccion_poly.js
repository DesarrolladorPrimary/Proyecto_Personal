import { fetchJson } from "../../utils/api-client.js";
import { buildUploadedAssetUrl } from "../../utils/api-config.js";
import { showConfirm, showPrompt } from "../../utils/dialog-service.js";
import {
  getCurrentUserId,
  getToken,
  logoutAndRedirect,
} from "../../utils/auth-session.js";
import { loadPlanSnapshot } from "../../utils/subscription-plan.js";

/*
 * Controlador principal de Poly.
 * Coordina chat, borrador, archivos fuente, parámetros de IA y guardado
 * del relato artificial desde una sola pantalla.
 */
const STORY_MODE = "Seccion_Artificial";
const DEFAULT_AI_SETTINGS = {
  estiloEscritura: "Narrativo",
  nivelCreatividad: "Medio",
  longitudRespuesta: "Media",
  tonoEmocional: "Neutral",
};
const AI_SETTING_OPTIONS = {
  estiloEscritura: ["Narrativo", "Descriptivo", "Dialogado"],
  longitudRespuesta: ["Corta", "Media", "Larga"],
  tonoEmocional: ["Neutral", "Dramático", "Poético"],
};
const CREATIVITY_OPTIONS = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};
const DEFAULT_INPUT_PLACEHOLDER = "Escribe tu mensaje...";
const TITLE_MAX_LENGTH = 255;
const CANVAS_MAX_LENGTH = 20000;
const SHELF_NAME_MAX_LENGTH = 150;
const CHAT_INPUT_MAX_LENGTH = 20000;
const DEFAULT_CANVAS_PLACEHOLDER = "Aquí aparecerá el borrador final de la historia cuando Poly empiece a desarrollarlo.";
const WAITING_STATUS_STAGES = [
  {
    afterMs: 0,
    getText: (hasFiles) =>
      hasFiles
        ? "Poly esta leyendo tu mensaje y revisando los documentos"
        : "Poly esta pensando en la mejor respuesta",
  },
  {
    afterMs: 5000,
    getText: (hasFiles) =>
      hasFiles
        ? "Poly esta cruzando el contexto y escribiendo la respuesta"
        : "Poly esta escribiendo la respuesta",
  },
  {
    afterMs: 12000,
    getText: (hasFiles) =>
      hasFiles
        ? "Poly sigue procesando el contexto; puede tardar un poco mas"
        : "Poly sigue trabajando en la respuesta; puede tardar un poco mas",
  },
];

const state = {
  userId: getCurrentUserId(),
  userDisplayName: "Usuario",
  stories: [],
  shelves: [],
  activeStoryId: null,
  messages: [],
  sending: false,
  awaitingPolyResponse: false,
  pendingUserMessage: null,
  responseWaitStartedAt: 0,
  responseWaitTimerId: null,
  asideOpen: false,
  sourceFiles: [],
  sourceFilesExpanded: false,
  aiSettings: { ...DEFAULT_AI_SETTINGS },
  aiSettingsDraft: { ...DEFAULT_AI_SETTINGS },
  canvasDirty: false,
  lastSavedCanvasSnapshot: null,
};

// Este mapa evita buscar nodos repetidamente en un archivo que orquesta buena
// parte de Poly: chat, canvas, archivos, perfil y exportación.
const elements = {
  aside: document.getElementById("sidebar"),
  asideNav: document.querySelector(".header__nav"),
  asideToggle: document.getElementById("poly-aside-toggle"),
  asideClose: document.getElementById("poly-aside-close"),
  logoUserButton: document.getElementById("logo_user_button"),
  logoUser: document.getElementById("logo_user"),
  userMenu: document.getElementById("user"),
  userName: document.getElementById("nombre_usuario"),
  userEmail: document.getElementById("correo_usuario"),
  userAiModel: document.getElementById("menu-user-ai-model"),
  userMenuPhoto: document.getElementById("profile_photo_user"),
  logoutButton: document.getElementById("logout"),
  form: document.getElementById("poly-form"),
  input: document.getElementById("poly-message-input"),
  emptyState: document.getElementById("poly-empty-state"),
  planBadge: document.getElementById("poly-plan-badge"),
  planStorage: document.getElementById("poly-plan-storage"),
  planCopy: document.getElementById("poly-plan-copy"),
  planModels: document.getElementById("poly-plan-models"),
  messageList: document.getElementById("poly-messages"),
  status: document.getElementById("poly-chat-status"),
  storyList: document.getElementById("poly-story-list"),
  newChatButton: document.getElementById("poly-new-chat"),
  attachButton: document.getElementById("poly-attach"),
  aiModalOpen: document.querySelector(".poly-input__action--intruction"),
  fileInput: document.getElementById("poly-file-input"),
  fileAttachment: document.getElementById("poly-file-attachment"),
  fileAttachmentToggle: document.getElementById("poly-file-toggle"),
  fileAttachmentName: document.getElementById("poly-file-name"),
  fileAttachmentChevron: document.getElementById("poly-file-chevron"),
  fileAttachmentRemove: document.getElementById("poly-file-remove"),
  sourceFilesPanel: document.getElementById("poly-source-files"),
  sourceFilesCount: document.getElementById("poly-source-files-count"),
  sourceFilesList: document.getElementById("poly-source-files-list"),
  sendButton: document.getElementById("poly-send-button"),
  modalForm: document.querySelector(".poly-modal__form"),
  styleButton: document.getElementById("poly-style-button"),
  lengthButton: document.getElementById("poly-length-button"),
  toneButton: document.getElementById("poly-tone-button"),
  creativityLow: document.getElementById("poly-creativity-low"),
  creativityMedium: document.getElementById("poly-creativity-medium"),
  creativityHigh: document.getElementById("poly-creativity-high"),
  paramsReset: document.getElementById("poly-params-reset"),
  canvasTitle: document.getElementById("canvas-title"),
  canvasBody: document.getElementById("canvas-body"),
  canvasCounter: document.getElementById("canvas-counter"),
  canvasSaveButton: document.getElementById("canvas-save-button"),
  bookForm: document.getElementById("book-form"),
  bookTitle: document.getElementById("book-title"),
  bookShelf: document.getElementById("book-shelf"),
  bookCreateShelfButton: document.getElementById("book-create-shelf"),
  bookSubmit: document.getElementById("book-submit"),
  bookSuccessMessage: document.getElementById("book-success-message"),
  bookLibraryLink: document.getElementById("book-library-link"),
};

const getStorageKey = (suffix) => `poly:${state.userId}:${suffix}`;
const getActiveStory = () => state.stories.find((story) => story.id === state.activeStoryId) || null;
const getMessageAuthorLabel = (emisor = "") => {
  const normalizedSender = String(emisor || "").trim().toLowerCase();

  if (normalizedSender === "usuario") {
    return state.userDisplayName || "Usuario";
  }

  return emisor || "Sistema";
};

const showToast = (text, background = "red") => {
  if (!window.Toastify) {
    return;
  }

  window.Toastify({
    text,
    duration: 2800,
    gravity: "top",
    position: "center",
    stopOnFocus: true,
    style: { background },
  }).showToast();
};

const normalizeShelfIds = (value) => {
  const source = Array.isArray(value)
    ? value
    : value == null || value === ""
      ? []
      : [value];

  return [...new Set(source
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0))];
};

const getStoryShelfIds = (story) =>
  normalizeShelfIds(Array.isArray(story?.estanteriaIds) && story.estanteriaIds.length
    ? story.estanteriaIds
    : story?.estanteriaId);

const getPrimaryShelfId = (value) => normalizeShelfIds(value)[0] || null;

const getSelectedShelfIds = (selectElement) =>
  normalizeShelfIds(Array.from(selectElement?.selectedOptions || []).map((option) => option.value));

const setSelectedShelfIds = (selectElement, shelfIds) => {
  if (!selectElement) {
    return;
  }

  const normalized = normalizeShelfIds(shelfIds).map(String);
  Array.from(selectElement.options).forEach((option) => {
    option.selected = normalized.includes(option.value);
  });
};

const buildShelfNamesLabel = (shelfIds) =>
  normalizeShelfIds(shelfIds)
    .map((shelfId) => state.shelves.find((shelf) => String(shelf.id) === String(shelfId))?.nombre)
    .filter(Boolean)
    .join(", ");

const setStatus = (text = "") => {
  if (!elements.status) {
    return;
  }

  elements.status.textContent = text;
  elements.status.classList.toggle("poly-chat__status--visible", Boolean(text));
  elements.status.classList.toggle("poly-chat__status--loading", state.awaitingPolyResponse && Boolean(text));
};

const renderPlanState = (snapshot) => {
  if (elements.planBadge) {
    elements.planBadge.textContent = `Plan ${snapshot.plan}`;
    elements.planBadge.classList.toggle("poly-plan__badge--premium", snapshot.isPremium);
  }

  if (elements.planStorage) {
    elements.planStorage.textContent = snapshot.storageLabel;
  }

  if (elements.planCopy) {
    elements.planCopy.textContent = snapshot.isPremium
      ? "Poly responde en modo amplio y usa los modelos disponibles para tu plan Premium."
      : "Poly responde en modo compacto y usa solo los modelos disponibles para tu plan gratuito.";
  }

  if (elements.planModels) {
    elements.planModels.textContent = `Modelos disponibles: ${snapshot.availableModelsLabel}.`;
  }
};

const loadPlanState = async () => {
  const snapshot = await loadPlanSnapshot(state.userId, { includeModels: true });

  if (!snapshot.ok) {
    if (elements.planStorage) {
      elements.planStorage.textContent = "Sin datos";
    }

    if (elements.planModels) {
      elements.planModels.textContent = "No fue posible cargar los modelos del plan.";
    }
    return;
  }

  // Poly consume este snapshot como fuente de verdad visual del plan para no
  // duplicar lógica de suscripción dentro de la página.
  renderPlanState(snapshot);
};

const syncAsideState = () => {
  if (!elements.aside || !elements.asideToggle) {
    return;
  }

  elements.aside.classList.toggle("poly-aside--open", state.asideOpen);
  elements.aside.setAttribute("aria-hidden", String(!state.asideOpen));
  elements.asideToggle.setAttribute("aria-expanded", String(state.asideOpen));
  elements.asideNav?.classList.toggle("header__nav--hidden", state.asideOpen);
};

const setAsideOpen = (nextValue) => {
  state.asideOpen = Boolean(nextValue);
  syncAsideState();
};

const setUserMenuOpen = (nextValue) => {
  elements.userMenu?.classList.toggle("menu-user--visible", Boolean(nextValue));
};

const getShelfById = (shelfId) =>
  state.shelves.find((shelf) => String(shelf.id) === String(shelfId)) || null;

const buildLibraryUrl = (shelfIds) => {
  const basePath = "../biblioteca/library.html";
  const shelfId = getPrimaryShelfId(shelfIds);
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

const syncLibraryLink = (shelfIds = []) => {
  if (!elements.bookLibraryLink) {
    return;
  }

  const shelfLabel = buildShelfNamesLabel(shelfIds);
  elements.bookLibraryLink.href = buildLibraryUrl(shelfIds);
  elements.bookLibraryLink.textContent = shelfLabel
    ? `Abrir biblioteca: ${shelfLabel}`
    : "Abrir biblioteca";
};

const syncBookShelfSelection = (preferredShelfIds = []) => {
  if (!elements.bookShelf) {
    return;
  }

  const activeStory = getActiveStory();
  const nextValues = normalizeShelfIds(
    preferredShelfIds != null && (Array.isArray(preferredShelfIds) || preferredShelfIds !== "")
      ? preferredShelfIds
      : getStoryShelfIds(activeStory),
  );

  setSelectedShelfIds(elements.bookShelf, nextValues);
  syncLibraryLink(nextValues);
};

const renderShelfOptions = (preferredShelfIds = []) => {
  if (!elements.bookShelf) {
    return;
  }

  const currentValues = getSelectedShelfIds(elements.bookShelf);
  elements.bookShelf.innerHTML = "";

  state.shelves.forEach((shelf) => {
    const option = document.createElement("option");
    option.value = String(shelf.id);
    option.textContent = shelf.nombre;
    elements.bookShelf.appendChild(option);
  });

  const activeStory = getActiveStory();
  const nextValues = normalizeShelfIds(
    preferredShelfIds != null && (Array.isArray(preferredShelfIds) || preferredShelfIds !== "")
      ? preferredShelfIds
      : currentValues.length
        ? currentValues
        : getStoryShelfIds(activeStory),
  );

  setSelectedShelfIds(elements.bookShelf, nextValues);
  syncLibraryLink(nextValues);
};

const getPrimarySourceFile = () => state.sourceFiles[0] || null;

const getSourceFileName = (file) => file?.nombreArchivo || file?.name || "Documento";

const getSourceFileType = (file) => String(file?.tipoArchivo || file?.type || "")
  .replace("application/", "")
  .replace("vnd.openxmlformats-officedocument.wordprocessingml.document", "DOCX")
  .replace("msword", "DOC")
  .toUpperCase();

const formatBytesToMb = (bytes) => {
  const normalized = Number(bytes || 0);
  if (!normalized) {
    return "";
  }

  return `${(normalized / 1024 / 1024).toFixed(normalized >= 1024 * 1024 ? 2 : 1)} MB`;
};

const syncSourceFilesAccordion = () => {
  const hasFiles = state.sourceFiles.length > 0;
  const isExpanded = hasFiles && state.sourceFilesExpanded;

  // El acordeón depende de estado local para evitar inconsistencias entre el
  // archivo adjunto principal y la lista completa de documentos fuente.
  elements.sourceFilesPanel?.classList.toggle("poly-hidden", !isExpanded);
  elements.fileAttachmentToggle?.setAttribute("aria-expanded", String(isExpanded));
  elements.fileAttachmentChevron?.classList.toggle("poly-input__attachment-chevron--expanded", isExpanded);
};

const syncAttachedFile = () => {
  if (!elements.fileAttachment || !elements.fileAttachmentName) {
    return;
  }

  const primaryFile = getPrimarySourceFile();
  const hasFile = Boolean(primaryFile);
  if (!hasFile) {
    state.sourceFilesExpanded = false;
  }

  elements.fileAttachment.classList.toggle("poly-hidden", !hasFile);
  elements.fileAttachmentName.textContent = hasFile
    ? state.sourceFiles.length > 1
      ? `${primaryFile.nombreArchivo || primaryFile.name} (+${state.sourceFiles.length - 1})`
      : getSourceFileName(primaryFile)
    : "";
  syncSourceFilesAccordion();
};

const removeSourceFile = async (fileId) => {
  if (!fileId || !state.activeStoryId) {
    return;
  }

  const { ok, data } = await fetchJson("/api/v1/upload/relato", {
    method: "DELETE",
    auth: true,
    params: {
      storyId: state.activeStoryId,
      fileId,
    },
  });

  if (!ok) {
    showToast(data.Mensaje || "No fue posible quitar el archivo");
    return;
  }

  showToast(data.Mensaje || "Archivo eliminado", "green");
  await loadStoryDetails(state.activeStoryId);
  // La cuota visible cambia al subir o quitar archivos, por eso se recarga
  // también el estado del plan después de tocar documentos fuente.
  await loadPlanState();
};

const renderSourceFilesList = () => {
  if (!elements.sourceFilesPanel || !elements.sourceFilesList || !elements.sourceFilesCount) {
    return;
  }

  const hasFiles = state.sourceFiles.length > 0;
  elements.sourceFilesCount.textContent = String(state.sourceFiles.length);
  elements.sourceFilesList.innerHTML = "";

  if (!hasFiles) {
    syncSourceFilesAccordion();
    return;
  }

  state.sourceFiles.forEach((file, index) => {
    const row = document.createElement("article");
    row.className = "poly-source-files__item";

    const content = document.createElement("div");
    content.className = "poly-source-files__content";

    const title = document.createElement("p");
    title.className = "poly-source-files__name";
    title.textContent = getSourceFileName(file);

    const meta = document.createElement("p");
    meta.className = "poly-source-files__meta";
    const metaParts = [];
    const fileType = getSourceFileType(file);
    const fileSize = formatBytesToMb(file?.tamanoBytes || file?.size);
    if (fileType) {
      metaParts.push(fileType);
    }
    if (fileSize) {
      metaParts.push(fileSize);
    }
    metaParts.push(index === 0 ? "Adjunto principal" : `Documento ${index + 1}`);
    meta.textContent = metaParts.join(" · ");

    content.append(title, meta);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "poly-source-files__remove";
    removeButton.textContent = "Quitar";
    removeButton.disabled = state.sending || !file?.id;
    removeButton.addEventListener("click", async () => {
      await removeSourceFile(file.id);
    });

    row.append(content, removeButton);
    elements.sourceFilesList.appendChild(row);
  });

  syncSourceFilesAccordion();
};

const cycleValue = (currentValue, options) => {
  const currentIndex = options.indexOf(currentValue);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % options.length;
  return options[nextIndex];
};

const syncAiSettingsUI = () => {
  const settings = state.aiSettingsDraft;

  if (elements.styleButton) {
    elements.styleButton.textContent = settings.estiloEscritura;
  }

  if (elements.lengthButton) {
    elements.lengthButton.textContent = settings.longitudRespuesta;
  }

  if (elements.toneButton) {
    elements.toneButton.textContent = settings.tonoEmocional;
  }

  if (elements.creativityLow) {
    elements.creativityLow.checked = settings.nivelCreatividad === CREATIVITY_OPTIONS.low;
  }

  if (elements.creativityMedium) {
    elements.creativityMedium.checked = settings.nivelCreatividad === CREATIVITY_OPTIONS.medium;
  }

  if (elements.creativityHigh) {
    elements.creativityHigh.checked = settings.nivelCreatividad === CREATIVITY_OPTIONS.high;
  }
};

const syncFormState = () => {
  const disabled = state.sending;

  // Un único flag controla input, adjuntos y acciones para que el usuario no
  // dispare solicitudes paralelas mientras Poly sigue respondiendo.
  if (elements.input) {
    elements.input.disabled = disabled;
    elements.input.placeholder = disabled ? "Poly esta respondiendo..." : DEFAULT_INPUT_PLACEHOLDER;
  }

  if (elements.sendButton) {
    elements.sendButton.disabled = disabled;
    elements.sendButton.classList.toggle("poly-input__action--disabled", disabled);
    elements.sendButton.classList.toggle("poly-input__action--loading", disabled);
    elements.sendButton.setAttribute("aria-label", disabled ? "Poly esta respondiendo" : "Enviar mensaje");
  }

  if (elements.newChatButton) {
    elements.newChatButton.disabled = disabled;
  }

  if (elements.attachButton) {
    elements.attachButton.disabled = disabled;
  }

  if (elements.fileAttachmentRemove) {
    elements.fileAttachmentRemove.disabled = disabled;
  }

  if (elements.fileAttachmentToggle) {
    elements.fileAttachmentToggle.disabled = disabled;
  }

  renderSourceFilesList();
};

const focusInput = () => {
  if (elements.input && !elements.input.disabled) {
    elements.input.focus();
  }
};

const truncate = (text, maxLength = 36) => {
  const normalized = String(text || "").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
};

const countWords = (text) => {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return 0;
  }

  return normalized.split(/\s+/).filter(Boolean).length;
};

const splitIntoParagraphs = (text) =>
  String(text || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

const isCanvasPlaceholder = (text) => String(text || "").trim() === DEFAULT_CANVAS_PLACEHOLDER;
const clampText = (value, maxLength) => String(value || "").slice(0, maxLength);

const getCanvasBodyText = () => {
  const currentText = elements.canvasBody?.innerText?.trim() || "";
  return isCanvasPlaceholder(currentText) ? "" : clampText(currentText, CANVAS_MAX_LENGTH);
};

const updateCanvasCounter = (text) => {
  if (!elements.canvasCounter) {
    return;
  }

  const words = countWords(text);
  elements.canvasCounter.textContent = `${words} palabra${words === 1 ? "" : "s"}`;
};

const setCanvasPlaceholder = () => {
  if (!elements.canvasBody) {
    return;
  }

  elements.canvasBody.innerHTML = `<p>${DEFAULT_CANVAS_PLACEHOLDER}</p>`;
  updateCanvasCounter("");
};

const normalizeMessageContent = (text) => String(text || "").trim();

const getPendingDisplayContent = (typedContent) => {
  const normalized = normalizeMessageContent(typedContent);
  if (normalized) {
    return normalized;
  }

  if (state.sourceFiles.length) {
    return "Usa los documentos cargados como contexto para continuar el relato.";
  }

  return "";
};

const hasPersistedPendingUserMessage = () => {
  if (!state.pendingUserMessage) {
    return false;
  }

  const pendingContent = normalizeMessageContent(state.pendingUserMessage.contenido);
  if (!pendingContent) {
    return false;
  }

  for (let index = state.messages.length - 1; index >= 0; index -= 1) {
    const message = state.messages[index];
    if (String(message?.emisor || "").toLowerCase() !== "usuario") {
      continue;
    }

    return normalizeMessageContent(message.contenido) === pendingContent;
  }

  return false;
};

const shouldShowTypingIndicator = () => {
  if (!state.awaitingPolyResponse) {
    return false;
  }

  const lastMessage = state.messages[state.messages.length - 1];
  return String(lastMessage?.emisor || "").toLowerCase() !== "poly";
};

const getVisibleMessages = () => {
  const visibleMessages = [...state.messages];

  if (state.pendingUserMessage && !hasPersistedPendingUserMessage()) {
    visibleMessages.push({
      ...state.pendingUserMessage,
      pending: true,
    });
  }

  if (shouldShowTypingIndicator()) {
    visibleMessages.push({
      emisor: "Poly",
      pending: true,
      typing: true,
    });
  }

  return visibleMessages;
};

const getWaitingStatusText = () => {
  if (!state.awaitingPolyResponse || !state.responseWaitStartedAt) {
    return "";
  }

  const elapsedMs = Math.max(0, Date.now() - state.responseWaitStartedAt);
  const elapsedSeconds = Math.max(1, Math.round(elapsedMs / 1000));
  let currentStage = WAITING_STATUS_STAGES[0];

  WAITING_STATUS_STAGES.forEach((stage) => {
    if (elapsedMs >= stage.afterMs) {
      currentStage = stage;
    }
  });

  return `${currentStage.getText(state.sourceFiles.length > 0)} · ${elapsedSeconds}s`;
};

const clearResponseWaitTimer = () => {
  if (state.responseWaitTimerId) {
    window.clearInterval(state.responseWaitTimerId);
    state.responseWaitTimerId = null;
  }
};

const startResponseWait = (displayContent) => {
  clearResponseWaitTimer();
  state.pendingUserMessage = displayContent
    ? { emisor: "Usuario", contenido: displayContent }
    : null;
  state.awaitingPolyResponse = true;
  state.responseWaitStartedAt = Date.now();
  setStatus(getWaitingStatusText());
  renderMessages();

  state.responseWaitTimerId = window.setInterval(() => {
    setStatus(getWaitingStatusText());
  }, 1000);
};

const stopResponseWait = () => {
  clearResponseWaitTimer();
  state.awaitingPolyResponse = false;
  state.pendingUserMessage = null;
  state.responseWaitStartedAt = 0;
  setStatus("");
};

const getCanvasDraft = () => {
  const activeStory = getActiveStory();
  return String(activeStory?.descripcion || "").trim();
};

const getCanvasText = () => {
  const bodyText = getCanvasBodyText();
  if (bodyText) {
    return bodyText;
  }

  return getCanvasDraft();
};

const isSupportedStoryFile = (file) => {
  const supportedExtensions = [".pdf", ".doc", ".docx"];
  const lowerName = file.name.toLowerCase();

  return supportedExtensions.some((extension) => lowerName.endsWith(extension))
    || file.type === "application/pdf"
    || file.type === "application/msword"
    || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
};

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return window.btoa(binary);
};

const buildCanvasSnapshot = () => ({
  title: (elements.canvasTitle?.textContent || "").trim(),
  body: getCanvasText(),
});

const setCanvasSavedSnapshot = (snapshot = buildCanvasSnapshot()) => {
  state.lastSavedCanvasSnapshot = {
    title: String(snapshot?.title || "").trim(),
    body: String(snapshot?.body || "").trim(),
  };
  state.canvasDirty = false;
};

const syncCanvasDirtyState = () => {
  const current = buildCanvasSnapshot();
  const saved = state.lastSavedCanvasSnapshot || { title: "", body: "" };
  state.canvasDirty = current.title !== saved.title || current.body !== saved.body;
};

const ensureCanvasChangesHandled = async (contextLabel = "continuar") => {
  if (!state.canvasDirty) {
    return true;
  }

  const shouldSave = await showConfirm({
    title: "Cambios sin guardar",
    text: `Hay cambios sin guardar en el canvas. ¿Deseas guardarlos antes de ${contextLabel}?`,
  });

  if (shouldSave) {
    return saveCanvasDraft({ silentIfEmpty: true });
  }

  return showConfirm({
    title: "Descartar cambios",
    text: "Se perderán los cambios no guardados. ¿Deseas descartarlos?",
  });
};

const updateCanvas = () => {
  if (!elements.canvasTitle || !elements.canvasBody || !elements.canvasCounter) {
    return;
  }

  const activeStory = getActiveStory();
  const draft = getCanvasDraft();

  elements.canvasTitle.textContent = activeStory?.titulo || "Título";
  elements.bookTitle.value = activeStory?.titulo || "Mi historia con Poly-AI";

  if (!draft) {
    setCanvasPlaceholder();
    setCanvasSavedSnapshot({
      title: activeStory?.titulo || "Título",
      body: "",
    });
    return;
  }

  elements.canvasBody.innerHTML = splitIntoParagraphs(draft)
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join("");
  updateCanvasCounter(draft);
  setCanvasSavedSnapshot({
    title: activeStory?.titulo || "Título",
    body: draft,
  });
};

const saveCanvasDraft = async ({ silentIfEmpty = false } = {}) => {
  if (!state.activeStoryId) {
    showToast("Primero crea o selecciona un chat");
    return false;
  }

  const activeStory = getActiveStory();
  const titulo = elements.canvasTitle?.textContent?.trim() || "Nuevo chat Poly";
  const descripcion = getCanvasText();
  const hasTitleChange = titulo !== (activeStory?.titulo || "Título");

  if (!descripcion && !hasTitleChange) {
    if (!silentIfEmpty) {
      showToast("Todavía no hay borrador para guardar");
    }
    return false;
  }

  if (elements.canvasSaveButton) {
    elements.canvasSaveButton.disabled = true;
  }

  const { ok, data } = await fetchJson(`/api/v1/stories/${state.activeStoryId}`, {
    method: "PUT",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titulo,
      descripcion,
    }),
  });

  if (elements.canvasSaveButton) {
    elements.canvasSaveButton.disabled = false;
  }

  if (!ok) {
    showToast(data.Mensaje || "No fue posible guardar el canvas");
    return false;
  }

  showToast(
    data.version
      ? `${data.Mensaje || "Canvas guardado"} · Versión ${data.version}`
      : data.Mensaje || "Canvas guardado",
    "green",
  );
  await loadStories(state.activeStoryId);
  await loadStoryDetails(state.activeStoryId);
  setCanvasSavedSnapshot({
    title: titulo,
    body: descripcion,
  });
  return true;
};

const renderMessages = () => {
  if (!elements.messageList || !elements.emptyState) {
    return;
  }

  elements.messageList.innerHTML = "";

  const visibleMessages = getVisibleMessages();
  const hasMessages = visibleMessages.length > 0;
  elements.emptyState.classList.toggle("poly-hidden", hasMessages);
  elements.messageList.classList.toggle("poly-chat__messages--empty", !hasMessages);

  if (!hasMessages) {
    updateCanvas();
    focusInput();
    return;
  }

  visibleMessages.forEach((message) => {
    const article = document.createElement("article");
    article.className = `poly-message poly-message--${(message.emisor || "Sistema").toLowerCase()}`;
    if (message.pending) {
      article.classList.add("poly-message--pending");
    }
    if (message.typing) {
      article.classList.add("poly-message--typing");
    }

    const author = document.createElement("p");
    author.className = "poly-message__author";
    author.textContent = getMessageAuthorLabel(message.emisor);

    let content;
    if (message.typing) {
      content = document.createElement("div");
      content.className = "poly-message__typing-indicator";

      const typingText = document.createElement("span");
      typingText.className = "poly-message__typing-text";
      typingText.textContent = "Escribiendo";

      const dots = document.createElement("span");
      dots.className = "poly-message__typing-dots";

      for (let index = 0; index < 3; index += 1) {
        const dot = document.createElement("span");
        dot.className = "poly-message__typing-dot";
        dots.appendChild(dot);
      }

      content.append(typingText, dots);
    } else {
      content = document.createElement("p");
      content.className = "poly-message__content";
      content.textContent = message.contenido || "";
    }

    article.append(author, content);
    elements.messageList.appendChild(article);
  });

  elements.messageList.scrollTop = elements.messageList.scrollHeight;
  updateCanvas();
  focusInput();
};

const renderStories = () => {
  if (!elements.storyList) {
    return;
  }

  elements.storyList.innerHTML = "";

  if (!state.stories.length) {
    const empty = document.createElement("p");
    empty.className = "poly-aside__empty";
    empty.textContent = "No hay chats todavía";
    elements.storyList.appendChild(empty);
    return;
  }

  state.stories.forEach((story) => {
    const row = document.createElement("div");
    row.className = "poly-aside__chat";
    if (story.id === state.activeStoryId) {
      row.classList.add("poly-aside__chat--active");
    }

    const titleButton = document.createElement("button");
    titleButton.type = "button";
    titleButton.className = "poly-aside__chat-title poly-aside__chat-title--button";
    titleButton.textContent = truncate(story.titulo || "Chat sin título");
    titleButton.addEventListener("click", async () => {
      const canContinue = await ensureCanvasChangesHandled("cambiar de chat");
      if (!canContinue) {
        return;
      }

      await selectStory(story.id);
      setAsideOpen(false);
    });

    const options = document.createElement("div");
    options.className = "poly-aside__options";

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "poly-aside__chat-opciones";
    toggleButton.textContent = "⋮";
    toggleButton.setAttribute("aria-label", "Opciones del chat");
    toggleButton.setAttribute("aria-expanded", "false");
    toggleButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = !row.classList.contains("poly-aside__chat--menu-open");

      elements.storyList
        ?.querySelectorAll(".poly-aside__chat--menu-open")
        .forEach((chat) => {
          chat.classList.remove("poly-aside__chat--menu-open");
          chat
            .querySelector(".poly-aside__chat-opciones")
            ?.setAttribute("aria-expanded", "false");
        });

      row.classList.toggle("poly-aside__chat--menu-open", willOpen);
      toggleButton.setAttribute("aria-expanded", String(willOpen));
    });

    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.className = "poly-aside__option poly-aside__option--rename";
    renameButton.textContent = "Renombrar";
    renameButton.addEventListener("click", async () => {
      const nextTitle = await showPrompt({
        title: "Renombrar chat",
        inputLabel: "Nuevo nombre del chat",
        inputValue: story.titulo || "",
        inputAttributes: {
          maxlength: String(TITLE_MAX_LENGTH),
        },
      });
      if (!nextTitle || !nextTitle.trim()) {
        return;
      }

      const { ok, data } = await fetchJson(`/api/v1/stories/${story.id}`, {
        method: "PUT",
        auth: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: nextTitle.trim() }),
      });

      if (!ok) {
        showToast(data.Mensaje || "No fue posible renombrar");
        return;
      }

      showToast(data.Mensaje || "Chat actualizado", "green");
      await loadStories(story.id);
      row.classList.remove("poly-aside__chat--menu-open");
      toggleButton.setAttribute("aria-expanded", "false");
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "poly-aside__option poly-aside__option--delete";
    deleteButton.textContent = "Eliminar";
    deleteButton.addEventListener("click", async () => {
      const confirmed = await showConfirm({
        title: "Eliminar chat",
        text: "¿Eliminar este chat?",
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

      if (state.activeStoryId === story.id) {
        state.activeStoryId = null;
        state.messages = [];
      }

      showToast(data.Mensaje || "Chat eliminado", "green");
      await loadStories();
      await selectStory(state.activeStoryId);
      row.classList.remove("poly-aside__chat--menu-open");
      toggleButton.setAttribute("aria-expanded", "false");
    });

    options.append(renameButton, deleteButton);
    row.append(titleButton, toggleButton, options);
    elements.storyList.appendChild(row);
  });
};

const applyUserData = (user) => {
  const defaultPhoto = "../../../assets/icons/image.png";
  const photoSrc = user.FotoPerfil
    ? buildUploadedAssetUrl(user.FotoPerfil)
    : defaultPhoto;
  state.userDisplayName = String(user.Nombre || "").trim() || "Usuario";

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

const loadUser = async () => {
  const token = getToken();

  if (!state.userId || !token) {
    logoutAndRedirect();
    return;
  }

  const { ok, status, data } = await fetchJson("/api/v1/usuarios/id", {
    params: { id: state.userId },
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

const loadAiModel = async () => {
  if (!elements.userAiModel || !state.userId) {
    return;
  }

  const { ok, data } = await fetchJson("/api/v1/settings/version-ia", {
    params: { id: state.userId },
    auth: true,
  });

  if (!ok) {
    elements.userAiModel.textContent = "No disponible";
    return;
  }

  applyAiModelData(data);
};

const loadMessages = async (storyId, { showLoadingStatus = true } = {}) => {
  if (!storyId) {
    state.messages = [];
    renderMessages();
    return;
  }

  if (showLoadingStatus) {
    setStatus("Cargando conversación...");
  }

  const { ok, data } = await fetchJson(`/api/v1/chat/${storyId}`, {
    auth: true,
  });

  if (!ok) {
    state.messages = [];
    renderMessages();
    if (showLoadingStatus) {
      setStatus("");
    }
    showToast(data.Mensaje || "No fue posible cargar la conversación");
    return;
  }

  state.messages = Array.isArray(data.mensajes) ? data.mensajes : [];
  if (showLoadingStatus) {
    setStatus("");
  }
  renderMessages();
};

const loadStoryDetails = async (storyId) => {
  if (!storyId) {
    state.aiSettings = { ...DEFAULT_AI_SETTINGS };
    state.aiSettingsDraft = { ...DEFAULT_AI_SETTINGS };
    state.sourceFiles = [];
    syncAiSettingsUI();
    syncAttachedFile();
    renderSourceFilesList();
    syncBookShelfSelection();
    updateCanvas();
    return;
  }

  const { ok, status, data } = await fetchJson(`/api/v1/stories/${storyId}`, {
    auth: true,
  });

  if (!ok) {
    if (status === 401) {
      logoutAndRedirect();
      return;
    }

    state.aiSettings = { ...DEFAULT_AI_SETTINGS };
    state.aiSettingsDraft = { ...DEFAULT_AI_SETTINGS };
    state.sourceFiles = [];
    syncAiSettingsUI();
    syncAttachedFile();
    renderSourceFilesList();
    syncBookShelfSelection();
    showToast(data.Mensaje || "No fue posible cargar el detalle del chat");
    return;
  }

  if (data.relato) {
    state.stories = state.stories.map((story) =>
      story.id === storyId ? { ...story, ...data.relato } : story
    );
  }

  state.aiSettings = {
    ...DEFAULT_AI_SETTINGS,
    ...(data.configuracionIA || {}),
  };
  state.aiSettingsDraft = { ...state.aiSettings };
  state.sourceFiles = Array.isArray(data.archivosFuente) ? data.archivosFuente : [];
  syncAiSettingsUI();
  syncAttachedFile();
  renderSourceFilesList();
  syncBookShelfSelection();
  renderStories();
  updateCanvas();
};

const selectStory = async (storyId, { showMessageLoadingStatus = true } = {}) => {
  state.activeStoryId = storyId;

  if (storyId) {
    sessionStorage.setItem(getStorageKey("activeStoryId"), String(storyId));
  } else {
    sessionStorage.removeItem(getStorageKey("activeStoryId"));
  }

  renderStories();
  await loadStoryDetails(storyId);
  await loadMessages(storyId, { showLoadingStatus: showMessageLoadingStatus });
};

const createStory = async (title = "Nuevo chat Poly") => {
  const normalizedTitle = String(title || "Nuevo chat Poly")
    .replace(/\.[^/.]+$/, "")
    .trim();

  const { ok, data } = await fetchJson("/api/v1/stories", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titulo: truncate(normalizedTitle || "Nuevo chat Poly", 80),
      modoOrigen: STORY_MODE,
      descripcion: "",
    }),
  });

  if (!ok) {
    showToast(data.Mensaje || "No fue posible crear el chat");
    return null;
  }

  return data.id || null;
};

const ensureActiveStory = async (preferredTitle = "Nuevo chat Poly", selectionOptions = {}) => {
  if (state.activeStoryId) {
    return state.activeStoryId;
  }

  const storyId = await createStory(preferredTitle);
  if (!storyId) {
    return null;
  }

  await loadStories(storyId);
  await selectStory(storyId, selectionOptions);
  return storyId;
};

const loadStories = async (preferredStoryId = null) => {
  const { ok, data } = await fetchJson("/api/v1/stories", {
    auth: true,
  });

  if (!ok) {
    showToast(data.Mensaje || "No fue posible cargar los chats");
    return;
  }

  const stories = Array.isArray(data.relatos)
    ? data.relatos.filter((story) => story?.modoOrigen === STORY_MODE)
    : [];

  state.stories = stories;

  const storedStoryId = Number(sessionStorage.getItem(getStorageKey("activeStoryId")) || 0);
  const candidateId = preferredStoryId || state.activeStoryId || storedStoryId;
  const existingCandidate = stories.find((story) => story.id === candidateId);

  if (existingCandidate) {
    state.activeStoryId = existingCandidate.id;
  } else {
    state.activeStoryId = stories[0]?.id ?? null;
  }

  renderStories();
  syncBookShelfSelection();
};

const loadShelves = async (preferredShelfIds = []) => {
  const { ok, status, data } = await fetchJson("/api/v1/estanterias", {
    params: { id: state.userId },
    auth: true,
  });

  if (!ok) {
    if (status === 401) {
      logoutAndRedirect();
      return;
    }

    state.shelves = [];
    renderShelfOptions(preferredShelfIds);
    showToast(data.Mensaje || "No fue posible cargar las estanterías");
    return;
  }

  state.shelves = Array.isArray(data)
    ? data.filter((item) => item && typeof item === "object" && item.id)
    : [];
  renderShelfOptions(preferredShelfIds);
};

const createShelfFromBookFlow = async () => {
  if (!state.userId) {
    return null;
  }

  const suggestedName = clampText(elements.bookTitle?.value.trim() || "", SHELF_NAME_MAX_LENGTH);
  const shelfName = (await showPrompt({
    title: "Nueva estantería",
    inputLabel: "Nombre de la estantería",
    inputValue: suggestedName,
    inputPlaceholder: "Mi estantería",
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
    showToast(data.Mensaje || "No fue posible crear la estantería");
    return null;
  }

  const createdShelfId = Number(data.id || 0);
  const currentSelection = getSelectedShelfIds(elements.bookShelf);

  if (createdShelfId > 0) {
    state.shelves = [
      ...state.shelves.filter((shelf) => Number(shelf.id) !== createdShelfId),
      { id: createdShelfId, nombre: shelfName },
    ];
    renderShelfOptions([...currentSelection, createdShelfId]);
  } else {
    await loadShelves();
    const createdShelf = state.shelves.find((shelf) => shelf.nombre === shelfName);
    if (createdShelf) {
      renderShelfOptions([...currentSelection, createdShelf.id]);
    }
  }

  showToast(data.Mensaje || "Estanteria creada", "green");
  elements.bookShelf?.focus();
  return createdShelfId || null;
};

const sendMessage = async (content) => {
  const { ok, data } = await fetchJson("/api/v1/chat/message", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      relatoId: state.activeStoryId,
      emisor: "Usuario",
      contenido: content,
      parametrosIA: state.aiSettings,
    }),
  });

  if (!ok) {
    showToast(data.Mensaje || "No fue posible enviar el mensaje");
    return false;
  }

  return true;
};

const handleSubmit = async (event) => {
  event.preventDefault();

  if (state.sending) {
    return;
  }

  const typedContent = clampText(elements.input?.value.trim() || "", CHAT_INPUT_MAX_LENGTH);
  const content = typedContent || (
    state.sourceFiles.length
      ? "Usa los archivos fuente asociados como contexto para continuar y desarrollar el relato."
      : ""
  );
  if (!content) {
    return;
  }

  const pendingDisplayContent = getPendingDisplayContent(typedContent);
  elements.input.value = "";
  state.sending = true;
  startResponseWait(pendingDisplayContent);
  syncFormState();

  try {
    if (!state.activeStoryId) {
      const initialTitle = typedContent || getPrimarySourceFile()?.nombreArchivo || "Nuevo chat Poly";
      const storyId = await ensureActiveStory(initialTitle, { showMessageLoadingStatus: false });
      if (!storyId) {
        elements.input.value = typedContent;
        return;
      }
    }

    const sent = await sendMessage(content);
    if (!sent) {
      elements.input.value = typedContent;
      return;
    }

    await loadStories(state.activeStoryId);
    await selectStory(state.activeStoryId, { showMessageLoadingStatus: false });
  } finally {
    stopResponseWait();
    state.sending = false;
    syncFormState();
    renderMessages();
    focusInput();
  }
};

const handleCreateNewChat = async () => {
  const canContinue = await ensureCanvasChangesHandled("crear un chat nuevo");
  if (!canContinue) {
    return;
  }

  const storyId = await createStory("Nuevo chat Poly");
  if (!storyId) {
    return;
  }

  showToast("Chat creado", "green");
  await loadStories(storyId);
  await selectStory(storyId);
};

const handleAttachClick = () => {
  elements.fileInput?.click();
};

const handleBookSubmit = async (event) => {
  event.preventDefault();

  const storyId = await ensureActiveStory(clampText(elements.bookTitle?.value.trim() || "Mi historia con Poly-AI", TITLE_MAX_LENGTH));
  if (!storyId) {
    showToast("Primero crea o selecciona un chat");
    return;
  }

  const nextTitle = clampText(elements.bookTitle?.value.trim(), TITLE_MAX_LENGTH);
  if (!nextTitle) {
    showToast("Ingresa un título para el libro");
    return;
  }

  const selectedShelfIds = getSelectedShelfIds(elements.bookShelf);
  const selectedShelfLabel = buildShelfNamesLabel(selectedShelfIds);

  if (!selectedShelfIds.length) {
    const shouldCreateShelf = await showConfirm({
      title: "Falta una estantería",
      text: "Aún no has seleccionado ninguna estantería. ¿Quieres crear una ahora mismo?",
    });

    if (!shouldCreateShelf) {
      elements.bookShelf?.focus();
      return;
    }

    const createdShelfId = await createShelfFromBookFlow();
    if (createdShelfId) {
      elements.bookForm?.requestSubmit();
      return;
    }

    elements.bookShelf?.focus();
    return;
  }

  if (!selectedShelfIds.length) {
    showToast("Debes seleccionar al menos una estantería antes de guardar el relato");
    elements.bookShelf?.focus();
    return;
  }

  const description = getCanvasText();

  if (!description) {
    showToast("Todavía no hay contenido para guardar");
    return;
  }

  if (elements.bookSubmit) {
    elements.bookSubmit.disabled = true;
  }

  const { ok, data } = await fetchJson(`/api/v1/stories/${storyId}`, {
    method: "PUT",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titulo: nextTitle,
      descripcion: description,
      estanteriaIds: selectedShelfIds,
    }),
  });

  if (elements.bookSubmit) {
    elements.bookSubmit.disabled = false;
  }

  if (!ok) {
    showToast(data.Mensaje || "No fue posible guardar el relato");
    return;
  }

  showToast(
    data.version
      ? `${data.Mensaje || "Relato guardado en biblioteca"} · Versión ${data.version}`
      : data.Mensaje || "Relato guardado en biblioteca",
    "green",
  );
  await loadPlanState();
  await loadStories(storyId);
  await selectStory(storyId);

  if (elements.bookSuccessMessage) {
    elements.bookSuccessMessage.textContent = selectedShelfLabel
      ? `Relato guardado con éxito. Quedó actualizado en: ${selectedShelfLabel}.`
      : "Relato guardado con éxito. Quedó actualizado en tu biblioteca.";
  }
  syncLibraryLink(selectedShelfIds);

  window.location.hash = "#bookSuccess";
};

const setupInputAutoResize = () => {
  if (!elements.input) {
    return;
  }

  const resize = () => {
    elements.input.style.height = "auto";
    elements.input.style.height = `${Math.min(elements.input.scrollHeight, 120)}px`;
  };

  elements.input.addEventListener("input", resize);
  resize();
};

const setupCanvasBindings = () => {
  elements.canvasTitle?.addEventListener("input", () => {
    const nextTitle = clampText(elements.canvasTitle.textContent?.trim(), TITLE_MAX_LENGTH);
    if (elements.canvasTitle.textContent !== nextTitle) {
      elements.canvasTitle.textContent = nextTitle;
      const selection = window.getSelection();
      selection?.selectAllChildren(elements.canvasTitle);
      selection?.collapseToEnd();
    }
    if (elements.bookTitle) {
      elements.bookTitle.value = nextTitle || "Mi historia con Poly-AI";
    }
    syncCanvasDirtyState();
  });

  elements.canvasBody?.addEventListener("focus", () => {
    if (isCanvasPlaceholder(elements.canvasBody.innerText)) {
      elements.canvasBody.innerHTML = "";
      updateCanvasCounter("");
      syncCanvasDirtyState();
    }
  });

  elements.canvasBody?.addEventListener("blur", () => {
    if (!getCanvasBodyText()) {
      setCanvasPlaceholder();
    }
    syncCanvasDirtyState();
  });

  elements.canvasBody?.addEventListener("input", () => {
    const nextText = clampText(getCanvasBodyText(), CANVAS_MAX_LENGTH);
    if (getCanvasBodyText() !== nextText) {
      elements.canvasBody.innerText = nextText;
    }
    updateCanvasCounter(getCanvasBodyText());
    syncCanvasDirtyState();
  });

  elements.canvasSaveButton?.addEventListener("click", async () => {
    await saveCanvasDraft();
  });
};

const setupInputSubmitBehavior = () => {
  if (!elements.input || !elements.form) {
    return;
  }

  elements.input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (state.sending) {
      return;
    }

    elements.form.requestSubmit();
  });
};

const setupFileAttachment = () => {
  elements.fileAttachmentToggle?.addEventListener("click", () => {
    if (!state.sourceFiles.length) {
      return;
    }

    state.sourceFilesExpanded = !state.sourceFilesExpanded;
    syncSourceFilesAccordion();
  });

  elements.fileAttachmentRemove?.addEventListener("click", async () => {
    const primaryFile = getPrimarySourceFile();
    if (!primaryFile) {
      return;
    }

    await removeSourceFile(primaryFile.id);
  });

  elements.fileInput?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!isSupportedStoryFile(file)) {
      showToast("Poly solo admite PDF, DOC o DOCX", "orange");
      elements.fileInput.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("Máximo 10MB por archivo", "orange");
      elements.fileInput.value = "";
      return;
    }

    try {
      const storyId = await ensureActiveStory(file.name);
      if (!storyId) {
        return;
      }

      const buffer = await file.arrayBuffer();
      const base64File = arrayBufferToBase64(buffer);
      const { ok, data } = await fetchJson("/api/v1/upload/relato", {
        method: "POST",
        auth: true,
        params: { storyId },
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreArchivo: file.name,
          mimeType: file.type,
          archivo: base64File,
        }),
      });

      if (!ok) {
        showToast(data.Mensaje || "No fue posible subir el archivo");
        return;
      }

      showToast(data.Mensaje || "Archivo fuente vinculado", "green");
      await loadStoryDetails(storyId);
      await loadPlanState();
    } catch (error) {
      showToast("No fue posible procesar el archivo");
    } finally {
      elements.fileInput.value = "";
    }
  });
};

const setupAiParameters = () => {
  state.aiSettings = { ...DEFAULT_AI_SETTINGS };
  state.aiSettingsDraft = { ...DEFAULT_AI_SETTINGS };
  syncAiSettingsUI();

  elements.aiModalOpen?.addEventListener("click", () => {
    state.aiSettingsDraft = { ...state.aiSettings };
    syncAiSettingsUI();
  });

  elements.styleButton?.addEventListener("click", () => {
    state.aiSettingsDraft.estiloEscritura = cycleValue(
      state.aiSettingsDraft.estiloEscritura,
      AI_SETTING_OPTIONS.estiloEscritura
    );
    syncAiSettingsUI();
  });

  elements.lengthButton?.addEventListener("click", () => {
    state.aiSettingsDraft.longitudRespuesta = cycleValue(
      state.aiSettingsDraft.longitudRespuesta,
      AI_SETTING_OPTIONS.longitudRespuesta
    );
    syncAiSettingsUI();
  });

  elements.toneButton?.addEventListener("click", () => {
    state.aiSettingsDraft.tonoEmocional = cycleValue(
      state.aiSettingsDraft.tonoEmocional,
      AI_SETTING_OPTIONS.tonoEmocional
    );
    syncAiSettingsUI();
  });

  [
    [elements.creativityLow, CREATIVITY_OPTIONS.low],
    [elements.creativityMedium, CREATIVITY_OPTIONS.medium],
    [elements.creativityHigh, CREATIVITY_OPTIONS.high],
  ].forEach(([input, label]) => {
    input?.addEventListener("change", () => {
      state.aiSettingsDraft.nivelCreatividad = label;
      syncAiSettingsUI();
    });
  });

  elements.modalForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const storyId = await ensureActiveStory("Nuevo chat Poly");
    if (!storyId) {
      showToast("No fue posible preparar el chat");
      return;
    }

    const { ok, data } = await fetchJson(`/api/v1/stories/${storyId}/configuracion-ia`, {
      method: "PUT",
      auth: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.aiSettingsDraft),
    });

    if (!ok) {
      showToast(data.Mensaje || "No fue posible guardar la configuración");
      return;
    }

    state.aiSettings = {
      ...DEFAULT_AI_SETTINGS,
      ...(data.configuracionIA || state.aiSettingsDraft),
    };
    state.aiSettingsDraft = { ...state.aiSettings };
    syncAiSettingsUI();
    showToast(data.Mensaje || "Parámetros de Poly actualizados", "green");
    window.location.hash = "#";
  });

  elements.paramsReset?.addEventListener("click", async () => {
    state.aiSettingsDraft = { ...DEFAULT_AI_SETTINGS };
    syncAiSettingsUI();

    if (state.activeStoryId) {
      const { ok, data } = await fetchJson(`/api/v1/stories/${state.activeStoryId}/configuracion-ia`, {
        method: "PUT",
        auth: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.aiSettingsDraft),
      });

      if (!ok) {
        showToast(data.Mensaje || "No fue posible restablecer la configuración");
        return;
      }
    }

    state.aiSettings = { ...state.aiSettingsDraft };
    showToast("Parámetros restablecidos", "green");
  });
};

const setupAsideBehavior = () => {
  elements.asideToggle?.addEventListener("click", () => {
    setUserMenuOpen(false);
    setAsideOpen(!state.asideOpen);
  });

  elements.asideClose?.addEventListener("click", () => {
    setAsideOpen(false);
  });

  document.addEventListener("click", (event) => {
    if (!elements.aside?.contains(event.target) && !elements.asideToggle?.contains(event.target)) {
      setAsideOpen(false);
    }

    if (
      !elements.userMenu?.contains(event.target) &&
      !elements.logoUserButton?.contains(event.target)
    ) {
      setUserMenuOpen(false);
    }

    elements.storyList
      ?.querySelectorAll(".poly-aside__chat--menu-open")
      .forEach((chat) => {
        if (!chat.contains(event.target)) {
          chat.classList.remove("poly-aside__chat--menu-open");
          chat
            .querySelector(".poly-aside__chat-opciones")
            ?.setAttribute("aria-expanded", "false");
        }
      });
  });
};

const setupUserMenu = () => {
  elements.logoUserButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    const nextVisible = !elements.userMenu?.classList.contains("menu-user--visible");
    setUserMenuOpen(nextVisible);
    setAsideOpen(false);
  });

  elements.logoutButton?.addEventListener("click", () => {
    showToast("Sesión cerrada", "red");
    window.setTimeout(() => {
      logoutAndRedirect();
    }, 450);
  });
};

const setupUnsavedChangesProtection = () => {
  window.addEventListener("beforeunload", (event) => {
    if (!state.canvasDirty) {
      return;
    }

    event.preventDefault();
    event.returnValue = "";
  });
};

document.addEventListener("DOMContentLoaded", async () => {
  if (!state.userId) {
    return;
  }

  elements.form?.addEventListener("submit", handleSubmit);
  elements.newChatButton?.addEventListener("click", handleCreateNewChat);
  elements.attachButton?.addEventListener("click", handleAttachClick);
  elements.bookForm?.addEventListener("submit", handleBookSubmit);
  setupInputAutoResize();
  setupInputSubmitBehavior();
  setupCanvasBindings();
  setupFileAttachment();
  setupAiParameters();
  setupAsideBehavior();
  setupUserMenu();
  setupUnsavedChangesProtection();
  elements.bookShelf?.addEventListener("change", () => {
    syncLibraryLink(getSelectedShelfIds(elements.bookShelf));
  });
  elements.bookCreateShelfButton?.addEventListener("click", async () => {
    await createShelfFromBookFlow();
  });
  syncFormState();
  syncAsideState();
  syncAttachedFile();
  renderShelfOptions();
  focusInput();

  await loadUser();
  await loadAiModel();
  await loadPlanState();
  await loadShelves();
  await loadStories();
  await selectStory(state.activeStoryId);
});
