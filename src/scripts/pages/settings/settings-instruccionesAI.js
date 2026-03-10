import { fetchJson } from "/src/scripts/utils/api-client.js";
import { getCurrentUserId } from "/src/scripts/utils/auth-session.js";

const textarea = document.querySelector(".ai-instructions__input");
const btnGuardar = document.querySelector(".ai-instructions__btn");
const trigger = document.querySelector("#save-trigger");
const msg = document.querySelector(".ai-instructions__success-msg");
const currentModelText = document.querySelector("#ai-model-current");
const changelogText = document.querySelector("#ai-model-changelog");
const planNote = document.querySelector("#ai-model-plan-note");

const showMessage = (text) => {
  msg.textContent = text;
  trigger.checked = false;
  void trigger.offsetWidth;
  trigger.checked = true;
  setTimeout(() => {
    trigger.checked = false;
  }, 2400);
};

const formatModelLabel = (data = {}) => {
  const name = String(data.nombre || "Modelo no disponible").trim();
  const version = String(data.version || "").trim();
  return version ? `${name} (${version})` : name;
};

const loadInstruction = async (id) => {
  const { ok, data } = await fetchJson("/api/v1/settings/instruccion-ia", {
    params: { id },
    auth: true,
  });

  if (ok && typeof data.instruccion === "string" && textarea) {
    textarea.value = data.instruccion;
  }
};

const loadModelInfo = async (id) => {
  const [versionResponse, subscriptionResponse] = await Promise.all([
    fetchJson("/api/v1/settings/version-ia", {
      params: { id },
      auth: true,
    }),
    fetchJson("/api/v1/settings/suscripcion", {
      params: { id },
      auth: true,
    }),
  ]);

  if (currentModelText) {
    currentModelText.textContent = versionResponse.ok
      ? formatModelLabel(versionResponse.data)
      : versionResponse.data.Mensaje || "No fue posible cargar el modelo actual";
  }

  if (changelogText) {
    changelogText.textContent = versionResponse.ok
      ? versionResponse.data.changelog || versionResponse.data.descripcion || "Sin notas de versión disponibles."
      : "";
  }

  if (planNote) {
    if (subscriptionResponse.ok) {
      const plan = subscriptionResponse.data.plan || "Gratuito";
      planNote.textContent = `Plan actual: ${plan}. El backend enruta Poly según la configuración activa y tu plan.`;
    } else {
      planNote.textContent = "Poly usa el modelo activo configurado por la plataforma.";
    }
  }
};

const saveInstruction = async (id) => {
  const { ok, data } = await fetchJson("/api/v1/settings/instruccion-ia", {
    method: "PUT",
    params: { id },
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instruccion: textarea?.value || "" }),
  });

  showMessage(ok ? "Instruccion guardada con exito" : data.Mensaje || "Error al guardar");
};

btnGuardar?.addEventListener("click", async (event) => {
  event.preventDefault();

  const id = getCurrentUserId();
  if (!id) {
    return;
  }

  try {
    await saveInstruction(id);
  } catch (error) {
    showMessage("Error al guardar");
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const id = getCurrentUserId();

  if (!id) {
    return;
  }

  try {
    await Promise.all([
      loadInstruction(id),
      loadModelInfo(id),
    ]);
  } catch (error) {
    showMessage("No fue posible cargar la configuracion de Poly");
  }
});
