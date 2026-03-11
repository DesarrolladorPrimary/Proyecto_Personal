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
  toolButtons: Array.from(document.querySelectorAll(".canvas-main__marker")),
  toolStatus: document.getElementById("creative-tool-status"),
};

const state = {
  storyId: null,
  stories: [],
  assistantBusy: false,
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

const setToolStatus = (text) => {
  if (elements.toolStatus) {
    elements.toolStatus.textContent = text;
  }
};

const getWordCount = (text) =>
  text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;

const updateCounter = () => {
  const words = getWordCount(elements.body?.value || "");
  if (elements.counter) {
    elements.counter.textContent = `${words} palabras`;
  }
};

const syncBodyState = () => {
  updateCounter();
  elements.body?.dispatchEvent(new Event("input", { bubbles: true }));
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
    value,
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
  const { selectedText, start, end } = getSelectionInfo();

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

const setAssistantBusy = (busy, label = "") => {
  state.assistantBusy = busy;
  elements.toolButtons.forEach((button) => {
    button.disabled = busy;
    button.classList.toggle("canvas-main__marker--busy", busy);
  });

  if (busy && label) {
    setToolStatus(label);
  } else if (!busy) {
    setToolStatus("Selecciona texto o usa las ayudas para seguir escribiendo.");
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
    showToast("Error de conexión al consultar la IA");
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
    "Corrige ortografía, gramática y puntuación. Conserva el idioma, la intención y el sentido. Devuelve solo el texto corregido, sin comentarios ni títulos.",
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
    "Mejora el estilo narrativo del texto, haciéndolo más claro, fluido y literario. Conserva la idea original. Devuelve solo el texto mejorado, sin explicaciones.",
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
  const title = elements.title?.textContent?.trim() || DEFAULT_TITLE;
  const context = value.slice(Math.max(0, start - 1800), start).trim();

  const prompt = context
    ? `Título: ${title}\n\nContinúa este relato a partir de este contexto:\n${context}`
    : `Título: ${title}\n\nEscribe un primer párrafo atractivo para comenzar este relato.`;

  const result = await requestAiTool(
    prompt,
    "Redacta un único fragmento nuevo en español, coherente con el contexto dado. No expliques lo que haces, no uses títulos y no repitas literalmente el texto previo.",
    "Pidiendo continuación...",
  );

  if (!result) {
    return;
  }

  const prefix = value.trim() ? "\n\n" : "";
  insertAtCursor(`${prefix}${result}`);
  showToast("Continuación añadida", "green");
};

const handleToolAction = async (action) => {
  if (!elements.body) {
    return;
  }

  switch (action) {
    case "undo":
      focusBody();
      document.execCommand?.("undo");
      break;
    case "redo":
      focusBody();
      document.execCommand?.("redo");
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
      insertAtCursor(" — ");
      break;
    case "scene":
      insertAtCursor("\n● ● ●\n");
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
  setToolStatus("Selecciona texto o usa las ayudas para seguir escribiendo.");
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
  showToast(
    data.version
      ? `${data.Mensaje || "Borrador guardado"} · Versión ${data.version}`
      : data.Mensaje || "Borrador guardado",
    "green",
  );
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

  const title = elements.exportTitle.value.trim() || elements.title.textContent?.trim() || DEFAULT_TITLE;
  const content = elements.body.value.trim();

  if (!content) {
    showToast("Todavia no hay contenido para guardar en biblioteca");
    return;
  }

  elements.title.textContent = title;
  elements.exportTitle.value = title;

  if (!(await persistStory())) {
    return;
  }

  showToast("Borrador listo en biblioteca", "green");
  window.location.href = new URL("../biblioteca/library.html", window.location.href).toString();
};

document.addEventListener("DOMContentLoaded", async () => {
  elements.body?.addEventListener("input", updateCounter);
  elements.title?.addEventListener("input", () => {
    elements.exportTitle.value = elements.title.textContent?.trim() || DEFAULT_TITLE;
  });
  elements.saveButton?.addEventListener("click", persistStory);
  elements.exportForm?.addEventListener("submit", exportStory);
  elements.newButton?.addEventListener("click", createStory);
  elements.toolButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      await handleToolAction(button.dataset.tool || "");
    });
  });

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
