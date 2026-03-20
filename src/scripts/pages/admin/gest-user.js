import { fetchJson } from "../../utils/api-client.js";
import { getCurrentUserRole } from "../../utils/auth-session.js";

const ROLE_OPTIONS = ["Gratuito", "Premium", "Admin"];
const ROLE_ORDER = ["Admin", "Premium", "Gratuito", "Otros"];

const elements = {
  usersContainer: document.getElementById("admin-users-list"),
  searchForm: document.getElementById("admin-users-search-form"),
  searchInput: document.getElementById("admin-users-search"),
  roleFilters: document.getElementById("admin-users-role-filters"),
  statusFilters: document.getElementById("admin-users-status-filters"),
  resultsLabel: document.getElementById("admin-users-results-label"),
  total: document.getElementById("admin-users-total"),
  active: document.getElementById("admin-users-active"),
  suspended: document.getElementById("admin-users-suspended"),
  admin: document.getElementById("admin-users-admin"),
  premium: document.getElementById("admin-users-premium"),
  free: document.getElementById("admin-users-free"),
};

const state = {
  users: [],
  query: "",
  role: "Todos",
  status: "Todos",
  openGroups: new Set(),
};

const showToast = (text, background = "red") => {
  window.Toastify?.({
    text,
    duration: 2500,
    gravity: "top",
    position: "center",
    stopOnFocus: true,
    style: { background },
  }).showToast();
};

const formatJoinDate = (value) => {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("es-CO");
};

const normalizeRole = (role = "") => {
  const normalized = role.trim();
  return ROLE_OPTIONS.includes(normalized) ? normalized : "Otros";
};

const getRoleTitle = (role) => {
  if (role === "Admin") {
    return "Administradores";
  }

  if (role === "Premium") {
    return "Usuarios Premium";
  }

  if (role === "Gratuito") {
    return "Usuarios Gratuitos";
  }

  return "Otros roles";
};

const getUserInitials = (name = "") => {
  const words = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return "US";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");
};

const buildRoleOptions = (role) =>
  ROLE_OPTIONS.map((option) => {
    const selected = option.toLowerCase() === (role || "").toLowerCase() ? "selected" : "";
    return `<option value="${option}" ${selected}>${option}</option>`;
  }).join("");

const sortUsers = (users) =>
  [...users].sort((left, right) => {
    const activeDiff = Number(Boolean(right.Activo)) - Number(Boolean(left.Activo));
    if (activeDiff !== 0) {
      return activeDiff;
    }

    return String(left.Nombre || "").localeCompare(String(right.Nombre || ""), "es", {
      sensitivity: "base",
    });
  });

const getCounts = (users) => {
  const counts = {
    total: users.length,
    active: 0,
    suspended: 0,
    admin: 0,
    premium: 0,
    free: 0,
  };

  users.forEach((user) => {
    const role = normalizeRole(user.Rol);

    if (Boolean(user.Activo)) {
      counts.active += 1;
    } else {
      counts.suspended += 1;
    }

    if (role === "Admin") {
      counts.admin += 1;
    } else if (role === "Premium") {
      counts.premium += 1;
    } else if (role === "Gratuito") {
      counts.free += 1;
    }
  });

  return counts;
};

const updateSummary = (users) => {
  const counts = getCounts(users);
  elements.total.textContent = String(counts.total);
  elements.active.textContent = String(counts.active);
  elements.suspended.textContent = String(counts.suspended);
  elements.admin.textContent = String(counts.admin);
  elements.premium.textContent = String(counts.premium);
  elements.free.textContent = String(counts.free);
};

const getFilteredUsers = () => {
  const query = state.query.trim().toLowerCase();

  return state.users.filter((user) => {
    const matchesQuery =
      !query ||
      String(user.Nombre || "").toLowerCase().includes(query) ||
      String(user.Correo || "").toLowerCase().includes(query);

    const userRole = normalizeRole(user.Rol);
    const matchesRole = state.role === "Todos" || userRole === state.role;

    const userStatus = user.Activo ? "Activo" : "Suspendido";
    const matchesStatus = state.status === "Todos" || userStatus === state.status;

    return matchesQuery && matchesRole && matchesStatus;
  });
};

const updateResultsLabel = (filteredUsers) => {
  const roleLabel = state.role === "Todos" ? "todos los roles" : state.role;
  const statusLabel = state.status === "Todos" ? "todos los estados" : state.status.toLowerCase();
  const queryLabel = state.query.trim() ? ` con busqueda "${state.query.trim()}"` : "";

  elements.resultsLabel.textContent = `${filteredUsers.length} usuarios visibles en ${roleLabel}, ${statusLabel}${queryLabel}.`;
};

