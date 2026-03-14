import { fetchJson } from "../utils/api-client.js";
import { bindFieldValidation, setFieldState, validateFields } from "../utils/form-feedback.js";

const PASSWORD_COMPLEXITY = /[\d\W_]/;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form");
  const passwordInput = document.getElementById("contraseña");
  const confirmInput = document.getElementById("confirmar_contraseña");
  const token = new URLSearchParams(window.location.search).get("token");
  const passwordRuleLength = document.getElementById("password-rule-length");
  const passwordRuleComplexity = document.getElementById("password-rule-complexity");
  const passwordRuleMax = document.getElementById("password-rule-max");
  const passwordRuleMatch = document.getElementById("password-rule-match");

  const showToast = (text, background = "red", callback) => {
    Toastify({
      text,
      duration: 3000,
      gravity: "top",
      position: "center",
      stopOnFocus: true,
      style: { background },
      callback,
    }).showToast();
  };

  const syncPasswordRules = () => {
    const password = passwordInput.value;
    const confirmation = confirmInput.value;

    passwordRuleLength?.classList.toggle("recovery-password__form-requirement--met", password.length >= 8);
    passwordRuleComplexity?.classList.toggle("recovery-password__form-requirement--met", PASSWORD_COMPLEXITY.test(password));
    passwordRuleMax?.classList.toggle(
      "recovery-password__form-requirement--met",
      password.length > 0 && password.length <= 128,
    );
    passwordRuleMatch?.classList.toggle(
      "recovery-password__form-requirement--met",
      Boolean(password) && Boolean(confirmation) && password === confirmation,
    );
  };

  const fieldBindings = [
    {
      input: passwordInput,
      ...bindFieldValidation(
        passwordInput,
        (value) => {
          if (!value) {
            return { valid: false, message: "Ingresa tu nueva contraseña." };
          }

          if (value.length < 8) {
            return { valid: false, message: "Debe tener al menos 8 caracteres." };
          }

          if (!PASSWORD_COMPLEXITY.test(value)) {
            return { valid: false, message: "Incluye al menos un número o símbolo." };
          }

          return { valid: true, message: "Contraseña válida." };
        },
        { validateOnInput: true },
      ),
    },
    {
      input: confirmInput,
      ...bindFieldValidation(
        confirmInput,
        (value) => {
          if (!value) {
            return { valid: false, message: "Confirma tu nueva contraseña." };
          }

          if (value !== passwordInput.value) {
            return { valid: false, message: "La confirmación debe coincidir." };
          }

          return { valid: true, message: "Las contraseñas coinciden." };
        },
        { validateOnInput: true },
      ),
    },
  ];

  passwordInput?.addEventListener("input", () => {
    syncPasswordRules();
    if (confirmInput.value) {
      fieldBindings[1].validate();
    }
  });

  confirmInput?.addEventListener("input", syncPasswordRules);

  if (!token) {
    showToast("Token no válido. Solicita un nuevo enlace.");
    form.querySelector("button").disabled = true;
    setFieldState(passwordInput, {
      state: "error",
      message: "El enlace de recuperación no es válido o ya expiró.",
    });
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const contraseña = passwordInput.value;

    syncPasswordRules();

    if (!validateFields(fieldBindings)) {
      showToast("Revisa los campos marcados antes de continuar.");
      return;
    }

    try {
      const { ok, data } = await fetchJson("/api/v1/recuperar/nueva", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, contraseña }),
      });

      if (ok) {
        showToast(
          data.Mensaje || "Contraseña actualizada correctamente",
          "green",
          () => {
            window.location.href = "login.html";
          },
        );
        return;
      }

      setFieldState(passwordInput, {
        state: "error",
        message: data.Mensaje || "No fue posible actualizar la contraseña.",
      });
      showToast(data.Mensaje || "No fue posible actualizar la contraseña");
    } catch (error) {
      showToast("Error de conexión");
    }
  });
});
