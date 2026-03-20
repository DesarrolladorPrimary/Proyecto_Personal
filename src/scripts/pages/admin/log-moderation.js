import { fetchJson } from "../../utils/api-client.js";

const elements = {
  total: document.getElementById("moderation-total"),
  users: document.getElementById("moderation-users"),
  latest: document.getElementById("moderation-latest"),
  search: document.getElementById("moderation-search"),
  list: document.getElementById("moderation-log-list"),
  empty: document.getElementById("moderation-empty"),
};

const state = {
  logs: [],
  filteredLogs: [],
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

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || "Sin fecha";
  }

  return date.toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const buildUserLabel = (log) => {
  const name = log.Nombre || "Sin nombre";
  const email = log.Correo || "Sin correo";
  return `
    <div class="moderation-user">
      <strong class="moderation-user__name">${name}</strong>
      <span class="moderation-user__meta">${email}</span>
    </div>
  `;
};

const buildHashLabel = (hash) => {
  if (!hash) {
    return '<span class="moderation-hash moderation-hash--empty">Sin hash</span>';
  }

  const shortHash = hash.length > 14 ? `${hash.slice(0, 14)}...` : hash;
  return `<span class="moderation-hash" title="${hash}">${shortHash}</span>`;
};

const updateSummary = (logs) => {
  const total = logs.length;
  const distinctUsers = new Set(logs.map((log) => log.PK_UsuarioID).filter(Boolean)).size;
  const latest = total > 0 ? formatDateTime(logs[0].Fecha) : "Sin datos";

  elements.total.textContent = String(total);
  elements.users.textContent = String(distinctUsers);
  elements.latest.textContent = latest;
};

const renderLogs = (logs) => {
  elements.list.innerHTML = "";

  if (!logs.length) {
    elements.empty.classList.remove("moderation-empty--hidden");
    return;
  }

  elements.empty.classList.add("moderation-empty--hidden");

  logs.forEach((log) => {
    const row = document.createElement("article");
    row.className = "moderation-row";
    row.innerHTML = `
      <div class="moderation-row__cell moderation-row__cell--date">${formatDateTime(log.Fecha)}</div>
      <div class="moderation-row__cell">${buildUserLabel(log)}</div>
      <div class="moderation-row__cell">${log.Motivo || "Sin motivo"}</div>
      <div class="moderation-row__cell">${buildHashLabel(log.ContenidoBloqueadoHash)}</div>
    `;
    elements.list.appendChild(row);
  });
};

const applyFilter = () => {
  const query = elements.search.value.trim().toLowerCase();

  state.filteredLogs = !query
    ? [...state.logs]
    : state.logs.filter((log) => {
        const searchable = [
          log.Nombre,
          log.Correo,
          log.Motivo,
          log.ContenidoBloqueadoHash,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      });

  renderLogs(state.filteredLogs);
};

const loadModerationLogs = async () => {
  const { ok, data } = await fetchJson("/api/v1/admin/moderation", {
    auth: true,
  });

  if (!ok || !Array.isArray(data)) {
    throw new Error(data?.Mensaje || "No fue posible cargar el historial de moderación");
  }

  state.logs = data.filter((item) => !item.Mensaje);
  updateSummary(state.logs);
  applyFilter();
};

document.addEventListener("DOMContentLoaded", async () => {
  elements.search?.addEventListener("input", applyFilter);

  try {
    await loadModerationLogs();
  } catch (error) {
    showToast(error.message || "Error de conexión");
  }
});
