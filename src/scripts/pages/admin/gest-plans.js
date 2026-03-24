import { fetchJson } from "../../utils/api-client.js";
import { showConfirm } from "../../utils/dialog-service.js";

const elements = {
  plansContainer: document.getElementById("admin-plans-list"),
  form: document.getElementById("admin-plan-form"),
  modal: document.getElementById("admin-plan-modal"),
  modalBackdrop: document.getElementById("admin-plan-modal-backdrop"),
  openButton: document.getElementById("admin-plan-open"),
  closeButton: document.getElementById("admin-plan-close"),
  editorTitle: document.getElementById("admin-plan-editor-title"),
  resetButton: document.getElementById("admin-plan-reset"),
  deleteButton: document.getElementById("admin-plan-delete"),
  submitButton: document.getElementById("admin-plan-submit"),
  summary: document.getElementById("admin-plan-errors"),
  code: document.getElementById("admin-plan-code"),
  name: document.getElementById("admin-plan-name"),
  storage: document.getElementById("admin-plan-storage"),
  price: document.getElementById("admin-plan-price"),
  color: document.getElementById("admin-plan-color"),
  colorText: document.getElementById("admin-plan-color-text"),
  role: document.getElementById("admin-plan-role"),
  model: document.getElementById("admin-plan-model"),
  active: document.getElementById("admin-plan-active"),
  fieldErrors: {
    code: document.getElementById("admin-plan-code-error"),
    name: document.getElementById("admin-plan-name-error"),
    storage: document.getElementById("admin-plan-storage-error"),
    price: document.getElementById("admin-plan-price-error"),
    color: document.getElementById("admin-plan-color-error"),
    role: document.getElementById("admin-plan-role-error"),
    model: document.getElementById("admin-plan-model-error"),
  },
};

const state = {
  plans: [],
  models: [],
  editingPlanId: null,
};

const showToast = (text, background = "red") => {
  Toastify({
    text,
    duration: 2800,
    gravity: "top",
    position: "center",
    stopOnFocus: true,
    style: { background },
  }).showToast();
};

const formatStorage = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Sin limite";
  }

  return `${amount} MB`;
};

const formatPrice = (value) => {
  const amount = Number(value) || 0;
  if (amount <= 0) {
    return "Gratis";
  }

  return `$${amount.toFixed(2)}`;
};

const getPlanHighlights = (roleBase) =>
  roleBase === "Premium"
    ? [
        "Acceso avanzado a Poly y respuestas mas extensas.",
        "Pensado para cargas creativas y asistencia mas completa.",
      ]
    : [
        "Cobertura base para biblioteca, relatos y ayudas esenciales.",
        "Ideal para acceso inicial y consumo controlado.",
      ];

const normalizePlanCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");

const normalizeColorHex = (value, fallback = "#4ECDC4") => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : fallback;
};

const getDefaultPlanColor = (roleBase) => (roleBase === "Premium" ? "#FFD700" : "#4ECDC4");

const syncColorInputs = (value, fallback = "#4ECDC4") => {
  const normalized = normalizeColorHex(value, fallback);
  if (elements.color) {
    elements.color.value = normalized;
  }
  if (elements.colorText) {
    elements.colorText.value = normalized;
  }
  return normalized;
};

const renderModelOptions = (roleBase = elements.role?.value || "Gratuito") => {
  if (!elements.model) {
    return;
  }

  const currentValue = elements.model.value;
  elements.model.innerHTML = `<option value="">Sin modelo principal</option>`;

  state.models
    .filter((model) => roleBase === "Premium" || Boolean(model.gratuito))
    .forEach((model) => {
    const option = document.createElement("option");
    option.value = String(model.id);
    option.textContent = `${model.nombre} (${model.version})${model.gratuito ? " · Gratis" : ""}`;
    elements.model.appendChild(option);
    });

  if ([...elements.model.options].some((option) => option.value === currentValue)) {
    elements.model.value = currentValue;
  } else {
    elements.model.value = "";
  }
};

const clearFieldError = (fieldName) => {
  const field = elements[fieldName];
  const errorNode = elements.fieldErrors[fieldName];
  if (field) {
    field.classList.remove("plan-editor__input--invalid");
  }
  if (errorNode) {
    errorNode.textContent = "";
  }
};

const setFieldError = (fieldName, message) => {
  const field = elements[fieldName];
  const errorNode = elements.fieldErrors[fieldName];
  if (field) {
    field.classList.add("plan-editor__input--invalid");
  }
  if (errorNode) {
    errorNode.textContent = message;
  }
};

const clearValidationState = () => {
  Object.keys(elements.fieldErrors).forEach(clearFieldError);
  elements.summary.hidden = true;
  elements.summary.textContent = "";
};

