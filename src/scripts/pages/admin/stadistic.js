import { fetchJson } from "../../utils/api-client.js";

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

const renderStats = async () => {
  try {
    const { ok, data } = await fetchJson("/api/v1/admin/stats", {
      auth: true,
    });

    if (!ok) {
      showToast(data.Mensaje || "No fue posible cargar estadisticas");
      return;
    }

    document.getElementById("stats_total_users").textContent = data.totalUsuarios ?? 0;
    document.getElementById("stats_active_users").textContent = data.usuariosActivos ?? 0;
    document.getElementById("stats_suspended_users").textContent = data.usuariosSuspendidos ?? 0;
    document.getElementById("stats_ai_requests").textContent =
      `Solicitudes IA este mes: ${data.solicitudesIAMesActual ?? 0}`;
    document.getElementById("stats_total_stories").textContent =
      `Relatos creados: ${data.totalRelatosCreados ?? 0}`;
    document.getElementById("stats_premium_users").textContent =
      `${data.usuariosPremium ?? 0} usuarios`;
    document.getElementById("stats_free_users").textContent =
      `${data.usuariosGratuitos ?? 0} usuarios`;
    document.getElementById("stats_last_update").textContent =
      `Actualizado: ${new Date().toLocaleString("es-CO")}`;
  } catch (error) {
    showToast("Error de conexion");
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  await renderStats();

  document.getElementById("stats_refresh")?.addEventListener("click", async () => {
    await renderStats();
    showToast("Datos actualizados", "green");
  });
});
