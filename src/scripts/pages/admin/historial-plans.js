import { fetchJson } from "../../utils/api-client.js";

const paymentsContainer = document.getElementById("admin-payments-list");

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

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || "Sin fecha";
  }

  return date.toLocaleDateString("es-CO");
};

const getStatusLabel = (status) => {
  const normalized = (status || "").toLowerCase();
  if (normalized === "completado") {
    return { text: "Exito", className: "payment-status--success" };
  }

  if (normalized === "pendiente") {
    return { text: "Pendiente", className: "" };
  }

  return { text: status || "Desconocido", className: "" };
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { ok, data } = await fetchJson("/api/v1/admin/payments", {
      auth: true,
    });

    if (!ok || !Array.isArray(data)) {
      showToast("No fue posible cargar el historial de pagos");
      return;
    }

    paymentsContainer.innerHTML = "";

    data.filter((item) => !item.Mensaje).forEach((payment) => {
      const status = getStatusLabel(payment.EstadoPago);
      const row = document.createElement("div");
      row.className = "payment-row";
      row.innerHTML = `
        <div class="payment-row__cell">${payment.Referencia || payment.PK_PagoID}</div>
        <div class="payment-row__cell">${payment.Correo || payment.Nombre || "Sin usuario"}</div>
        <div class="payment-row__cell">${formatDate(payment.FechaPago)}</div>
        <div class="payment-row__cell">
          <span class="payment-status ${status.className}">${status.text}</span>
        </div>
      `;
      paymentsContainer.appendChild(row);
    });
  } catch (error) {
    showToast("Error de conexion");
  }
});