const openPlanModal = () => {
  elements.modal?.classList.add("plan-modal--open");
  elements.modal?.setAttribute("aria-hidden", "false");
};

const closePlanModal = () => {
  elements.modal?.classList.remove("plan-modal--open");
  elements.modal?.setAttribute("aria-hidden", "true");
  clearValidationState();
};

const resetPlanForm = () => {
  state.editingPlanId = null;
  elements.editorTitle.textContent = "Crear plan";
  elements.submitButton.textContent = "Crear plan";
  elements.deleteButton?.classList.add("plan-editor__delete--hidden");
  elements.form.reset();
  elements.active.checked = true;
  elements.role.value = "Gratuito";
  renderModelOptions("Gratuito");
  syncColorInputs(getDefaultPlanColor("Gratuito"));
  elements.model.value = "";
  clearValidationState();
};

const fillPlanForm = (plan) => {
  state.editingPlanId = Number(plan.PK_PlanID);
  elements.editorTitle.textContent = `Editar ${plan.NombrePlan || "plan"}`;
  elements.submitButton.textContent = "Guardar cambios";
  elements.deleteButton?.classList.remove("plan-editor__delete--hidden");
  elements.code.value = plan.CodigoPlan || "";
  elements.name.value = plan.NombrePlan || "";
  elements.storage.value = Number(plan.AlmacenamientoMaxMB) > 0 ? String(plan.AlmacenamientoMaxMB) : "";
  elements.price.value = Number(plan.Precio || 0).toFixed(2);
  elements.role.value = plan.RolBase === "Premium" ? "Premium" : "Gratuito";
  syncColorInputs(plan.ColorHex || getDefaultPlanColor(elements.role.value), getDefaultPlanColor(elements.role.value));
  renderModelOptions(elements.role.value);
  elements.model.value = Number(plan.FK_ModeloPreferidoID) > 0 ? String(plan.FK_ModeloPreferidoID) : "";
  elements.active.checked = Boolean(plan.Activo);
  clearValidationState();
};

const buildPlanCard = (plan) => {
  const card = document.createElement("article");
  const roleBase = plan.RolBase === "Premium" ? "Premium" : "Gratuito";
  const isPremium = roleBase === "Premium";
  const highlights = getPlanHighlights(roleBase);
  const statusText = plan.Activo ? "Activo" : "Inactivo";
  const accentColor = normalizeColorHex(plan.ColorHex || "", getDefaultPlanColor(roleBase));
  const preferredModel = plan.ModeloPreferidoNombre
    ? `${plan.ModeloPreferidoNombre}${plan.ModeloPreferidoVersion ? ` (${plan.ModeloPreferidoVersion})` : ""}`
    : "Sin modelo principal";

  card.className = `plan-card ${isPremium ? "plan-card--premium" : "plan-card--basic"}`;
  card.style.setProperty("--plan-accent", accentColor);
  card.innerHTML = `
    <div class="plan-card__head">
      <div class="plan-card__identity">
        <span class="plan-card__eyebrow">${isPremium ? "Plan destacado" : "Plan base"}</span>
        <h2 class="plan-card__title">
          <span class="plan-card__title-icon">${roleBase}</span>
          ${plan.NombrePlan || "Plan"}
        </h2>
        <span class="plan-card__code">${plan.CodigoPlan || "SIN_CODIGO"}</span>
      </div>
      <span class="plan-card__badge ${plan.Activo ? "plan-card__badge--active" : "plan-card__badge--inactive"}">
        ${statusText}
      </span>
    </div>

    <div class="plan-card__price-block">
      <strong class="plan-card__price">${formatPrice(plan.Precio)}</strong>
      <span class="plan-card__period">${Number(plan.Precio || 0) > 0 ? "/mes simulado" : "incluido en beta"}</span>
    </div>

    <div class="plan-card__metrics">
      <div class="plan-card__metric">
        <span class="plan-card__metric-label">Usuarios activos</span>
        <strong class="plan-card__metric-value">${plan.UsuariosActivos ?? 0}</strong>
      </div>
      <div class="plan-card__metric">
        <span class="plan-card__metric-label">Espacio</span>
        <strong class="plan-card__metric-value">${formatStorage(plan.AlmacenamientoMaxMB)}</strong>
      </div>
      <div class="plan-card__metric">
        <span class="plan-card__metric-label">Modelo IA</span>
        <strong class="plan-card__metric-value">${preferredModel}</strong>
      </div>
    </div>

    <ul class="plan-card__features">
      ${highlights
        .map(
          (highlight) => `
            <li class="plan-card__feature">
              <span class="plan-card__feature-label">Cobertura</span>
              <p class="plan-card__feature-text">${highlight}</p>
            </li>
          `,
        )
        .join("")}
    </ul>

    <div class="plan-card__footer">
      <p class="plan-card__status">Rol base del plan: ${roleBase}. Estado operativo: ${statusText.toLowerCase()}.</p>
      <div class="plan-card__actions">
        <button type="button" class="plan-card__edit" data-plan-id="${plan.PK_PlanID}">
          Editar plan
        </button>
        <span class="plan-card__accent">${isPremium ? "IA avanzada" : "Acceso esencial"}</span>
      </div>
    </div>
  `;

  return card;
};

