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

const formatStorage = (value) => {
  if (!value || Number(value) <= 0) {
    return "Ilimitado";
  }

  return `${value} MB`;
};

const buildPlanCard = (plan) => {
  const card = document.createElement("article");
  const isPremium = (plan.NombrePlan || "").toLowerCase().includes("premium");
  card.className = `plan-card ${isPremium ? "plan-card--premium" : "plan-card--basic"}`;
  card.innerHTML = `
    <h2 class="plan-card__title">
      <span class="plan-card__title-icon">${isPremium ? "Premium" : "Base"}</span>
      ${plan.NombrePlan || "Plan"}
    </h2>
    <ul class="plan-card__features">
      <li class="plan-card__feature">
        <p class="plan-card__feature-text">Usuarios activos: ${plan.UsuariosActivos ?? 0}</p>
      </li>
      <li class="plan-card__feature">
        <p class="plan-card__feature-text">Precio: $${plan.Precio ?? 0}</p>
      </li>
    </ul>
    <p class="plan-card__storage">Espacio: ${formatStorage(plan.AlmacenamientoMaxMB)}</p>
    <p class="plan-card__status">Estado: ${plan.Activo ? "Activo" : "Inactivo"}</p>
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
    showToast("Error de conexion");
  }
});
