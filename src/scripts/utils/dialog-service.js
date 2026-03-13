const hasSwal = () => typeof window !== "undefined" && typeof window.Swal?.fire === "function";

const sharedCustomClass = {
  container: "libraryai-dialog-container",
  popup: "libraryai-dialog-popup",
  title: "libraryai-dialog-title",
  htmlContainer: "libraryai-dialog-text",
  actions: "libraryai-dialog-actions",
  confirmButton: "libraryai-dialog-button libraryai-dialog-confirm",
  cancelButton: "libraryai-dialog-button libraryai-dialog-cancel",
  icon: "libraryai-dialog-icon",
};

const defaultConfirmOptions = {
  icon: "warning",
  confirmButtonText: "Confirmar",
  cancelButtonText: "Cancelar",
  reverseButtons: true,
  focusCancel: true,
  showCancelButton: true,
  heightAuto: false,
  buttonsStyling: false,
  customClass: sharedCustomClass,
};

const defaultPromptOptions = {
  input: "text",
  confirmButtonText: "Aceptar",
  cancelButtonText: "Cancelar",
  reverseButtons: true,
  showCancelButton: true,
  heightAuto: false,
  buttonsStyling: false,
  customClass: {
    ...sharedCustomClass,
    input: "libraryai-dialog-input",
  },
};

export const showAlert = async ({ title = "Aviso", text = "", icon = "info" } = {}) => {
  if (!hasSwal()) {
    window.alert(text || title);
    return;
  }

  await window.Swal.fire({
    ...defaultConfirmOptions,
    title,
    text,
    icon,
    showCancelButton: false,
    confirmButtonText: "Entendido",
  });
};

export const showConfirm = async ({ title = "¿Continuar?", text = "", icon = "warning" } = {}) => {
  if (!hasSwal()) {
    return window.confirm(text || title);
  }

  const result = await window.Swal.fire({
    ...defaultConfirmOptions,
    title,
    text,
    icon,
  });

  return Boolean(result.isConfirmed);
};

export const showPrompt = async ({
  title = "Ingresa un valor",
  inputLabel = "",
  inputValue = "",
  inputPlaceholder = "",
  inputAttributes = {},
  inputValidator = null,
} = {}) => {
  if (!hasSwal()) {
    const value = window.prompt(title, inputValue);
    return value == null ? null : String(value);
  }

  const result = await window.Swal.fire({
    ...defaultPromptOptions,
    title,
    inputLabel,
    inputValue,
    inputPlaceholder,
    inputAttributes,
    inputValidator,
  });

  if (!result.isConfirmed) {
    return null;
  }

  return typeof result.value === "string" ? result.value : String(result.value ?? "");
};
