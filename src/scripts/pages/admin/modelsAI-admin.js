import { fetchJson } from "../../utils/api-client.js";
import { getCurrentUserId, getCurrentUserRole } from "../../utils/auth-session.js";

const elements = {
  title: document.getElementById("admin-model-title"),
  status: document.getElementById("admin-model-status"),
  plan: document.getElementById("admin-model-plan"),
  description: document.getElementById("admin-model-description"),
  planNote: document.getElementById("admin-model-plan-note"),
  list: document.getElementById("admin-model-list"),
  changelog: document.getElementById("admin-model-changelog"),
  access: document.getElementById("admin-model-access"),
};

const showToast = (text, background = "red") => {
  Toastify({
    text,
    duration: 2600,
    gravity: "top",
    position: "center",
    stopOnFocus: true,
    style: { background },
  }).showToast();
};

const buildModelLabel = (model) => {
  const name = [model.nombre, model.version].filter(Boolean).join(" ");
  if (!name) {
    return "Modelo sin nombre";
  }

  return model.gratuito ? `${name} · Gratuito` : `${name} · Premium`;
};

const renderAvailableModels = (models = [], currentModelId = null) => {
  if (!elements.list) {
    return;
  }

  elements.list.innerHTML = "";

  if (!models.length) {
    const item = document.createElement("li");
    item.className = "model-features__item";
    item.textContent = "No hay modelos disponibles para esta cuenta.";
    elements.list.appendChild(item);
    return;
  }

  models.forEach((model) => {
    const item = document.createElement("li");
    item.className = "model-features__item";
    const isCurrent = currentModelId != null && Number(model.id) === Number(currentModelId);
    const description = model.descripcion ? ` ${model.descripcion}` : "";
    item.textContent = `${buildModelLabel(model)}${isCurrent ? " · Actual" : ""}.${description}`;
    elements.list.appendChild(item);
  });
};

document.addEventListener("DOMContentLoaded", async () => {
  const userId = getCurrentUserId();
  const role = getCurrentUserRole();

  if (!userId || role.toLowerCase() !== "admin") {
    return;
  }

  try {
    const [versionResult, modelsResult, subscriptionResult] = await Promise.all([
      fetchJson("/api/v1/settings/version-ia", {
        params: { id: userId },
        auth: true,
      }),
      fetchJson("/api/v1/settings/modelo-disponible", {
        params: { id: userId },
        auth: true,
      }),
      fetchJson("/api/v1/settings/suscripcion", {
        params: { id: userId },
        auth: true,
      }),
    ]);

    if (!versionResult.ok) {
      showToast(versionResult.data?.Mensaje || "No fue posible cargar el modelo actual");
      return;
    }

    const versionData = versionResult.data || {};
    const modelsData = modelsResult.ok ? modelsResult.data : {};
    const subscriptionData = subscriptionResult.ok ? subscriptionResult.data : {};
    const models = Array.isArray(modelsData.modelos) ? modelsData.modelos : [];
    const plan = subscriptionData.plan || "Gratuito";

    if (elements.title) {
      elements.title.textContent = [versionData.nombre, versionData.version].filter(Boolean).join(" ") || "Modelo no disponible";
    }

    if (elements.status) {
      elements.status.textContent = versionData.activo ? "Activo" : "No disponible";
    }

    if (elements.plan) {
      elements.plan.textContent = plan;
    }

    if (elements.description) {
      elements.description.textContent = versionData.descripcion || "No hay descripción registrada para el modelo actual.";
    }

    if (elements.planNote) {
      elements.planNote.textContent = models.length
        ? `Esta cuenta puede usar ${models.length} modelo(s) según su plan actual.`
        : "No hay modelos habilitados para el plan actual.";
    }

    if (elements.changelog) {
      elements.changelog.textContent = versionData.changelog || "Sin notas de versión registradas.";
    }

    if (elements.access) {
      elements.access.textContent = models.length
        ? `Acceso disponible: ${models.map((model) => buildModelLabel(model)).join(", ")}.`
        : "No fue posible obtener la disponibilidad de modelos.";
    }

    renderAvailableModels(models, versionData.id ?? null);
  } catch (error) {
    showToast("Error de conexión");
  }
});
