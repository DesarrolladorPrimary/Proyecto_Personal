import { fetchJson } from "../../utils/api-client.js";
import { getCurrentUserId } from "../../utils/auth-session.js";

const freeBtn = document.querySelector("#plan-free-button");
const premBtn = document.querySelector("#plan-premium-button");
const paymentToggle = document.querySelector("#checkPay");
const paymentTitle = document.querySelector("#payment-loading-title");
const paymentText = document.querySelector("#payment-loading-text");

const translate = (key, fallback) => {
  const translated = window.languageManager?.translate(key);
  return translated && translated !== key ? translated : fallback;
};

const showToast = (text, background = "#2a2727") => {
  if (!text || typeof window.Toastify !== "function") {
    return;
  }

  Toastify({
    text,
    duration: 2600,
    gravity: "top",
    position: "center",
    style: { background },
  }).showToast();
};

const normalizePlan = (plan) => {
  const normalized = String(plan || "Gratuito").trim().toLowerCase();
  return normalized.includes("premium") ? "Premium" : "Gratuito";
};

const setButtonState = (button, { current = false, label, disabled = false } = {}) => {
  if (!button) {
    return;
  }

  button.disabled = disabled;
  button.textContent = label;
  button.classList.toggle("plan-card__button--current", current);
  button.classList.toggle("plan-card__button--upgrade", !current);
};

const setLoading = (loading, title, message) => {
  if (paymentToggle) {
    paymentToggle.checked = loading;
  }

  if (paymentTitle && title) {
    paymentTitle.innerHTML = title;
  }

  if (paymentText && message) {
    paymentText.textContent = message;
  }

  if (freeBtn) {
    freeBtn.disabled = loading;
  }

  if (premBtn) {
    premBtn.disabled = loading;
  }
};

let activePlan = "Gratuito";
let isSubmitting = false;

const markActivePlan = (planActivo) => {
  activePlan = normalizePlan(planActivo);
  const isPremium = activePlan === "Premium";

  if (isPremium) {
    setButtonState(premBtn, {
      current: true,
      label: translate("common.active", "Activo"),
    });
    setButtonState(freeBtn, {
      current: false,
      label: "Volver a Gratuito",
    });
    return;
  }

  setButtonState(freeBtn, {
    current: true,
    label: translate("common.active", "Activo"),
  });
  setButtonState(premBtn, {
    current: false,
    label: "Simular Premium",
  });
};

const loadCurrentPlan = async () => {
  const id = getCurrentUserId();

  if (!id) {
    markActivePlan("Gratuito");
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
};

const simulatePlanChange = async (targetPlan) => {
  if (isSubmitting) {
    return;
  }

  const id = getCurrentUserId();
  if (!id) {
    return;
  }

  const normalizedTarget = normalizePlan(targetPlan);
  if (normalizedTarget === activePlan) {
    return;
  }

  isSubmitting = true;
  const isPremium = normalizedTarget === "Premium";

  setLoading(
    true,
    isPremium ? "Activando <br />Premium..." : "Volviendo al <br />plan gratuito...",
    isPremium
      ? "Se registrará un pago simulado y tu cuenta cambiará a Premium"
      : "Se cancelará la suscripción activa y tu cuenta volverá al plan gratuito",
  );

  try {
    const { ok, data } = await fetchJson("/api/v1/settings/suscripcion/simular", {
      method: "PUT",
      params: { id },
      auth: true,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan: normalizedTarget }),
    });

    if (!ok) {
      showToast(data?.Mensaje || "No se pudo actualizar el plan", "#b42318");
      return;
    }

    if (data?.Token) {
      localStorage.setItem("Token", data.Token);
    }

    markActivePlan(data?.plan || normalizedTarget);
    showToast(data?.Mensaje || "Plan actualizado correctamente", "#0f766e");
  } catch (error) {
    showToast("Error de red al actualizar el plan", "#b42318");
  } finally {
    setLoading(false, "Actualizando <br />plan...", "Simulando el cambio de suscripción en tu cuenta");
    isSubmitting = false;
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  freeBtn?.addEventListener("click", () => simulatePlanChange("Gratuito"));
  premBtn?.addEventListener("click", () => simulatePlanChange("Premium"));

  window.addEventListener("languagechange", () => {
    markActivePlan(activePlan);
  });

  await loadCurrentPlan();
});
