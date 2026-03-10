import { buildApiUrl } from "../../utils/api-config.js";
import { fetchJson } from "../../utils/api-client.js";
import {
  getAuthHeaders,
  getCurrentUserId,
  getUnauthorizedNotice,
  logoutAndRedirect,
} from "../../utils/auth-session.js";

document.addEventListener("DOMContentLoaded", async () => {
  const inputLibrary = document.getElementById("input_library");
  const createButton = document.getElementById("create-shelf");
  const refreshButton = document.getElementById("refresh-library");
  const libraryMain = document.getElementById("library-main");
  const storageBar = document.querySelector(".storage-bar");
  const storageFill = document.querySelector(".storage-bar__fill");
  const storageText = document.querySelector(".storage-bar__text");
  const modalTitle = document.getElementById("book-modal-title");
  const modalMeta = document.getElementById("book-modal-meta");
  const modalDownloadButton = document.getElementById("book-modal-download");
  const modalDeleteButton = document.getElementById("book-modal-delete");
  const userId = getCurrentUserId();
  const urlParams = new URLSearchParams(window.location.search);
  const queryShelfId = urlParams.get("shelfId");
  const queryShelfName = urlParams.get("shelfName");

  const state = {
    documents: [],
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
    Toastify({
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

    if (savedShelfName) {
      inputLibrary.value = savedShelfName;
    }
  };

  const clearBookModalHash = () => {
    if (window.location.hash !== "#bookModal") {
      return;
    }

    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  };

  const setSelectedDocument = (document) => {
    state.selectedDocument = document;

    const isEnabled = Boolean(document);
    if (modalDownloadButton) {
      modalDownloadButton.disabled = !isEnabled;
    }
    if (modalDeleteButton) {
      modalDeleteButton.disabled = !isEnabled;
    }

    if (!document) {
      if (modalTitle) {
        modalTitle.textContent = t("library.modal_title", "Documento");
      }
      if (modalMeta) {
        modalMeta.textContent = "";
      }
      return;
    }

    if (modalTitle) {
      modalTitle.textContent = document.nombreArchivo || document.tituloRelato || t("library.document", "Documento");
    }

    if (modalMeta) {
      modalMeta.textContent = buildDocumentMeta(document);
    }
  };

  const formatMb = (value) => numberFormatter.format(Number(value || 0));

  const formatFileSize = (bytes) => formatMb((Number(bytes) || 0) / 1024 / 1024) + " MB";

  const formatDate = (value) => {
    if (!value) {
      return "";
    }

    const normalized = String(value).replace(" ", "T");
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    return parsed.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

  const getDocumentCountLabel = () => {
    const total = state.documents.length;
    return `${total} documento${total === 1 ? "" : "s"}`;
  };

  const openDocumentModal = (document) => {
    setSelectedDocument(document);
    window.location.hash = "bookModal";
  };

  const createBookCard = (document) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "book-card";
    button.title = document.nombreArchivo || document.tituloRelato || t("library.document", "Documento");
    button.addEventListener("click", () => openDocumentModal(document));

    const title = document.createElement("p");
    title.className = "book-card__title";
    title.textContent = document.nombreArchivo || document.tituloRelato || t("library.document", "Documento");
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
      ? "Esta estantería aún no tiene documentos convertidos"
      : "Aún no tienes documentos convertidos guardados";

    const description = document.createElement("p");
    description.className = "library-empty__text";
    description.textContent = "Los archivos exportados desde Poly aparecerán aquí para descargarlos o eliminarlos.";

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
    panel.className = "library-panel";
    panel.append(
      createPanelHeader("Vista de estantería", getDocumentCountLabel()),
    );

    const shelfStack = document.createElement("div");
    shelfStack.className = "library-shelf-stack";
    const rowSize = 8;
    const rowCount = Math.max(3, Math.ceil(state.documents.length / rowSize));

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const shelf = document.createElement("section");
      shelf.className = "shelf";

      const start = rowIndex * rowSize;
      const rowDocuments = state.documents.slice(start, start + rowSize);
      rowDocuments.forEach((document) => {
        shelf.appendChild(createBookCard(document));
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

  const createDocumentListItem = (document) => {
    const item = document.createElement("article");
    item.className = "document-list__item";

    const content = document.createElement("div");
    content.className = "document-list__content";

    const title = document.createElement("button");
    title.type = "button";
    title.className = "document-list__title";
    title.textContent = document.nombreArchivo || document.tituloRelato || "Documento";
    title.addEventListener("click", () => openDocumentModal(document));

    const story = document.createElement("p");
    story.className = "document-list__story";
    story.textContent = document.tituloRelato
      ? `Relato: ${document.tituloRelato}`
      : "Documento exportado";

    const meta = document.createElement("p");
    meta.className = "document-list__meta";
    meta.textContent = buildDocumentMeta(document);

    content.append(title, story, meta);

    const actions = document.createElement("div");
    actions.className = "document-list__actions";
    actions.append(
      createListActionButton("Ver", "ghost", () => openDocumentModal(document)),
      createListActionButton("Descargar", "", () => downloadDocument(document)),
      createListActionButton("Eliminar", "danger", () => deleteDocument(document)),
    );

    item.append(content, actions);
    return item;
  };

  const createListPanel = () => {
    const panel = document.createElement("section");
    panel.className = "library-panel library-panel--list";
    panel.append(
      createPanelHeader("Lista de documentos", "Nombre, relato, fecha y acciones directas"),
    );

    const list = document.createElement("div");
    list.className = "document-list";
    state.documents.forEach((document) => {
      list.appendChild(createDocumentListItem(document));
    });

    panel.appendChild(list);
    return panel;
  };

  const renderDocuments = () => {
    libraryMain.innerHTML = "";
    libraryMain.classList.remove("library-main--empty");

    if (!state.documents.length) {
      renderEmptyState();
      return;
    }

    libraryMain.append(
      createShelfPanel(),
      createListPanel(),
    );
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
      const percentage = !unlimited && limit > 0
        ? Math.min(100, Math.round((used / limit) * 100))
        : 100;

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
      // Dejamos el estado visual por defecto si no carga la suscripción.
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
        renderEmptyState();
        return;
      }

      state.documents = Array.isArray(data.documentos) ? data.documentos : [];
      renderDocuments();
    } catch (error) {
      showToast("Error de conexión");
      renderEmptyState();
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

  const downloadDocument = async (document = state.selectedDocument) => {
    if (!document?.id) {
      return;
    }

    try {
      const response = await fetch(
        buildApiUrl("/api/v1/library/documents/download", { fileId: document.id }),
        {
          method: "GET",
          headers: getAuthHeaders(),
        },
      );

      if (response.status === 401) {
        const errorData = await parseErrorResponse(response);
        logoutAndRedirect("/public/auth/login.html", getUnauthorizedNotice(errorData));
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
      anchor.download = document.nombreArchivo || "documento";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);

      showToast("Documento descargado", "green");
    } catch (error) {
      showToast("Error de conexión");
    }
  };

  const deleteDocument = async (document = state.selectedDocument) => {
    if (!document?.id) {
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar "${document.nombreArchivo || "documento"}" de la biblioteca?`,
    );
    if (!confirmed) {
      return;
    }

    try {
      const { ok, data } = await fetchJson("/api/v1/library/documents", {
        method: "DELETE",
        params: { fileId: document.id },
        auth: true,
      });

      if (!ok) {
        showToast(data.Mensaje || "No fue posible eliminar el documento");
        return;
      }

      if (state.selectedDocument?.id === document.id) {
        setSelectedDocument(null);
        clearBookModalHash();
      }

      showToast(data.Mensaje || "Documento eliminado", "green");
      await Promise.all([loadDocuments(), loadSubscription()]);
    } catch (error) {
      showToast("Error de conexión");
    }
  };

  refreshButton?.addEventListener("click", async () => {
    await Promise.all([loadDocuments(), loadSubscription()]);
  });

  modalDownloadButton?.addEventListener("click", () => downloadDocument());
  modalDeleteButton?.addEventListener("click", () => deleteDocument());

  window.addEventListener("hashchange", () => {
    if (window.location.hash !== "#bookModal") {
      setSelectedDocument(null);
    }
  });

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

      sessionStorage.setItem(storageNameKey, nombre);
      if (data.id) {
        sessionStorage.setItem(storageIdKey, String(data.id));
      }

      showToast(data.Mensaje || "Estantería creada correctamente", "green");
      window.location.href = `shelves.html?selected=${encodeURIComponent(data.id || "")}`;
    } catch (error) {
      showToast("Error de conexión");
    }
  });

  syncSelectedShelf();
  setSelectedDocument(null);
  await Promise.all([loadDocuments(), loadSubscription()]);
});
