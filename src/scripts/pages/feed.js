import { dataToken } from "../utils/dataToken.js";

document.addEventListener("DOMContentLoaded", async () => {
  let logoUser = document.getElementById("logo_user");
  let menuUser = document.getElementById("user");

  const token = localStorage.getItem("Token");

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


  const { id } = dataToken();


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


  const compressImage = (file, maxWidth = 512, maxHeight = 512, quality = 0.8) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));

      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL("image/jpeg", quality);
        resolve(base64);
      };

      img.onerror = () => reject(new Error("Formato de imagen no válido"));
      reader.readAsDataURL(file);
    });


  // Función principal para manejar la carga de foto
  const setupProfilePhotoUpload = () => {
    // Obtener elementos del DOM
    const profileImage = document.getElementById("profile_photo_user"); // Tu img actual
    if (!profileImage) return;
    const fileInput = document.createElement("input"); // Input oculto

    // Configurar el input de archivo
    fileInput.type = "file";
    fileInput.accept = "image/*"; // Solo aceptar imágenes
    fileInput.style.display = "none"; // Mantenerlo oculto

    // Añadir el input al DOM
    document.body.appendChild(fileInput);

    // Evento click en la imagen
    profileImage.addEventListener("click", () => {
      fileInput.click(); // Abrir el selector de archivos
    });

    // Evento cuando se selecciona un archivo
    fileInput.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        Toastify({ text: "Selecciona una imagen válida", duration: 2500, style: { background: "orange" } }).showToast();
        fileInput.value = "";
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        Toastify({ text: "Máximo 8MB antes de comprimir", duration: 2500, style: { background: "orange" } }).showToast();
        fileInput.value = "";
        return;
      }

      try {
        const compressedBase64 = await compressImage(file, 512, 512, 0.8);

        // Enviar al backend como JSON (base64)
        const uploadResponse = await fetch(`http://localhost:8080/api/v1/upload/perfil?id=${id}`, {
          method: 'POST',
          headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imagen: compressedBase64
          }),
        });

        const data = await uploadResponse.json();
        
        if (uploadResponse.ok) {
          // Actualizar la imagen en el frontend
          profileImage.src = compressedBase64;
          
          const logoUser = document.getElementById("logo_user");
          if (logoUser) logoUser.src = compressedBase64;

          Toastify({ text: "Foto actualizada", duration: 2000, style: { background: "green" } }).showToast();
        } else {
          Toastify({ text: data.Mensaje || "Error al guardar", duration: 2500, style: { background: "red" } }).showToast();
        }
      } catch (err) {
        console.error("Error:", err);
        Toastify({ text: "Error procesando imagen", duration: 2500, style: { background: "red" } }).showToast();
      } finally {
        fileInput.value = "";
      }
    });
  };
  // Función para cargar la foto guardada al iniciar
  const loadSavedProfilePhoto = async (userId) => {
    const profileImage = document.getElementById("profile_photo_user");
    const logoUser = document.getElementById("logo_user");

    if (!profileImage) return;

    const defaultPhoto = "../../assets/icons/image.png";

    try {
      // Obtener datos del usuario del backend
      const response = await fetch(`http://localhost:8080/api/v1/usuarios/id?id=${userId}`, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        const fotoPerfil = userData.FotoPerfil;
        
        // Si tiene foto en el servidor, usarla desde el backend
        let photoSrc = defaultPhoto;
        if (fotoPerfil) {
          photoSrc = `http://localhost:8080/${fotoPerfil}`;
        }

        profileImage.src = photoSrc;
        if (logoUser) {
          logoUser.src = photoSrc;
        }
      } else {
        // Si hay error, usar default
        profileImage.src = defaultPhoto;
        if (logoUser) {
          logoUser.src = defaultPhoto;
        }
      }
    } catch (error) {
      console.error("Error cargando foto:", error);
      profileImage.src = defaultPhoto;
      if (logoUser) {
        logoUser.src = defaultPhoto;
      }
    }
  };




  loadSavedProfilePhoto(id);

  setupProfilePhotoUpload();




});