const ensureOpenGroups = (groups) => {
  const visibleRoles = new Set(groups.map(([role]) => role));
  state.openGroups = new Set([...state.openGroups].filter((role) => visibleRoles.has(role)));

  if (state.openGroups.size > 0 || groups.length === 0) {
    return;
  }

  const hasFilters = state.role !== "Todos" || state.status !== "Todos" || Boolean(state.query.trim());

  if (hasFilters) {
    groups.forEach(([role]) => state.openGroups.add(role));
    return;
  }

  state.openGroups.add(groups[0][0]);
};

const buildUserCard = (user) => {
  const role = normalizeRole(user.Rol);
  const isActive = Boolean(user.Activo);
  const statusText = isActive ? "Activo" : "Desactivado";
  const plan = user.NombrePlan || "Sin plan";
  const subscription = user.EstadoSuscripcion || "Sin suscripcion";
  const isProtectedAdmin = role === "Admin";

  const card = document.createElement("details");
  card.className = "user-card";
  card.innerHTML = `
    <summary class="user-card__summary">
      <div class="user-card__identity">
        <span class="user-card__avatar">${getUserInitials(user.Nombre)}</span>
        <div class="user-card__identity-copy">
          <strong class="user-card__name">${user.Nombre || "Sin nombre"}</strong>
          <span class="user-card__email">${user.Correo || "Sin correo"}</span>
          <span class="user-card__id">ID ${user.PK_UsuarioID || "-"}</span>
        </div>
      </div>

      <div class="user-card__meta">
        <span class="user-card__pill">${role}</span>
        <span class="user-card__pill ${isActive ? "user-card__pill--active" : "user-card__pill--suspended"}">${statusText}</span>
      </div>
    </summary>

    <div class="user-card__body">
      <div class="user-card__grid">
        <div class="user-card__row">
          <span class="user-card__label">Registro</span>
          <span class="user-card__value">${formatJoinDate(user.FechaRegistro)}</span>
        </div>
        <div class="user-card__row">
          <span class="user-card__label">Plan actual</span>
          <span class="user-card__value">${plan}</span>
        </div>
        <div class="user-card__row">
          <span class="user-card__label">Suscripcion</span>
          <span class="user-card__value">${subscription}</span>
        </div>
      </div>

      <div class="user-card__role-editor">
        <label class="user-card__label" for="role-${user.PK_UsuarioID}">Cambiar rol</label>
        <select class="user-card__select" id="role-${user.PK_UsuarioID}">
          ${buildRoleOptions(role)}
        </select>
      </div>

      <div class="user-card__actions">
        <button type="button" class="user-card__button user-card__button--role">Guardar rol</button>
        <button type="button" class="user-card__button user-card__button--status">
          ${isActive ? "Desactivar" : "Reactivar"}
        </button>
      </div>

      ${isProtectedAdmin ? '<p class="user-card__notice">Las cuentas con rol Admin quedan protegidas desde este panel y no se pueden desactivar aqui.</p>' : ""}
    </div>
  `;

  const statusButton = card.querySelector(".user-card__button--status");
  const roleButton = card.querySelector(".user-card__button--role");
  const roleSelect = card.querySelector(".user-card__select");

  if (isProtectedAdmin) {
    statusButton.disabled = true;
    roleButton.disabled = true;
    roleSelect.disabled = true;
    return card;
  }

  roleButton.addEventListener("click", async () => {
    const nextRole = roleSelect.value;

    if (!nextRole || nextRole.toLowerCase() === role.toLowerCase()) {
      showToast("Selecciona un rol diferente", "orange");
      return;
    }

    try {
      const { ok, data } = await fetchJson("/api/v1/admin/users/role", {
        method: "PUT",
        params: { id: user.PK_UsuarioID },
        auth: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol: nextRole }),
      });

      if (!ok) {
        showToast(data.Mensaje || "No fue posible actualizar el rol");
        return;
      }

      showToast(data.Mensaje || "Rol actualizado", "green");
      await loadUsers();
    } catch (error) {
      showToast("Error de conexion");
    }
  });

  statusButton.addEventListener("click", async () => {
    try {
      const { ok, data } = await fetchJson("/api/v1/admin/users/status", {
        method: "PUT",
        params: { id: user.PK_UsuarioID },
        auth: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !isActive }),
      });

      if (!ok) {
        showToast(data.Mensaje || "No fue posible actualizar el estado");
        return;
      }

      showToast(data.Mensaje || "Estado actualizado", "green");
      await loadUsers();
    } catch (error) {
      showToast("Error de conexion");
    }
  });

  return card;
};

