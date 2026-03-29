/*
 * Helpers reutilizables para validación visual de formularios.
 * Unifican mensajes, clases de error/éxito y foco sobre el primer campo inválido.
 */
const ERROR_CLASS = "is-invalid";
const SUCCESS_CLASS = "is-valid";
const MESSAGE_CLASS = "field-feedback__message";

const getFieldRoot = (input) => input.closest("[data-field]") || input.parentElement;

const getMessageElement = (root) => {
  let message = root.querySelector(`.${MESSAGE_CLASS}`);
  if (!message) {
    message = document.createElement("p");
    message.className = MESSAGE_CLASS;
    message.setAttribute("aria-live", "polite");
    root.append(message);
  }
  return message;
};

export const setFieldState = (input, { state = "idle", message = "" } = {}) => {
  const root = getFieldRoot(input);
  if (!root) {
    return;
  }

  const messageElement = getMessageElement(root);
  root.classList.remove(ERROR_CLASS, SUCCESS_CLASS);
  input.removeAttribute("aria-invalid");

  if (state === "error") {
    root.classList.add(ERROR_CLASS);
    input.setAttribute("aria-invalid", "true");
  }

  if (state === "success") {
    root.classList.add(SUCCESS_CLASS);
  }

  messageElement.textContent = message;
};

export const resetFieldState = (input) => {
  setFieldState(input, { state: "idle", message: "" });
};

export const bindFieldValidation = (input, validate, options = {}) => {
  let touched = false;

  const runValidation = (showSuccess = true, allowEmptyIdle = false) => {
    if (allowEmptyIdle && !input.value) {
      resetFieldState(input);
      return true;
    }

    const result = validate(input.value, input) || { valid: true, message: "" };

    if (!result.valid) {
      setFieldState(input, { state: "error", message: result.message || "" });
      return false;
    }

    if (showSuccess && input.value.trim()) {
      setFieldState(input, { state: "success", message: result.message || "" });
    } else {
      resetFieldState(input);
    }

    return true;
  };

  input.addEventListener("blur", () => {
    touched = true;
    runValidation(true, true);
  });

  input.addEventListener("input", () => {
    if (!touched && !options.validateOnInput) {
      return;
    }

    runValidation(true, true);
  });

  return {
    validate: () => {
      touched = true;
      return runValidation(true);
    },
    reset: () => {
      touched = false;
      resetFieldState(input);
    },
  };
};

export const validateFields = (bindings) => {
  let firstInvalidInput = null;
  let isValid = true;

  bindings.forEach((binding) => {
    const currentValid = binding.validate();
    if (!currentValid && !firstInvalidInput) {
      firstInvalidInput = binding.input;
    }
    if (!currentValid) {
      isValid = false;
    }
  });

  if (!isValid) {
    firstInvalidInput?.focus();
  }

  return isValid;
};
