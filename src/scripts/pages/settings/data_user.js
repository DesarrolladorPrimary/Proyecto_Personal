const usuario = document.querySelector("#usuario");
const correo = document.querySelector("#correo");
const fechaRegistro = document.querySelector("#fechaRegistro");
const rolFunciones = document.querySelector("#funciones");
const perfilUser = document.querySelector("#perfilUser")

import { dataToken } from './../../utils/dataToken.js';

const {id} = dataToken();

let token = localStorage.getItem("Token");


const request = async (id)=> {
    let rt = await fetch(`http://localhost:8080/api/v1/usuarios/id?id=${id}`, {
        method: "GET",
        headers: {
            Authorization: "Bearer " + token,
        }
    })
    
    let data = await rt.json()
    return data;
}


document.addEventListener('DOMContentLoaded', async ()=>{
    let user = await request(id);

    console.log(user);
    

    
    // Asignar datos a los elementos del DOM
    if(user.status === 200) {
        perfilUser.textContent = user.Nombre;
        usuario.textContent = user.Nombre;
        correo.textContent = user.Correo;
        fechaRegistro.textContent = user["Fecha Registro"];
        rolFunciones.textContent = user.Rol;

    }
    
    
    
})
