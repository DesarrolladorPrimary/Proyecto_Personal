import { fetchJson } from "../../utils/api-client.js";
import { getCurrentUserId } from "../../utils/auth-session.js";

const userField = document.querySelector("#usuario");
const emailField = document.querySelector("#correo");
const registerDateField = document.querySelector("#fechaRegistro");
const roleField = document.querySelector("#funciones");
const profileField = document.querySelector("#perfilUser");
const planField = document.querySelector("#value_plan");

const normalizePlanName = (plan) => {
  if (!plan || plan === "Sin Plan") {
    return "Gratuito";
  }

  return plan;
};

document.addEventListener("DOMContentLoaded", async () => {
  const id = getCurrentUserId();

  if (!id) {
    return;
  }

  try {
    const [userResponse, subscriptionResponse] = await Promise.all([
      fetchJson("/api/v1/usuarios/id", {
        params: { id },
        auth: true,
      }),
      fetchJson("/api/v1/settings/suscripcion", {
        params: { id },
        auth: true,
      }),
    ]);

    if (userResponse.ok) {
      const user = userResponse.data;
      const role = user.Rol || "Gratuito";

      profileField.textContent = user.Nombre || "—";
      userField.textContent = user.Nombre || "—";
      emailField.textContent = user.Correo || "—";
      registerDateField.textContent = user["Fecha Registro"] || "—";
      roleField.textContent = role;

      if (!subscriptionResponse.ok) {
        planField.textContent = `${role} (Básico)`;
      }
    }

    if (subscriptionResponse.ok) {
      const plan = normalizePlanName(subscriptionResponse.data.plan);
      planField.textContent = `${plan} (${plan === "Premium" ? "Activo" : "Básico"})`;
    }
  } catch (error) {
    // accesoAuth.js ya gestiona el caso de token inválido; aquí evitamos ruido extra.
  }
});
