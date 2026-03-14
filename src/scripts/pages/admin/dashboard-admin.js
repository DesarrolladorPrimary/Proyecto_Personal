import { fetchJson } from "../../utils/api-client.js";
import { buildUploadedAssetUrl } from "../../utils/api-config.js";
import {
  getCurrentUserId,
  getCurrentUserRole,
  logoutAndRedirect,
} from "../../utils/auth-session.js";

const DEFAULT_PHOTO = "/assets/icons/image.png";

const elements = {
  userButton: document.getElementById("logo_user_button"),
  logo: document.getElementById("admin_logo"),
  userMenu: document.getElementById("user"),
  profilePhoto: document.getElementById("admin_profile_photo"),
  logoutButton: document.getElementById("admin_logout"),
  name: document.getElementById("admin_name"),
  heroName: document.getElementById("dashboard-admin-name"),
  id: document.getElementById("admin_id"),
  email: document.getElementById("admin_email"),
  role: document.getElementById("admin_role"),
  totalUsers: document.getElementById("dashboard-total-users"),
  activeUsers: document.getElementById("dashboard-active-users"),
  activeShare: document.getElementById("dashboard-active-share"),
  suspendedUsers: document.getElementById("dashboard-suspended-users"),
  aiRequests: document.getElementById("dashboard-ai-requests"),
  totalStories: document.getElementById("dashboard-total-stories"),
  premiumUsers: document.getElementById("dashboard-premium-users"),
  freeUsers: document.getElementById("dashboard-free-users"),
  premiumShare: document.getElementById("dashboard-premium-share"),
  premiumBar: document.getElementById("dashboard-premium-bar"),
  freeBar: document.getElementById("dashboard-free-bar"),
  planNote: document.getElementById("dashboard-plan-note"),
  lastUpdate: document.getElementById("dashboard-last-update"),
  syncText: document.getElementById("dashboard-sync-text"),
  refreshButton: document.getElementById("dashboard-refresh"),
};

const state = {
  userMenuOpen: false,
};

const showToast = (text, background = "red", callback) => {
  window.Toastify?.({
    text,
    duration: 2500,
    gravity: "top",
    position: "center",
    stopOnFocus: true,
    style: { background },
    callback,
  }).showToast();
};

const formatNumber = (value) => new Intl.NumberFormat("es-CO").format(Number(value) || 0);

const formatPercent = (value, total) => {
  const safeTotal = Number(total) || 0;
  if (safeTotal <= 0) {
    return 0;
  }

  return Math.round(((Number(value) || 0) / safeTotal) * 100);
};

const getNowLabel = () =>
  new Date().toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const setUserMenuOpen = (nextValue) => {
  const open = Boolean(nextValue);
  state.userMenuOpen = open;
  elements.userMenu?.classList.toggle("menu-user--visible", open);
  elements.userMenu?.setAttribute("aria-hidden", String(!open));
  elements.userButton?.setAttribute("aria-expanded", String(open));
};

const applyUserData = (user = {}) => {
  const photoSrc = user.FotoPerfil ? buildUploadedAssetUrl(user.FotoPerfil) : DEFAULT_PHOTO;

  elements.name.textContent = user.Nombre || "Administrador";
  elements.heroName.textContent = user.Nombre || "Administrador";
  elements.id.textContent = String(user.PK_UsuarioID || "—");
  elements.email.textContent = user.Correo || "—";
  elements.role.textContent = user.Rol || "Admin";
  elements.logo.src = photoSrc;
  elements.profilePhoto.src = photoSrc;
};

const applyStats = (stats = {}) => {
  const totalUsers = Number(stats.totalUsuarios) || 0;
  const activeUsers = Number(stats.usuariosActivos) || 0;
  const suspendedUsers = Number(stats.usuariosSuspendidos) || 0;
  const aiRequests = Number(stats.solicitudesIAMesActual) || 0;
  const totalStories = Number(stats.totalRelatosCreados) || 0;
  const premiumUsers = Number(stats.usuariosPremium) || 0;
  const freeUsers = Number(stats.usuariosGratuitos) || 0;
  const activePercent = formatPercent(activeUsers, totalUsers);
  const premiumPercent = formatPercent(premiumUsers, totalUsers);
  const freePercent = formatPercent(freeUsers, totalUsers);
  const nowLabel = getNowLabel();

  elements.totalUsers.textContent = formatNumber(totalUsers);
  elements.activeUsers.textContent = formatNumber(activeUsers);
  elements.activeShare.textContent = `${activePercent}% del total`;
  elements.suspendedUsers.textContent = formatNumber(suspendedUsers);
  elements.aiRequests.textContent = formatNumber(aiRequests);
  elements.totalStories.textContent = formatNumber(totalStories);
  elements.premiumUsers.textContent = formatNumber(premiumUsers);
  elements.freeUsers.textContent = formatNumber(freeUsers);
  elements.premiumShare.textContent = `${premiumPercent}%`;
  elements.premiumBar.style.width = `${premiumPercent}%`;
  elements.freeBar.style.width = `${freePercent}%`;
  elements.planNote.textContent =
    totalUsers > 0
      ? `${premiumPercent}% de la base usa Premium y ${freePercent}% permanece en Gratuito.`
      : "Sin datos de planes por ahora.";
  elements.lastUpdate.textContent = `Actualizado: ${nowLabel}`;
  elements.syncText.textContent = nowLabel;
};

const loadProfile = async (userId) => {
  const { ok, status, data } = await fetchJson("/api/v1/usuarios/id", {
    params: { id: userId },
    auth: true,
  });

  if (!ok) {
    if (status === 401) {
      logoutAndRedirect("/public/admin/login-admin.html");
      return;
    }

    throw new Error(data.Mensaje || "No fue posible cargar el perfil");
  }

  applyUserData(data);
};

const loadStats = async () => {
  const { ok, status, data } = await fetchJson("/api/v1/admin/stats", {
    auth: true,
  });

  if (!ok) {
    if (status === 401) {
      logoutAndRedirect("/public/admin/login-admin.html");
      return;
    }

    throw new Error(data.Mensaje || "No fue posible cargar estadísticas");
  }

  applyStats(data);
};

const initEvents = () => {
  elements.userButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    setUserMenuOpen(!state.userMenuOpen);
  });

  elements.logoutButton?.addEventListener("click", () => {
    showToast("Sesión cerrada", "red", () => {
      logoutAndRedirect("/public/admin/login-admin.html");
    });
  });

  elements.refreshButton?.addEventListener("click", async () => {
    try {
      await loadStats();
      showToast("Dashboard actualizado", "green");
    } catch (error) {
      showToast(error.message || "No fue posible actualizar");
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (
      state.userMenuOpen &&
      !elements.userMenu?.contains(target) &&
      !elements.userButton?.contains(target)
    ) {
      setUserMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setUserMenuOpen(false);
    }
  });
};

document.addEventListener("DOMContentLoaded", async () => {
  const userId = getCurrentUserId();
  const role = getCurrentUserRole();

  if (!userId || !role || role.toLowerCase() !== "admin") {
    logoutAndRedirect("/public/admin/login-admin.html", {
      text: "Debes iniciar sesión como administrador.",
      background: "red",
    });
    return;
  }

  initEvents();

  try {
    await Promise.all([loadProfile(userId), loadStats()]);
  } catch (error) {
    showToast(error.message || "No fue posible cargar el dashboard");
  }
});
