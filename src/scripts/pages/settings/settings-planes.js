import { fetchJson } from "../../utils/api-client.js";
import { getCurrentUserId } from "../../utils/auth-session.js";

const elements = {
  currentName: document.getElementById("plans-current-name"),
  currentMeta: document.getElementById("plans-current-meta"),
  currentStorage: document.getElementById("plans-current-storage"),
  currentModel: document.getElementById("plans-current-model"),
  currentPrice: document.getElementById("plans-current-price"),
  currentBadge: document.getElementById("plans-current-badge"),
  currentPanel: document.getElementById("plans-current-summary"),
  catalog: document.getElementById("plans-catalog"),
  paymentToggle: document.getElementById("checkPay"),
  paymentTitle: document.getElementById("payment-loading-title"),
  paymentText: document.getElementById("payment-loading-text"),
};

const state = {
  plans: [],
  currentPlanId: 0,
  currentPlanCode: "GRATUITO",
  currentPlanName: "Plan Gratuito",
  currentPlanRole: "Gratuito",
  submittingPlanId: null,
};

const showToast = (text, background = "#2a2727") => {
  if (!text || typeof window.Toastify !== "function") {
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

const normalizeColorHex = (value, fallback = "#4ECDC4") => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : fallback;
};

const normalizeRole = (role) => (String(role || "").toLowerCase().includes("premium") ? "Premium" : "Gratuito");

const formatPrice = (value) => {
  const amount = Number(value) || 0;
  if (amount <= 0) {
    return "Gratis";
  }

  return `$${amount.toFixed(2)}/mes`;
};

const formatStorage = (value, unlimited = false) => {
  const amount = Number(value) || 0;
  if (unlimited || amount <= 0) {
    return "Sin límite";
  }

  if (amount >= 1024) {
    return `${(amount / 1024).toFixed(amount % 1024 === 0 ? 0 : 1)} GB`;
  }

  return `${amount} MB`;
};

const isCurrentPlan = (plan) => {
  const planId = Number(plan.id || 0);
  const planCode = String(plan.codigoPlan || "").trim().toUpperCase();

  if (state.currentPlanId > 0) {
    return planId === state.currentPlanId;
  }

  return planCode === state.currentPlanCode;
};

const getPlanHighlights = (plan) => {
  const roleBase = normalizeRole(plan.rolBase);
  const storage = formatStorage(plan.almacenamientoMaxMb, plan.almacenamientoIlimitado);
  const preferredModel = plan.modeloPreferidoNombre
    ? `${plan.modeloPreferidoNombre}${plan.modeloPreferidoVersion ? ` (${plan.modeloPreferidoVersion})` : ""}`
    : roleBase === "Premium"
      ? "Catálogo premium activo"
      : "Catálogo gratuito activo";

  const highlights = [
    `Espacio disponible: ${storage}.`,
    `Modelo principal: ${preferredModel}.`,
  ];

  if (roleBase === "Premium") {
    highlights.push("Acceso ampliado para Poly, canvas y ayudas IA más completas.");
  } else {
    highlights.push("Acceso base para biblioteca, relatos y modelos gratuitos.");
  }

  return highlights;
};

const setLoading = (loading, title, message) => {
  if (elements.paymentToggle) {
    elements.paymentToggle.checked = loading;
  }

  if (elements.paymentTitle && title) {
    elements.paymentTitle.innerHTML = title;
  }

  if (elements.paymentText && message) {
    elements.paymentText.textContent = message;
  }
};

const renderCurrentSummary = (subscription = {}) => {
  const name = subscription.nombrePlan || "Sin plan activo";
  const role = normalizeRole(subscription.plan);
  const price = formatPrice(subscription.precio);
  const storage = formatStorage(subscription.limiteAlmacenamientoMb, subscription.almacenamientoIlimitado);
  const usedStorage = Number(subscription.almacenamientoUsadoMb || 0).toFixed(2);

  state.currentPlanName = name;
  state.currentPlanRole = role;
  state.currentPlanId = Number(subscription.planId || 0);
  state.currentPlanCode = String(subscription.codigoPlan || "GRATUITO").trim().toUpperCase();
  const preferredModel = state.plans.find((plan) => isCurrentPlan(plan))?.modeloPreferidoNombre
    || "Sin modelo principal";
  const accentColor = normalizeColorHex(subscription.colorHex, role === "Premium" ? "#FFD700" : "#4ECDC4");

  elements.currentPanel?.style.setProperty("--plan-accent", accentColor);
  if (elements.currentBadge) {
    elements.currentBadge.textContent = role;
    elements.currentBadge.classList.toggle("plans-current__badge--premium", role === "Premium");
  }
  if (elements.currentName) {
    elements.currentName.textContent = name;
  }
  if (elements.currentMeta) {
    elements.currentMeta.textContent = subscription.estado === "Activa"
      ? "Tu cuenta opera con este plan en este momento."
      : "Tu cuenta no tiene una suscripción activa; se muestra el plan base.";
  }
  if (elements.currentStorage) {
    elements.currentStorage.textContent = `${storage} · usado ${usedStorage} MB`;
  }
  if (elements.currentModel) {
    elements.currentModel.textContent = preferredModel;
  }
  if (elements.currentPrice) {
    elements.currentPrice.textContent = price;
  }
};

const renderEmptyState = (message) => {
  if (!elements.catalog) {
    return;
  }

  elements.catalog.innerHTML = `
    <article class="plans-empty">
      <strong class="plans-empty__title">No pudimos cargar los planes</strong>
      <p class="plans-empty__text">${message}</p>
    </article>
  `;
};

const getActionLabel = (plan) => {
  if (isCurrentPlan(plan)) {
    return "Tu plan actual";
  }

  const amount = Number(plan.precio) || 0;
  return amount > 0 ? "Activar este plan" : "Cambiar a este plan";
};

const buildPlanCard = (plan) => {
  const article = document.createElement("article");
  const roleBase = normalizeRole(plan.rolBase);
  const accentColor = normalizeColorHex(plan.colorHex, roleBase === "Premium" ? "#FFD700" : "#4ECDC4");
  const current = isCurrentPlan(plan);
  const storage = formatStorage(plan.almacenamientoMaxMb, plan.almacenamientoIlimitado);
  const preferredModel = plan.modeloPreferidoNombre
    ? `${plan.modeloPreferidoNombre}${plan.modeloPreferidoVersion ? ` (${plan.modeloPreferidoVersion})` : ""}`
    : "Sin modelo principal";
  const actionDisabled = current || state.submittingPlanId !== null || !plan.activo;

  article.className = `plan-card ${roleBase === "Premium" ? "plan-card--premium" : "plan-card--basic"}${current ? " plan-card--current" : ""}`;
  article.style.setProperty("--plan-accent", accentColor);
  article.innerHTML = `
    <div class="plan-card__glow"></div>
    <div class="plan-card__head">
      <div class="plan-card__identity">
        <span class="plan-card__eyebrow">${roleBase === "Premium" ? "Capa ampliada" : "Capa base"}</span>
        <h2 class="plan-card__title">${plan.nombrePlan}</h2>
        <span class="plan-card__code">${plan.codigoPlan}</span>
      </div>
      <div class="plan-card__badges">
        <span class="plan-card__badge">${roleBase}</span>
        ${current ? '<span class="plan-card__badge plan-card__badge--current">Actual</span>' : ""}
      </div>
    </div>

    <div class="plan-card__price-block">
      <strong class="plan-card__price">${formatPrice(plan.precio)}</strong>
      <span class="plan-card__storage">${storage}</span>
    </div>

    <div class="plan-card__meta">
      <div class="plan-card__meta-item">
        <span class="plan-card__meta-label">Modelo IA</span>
        <strong class="plan-card__meta-value">${preferredModel}</strong>
      </div>
      <div class="plan-card__meta-item">
        <span class="plan-card__meta-label">Estado</span>
        <strong class="plan-card__meta-value">${plan.activo ? "Disponible" : "No disponible"}</strong>
      </div>
    </div>

    <ul class="plan-card__features">
      ${getPlanHighlights(plan)
        .map(
          (highlight) => `
            <li class="plan-card__feature">
              <span class="plan-card__feature-dot"></span>
              <span class="plan-card__feature-text">${highlight}</span>
            </li>
          `,
        )
        .join("")}
    </ul>

    <button
      type="button"
      class="plan-card__button${current ? " plan-card__button--current" : ""}"
      data-plan-id="${plan.id}"
      ${actionDisabled ? "disabled" : ""}
    >
      ${getActionLabel(plan)}
    </button>
  `;

  const button = article.querySelector(".plan-card__button");
  button?.addEventListener("click", () => simulatePlanChange(plan));

  return article;
};

const renderPlans = () => {
  if (!elements.catalog) {
    return;
  }

  elements.catalog.innerHTML = "";

  if (!state.plans.length) {
    renderEmptyState("Aún no hay planes visibles para tu cuenta.");
    return;
  }

  state.plans.forEach((plan) => {
    elements.catalog.appendChild(buildPlanCard(plan));
  });
};

const loadPlansCatalog = async () => {
  const userId = getCurrentUserId();
  if (!userId) {
    renderEmptyState("No pudimos identificar tu sesión actual.");
    return;
  }

  try {
    const { ok, data } = await fetchJson("/api/v1/settings/planes", {
      params: { id: userId },
      auth: true,
    });

    if (!ok) {
      renderEmptyState(data?.Mensaje || "No fue posible cargar el catálogo de planes.");
      return;
    }

    state.plans = Array.isArray(data?.planes) ? data.planes : [];
    renderCurrentSummary(data?.suscripcion || {});
    renderPlans();
  } catch (error) {
    renderEmptyState("Ocurrió un error de red mientras intentábamos cargar tus planes.");
  }
};

const simulatePlanChange = async (plan) => {
  if (!plan || state.submittingPlanId !== null || isCurrentPlan(plan)) {
    return;
  }

  const userId = getCurrentUserId();
  if (!userId) {
    showToast("No pudimos identificar tu cuenta actual.", "#b42318");
    return;
  }

  state.submittingPlanId = Number(plan.id);
  renderPlans();

  const title = Number(plan.precio) > 0
    ? `Activando <br />${plan.nombrePlan}...`
    : `Cambiando a <br />${plan.nombrePlan}...`;
  const message = Number(plan.precio) > 0
    ? `Se registrará un pago simulado y tu cuenta adoptará el plan ${plan.nombrePlan}.`
    : `Tu cuenta se moverá al plan ${plan.nombrePlan} sin cobro simulado.`;

  setLoading(true, title, message);

  try {
    const { ok, data } = await fetchJson("/api/v1/settings/suscripcion/simular", {
      method: "PUT",
      params: { id: userId },
      auth: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id }),
    });

    if (!ok) {
      showToast(data?.Mensaje || "No fue posible actualizar el plan", "#b42318");
      return;
    }

    if (data?.Token) {
      localStorage.setItem("Token", data.Token);
    }

    showToast(data?.Mensaje || "Plan actualizado correctamente", "#0f766e");
    await loadPlansCatalog();
  } catch (error) {
    showToast("Error de red al actualizar el plan", "#b42318");
  } finally {
    state.submittingPlanId = null;
    setLoading(false, "Actualizando <br />plan...", "Preparando el cambio de suscripción en tu cuenta.");
    renderPlans();
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  await loadPlansCatalog();
});
