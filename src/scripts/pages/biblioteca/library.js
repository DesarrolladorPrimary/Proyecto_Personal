import { buildApiUrl } from "../../utils/api-config.js";
import { fetchJson } from "../../utils/api-client.js";
import {
  getAuthHeaders,
  getCurrentUserId,
  getLoginRouteForPath,
  getUnauthorizedNotice,
  logoutAndRedirect,
} from "../../utils/auth-session.js";

document.addEventListener("DOMContentLoaded", async () => {
  const inputLibrary = document.getElementById("input_library");
  const createButton = document.getElementById("create-shelf");
  const refreshButton = document.getElementById("refresh-library");
  const clearFilterButton = document.getElementById("clear-shelf-filter");
  const activeShelfChip = document.getElementById("active-shelf-chip");
  const libraryMain = document.getElementById("library-main");
  const storageBar = document.querySelector(".storage-bar");
  const storageFill = document.querySelector(".storage-bar__fill");
  const storageText = document.querySelector(".storage-bar__text");
  const modalTitle = document.getElementById("book-modal-title");
  const modalMeta = document.getElementById("book-modal-meta");
  const modalDownloadButton = document.getElementById("book-modal-download");
  const modalDeleteButton = document.getElementById("book-modal-delete");
  const exportModalTitle = document.getElementById("export-modal-title");
  const exportModalMeta = document.getElementById("export-modal-meta");
  const exportForm = document.getElementById("export-form");
  const exportTitleInput = document.getElementById("export-title");
  const exportFormatInput = document.getElementById("export-format");
  const exportSubmitButton = document.getElementById("export-submit");
  const userId = getCurrentUserId();
  const urlParams = new URLSearchParams(window.location.search);
  const queryShelfId = urlParams.get("shelfId");
  const queryShelfName = urlParams.get("shelfName");

  const state = {
    stories: [],
    documents: [],
    selectedStory: null,
    selectedDocument: null,
    selectedShelfId: "",
  };

  const numberFormatter = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 2,
  });

  const t = (key, fallback) => {
    const translated = window.languageManager?.translate(key);
    return translated && translated !== key ? translated : fallback;
  };

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

  if (!userId || !libraryMain) {
    return;
  }

  const storageNameKey = `activeShelf:${userId}`;
  const storageIdKey = `activeShelfId:${userId}`;

  const syncSelectedShelf = () => {
    const savedShelfName = sessionStorage.getItem(storageNameKey) || "";
    const savedShelfId = sessionStorage.getItem(storageIdKey) || "";

    state.selectedShelfId = queryShelfId || savedShelfId || "";

    if (queryShelfName) {
      sessionStorage.setItem(storageNameKey, queryShelfName);
      if (queryShelfId) {
        sessionStorage.setItem(storageIdKey, queryShelfId);
      }
      inputLibrary.value = queryShelfName;
      return;
    }

    inputLibrary.value = savedShelfName;
  };

  const syncShelfFilterUi = () => {
    const shelfName = inputLibrary.value.trim();
    if (activeShelfChip) {
      activeShelfChip.textContent = shelfName || "Toda la biblioteca";
    }

    if (clearFilterButton) {
      clearFilterButton.disabled = !state.selectedShelfId;
    }
  };

  const clearBookModalHash = () => {
    if (window.location.hash !== "#bookModal") {
      return;
    }

    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  };

  const clearExportModalHash = () => {
    if (window.location.hash !== "#exportModal") {
      return;
    }

    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  };

  const formatMb = (value) => numberFormatter.format(Number(value || 0));
  const formatFileSize = (bytes) => `${formatMb((Number(bytes) || 0) / 1024 / 1024)} MB`;

  const formatDate = (value) => {
    if (!value) {
      return "";
    }

    const parsed = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    return parsed.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const buildSpineTitle = (value) => {
    const normalized = String(value || "Documento")
      .replace(/\s+/g, " ")
      .trim();

    if (normalized.length <= 18) {
      return normalized;
    }

    const words = normalized.split(" ");
    const compact = words.slice(0, 3).join(" ");
    if (compact.length <= 18) {
      return `${compact}…`;
    }

    return `${normalized.slice(0, 17).trim()}…`;
  };

  const buildDocumentMeta = (document) => {
    const parts = [];

    if (document.tipoArchivo) {
      parts.push(document.tipoArchivo);
    }

    parts.push(formatFileSize(document.tamanoBytes));

    const uploadedAt = formatDate(document.fechaSubida);
    if (uploadedAt) {
      parts.push(uploadedAt);
    }

    if (document.nombreEstanteria) {
      parts.push(document.nombreEstanteria);
    }

    return parts.join(" · ");
  };

  const buildStoryMeta = (story) => {
    const parts = [];
    parts.push(story.modoOrigen === "Seccion_Artificial" ? "Poly" : "Creativo");

    const words = String(story.descripcion || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    parts.push(`${words} palabra${words === 1 ? "" : "s"}`);

    const updatedAt = formatDate(story.fechaModificacion || story.fechaCreacion);
    if (updatedAt) {
      parts.push(updatedAt);
    }

    if (story.estanteriaId && inputLibrary.value.trim()) {
      parts.push(inputLibrary.value.trim());
    }

    return parts.join(" · ");
  };

  const setSelectedDocument = (document) => {
    state.selectedDocument = document;

    const enabled = Boolean(document);
    modalDownloadButton.disabled = !enabled;
    modalDeleteButton.disabled = !enabled;

    if (!document) {
      modalTitle.textContent = t("library.modal_title", "Documento");
      modalMeta.textContent = "";
      return;
    }

    modalTitle.textContent = document.nombreArchivo || document.tituloRelato || "Documento";
    modalMeta.textContent = buildDocumentMeta(document);
  };

  const setSelectedStory = (story) => {
    state.selectedStory = story;
    const enabled = Boolean(story);

    if (exportSubmitButton) {
      exportSubmitButton.disabled = !enabled;
    }

    if (!story) {
      exportModalTitle.textContent = "Convertir en libro";
      exportModalMeta.textContent = "";
      exportTitleInput.value = "";
      exportFormatInput.value = "word";
      return;
    }

    exportModalTitle.textContent = story.titulo || "Libro";
    exportModalMeta.textContent = `Borrador listo para convertir · ${buildStoryMeta(story)}`;
    exportTitleInput.value = story.titulo || "Libro final";
    exportFormatInput.value = "word";
  };

  const getDocumentCountLabel = () => {
    const total = state.documents.length;
    return `${total} libro${total === 1 ? "" : "s"}`;
  };

  const getStoryCountLabel = () => {
    const total = state.stories.length;
    return `${total} relato${total === 1 ? "" : "s"}`;
  };

  const openDocumentModal = (libraryDocument) => {
    setSelectedDocument(libraryDocument);
    window.location.hash = "bookModal";
  };

  const openStoryExportModal = (story) => {
    setSelectedStory(story);
    window.location.hash = "exportModal";
  };

  const openStoryEditor = (story) => {
    if (!story?.id) {
      return;
    }

    if (story.modoOrigen === "Seccion_Creativa") {
      const url = new URL("../creative/canvas_creative.html", window.location.href);
      url.searchParams.set("creativeStoryId", String(story.id));
      window.location.href = url.toString();
      return;
    }

    sessionStorage.setItem(`poly:${userId}:activeStoryId`, String(story.id));
    window.location.href = new URL("../poly/seccion_poly.html", window.location.href).toString();
  };

  const createBookCard = (libraryDocument, onPreviewChange = () => {}) => {
    const button = document.createElement("button");
    const fullTitle = libraryDocument.nombreArchivo || libraryDocument.tituloRelato || "Documento";

    button.type = "button";
    button.className = "book-card";
    button.title = fullTitle;
    button.setAttribute("aria-label", fullTitle);
    button.addEventListener("click", () => openDocumentModal(libraryDocument));
    button.addEventListener("mouseenter", () => onPreviewChange(fullTitle));
    button.addEventListener("focus", () => onPreviewChange(fullTitle));
    button.addEventListener("mouseleave", () => onPreviewChange(""));
    button.addEventListener("blur", () => onPreviewChange(""));

    const title = document.createElement("p");
    title.className = "book-card__title";
    title.textContent = buildSpineTitle(fullTitle);
    button.appendChild(title);

    return button;
  };

  const renderEmptyState = () => {
    libraryMain.innerHTML = "";
    libraryMain.classList.add("library-main--empty");

    const emptyState = document.createElement("section");
    emptyState.className = "library-empty";

    const title = document.createElement("h2");
    title.className = "library-empty__title";
    title.textContent = state.selectedShelfId
      ? "Esta estantería aún no tiene libros guardados"
      : "Aún no tienes libros guardados";

    const description = document.createElement("p");
    description.className = "library-empty__text";
    description.textContent = "Cuando conviertas un relato en libro, aparecerá aquí para abrirlo, descargarlo o eliminarlo.";

    emptyState.append(title, description);
    libraryMain.appendChild(emptyState);
  };

  const createPanelHeader = (titleText, subtitleText) => {
    const header = document.createElement("div");
    header.className = "library-panel__header";

    const title = document.createElement("h2");
    title.className = "library-panel__title";
    title.textContent = titleText;

    const subtitle = document.createElement("p");
    subtitle.className = "library-panel__subtitle";
    subtitle.textContent = subtitleText;

    header.append(title, subtitle);
    return header;
  };

  const createShelfPanel = () => {
    const panel = document.createElement("section");
    panel.className = "library-panel library-panel--shelf";
    panel.append(createPanelHeader("Libros", getDocumentCountLabel()));

    const spotlight = document.createElement("div");
    spotlight.className = "library-shelf-preview";

    const spotlightLabel = document.createElement("span");
    spotlightLabel.className = "library-shelf-preview__label";
    spotlightLabel.textContent = "Libro";

    const spotlightValue = document.createElement("span");
    spotlightValue.className = "library-shelf-preview__value";
    spotlightValue.textContent = "Pasa sobre un libro para ver el título completo";

    const updatePreview = (value) => {
      spotlightValue.textContent = value || "Pasa sobre un libro para ver el título completo";
      spotlight.classList.toggle("library-shelf-preview--active", Boolean(value));
    };

    spotlight.append(spotlightLabel, spotlightValue);
    panel.appendChild(spotlight);

    const shelfStack = document.createElement("div");
    shelfStack.className = "library-shelf-stack";
    const rowSize = 8;
    const rowCount = Math.max(3, Math.ceil(state.documents.length / rowSize));

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const shelf = document.createElement("section");
      shelf.className = "shelf";

      const start = rowIndex * rowSize;
      const rowDocuments = state.documents.slice(start, start + rowSize);
      rowDocuments.forEach((libraryDocument) => {
        shelf.appendChild(createBookCard(libraryDocument, updatePreview));
      });

      shelfStack.appendChild(shelf);
    }

    panel.appendChild(shelfStack);
    return panel;
  };

  const createListActionButton = (label, variant, onClick) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `document-list__button${variant ? ` document-list__button--${variant}` : ""}`;
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  };

  const createStoryListItem = (story) => {
    const item = document.createElement("article");
    item.className = "document-list__item";

    const content = document.createElement("div");
    content.className = "document-list__content";

    const title = document.createElement("button");
    title.type = "button";
    title.className = "document-list__title";
    title.textContent = story.titulo || "Relato sin título";
    title.title = story.titulo || "Relato sin título";
    title.addEventListener("click", () => openStoryEditor(story));

    const type = document.createElement("p");
    type.className = "document-list__story";
    type.textContent = story.modoOrigen === "Seccion_Artificial"
      ? "Borrador narrativo de Poly"
      : "Borrador manual de Creativo";

    const meta = document.createElement("p");
    meta.className = "document-list__meta";
    meta.textContent = buildStoryMeta(story);

    content.append(title, type, meta);

    const actions = document.createElement("div");
    actions.className = "document-list__actions";
    actions.append(
      createListActionButton("Editar", "ghost", () => openStoryEditor(story)),
    );

    actions.append(
      createListActionButton("Convertir a libro", "", () => openStoryExportModal(story)),
    );

    item.append(content, actions);
    return item;
  };

  const createStoriesPanel = () => {
    const panel = document.createElement("section");
    panel.className = "library-panel library-panel--list";
    panel.append(createPanelHeader("Borradores guardados", "Edita tus relatos y, cuando estén listos, conviértelos en libro"));

    const list = document.createElement("div");
    list.className = "document-list";
    state.stories.forEach((story) => {
      list.appendChild(createStoryListItem(story));
    });

    panel.appendChild(list);
    return panel;
  };

  const renderDocuments = () => {
    libraryMain.innerHTML = "";
    libraryMain.classList.remove("library-main--empty");

    if (!state.documents.length && !state.stories.length) {
      renderEmptyState();
      return;
    }

    if (state.stories.length) {
      libraryMain.appendChild(createStoriesPanel());
    }

    if (state.documents.length) {
      libraryMain.appendChild(createShelfPanel());
    }
  };

  const loadSubscription = async () => {
    try {
      const { ok, data } = await fetchJson("/api/v1/settings/suscripcion", {
        params: { id: userId },
        auth: true,
      });

      if (!ok) {
        return;
      }

      const used = Number(data.almacenamientoUsadoMb ?? 0);
      const limit = Number(data.limiteAlmacenamientoMb ?? data.almacenamiento ?? 500);
      const unlimited = Boolean(data.almacenamientoIlimitado);
      const percentage = !unlimited && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;

      storageBar?.classList.toggle("storage-bar--unlimited", unlimited);
      if (storageFill) {
        storageFill.style.width = `${percentage}%`;
      }
      if (storageText) {
        storageText.textContent = unlimited
          ? `${formatMb(used)} MB / Ilimitado`
          : `${formatMb(used)}/${formatMb(limit)} MB`;
      }
    } catch (error) {
    }
  };

  const loadStories = async () => {
    try {
      const { ok, data } = await fetchJson("/api/v1/stories", {
        auth: true,
      });

      if (!ok) {
        showToast(data.Mensaje || "No fue posible cargar los relatos");
        state.stories = [];
        renderDocuments();
        return;
      }

      const stories = Array.isArray(data.relatos)
        ? data.relatos.filter((story) => {
          if (!story || typeof story !== "object") {
            return false;
          }

          const hasDraft = Boolean(String(story.descripcion || "").trim());
          if (!hasDraft) {
            return false;
          }

          if (!state.selectedShelfId) {
            return true;
          }

          return String(story.estanteriaId || "") === String(state.selectedShelfId);
        })
        : [];

      state.stories = stories;
      renderDocuments();
    } catch (error) {
      state.stories = [];
      renderDocuments();
      console.error("Error cargando relatos de biblioteca:", error);
      showToast("No fue posible cargar los relatos");
    }
  };

  const loadDocuments = async () => {
    try {
      const { ok, data } = await fetchJson("/api/v1/library/documents", {
        params: state.selectedShelfId ? { shelfId: state.selectedShelfId } : undefined,
        auth: true,
      });

      if (!ok) {
        showToast(data.Mensaje || "No fue posible cargar la biblioteca");
        state.documents = [];
        renderDocuments();
        return;
      }

      state.documents = Array.isArray(data.documentos) ? data.documentos : [];
      renderDocuments();
    } catch (error) {
      state.documents = [];
      renderDocuments();
      console.error("Error cargando documentos de biblioteca:", error);
      showToast("No fue posible cargar la biblioteca");
    }
  };

  const exportStory = async (story = state.selectedStory) => {
    if (!story?.id) {
      return;
    }

    if (!story.estanteriaId) {
      showToast("Debes asignar una estantería antes de convertir este relato en libro");
      return;
    }

    const title = exportTitleInput?.value.trim() || story.titulo || "Libro final";
    if (!title) {
      showToast("Ingresa un título para el libro");
      exportTitleInput?.focus();
      return;
    }

    const format = exportFormatInput?.value || "word";

    if (exportSubmitButton) {
      exportSubmitButton.disabled = true;
    }

    try {
      const { ok, data } = await fetchJson(`/api/v1/stories/${story.id}/export`, {
        method: "POST",
        auth: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: title,
          contenido: story.descripcion || "",
          formato: format,
          estanteriaId: story.estanteriaId ?? null,
        }),
      });

      if (!ok) {
        showToast(data.Mensaje || "No fue posible convertir el libro");
        return;
      }

      showToast(data.Mensaje || "Libro generado correctamente", "green");
      clearExportModalHash();
      setSelectedStory(null);
      await Promise.all([loadDocuments(), loadSubscription()]);
    } catch (error) {
      console.error("Error convirtiendo libro desde biblioteca:", error);
      showToast("No fue posible convertir el libro");
    } finally {
      if (exportSubmitButton) {
        exportSubmitButton.disabled = false;
      }
    }
  };

  const parseErrorResponse = async (response) => {
    const raw = await response.text();
    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      return { Mensaje: raw };
    }
  };

  const downloadDocument = async (libraryDocument = state.selectedDocument) => {
    if (!libraryDocument?.id) {
      return;
    }

    try {
      const response = await fetch(buildApiUrl("/api/v1/library/documents/download", { fileId: libraryDocument.id }), {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        const errorData = await parseErrorResponse(response);
        logoutAndRedirect(getLoginRouteForPath(), getUnauthorizedNotice(errorData));
        return;
      }

      if (!response.ok) {
        const errorData = await parseErrorResponse(response);
        showToast(errorData.Mensaje || "No fue posible descargar el documento");
        return;
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = libraryDocument.nombreArchivo || "documento";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);

      showToast("Documento descargado", "green");
    } catch (error) {
      console.error("Error descargando documento de biblioteca:", error);
      showToast("No fue posible descargar el documento");
    }
  };

  const deleteDocument = async (libraryDocument = state.selectedDocument) => {
    if (!libraryDocument?.id) {
      return;
    }

    const confirmed = window.confirm(`Eliminar "${libraryDocument.nombreArchivo || "documento"}" de la biblioteca?`);
    if (!confirmed) {
      return;
    }

    try {
      const { ok, data } = await fetchJson("/api/v1/library/documents", {
        method: "DELETE",
        params: { fileId: libraryDocument.id },
        auth: true,
      });

      if (!ok) {
        showToast(data.Mensaje || "No fue posible eliminar el documento");
        return;
      }

      if (state.selectedDocument?.id === libraryDocument.id) {
        setSelectedDocument(null);
        clearBookModalHash();
      }

      showToast(data.Mensaje || "Documento eliminado", "green");
      await Promise.all([loadDocuments(), loadSubscription()]);
    } catch (error) {
      console.error("Error eliminando documento de biblioteca:", error);
      showToast("No fue posible eliminar el documento");
    }
  };

  refreshButton?.addEventListener("click", async () => {
    await Promise.all([loadStories(), loadDocuments(), loadSubscription()]);
  });

  clearFilterButton?.addEventListener("click", async () => {
    state.selectedShelfId = "";
    inputLibrary.value = "";
    sessionStorage.removeItem(storageNameKey);
    sessionStorage.removeItem(storageIdKey);
    history.replaceState(null, "", window.location.pathname);
    syncShelfFilterUi();
    await Promise.all([loadStories(), loadDocuments()]);
  });

  modalDownloadButton?.addEventListener("click", () => downloadDocument());
  modalDeleteButton?.addEventListener("click", () => deleteDocument());
  exportForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await exportStory();
  });

  window.addEventListener("hashchange", () => {
    if (window.location.hash !== "#bookModal") {
      setSelectedDocument(null);
    }

    if (window.location.hash !== "#exportModal") {
      setSelectedStory(null);
    }
  });

  createButton?.addEventListener("click", async () => {
    const suggestedName = state.selectedShelfId ? "" : inputLibrary.value.trim();
    const nombre = window.prompt("Nombre de la nueva estantería", suggestedName)?.trim();

    if (!nombre) {
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
        showToast(data.Mensaje || "No fue posible crear la estanteria");
        return;
      }

      sessionStorage.setItem(storageNameKey, nombre);
      if (data.id) {
        sessionStorage.setItem(storageIdKey, String(data.id));
      }

      showToast(data.Mensaje || "Estanteria creada correctamente", "green");
      window.location.href = `shelves.html?selected=${encodeURIComponent(data.id || "")}`;
    } catch (error) {
      console.error("Error creando estantería desde biblioteca:", error);
      showToast("No fue posible crear la estantería");
    }
  });

  syncSelectedShelf();
  syncShelfFilterUi();
  setSelectedDocument(null);
  setSelectedStory(null);
  await Promise.all([loadStories(), loadDocuments(), loadSubscription()]);
});
