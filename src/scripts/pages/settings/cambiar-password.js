import { dataToken } from '../../utils/dataToken.js';

const btnCambiarPassword = document.getElementById("cambiar-password");
const modalPassword = document.getElementById("modal-password");
const btnCancelar = document.getElementById("cancel-password");
const btnGuardar = document.getElementById("save-password");
const inputNuevaPassword = document.getElementById("nueva-password");
const inputConfirmarPassword = document.getElementById("confirmar-password");

const { id } = dataToken();
const token = localStorage.getItem("Token");

// Función para cambiar contraseña
const cambiarPassword = async (id, nuevaPassword, token) => {
    try {
        let request = await fetch(`http://localhost:8080/api/v1/usuarios/campo?id=${id}`, {
            method: 'PUT',
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                campo: "contraseña",
                valor: nuevaPassword
            }),
        });

        if (!request.ok) {
            const errorData = await request.json().catch(() => ({}));
            throw new Error(errorData.Mensaje || "Error al cambiar contraseña");
        }

        const data = await request.json();
        data.status = request.status;
        return data;
    } catch (error) {
        console.error("Error en cambiarPassword:", error);
        return { status: 500, Mensaje: error.message };
    }
};

// Abrir modal al hacer click en "Cambiar Contraseña"
btnCambiarPassword.addEventListener('click', () => {
    modalPassword.classList.add("modal--active");
});

// Cerrar modal al hacer click en "Cancelar"
btnCancelar.addEventListener('click', () => {
    modalPassword.classList.remove("modal--active");
    // Limpiar campos
    inputNuevaPassword.value = "";
    inputConfirmarPassword.value = "";
});

// Cerrar modal al hacer click en el overlay
modalPassword.querySelector('.modal__overlay').addEventListener('click', () => {
    modalPassword.classList.remove("modal--active");
    inputNuevaPassword.value = "";
    inputConfirmarPassword.value = "";
});

// Guardar nueva contraseña
btnGuardar.addEventListener('click', async () => {
    const nuevaPassword = inputNuevaPassword.value;
    const confirmarPassword = inputConfirmarPassword.value;

    // Validaciones
    if (!nuevaPassword || !confirmarPassword) {
        Toastify({
            text: "Por favor complete todos los campos",
            duration: 3000,
            gravity: "top",
            position: "center",
            style: { background: "red" },
        }).showToast();
        return;
    }

    if (nuevaPassword.length < 8) {
        Toastify({
            text: "La contraseña debe tener al menos 8 caracteres",
            duration: 3000,
            gravity: "top",
            position: "center",
            style: { background: "red" },
        }).showToast();
        return;
    }

    if (nuevaPassword !== confirmarPassword) {
        Toastify({
            text: "Las contraseñas no coinciden",
            duration: 3000,
            gravity: "top",
            position: "center",
            style: { background: "red" },
        }).showToast();
        return;
    }

    // Llamar a la API
    let resp = await cambiarPassword(id, nuevaPassword, token);

    if (resp.status === 200) {
        Toastify({
            text: "Contraseña actualizada correctamente",
            duration: 3000,
            gravity: "top",
            position: "center",
            style: { background: "green" },
        }).showToast();
        
        // Cerrar modal y limpiar
        modalPassword.classList.remove("modal--active");
        inputNuevaPassword.value = "";
        inputConfirmarPassword.value = "";
    } else {
        Toastify({
            text: resp.Mensaje || "Error al cambiar contraseña",
            duration: 3000,
            gravity: "top",
            position: "center",
            style: { background: "red" },
        }).showToast();
    }
});