const renderPlans = () => {
  elements.plansContainer.innerHTML = "";

  if (!state.plans.length) {
    const emptyState = document.createElement("article");
    emptyState.className = "plans-empty";
    emptyState.innerHTML = `
      <strong>No hay planes para mostrar.</strong>
      <p>Crea el primer plan desde el botón principal.</p>
    `;
    elements.plansContainer.appendChild(emptyState);
    return;
  }

  state.plans.forEach((plan) => {
    elements.plansContainer.appendChild(buildPlanCard(plan));
  });
};

const loadPlans = async () => {
  const { ok, data } = await fetchJson("/api/v1/admin/plans", {
    auth: true,
  });

  if (!ok || !Array.isArray(data)) {
    throw new Error("No fue posible cargar los planes");
  }

  state.plans = data.filter((item) => !item.Mensaje);
  renderPlans();
};

const loadModels = async () => {
  const { ok, data } = await fetchJson("/api/v1/admin/models", {
    auth: true,
  });

  if (!ok || !Array.isArray(data?.modelos)) {
    throw new Error("No fue posible cargar el catálogo de modelos");
  }

  state.models = data.modelos;
  renderModelOptions(elements.role?.value || "Gratuito");
};

const validatePayload = () => {
  clearValidationState();

  const payload = {
    codigo: normalizePlanCode(elements.code.value),
    nombre: elements.name.value.trim(),
    almacenamientoMaxMB: null,
    precio: Number(elements.price.value || 0),
    colorHex: normalizeColorHex(elements.colorText?.value || elements.color?.value || "", getDefaultPlanColor(elements.role.value)),
    rolBase: elements.role.value,
    modeloPreferidoId: null,
    activo: elements.active.checked,
  };

  elements.code.value = payload.codigo;
  syncColorInputs(payload.colorHex, getDefaultPlanColor(payload.rolBase));

  const errors = [];
  const storageValue = elements.storage.value.trim();
  const selectedModelValue = elements.model?.value?.trim() || "";

  if (!/^[A-Z0-9_]{2,30}$/.test(payload.codigo)) {
    const message = "Usa entre 2 y 30 caracteres en mayúsculas, números o guion bajo.";
    setFieldError("code", message);
    errors.push(message);
  }

  if (payload.nombre.length < 3 || payload.nombre.length > 100) {
    const message = "El nombre visible debe tener entre 3 y 100 caracteres.";
    setFieldError("name", message);
    errors.push(message);
  }

  if (storageValue) {
    const storageNumber = Number(storageValue);
    if (!Number.isInteger(storageNumber) || storageNumber < 0) {
      const message = "El espacio debe ser un entero igual o mayor que 0.";
      setFieldError("storage", message);
      errors.push(message);
    } else {
      payload.almacenamientoMaxMB = storageNumber;
    }
  }

  if (!Number.isFinite(payload.precio) || payload.precio < 0) {
    const message = "El precio debe ser un número igual o mayor que 0.";
    setFieldError("price", message);
    errors.push(message);
  }

  if (!/^#[0-9A-F]{6}$/.test(payload.colorHex)) {
    const message = "El color debe estar en formato hexadecimal, por ejemplo #4ECDC4.";
    setFieldError("color", message);
    errors.push(message);
  }

  if (!["Gratuito", "Premium"].includes(payload.rolBase)) {
    const message = "Selecciona un rol base válido para el plan.";
    setFieldError("role", message);
    errors.push(message);
  }

  if (selectedModelValue) {
    const preferredModelId = Number(selectedModelValue);
    const selectedModel = state.models.find((model) => Number(model.id) === preferredModelId);

    if (!Number.isInteger(preferredModelId) || preferredModelId <= 0 || !selectedModel) {
      const message = "Selecciona un modelo IA válido para el plan.";
      setFieldError("model", message);
      errors.push(message);
    } else if (payload.rolBase === "Gratuito" && !selectedModel.gratuito) {
      const message = "Un plan Gratuito solo puede usar modelos marcados como gratuitos.";
      setFieldError("model", message);
      errors.push(message);
    } else {
      payload.modeloPreferidoId = preferredModelId;
    }
  }

  if (errors.length) {
    elements.summary.hidden = false;
    elements.summary.textContent = "Revisa los campos marcados antes de guardar el plan.";
    return null;
  }

  return payload;
};

