import { fetchJson } from "../../utils/api-client.js";
import {
  getCurrentUserId,
  logoutAndRedirect,
} from "../../utils/auth-session.js";

const buttonDelete = document.querySelector("#button-del");
const modalConfirm = document.querySelector("#modal-confirm");
const buttonConfirm = document.querySelector("#confirm_delete");
const modalProcessing = document.querySelector("#modal-processing");
const modalSuccess = document.querySelector("#modal-success");
const buttonExit = modalConfirm?.querySelector(".modal__button--secondary");

const toggleModal = (modal, shouldOpen) => {
  if (!modal) {
    return;
  }

  modal.classList.toggle("modal--active", shouldOpen);
};

document.addEventListener("DOMContentLoaded", () => {
  const id = getCurrentUserId();

  if (!id) {
    return;
  }

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target.classList.contains("modal__overlay")) {
        toggleModal(modal, false);
      }
    });
  });

  buttonDelete?.addEventListener("click", () => {
    toggleModal(modalConfirm, true);
  });

  buttonExit?.addEventListener("click", () => {
    toggleModal(modalConfirm, false);
  });

  buttonConfirm?.addEventListener("click", async () => {
    toggleModal(modalConfirm, false);
    toggleModal(modalProcessing, true);

    try {
      const { ok, data } = await fetchJson("/api/v1/usuarios/id", {
        method: "DELETE",
        params: { id },
        auth: true,
      });

      toggleModal(modalProcessing, false);

      if (!ok) {
        Toastify({
          text: data.Mensaje || "No fue posible eliminar la cuenta",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "center",
          style: {
            background: "linear-gradient(to right, #ff5f6d, #ffc371)",
          },
        }).showToast();
        return;
      }

      toggleModal(modalSuccess, true);

      const closeSuccessBtn = modalSuccess?.querySelector(".modal__button");
      closeSuccessBtn?.addEventListener(
        "click",
        () => {
          toggleModal(modalSuccess, false);
          logoutAndRedirect("../../index.html");
        },
        { once: true },
      );

      setTimeout(() => {
        logoutAndRedirect("../../index.html");
      }, 3000);
    } catch (error) {
      toggleModal(modalProcessing, false);
      Toastify({
        text: "Error de conexión",
        duration: 3000,
        gravity: "top",
        position: "center",
        style: {
          background: "linear-gradient(to right, #ff5f6d, #ffc371)",
        },
      }).showToast();
    }
  });
});
