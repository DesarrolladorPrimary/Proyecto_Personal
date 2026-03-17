import { fetchJson } from "../../utils/api-client.js";
import { getCurrentUserRole } from "../../utils/auth-session.js";

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
  const role = getCurrentUserRole();

  if (role.toLowerCase() !== "admin") {
    return;
  }

  try {
    const { ok, data } = await fetchJson("/api/v1/admin/models", {
      auth: true,
    });

    if (!ok) {
      showToast(data?.Mensaje || "No fue posible cargar el catálogo de modelos");
      return;
    }

    const freeModel = data?.modeloGratuito || {};
    const premiumModel = data?.modeloPremium || {};
    const models = Array.isArray(data?.modelos) ? data.modelos : [];

    if (elements.title) {
      elements.title.textContent = [premiumModel.nombre, premiumModel.version].filter(Boolean).join(" ") || "Modelo no disponible";
    }

    if (elements.status) {
      elements.status.textContent = `${models.length} modelo(s) activos`;
    }

    if (elements.plan) {
      elements.plan.textContent = "Catálogo global";
    }

    if (elements.description) {
      elements.description.textContent = premiumModel.descripcion || "No hay descripción registrada para el modelo premium preferido.";
    }

    if (elements.planNote) {
      elements.planNote.textContent = models.length
        ? `Modelo base: ${buildModelLabel(freeModel)}. Modelo avanzado: ${buildModelLabel(premiumModel)}.`
        : "No hay modelos activos registrados en el sistema.";
    }

    if (elements.changelog) {
      elements.changelog.textContent = premiumModel.changelog || "Sin notas de versión registradas.";
    }

    if (elements.access) {
      elements.access.textContent = models.length
        ? `Catálogo administrable: ${models.map((model) => buildModelLabel(model)).join(", ")}.`
        : "No fue posible obtener el catálogo de modelos.";
    }

    renderAvailableModels(models, premiumModel.id ?? null);
  } catch (error) {
    showToast("Error de conexión");
  }
});
