import { fetchJson } from "./api-client.js";

const DEFAULT_FREE_STORAGE_MB = 500;
const DEFAULT_PREMIUM_STORAGE_MB = 2048;

const formatMbValue = (value) => {
  const numeric = Number(value ?? 0);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "0";
  }

  if (numeric >= 100) {
    return String(Math.round(numeric));
  }

  return numeric.toFixed(1).replace(/\.0$/, "");
};

export const normalizePlanName = (plan) => {
  if (!plan || plan === "Sin Plan") {
    return "Gratuito";
  }

  return String(plan);
};

export const formatStorageLabel = ({
  usedMb = 0,
  limitMb = DEFAULT_FREE_STORAGE_MB,
  unlimited = false,
} = {}) => {
  const usedText = `${formatMbValue(usedMb)} MB`;

  if (unlimited) {
    return `${usedText} / Ilimitado`;
  }

  return `${usedText} / ${formatMbValue(limitMb)} MB`;
};

const buildModelLabel = (model) =>
  [model?.nombre, model?.version]
    .filter(Boolean)
    .join(" ")
    .trim();

export const loadPlanSnapshot = async (userId, { includeModels = false } = {}) => {
  if (!userId) {
    return {
      ok: false,
      plan: "Gratuito",
      isPremium: false,
      storageUnlimited: false,
      storageUsedMb: 0,
      storageLimitMb: DEFAULT_FREE_STORAGE_MB,
      storageLabel: formatStorageLabel(),
      availableModels: [],
      availableModelsLabel: "No disponible",
    };
  }

  const requests = [
    fetchJson("/api/v1/settings/suscripcion", {
      params: { id: userId },
      auth: true,
    }),
  ];

  if (includeModels) {
    requests.push(
      fetchJson("/api/v1/settings/modelo-disponible", {
        params: { id: userId },
        auth: true,
      }),
    );
  }

  let subscriptionResult;
  let modelsResult;

  try {
    [subscriptionResult, modelsResult] = await Promise.all(requests);
  } catch (error) {
    return {
      ok: false,
      plan: "Gratuito",
      isPremium: false,
      storageUnlimited: false,
      storageUsedMb: 0,
      storageLimitMb: DEFAULT_FREE_STORAGE_MB,
      storageLabel: formatStorageLabel(),
      availableModels: [],
      availableModelsLabel: "No disponible",
      rawSubscription: null,
    };
  }

  if (!subscriptionResult?.ok) {
    return {
      ok: false,
      plan: "Gratuito",
      isPremium: false,
      storageUnlimited: false,
      storageUsedMb: 0,
      storageLimitMb: DEFAULT_FREE_STORAGE_MB,
      storageLabel: formatStorageLabel(),
      availableModels: [],
      availableModelsLabel: "No disponible",
      rawSubscription: subscriptionResult?.data || null,
    };
  }

  const subscription = subscriptionResult.data || {};
  const plan = normalizePlanName(subscription.plan);
  const isPremium = plan === "Premium";
  const storageUsedMb = Number(subscription.almacenamientoUsadoMb ?? 0);
  let storageLimitMb = Number(subscription.limiteAlmacenamientoMb ?? subscription.almacenamiento ?? DEFAULT_FREE_STORAGE_MB);
  let storageUnlimited = Boolean(subscription.almacenamientoIlimitado);

  // Algunos entornos viejos aún devuelven "ilimitado" para Premium; aquí lo
  // normalizamos al límite beta actual para que toda la UI pinte lo mismo.
  if (isPremium && (!Number.isFinite(storageLimitMb) || storageLimitMb <= 0 || storageUnlimited)) {
    storageLimitMb = DEFAULT_PREMIUM_STORAGE_MB;
    storageUnlimited = false;
  }
  const availableModels = includeModels && modelsResult?.ok
    ? (Array.isArray(modelsResult.data?.modelos) ? modelsResult.data.modelos : [])
    : [];
  const availableModelNames = availableModels
    .map(buildModelLabel)
    .filter(Boolean);

  return {
    ok: true,
    plan,
    isPremium,
    storageUnlimited,
    storageUsedMb,
    storageLimitMb,
    storageLabel: formatStorageLabel({
      usedMb: storageUsedMb,
      limitMb: storageLimitMb,
      unlimited: storageUnlimited,
    }),
    availableModels,
    availableModelsLabel: availableModelNames.length
      ? availableModelNames.join(", ")
      : "No disponible",
    rawSubscription: subscription,
  };
};
