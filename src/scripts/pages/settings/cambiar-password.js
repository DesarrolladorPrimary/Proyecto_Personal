import { fetchJson } from "../../utils/api-client.js";
import { getCurrentUserId, logoutAndRedirect } from "../../utils/auth-session.js";
import { bindFieldValidation, resetFieldState, setFieldState, validateFields } from "../../utils/form-feedback.js";

const PASSWORD_COMPLEXITY = /[\d\W_]/;

const btnCambiarPassword = document.getElementById("cambiar-password");
const modalPassword = document.getElementById("modal-password");
const btnCancelar = document.getElementById("cancel-password");
const btnGuardar = document.getElementById("save-password");
const inputNuevaPassword = document.getElementById("nueva-password");
const inputConfirmarPassword = document.getElementById("confirmar-password");

const showToast = (text, background = "red") => {
  Toastify({
    text,
    duration: 3000,
    gravity: "top",
    position: "center",
    style: { background },
  }).showToast();
};

const fieldBindings = [
  {
    input: inputNuevaPassword,
    ...bindFieldValidation(
      inputNuevaPassword,
      (value) => {
        if (!value) {
          return { valid: false, message: "Ingresa la nueva contraseña." };
        }

        if (value.length < 8) {
          return { valid: false, message: "Debe tener al menos 8 caracteres." };
        }

        if (!PASSWORD_COMPLEXITY.test(value)) {
          return { valid: false, message: "Incluye al menos un numero o simbolo." };
        }

        return { valid: true, message: "Contraseña valida." };
      },
      { validateOnInput: true },
    ),
  },
  {
    input: inputConfirmarPassword,
    ...bindFieldValidation(
      inputConfirmarPassword,
      (value) => {
        if (!value) {
          return { valid: false, message: "Confirma la nueva contraseña." };
        }

        if (value !== inputNuevaPassword.value) {
          return { valid: false, message: "La confirmacion debe coincidir." };
        }

        return { valid: true, message: "Las contraseñas coinciden." };
      },
      { validateOnInput: true },
    ),
  },
];

const resetForm = () => {
  inputNuevaPassword.value = "";
  inputConfirmarPassword.value = "";
  resetFieldState(inputNuevaPassword);
  resetFieldState(inputConfirmarPassword);
};

const closeModal = () => {
  modalPassword.classList.remove("modal--active");
  resetForm();
};

inputNuevaPassword?.addEventListener("input", () => {
  if (inputConfirmarPassword.value) {
    fieldBindings[1].validate();
  }
});

btnCambiarPassword?.addEventListener("click", () => {
  modalPassword.classList.add("modal--active");
});

btnCancelar?.addEventListener("click", closeModal);

modalPassword?.querySelector(".modal__overlay")?.addEventListener("click", closeModal);

btnGuardar?.addEventListener("click", async () => {
  const id = getCurrentUserId();
  const nuevaPassword = inputNuevaPassword.value;

  if (!id) {
    return;
  }

  if (!validateFields(fieldBindings)) {
    showToast("Revisa los campos marcados antes de continuar.");
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
      setFieldState(inputNuevaPassword, {
        state: "error",
        message: data.Mensaje || "No fue posible actualizar la contraseña.",
      });
      showToast(data.Mensaje || "No fue posible actualizar la contraseña");
      return;
    }

    showToast(data.Mensaje || "Contraseña actualizada correctamente", "green");
    closeModal();
    window.setTimeout(() => {
      logoutAndRedirect(undefined, {
        text: "Tu contraseña fue actualizada. Inicia sesion de nuevo.",
        background: "green",
      });
    }, 900);
  } catch (error) {
    showToast("Error de conexion");
  }
});