const buildGroup = (role, users) => {
  const sortedUsers = sortUsers(users);
  const activeCount = sortedUsers.filter((user) => user.Activo).length;
  const suspendedCount = sortedUsers.length - activeCount;
  const group = document.createElement("section");
  const isOpen = state.openGroups.has(role);

  group.className = `user-group${isOpen ? " user-group--open" : ""}`;
  group.dataset.role = role;
  group.innerHTML = `
    <button type="button" class="user-group__trigger" aria-expanded="${String(isOpen)}">
      <div class="user-group__copy-block">
        <span class="user-group__eyebrow">Rol</span>
        <div class="user-group__title-row">
          <h2 class="user-group__title">${getRoleTitle(role)}</h2>
          <span class="user-group__count">${sortedUsers.length}</span>
        </div>
        <p class="user-group__copy">${activeCount} activos y ${suspendedCount} desactivados en esta vista.</p>
      </div>
    </button>
      <div class="user-group__body">
        <div class="user-group__grid"></div>
      </div>
  `;

  const grid = group.querySelector(".user-group__grid");
  sortedUsers.forEach((user) => {
    grid.appendChild(buildUserCard(user));
  });

  return group;
};

const renderUsers = () => {
  const filteredUsers = getFilteredUsers();
  const groups =
    state.role === "Todos"
      ? ROLE_ORDER.map((role) => [role, filteredUsers.filter((user) => normalizeRole(user.Rol) === role)])
          .filter(([, users]) => users.length > 0)
      : [[state.role, filteredUsers]];

  ensureOpenGroups(groups);
  updateResultsLabel(filteredUsers);
  elements.usersContainer.innerHTML = "";

  if (!filteredUsers.length) {
    const emptyState = document.createElement("article");
    emptyState.className = "users-empty";
    emptyState.innerHTML = `
      <strong>No hay usuarios para mostrar.</strong>
      <p>Prueba otro rol, estado o termino de busqueda.</p>
    `;
    elements.usersContainer.appendChild(emptyState);
    return;
  }

  groups.forEach(([role, users]) => {
    elements.usersContainer.appendChild(buildGroup(role, users));
  });
};

const syncFilterButtons = () => {
  document.querySelectorAll("[data-filter-group='role']").forEach((button) => {
    button.classList.toggle("users-filter--active", button.dataset.value === state.role);
  });

  document.querySelectorAll("[data-filter-group='status']").forEach((button) => {
    button.classList.toggle("users-filter--active", button.dataset.value === state.status);
  });
};

async function loadUsers() {
  try {
    const { ok, data } = await fetchJson("/api/v1/admin/users", {
      auth: true,
    });

    if (!ok || !Array.isArray(data)) {
      showToast("No fue posible cargar los usuarios");
      return;
    }

    state.users = data.filter((item) => !item.Mensaje);
    updateSummary(state.users);
    syncFilterButtons();
    renderUsers();
  } catch (error) {
    showToast("Error de conexion");
  }
}

const initFilters = () => {
  elements.searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  elements.searchInput?.addEventListener("input", () => {
    state.query = elements.searchInput.value;
    renderUsers();
  });

  const handleFilterClick = (event) => {
    const button = event.target.closest(".users-filter");
    if (!button) {
      return;
    }

    const group = button.dataset.filterGroup;
    const value = button.dataset.value || "Todos";

    if (group === "role") {
      state.role = value;
    }

    if (group === "status") {
      state.status = value;
    }

    state.openGroups.clear();
    syncFilterButtons();
    renderUsers();
  };

  elements.roleFilters?.addEventListener("click", handleFilterClick);
  elements.statusFilters?.addEventListener("click", handleFilterClick);

  elements.usersContainer?.addEventListener("click", (event) => {
    const trigger = event.target.closest(".user-group__trigger");
    if (!trigger) {
      return;
    }

    const group = trigger.closest(".user-group");
    const role = group?.dataset.role;
    if (!role) {
      return;
    }

    const nextOpen = !group.classList.contains("user-group--open");
    group.classList.toggle("user-group--open", nextOpen);
    trigger.setAttribute("aria-expanded", String(nextOpen));

    if (nextOpen) {
      state.openGroups.add(role);
    } else {
      state.openGroups.delete(role);
    }
  });
};

document.addEventListener("DOMContentLoaded", async () => {
  if (getCurrentUserRole().toLowerCase() !== "admin") {
    return;
  }

  initFilters();
  await loadUsers();
});
