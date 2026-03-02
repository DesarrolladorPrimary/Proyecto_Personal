import { fetchJson } from "/src/scripts/utils/api-client.js";
import { getCurrentUserId } from "/src/scripts/utils/auth-session.js";

const textarea = document.querySelector(".ai-instructions__input");
const btnGuardar = document.querySelector(".ai-instructions__btn");
const trigger = document.querySelector("#save-trigger");
const msg = document.querySelector(".ai-instructions__success-msg");

const mostrarMensaje = (texto) => {
  msg.textContent = texto;
  trigger.checked = false;
  void trigger.offsetWidth;
  trigger.checked = true;
  setTimeout(() => {
    trigger.checked = false;
  }, 2400);
};

const cargarInstruccion = async (id) => {
  const { ok, data } = await fetchJson("/api/v1/settings/instruccion-ia", {
    params: { id },
    auth: true,
  });

  if (ok && typeof data.instruccion === "string") {
    textarea.value = data.instruccion;
  }
};

btnGuardar?.addEventListener("click", async (event) => {
  event.preventDefault();

  const id = getCurrentUserId();
  if (!id) {
    return;
  }

  try {
    const { ok, data } = await fetchJson("/api/v1/settings/instruccion-ia", {
      method: "PUT",
      params: { id },
      auth: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruccion: textarea.value || "" }),
    });

    mostrarMensaje(ok ? "Guardado con éxito" : data.Mensaje || "Error al guardar");
  } catch (error) {
    mostrarMensaje("Error al guardar");
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const id = getCurrentUserId();

  if (!id) {
    return;
  }

  try {
    await cargarInstruccion(id);
  } catch (error) {
    mostrarMensaje("No fue posible cargar la instrucción");
  }
});
