import { fetchJson } from "../../utils/api-client.js";
import { getCurrentUserId } from "../../utils/auth-session.js";

const textarea = document.querySelector(".ai-instructions__input");
const btnGuardar = document.querySelector(".ai-instructions__btn");
const trigger = document.querySelector("#save-trigger");
const msg = document.querySelector(".ai-instructions__success-msg");
const modelCurrent = document.querySelector("#ai-model-current");
const modelChangelog = document.querySelector("#ai-model-changelog");
const modelPlanNote = document.querySelector("#ai-model-plan-note");

const mostrarMensaje = (texto) => {
  msg.textContent = texto;
  trigger.checked = false;
  void trigger.offsetWidth;
  trigger.checked = true;
  setTimeout(() => {
    trigger.checked = false;
  }, 2400);
};

const setModelState = ({
  current = "No disponible",
  changelog = "",
  planNote = "",
} = {}) => {
  if (modelCurrent) {
    modelCurrent.textContent = current;
  }

  if (modelChangelog) {
    modelChangelog.textContent = changelog;
  }

  if (modelPlanNote) {
    modelPlanNote.textContent = planNote;
  }
};

const cargarInstruccion = async (id) => {
  const { ok, data } = await fetchJson("/api/v1/settings/instruccion-ia", {
    params: { id },
    auth: true,
  });

  if (ok && typeof data.instruccion === "string") {
    textarea.value = data.instruccion;
  }
};

const cargarModeloIA = async (id) => {
  const [versionResult, modelosResult] = await Promise.all([
    fetchJson("/api/v1/settings/version-ia", {
      params: { id },
      auth: true,
    }),
    fetchJson("/api/v1/settings/modelo-disponible", {
      params: { id },
      auth: true,
    }),
  ]);

  const versionData = versionResult.ok ? versionResult.data : {};
  const modelosData = modelosResult.ok ? modelosResult.data : {};
  const modelos = Array.isArray(modelosData.modelos) ? modelosData.modelos : [];
  const current = [versionData.nombre, versionData.version].filter(Boolean).join(" ") || "No disponible";
  const availableModels = modelos
    .map((model) => [model.nombre, model.version].filter(Boolean).join(" "))
    .filter(Boolean);

  setModelState({
    current,
    changelog: versionData.changelog || "Sin notas de versión disponibles.",
    planNote: availableModels.length
      ? `Modelos disponibles para tu plan: ${availableModels.join(", ")}.`
      : "No fue posible obtener los modelos disponibles para tu plan.",
  });
};

btnGuardar?.addEventListener("click", async (event) => {
  event.preventDefault();

  const id = getCurrentUserId();
  if (!id) {
    return;
  }

  try {
    const { ok, data } = await fetchJson("/api/v1/settings/instruccion-ia", {
      method: "PUT",
      params: { id },
      auth: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruccion: textarea.value || "" }),
    });

    mostrarMensaje(ok ? "Guardado con éxito" : data.Mensaje || "Error al guardar");
  } catch (error) {
    mostrarMensaje("Error al guardar");
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const id = getCurrentUserId();

  if (!id) {
    return;
  }

  try {
    await cargarInstruccion(id);
    await cargarModeloIA(id);
  } catch (error) {
    setModelState({
      current: "No disponible",
      changelog: "No fue posible cargar la información del modelo.",
      planNote: "No fue posible cargar los modelos disponibles para tu plan.",
    });
    mostrarMensaje("No fue posible cargar la instrucción");
  }
});
