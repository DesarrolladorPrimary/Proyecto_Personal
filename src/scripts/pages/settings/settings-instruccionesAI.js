import { dataToken } from '/src/scripts/utils/dataToken.js';

const textarea   = document.querySelector('.ai-instructions__input');
const btnGuardar = document.querySelector('.ai-instructions__btn');
const trigger    = document.querySelector('#save-trigger');
const msg        = document.querySelector('.ai-instructions__success-msg');

const { id } = dataToken();
const token  = localStorage.getItem('Token');

// Carga la instrucción guardada en el textarea al entrar a la página
const cargarInstruccion = async () => {
    try {
        const res  = await fetch(`http://localhost:8080/api/v1/settings/instruccion-ia?id=${id}`, {
            method: 'GET',
            headers: { Authorization: 'Bearer ' + token }
        });
        const data = await res.json();
        if (res.ok && typeof data.instruccion === 'string') {
            textarea.value = data.instruccion;
        }
    } catch (e) {
        console.error('Error cargando instrucción:', e);
    }
};

// Activa el mensaje de éxito reutilizando la animación CSS que ya existe en la página
const mostrarMensaje = (texto) => {
    msg.textContent = texto;
    trigger.checked = false;
    void trigger.offsetWidth;
    trigger.checked = true;
    setTimeout(() => { trigger.checked = false; }, 2400);
};

// El botón "Guardar" es un <label> — interceptamos el clic para no marcar
// el checkbox a ciegas, sino solo cuando el backend confirme el guardado
btnGuardar.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        const res  = await fetch(`http://localhost:8080/api/v1/settings/instruccion-ia?id=${id}`, {
            method : 'PUT',
            headers: {
                Authorization : 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ instruccion: textarea.value || '' })
        });
        const data = await res.json();
        if (res.ok) mostrarMensaje('Guardado con éxito');
        else        mostrarMensaje(data?.Mensaje || 'Error al guardar');
    } catch (err) {
        console.error(err);
        mostrarMensaje('Error al guardar');
    }
});

cargarInstruccion();
