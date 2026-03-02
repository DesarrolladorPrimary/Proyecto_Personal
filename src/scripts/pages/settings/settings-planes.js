import { fetchJson } from "/src/scripts/utils/api-client.js";
import { getCurrentUserId } from "/src/scripts/utils/auth-session.js";

const freeBtn = document.querySelector(".plan-card--free .plan-card__button");
const premBtn = document.querySelector(".plan-card--premium .plan-card__button");
const t = (key) => window.languageManager?.translate(key) || key;

const markActivePlan = (planActivo) => {
  const normalizedPlan = (planActivo || "Gratuito").toLowerCase();
  const esPremium = normalizedPlan.includes("premium");

  if (esPremium) {
    freeBtn.classList.remove("plan-card__button--current");
    premBtn.classList.remove("plan-card__button--upgrade");
    premBtn.classList.add("plan-card__button--current");
    premBtn.textContent = t("common.active");
    freeBtn.textContent = t("common.available");
    return;
  }

  freeBtn.classList.add("plan-card__button--current");
  freeBtn.textContent = t("common.active");
  premBtn.classList.remove("plan-card__button--current");
  premBtn.classList.add("plan-card__button--upgrade");
  premBtn.innerHTML = `<span class="plan-card__button-label">${t("common.coming_soon")}</span>`;
};

document.addEventListener("DOMContentLoaded", async () => {
  const id = getCurrentUserId();

  if (!id) {
    return;
  }

  try {
    const { ok, data } = await fetchJson("/api/v1/settings/suscripcion", {
      params: { id },
      auth: true,
    });

    if (!ok) {
      markActivePlan("Gratuito");
      return;
    }

    markActivePlan(data.plan);
  } catch (error) {
    markActivePlan("Gratuito");
  }
});
