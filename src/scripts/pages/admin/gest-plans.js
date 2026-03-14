import { fetchJson } from "../../utils/api-client.js";

const plansContainer = document.getElementById("admin-plans-list");

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

const formatStorage = (value, isPremium) => {
  if (!value || Number(value) <= 0) {
    return isPremium ? "2048 MB" : "500 MB";
  }

  return `${value} MB`;
};

const formatPrice = (value) => {
  const amount = Number(value) || 0;
  if (amount <= 0) {
    return "Gratis";
  }

  return `$${amount.toFixed(2)}`;
};

const getPlanHighlights = (isPremium) =>
  isPremium
    ? [
        "Acceso completo a Poly y respuestas extendidas.",
        "Mas herramientas creativas y asistencia avanzada.",
      ]
    : [
        "Acceso base a biblioteca y creacion de relatos.",
        "Uso inicial de Poly y herramientas esenciales.",
      ];

const buildPlanCard = (plan) => {
  const card = document.createElement("article");
  const isPremium = (plan.NombrePlan || "").toLowerCase().includes("premium");
  const highlights = getPlanHighlights(isPremium);
  const statusText = plan.Activo ? "Activo" : "Inactivo";

  card.className = `plan-card ${isPremium ? "plan-card--premium" : "plan-card--basic"}`;
  card.innerHTML = `
    <div class="plan-card__head">
      <div class="plan-card__identity">
        <span class="plan-card__eyebrow">${isPremium ? "Plan destacado" : "Plan base"}</span>
        <h2 class="plan-card__title">
          <span class="plan-card__title-icon">${isPremium ? "Premium" : "Base"}</span>
          ${plan.NombrePlan || "Plan"}
        </h2>
      </div>
      <span class="plan-card__badge ${plan.Activo ? "plan-card__badge--active" : "plan-card__badge--inactive"}">
        ${statusText}
      </span>
    </div>

    <div class="plan-card__price-block">
      <strong class="plan-card__price">${formatPrice(plan.Precio)}</strong>
      <span class="plan-card__period">${isPremium ? "/mes simulado" : "incluido en beta"}</span>
    </div>

    <div class="plan-card__metrics">
      <div class="plan-card__metric">
        <span class="plan-card__metric-label">Usuarios activos</span>
        <strong class="plan-card__metric-value">${plan.UsuariosActivos ?? 0}</strong>
      </div>
      <div class="plan-card__metric">
        <span class="plan-card__metric-label">Espacio</span>
        <strong class="plan-card__metric-value">${formatStorage(plan.AlmacenamientoMaxMB, isPremium)}</strong>
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
      <p class="plan-card__status">Estado operativo del plan: ${statusText.toLowerCase()}.</p>
      <span class="plan-card__accent">${isPremium ? "IA avanzada" : "Acceso esencial"}</span>
    </div>
  `;

  return card;
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { ok, data } = await fetchJson("/api/v1/admin/plans", {
      auth: true,
    });

    if (!ok || !Array.isArray(data)) {
      showToast("No fue posible cargar los planes");
      return;
    }

    plansContainer.innerHTML = "";
    data.filter((item) => !item.Mensaje).forEach((plan) => {
      plansContainer.appendChild(buildPlanCard(plan));
    });
  } catch (error) {
    showToast("Error de conexión");
  }
});
