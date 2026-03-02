import { fetchJson } from "../../utils/api-client.js";
import { getCurrentUserId } from "../../utils/auth-session.js";

const PASSWORD_COMPLEXITY = /[\d\W_]/;

const btnCambiarPassword = document.getElementById("cambiar-password");
const modalPassword = document.getElementById("modal-password");
const btnCancelar = document.getElementById("cancel-password");
const btnGuardar = document.getElementById("save-password");
const inputNuevaPassword = document.getElementById("nueva-password");
const inputConfirmarPassword = document.getElementById("confirmar-password");

const resetForm = () => {
  inputNuevaPassword.value = "";
  inputConfirmarPassword.value = "";
};

const closeModal = () => {
  modalPassword.classList.remove("modal--active");
  resetForm();
};

const showToast = (text, background = "red") => {
  Toastify({
    text,
    duration: 3000,
    gravity: "top",
    position: "center",
    style: { background },
  }).showToast();
};

btnCambiarPassword?.addEventListener("click", () => {
  modalPassword.classList.add("modal--active");
});

btnCancelar?.addEventListener("click", closeModal);

modalPassword?.querySelector(".modal__overlay")?.addEventListener("click", closeModal);

btnGuardar?.addEventListener("click", async () => {
  const id = getCurrentUserId();
  const nuevaPassword = inputNuevaPassword.value;
  const confirmarPassword = inputConfirmarPassword.value;

  if (!id) {
    return;
  }

  if (!nuevaPassword || !confirmarPassword) {
    showToast("Por favor completa todos los campos");
    return;
  }

  if (nuevaPassword.length < 8) {
    showToast("La contraseña debe tener al menos 8 caracteres");
    return;
  }

  if (!PASSWORD_COMPLEXITY.test(nuevaPassword)) {
    showToast("La contraseña debe incluir un número o símbolo");
    return;
  }

  if (nuevaPassword !== confirmarPassword) {
    showToast("Las contraseñas no coinciden");
    return;
  }

  try {
    const { ok, data } = await fetchJson("/api/v1/usuarios/campo", {
      method: "PUT",
      params: { id },
      auth: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campo: "contraseña",
        valor: nuevaPassword,
      }),
    });

    if (!ok) {
      showToast(data.Mensaje || "No fue posible actualizar la contraseña");
      return;
    }

    showToast(data.Mensaje || "Contraseña actualizada correctamente", "green");
    closeModal();
  } catch (error) {
    showToast("Error de conexión");
  }
});
