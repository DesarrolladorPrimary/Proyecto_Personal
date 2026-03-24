import { fetchJson } from "../../utils/api-client.js";

const elements = {
  plansContainer: document.getElementById("admin-plans-list"),
  form: document.getElementById("admin-plan-form"),
  editorTitle: document.getElementById("admin-plan-editor-title"),
  resetButton: document.getElementById("admin-plan-reset"),
  submitButton: document.getElementById("admin-plan-submit"),
  code: document.getElementById("admin-plan-code"),
  name: document.getElementById("admin-plan-name"),
  storage: document.getElementById("admin-plan-storage"),
  price: document.getElementById("admin-plan-price"),
  role: document.getElementById("admin-plan-role"),
  active: document.getElementById("admin-plan-active"),
};

const state = {
  plans: [],
  editingPlanId: null,
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

const resetPlanForm = () => {
  state.editingPlanId = null;
  elements.editorTitle.textContent = "Crear plan";
  elements.submitButton.textContent = "Crear plan";
  elements.form.reset();
  elements.active.checked = true;
  elements.role.value = "Gratuito";
};

const fillPlanForm = (plan) => {
  state.editingPlanId = Number(plan.PK_PlanID);
  elements.editorTitle.textContent = `Editar ${plan.NombrePlan || "plan"}`;
  elements.submitButton.textContent = "Guardar cambios";
  elements.code.value = plan.CodigoPlan || "";
  elements.name.value = plan.NombrePlan || "";
  elements.storage.value = Number(plan.AlmacenamientoMaxMB) > 0 ? String(plan.AlmacenamientoMaxMB) : "";
  elements.price.value = Number(plan.Precio || 0).toFixed(2);
  elements.role.value = plan.RolBase === "Premium" ? "Premium" : "Gratuito";
  elements.active.checked = Boolean(plan.Activo);
  elements.code.focus();
};

const buildPlanCard = (plan) => {
  const card = document.createElement("article");
  const roleBase = plan.RolBase === "Premium" ? "Premium" : "Gratuito";
  const isPremium = roleBase === "Premium";
  const highlights = getPlanHighlights(roleBase);
  const statusText = plan.Activo ? "Activo" : "Inactivo";

  card.className = `plan-card ${isPremium ? "plan-card--premium" : "plan-card--basic"}`;
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
      <p>Crea el primer plan desde el formulario superior.</p>
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

const buildPayloadFromForm = () => {
  const storageValue = elements.storage.value.trim();

  return {
    codigo: normalizePlanCode(elements.code.value),
    nombre: elements.name.value.trim(),
    almacenamientoMaxMB: storageValue ? Number(storageValue) : null,
    precio: Number(elements.price.value || 0),
    rolBase: elements.role.value,
    activo: elements.active.checked,
  };
};

const handlePlanSubmit = async (event) => {
  event.preventDefault();

  const payload = buildPayloadFromForm();
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
  window.scrollTo({ top: 0, behavior: "smooth" });
};

document.addEventListener("DOMContentLoaded", async () => {
  elements.form?.addEventListener("submit", handlePlanSubmit);
  elements.resetButton?.addEventListener("click", resetPlanForm);
  elements.code?.addEventListener("input", () => {
    const nextValue = normalizePlanCode(elements.code.value);
    if (elements.code.value !== nextValue) {
      elements.code.value = nextValue;
    }
  });
  elements.plansContainer?.addEventListener("click", handlePlansClick);

  resetPlanForm();

  try {
    await loadPlans();
  } catch (error) {
    showToast("No fue posible cargar los planes");
  }
});