const handlePlanSubmit = async (event) => {
  event.preventDefault();

  const payload = validatePayload();
  if (!payload) {
    showToast("Revisa los campos del plan antes de continuar");
    return;
  }

  const isEditing = Number.isInteger(state.editingPlanId) && state.editingPlanId > 0;

  try {
    const { ok, data } = await fetchJson("/api/v1/admin/plans", {
      method: isEditing ? "PUT" : "POST",
      params: isEditing ? { id: state.editingPlanId } : undefined,
      auth: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!ok) {
      showToast(data.Mensaje || "No fue posible guardar el plan");
      return;
    }

    showToast(data.Mensaje || (isEditing ? "Plan actualizado" : "Plan creado"), "green");
    resetPlanForm();
    closePlanModal();
    await loadPlans();
  } catch (error) {
    showToast("Error de conexion");
  }
};

const handlePlanDelete = async () => {
  const planId = Number(state.editingPlanId);
  if (!Number.isInteger(planId) || planId <= 0) {
    return;
  }

  const confirmed = await showConfirm({
    title: "¿Eliminar este plan?",
    text: "Solo se eliminará si no tiene suscripciones asociadas. Esta acción no se puede deshacer.",
    icon: "warning",
  });

  if (!confirmed) {
    return;
  }

  try {
    const { ok, data } = await fetchJson("/api/v1/admin/plans", {
      method: "DELETE",
      params: { id: planId },
      auth: true,
    });

    if (!ok) {
      showToast(data.Mensaje || "No fue posible eliminar el plan");
      return;
    }

    showToast(data.Mensaje || "Plan eliminado", "green");
    resetPlanForm();
    closePlanModal();
    await loadPlans();
  } catch (error) {
    showToast("Error de conexion");
  }
};

const handlePlansClick = (event) => {
  const editButton = event.target.closest("[data-plan-id]");
  if (!editButton) {
    return;
  }

  const planId = Number(editButton.dataset.planId);
  const plan = state.plans.find((item) => Number(item.PK_PlanID) === planId);
  if (!plan) {
    return;
  }

  fillPlanForm(plan);
  openPlanModal();
  elements.code.focus();
};

document.addEventListener("DOMContentLoaded", async () => {
  elements.form?.addEventListener("submit", handlePlanSubmit);
  elements.resetButton?.addEventListener("click", resetPlanForm);
  elements.openButton?.addEventListener("click", () => {
    resetPlanForm();
    openPlanModal();
    elements.code.focus();
  });
  elements.closeButton?.addEventListener("click", closePlanModal);
  elements.deleteButton?.addEventListener("click", handlePlanDelete);
  elements.modalBackdrop?.addEventListener("click", closePlanModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.modal?.classList.contains("plan-modal--open")) {
      closePlanModal();
    }
  });
  elements.code?.addEventListener("input", () => {
    const nextValue = normalizePlanCode(elements.code.value);
    if (elements.code.value !== nextValue) {
      elements.code.value = nextValue;
    }
    clearFieldError("code");
  });
  elements.name?.addEventListener("input", () => clearFieldError("name"));
  elements.storage?.addEventListener("input", () => clearFieldError("storage"));
  elements.price?.addEventListener("input", () => clearFieldError("price"));
  elements.model?.addEventListener("change", () => clearFieldError("model"));
  elements.color?.addEventListener("input", () => {
    syncColorInputs(elements.color.value, getDefaultPlanColor(elements.role.value));
    clearFieldError("color");
  });
  elements.colorText?.addEventListener("input", () => {
    const normalized = elements.colorText.value.trim().toUpperCase();
    elements.colorText.value = normalized;
    if (/^#[0-9A-F]{6}$/.test(normalized)) {
      elements.color.value = normalized;
    }
    clearFieldError("color");
  });
  elements.role?.addEventListener("change", () => {
    const currentColor = elements.colorText?.value || "";
    syncColorInputs(currentColor, getDefaultPlanColor(elements.role.value));
    renderModelOptions(elements.role.value);
    clearFieldError("role");
    clearFieldError("model");
  });
  elements.plansContainer?.addEventListener("click", handlePlansClick);

  resetPlanForm();

  try {
    await loadModels();
    await loadPlans();
  } catch (error) {
    showToast("No fue posible cargar los datos del catálogo");
  }
});
