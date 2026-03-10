import { fetchJson } from "../../utils/api-client.js";
import { getCurrentUserRole } from "../../utils/auth-session.js";

const usersContainer = document.getElementById("admin-users-list");
const searchInput = document.getElementById("admin-users-search");
const ROLE_OPTIONS = ["Gratuito", "Premium", "Admin"];

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

const buildRoleOptions = (role) =>
  ROLE_OPTIONS.map((option) => {
    const selected = option.toLowerCase() === (role || "").toLowerCase() ? "selected" : "";
    return `<option value="${option}" ${selected}>${option}</option>`;
  }).join("");

const buildUserCard = (user) => {
  const role = user.Rol || "Sin rol";
  const isActive = Boolean(user.Activo);
  const statusText = isActive ? "Activo" : "Suspendido";
  const statusColor = isActive ? "#00ff7f" : "#ff595e";

  const card = document.createElement("article");
  card.className = "user-card";
  card.innerHTML = `
    <div class="user-card__separator"></div>
    <div class="user-card__content">
      <div class="user-card__row">
        <img src="/assets/icons/user.png" class="user-card__icon" alt="User" />
        <span class="user-card__text">${user.Nombre || "Sin nombre"}</span>
      </div>
      <div class="user-card__row">
        <img src="/assets/icons/email.png" class="user-card__icon" alt="Email" />
        <span class="user-card__text">${user.Correo || "Sin correo"}</span>
      </div>
      <div class="user-card__row">
        <span class="user-card__icon">ID</span>
        <span class="user-card__text">Registrado: ${formatJoinDate(user.FechaRegistro)}</span>
      </div>
      <div class="user-card__row">
        <span class="user-card__icon">RL</span>
        <span class="user-card__text">Rol actual: ${role}</span>
      </div>
      <div class="user-card__row">
        <span class="user-card__icon">PL</span>
        <span class="user-card__text">Plan: ${user.NombrePlan || "Sin plan"}</span>
      </div>
      <div class="user-card__row">
        <span class="user-card__icon">ST</span>
        <span class="user-card__text">Suscripcion: ${user.EstadoSuscripcion || "Sin suscripcion"}</span>
      </div>
      <div class="user-card__row">
        <div class="user-card__status-dot" style="background-color:${statusColor};box-shadow:0 0 5px ${statusColor};"></div>
        <span class="user-card__text">Estado: ${statusText}</span>
      </div>
      <div class="user-card__role-editor">
        <label class="user-card__label" for="role-${user.PK_UsuarioID}">Cambiar rol</label>
        <select class="user-card__select" id="role-${user.PK_UsuarioID}">
          ${buildRoleOptions(role)}
        </select>
      </div>
    </div>
    <div class="user-card__actions">
      <button class="user-card__button user-card__button--role">
        <span>Guardar rol</span>
      </button>
      <button class="user-card__button user-card__button--suspend">
        <span>${isActive ? "Suspender" : "Reactivar"}</span>
      </button>
      <button class="user-card__button user-card__button--delete">
        <span>Eliminar</span>
      </button>
    </div>
    <div class="user-card__separator"></div>
  `;

  const deleteButton = card.querySelector(".user-card__button--delete");
  const statusButton = card.querySelector(".user-card__button--suspend");
  const roleButton = card.querySelector(".user-card__button--role");
  const roleSelect = card.querySelector(".user-card__select");

  if ((role || "").toLowerCase() === "admin") {
    deleteButton.disabled = true;
    deleteButton.textContent = "Cuenta protegida";
    statusButton.disabled = true;
    statusButton.textContent = "Cuenta protegida";
    roleButton.disabled = true;
    roleButton.textContent = "Cuenta protegida";
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
      setTimeout(() => window.location.reload(), 500);
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
      window.location.reload();
    } catch (error) {
      showToast("Error de conexion");
    }
  });

  deleteButton.addEventListener("click", async () => {
    const confirmed = window.confirm(`Eliminar a ${user.Nombre || "este usuario"}?`);
    if (!confirmed) {
      return;
    }

    try {
      const { ok, data } = await fetchJson("/api/v1/usuarios/id", {
        method: "DELETE",
        params: { id: user.PK_UsuarioID },
        auth: true,
      });

      if (!ok) {
        showToast(data.Mensaje || "No fue posible eliminar el usuario");
        return;
      }

      card.remove();
      showToast(data.Mensaje || "Usuario eliminado correctamente", "green");
    } catch (error) {
      showToast("Error de conexion");
    }
  });

  return card;
};

const renderUsers = (users, query = "") => {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    if (!normalizedQuery) {
      return true;
    }

    const name = (user.Nombre || "").toLowerCase();
    const email = (user.Correo || "").toLowerCase();
    return name.includes(normalizedQuery) || email.includes(normalizedQuery);
  });

  usersContainer.innerHTML = "";

  if (!filteredUsers.length) {
    const emptyCard = document.createElement("article");
    emptyCard.className = "user-card user-card--empty";
    emptyCard.innerHTML = "<p>No hay usuarios para mostrar.</p>";
    usersContainer.appendChild(emptyCard);
    return;
  }

  filteredUsers.forEach((user) => {
    usersContainer.appendChild(buildUserCard(user));
  });
};

document.addEventListener("DOMContentLoaded", async () => {
  if (getCurrentUserRole().toLowerCase() !== "admin") {
    return;
  }

  try {
    const { ok, data } = await fetchJson("/api/v1/admin/users", {
      auth: true,
    });

    if (!ok || !Array.isArray(data)) {
      showToast("No fue posible cargar los usuarios");
      return;
    }

    const users = data.filter((item) => !item.Mensaje);
    renderUsers(users);

    searchInput?.addEventListener("input", () => {
      renderUsers(users, searchInput.value);
    });
  } catch (error) {
    showToast("Error de conexion");
  }
});
