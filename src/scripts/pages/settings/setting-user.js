import { dataToken } from '../../utils/dataToken.js'

const button_delete = document.querySelector("#button-del")
const modal_confirm = document.querySelector("modal-confirm")
const button_confirm = document.querySelector("#confirm_delete");
const modal_processing = document.querySelector("#modal-processing");
const modal_success = document.querySelector("#modal-success");



const deleteUser = async (id, token) => {
    await fetch(`http://localhost:8080/api/v1/usuarios/id?id=${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: "Bearer " + token,
        },

    })
}


document.addEventListener('DOMContentLoaded', () => {

    let datos = dataToken();


    const { id } = datos

    const token = localStorage.getItem("Token");

    button_delete.addEventListener('click', ()=>{
        modal_confirm.classList.add("modal--active")
    })



});














