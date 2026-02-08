import { dataToken } from "../utils/dataToken.js";

document.addEventListener("DOMContentLoaded", async () => {
  let logoUser = document.getElementById("logo_user");
  let menuUser = document.getElementById("user");

  let aside = document.getElementById("sidebar");
  let headerAside = document.getElementById("header__nav");

  let buttonLogout = document.getElementById("logout");

  logoUser.addEventListener("click", (e) => {
    menuUser.classList.toggle("menu-user--visible");
  });

  headerAside.addEventListener("click", () => {
    aside.classList.toggle("aside--active");
  });

  buttonLogout.addEventListener("click", () => {
    localStorage.removeItem("Token");

    Toastify({
      text: "Sesion cerrada",
      duration: 2000,
      gravity: "top",
      position: "center",
      stopOnFocus: true,
      style: {
        with: "300px",
        background: "red",
      },
      callback: () => {
        window.location.href = "/public/auth/login.html";
      },
    }).showToast();
  });

  window.addEventListener("click", (e) => {
    if (e.target != logoUser && !menuUser.contains(e.target)) {
      menuUser.classList.remove("menu-user--visible");
    }

    if (!headerAside.contains(e.target) && !aside.contains(e.target)) {
      aside.classList.remove("aside--active");
    }
  });

  
  const {id} = dataToken();
  

  try {
    const obtenerDatosUser = await fetch(
      "http://localhost:8080/api/v1/usuarios/id?id=" + id,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
      },
    );

    switch (obtenerDatosUser.status) {
      case 401:
        localStorage.removeItem("Token");
        Toastify({
          text: "El token expiro",
          duration: 2000,
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            width: "300px",
            background: "red",
          },
          callback: () => {
            window.location.href = "/public/auth/login.html";
          },
        }).showToast();
        break;

      case 404:
        Toastify({
          text: "El recurso no fue encontrado",
          duration: 2000,
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            width: "300px",
            background: "red",
          },
        }).showToast();
        break;

      case 500:
        Toastify({
          text: "Error del servidor",
          duration: 2000,
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            width: "300px",
            background: "red",
          },
        }).showToast();
        break;
      case 200:
        const User = await obtenerDatosUser.json();

        const datosUser = {
          id: User.PK_UsuarioID,
          nombre: User.Nombre,
          correo: User.Correo,
          role: User.Rol,
        };

        const { id, nombre, correo, role } = datosUser;

        let campoNombre = document.getElementById("nombre_usuario");
        let campoCorreo = document.getElementById("correo_usuario");

        if (nombre != null && correo != null) {
          campoNombre.innerText = nombre;
          campoCorreo.innerText = correo;
        }
        break;
    }
    return;
  } catch (error) {
    Toastify({
      text: error,
      duration: 2000,
      gravity: "top",
      position: "center",
      stopOnFocus: true,
      style: {
        width: "300px",
        background: "red",
      },
    }).showToast();
  }
});
