import { dataToken } from '../../utils/dataToken.js'

const button_delete = document.querySelector("#button-del")
const modal_confirm = document.querySelector("#modal-confirm")
const button_confirm = document.querySelector("#confirm_delete");
const modal_processing = document.querySelector("#modal-processing");
const modal_success = document.querySelector("#modal-success");
const button_exit = document.querySelector(".modal__button--secondary")

let datos = dataToken();
const { id } = datos
const token = localStorage.getItem("Token");

// Función para eliminar usuario
const deleteUser = async (id, token) => {
    try {
        let request = await fetch(`http://localhost:8080/api/v1/usuarios/id?id=${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: "Bearer " + token,
            },
        })

        if (!request.ok) {
            // Intenta leer el mensaje de error del backend si existe
            const errorData = await request.json().catch(() => ({}));
            throw new Error(errorData.Mensaje || "Error al eliminar usuario");
        }

        const data = await request.json();
        data.status = request.status;
        return data;
    } catch (error) {
        console.error("Error en deleteUser:", error);
        return { status: 500, Mensaje: error.message }; 
    }
}

document.addEventListener('DOMContentLoaded', () => {

    // Helper para cerrar modales al hacer click en el overlay
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal__overlay')) {
                modal.classList.remove('modal--active');
            }
        });
    });

    // Abrir modal de confirmación
    button_delete.addEventListener('click', () => {
        modal_confirm.classList.add("modal--active")
    })

    // Cerrar modal con el botón "No estoy seguro"
    button_exit.addEventListener('click', () => {
        modal_confirm.classList.remove("modal--active")
    })

    // Cerrar modal al confirmar la eliminación (lógica principal)
    button_confirm.addEventListener('click', async () => {
        // 1. Ocultar modal confirmación y mostrar "Procesando"
        modal_confirm.classList.remove("modal--active");
        modal_processing.classList.add("modal--active");

        // 2. Llamar a la API
        let resp = await deleteUser(id, token);

        // 3. Ocultar "Procesando"
        modal_processing.classList.remove("modal--active");

        // 4. Validar respuesta
        // El backend devuelve status 200 en el JSON si todo va bien
        if (resp.status === 200) {
            
            // Mostrar modal de éxito
            modal_success.classList.add("modal--active");

            // Opcional: Cerrar modal de éxito y redirigir
            const closeSuccessBtn = modal_success.querySelector(".modal__button");
            if(closeSuccessBtn) {
                closeSuccessBtn.addEventListener("click", () => {
                    modal_success.classList.remove("modal--active");
                    // Redirigir al login o home
                    localStorage.removeItem("Token"); // Limpiar sesión
                    window.location.href = "../../index.html"; 
                });
            }

            // También redirigir automáticamente después de unos segundos
            setTimeout(() => {
                 localStorage.removeItem("Token"); // Limpiar sesión
                 window.location.href = "../../index.html"; 
            }, 3000);

        } else {
            // Mostrar error con Toastify
            Toastify({
                text: resp.Mensaje || "Error desconocido al eliminar la cuenta",
                duration: 3000,
                close: true,
                gravity: "top", 
                position: "center", 
                style: {
                    background: "linear-gradient(to right, #ff5f6d, #ffc371)",
                },
            }).showToast();
            
            // Reabrir modal de confirmación si falló? O dejarlo cerrado.
            // Dejamos cerrado por ahora.
        }
    })
});














