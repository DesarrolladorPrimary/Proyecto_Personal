import { dataToken } from '/src/scripts/utils/dataToken.js';

const { id } = dataToken();
const token  = localStorage.getItem('Token');

const freeBtn = document.querySelector('.plan-card--free .plan-card__button');
const premBtn = document.querySelector('.plan-card--premium .plan-card__button');

// Marca visualmente qué plan está activo según la respuesta del backend
const marcarActivo = (planActivo) => {
    const esPremium = planActivo.toLowerCase().includes('premium');

    if (esPremium) {
        freeBtn.classList.remove('plan-card__button--current');
        premBtn.classList.remove('plan-card__button--upgrade');
        premBtn.classList.add('plan-card__button--current');
        premBtn.innerHTML   = 'Activo';
        freeBtn.textContent = 'Disponible';
    } else {
        freeBtn.classList.add('plan-card__button--current');
        premBtn.classList.remove('plan-card__button--current');
        premBtn.classList.add('plan-card__button--upgrade');
        premBtn.innerHTML = '<label for="checkPay" class="plan-card__button-label">💎 Comprar Premium</label>';
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res  = await fetch(`http://localhost:8080/api/v1/settings/suscripcion?id=${id}`, {
            method: 'GET',
            headers: { Authorization: 'Bearer ' + token }
        });
        const data = await res.json();
        marcarActivo(data.plan || '');
    } catch (e) {
        console.error('Error cargando suscripción:', e);
    }
});
