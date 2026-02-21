document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM cargado - Página de nueva contraseña");

  let form = document.getElementById("form");
  let contraseñaInput = document.getElementById("contraseña");
  let confirmarInput = document.getElementById("confirmar_contraseña");

  // Obtener el token de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  console.log(`Token recibido: ${token}`);

  // Si no hay token, mostrar error
  if (!token) {
    Toastify({
      text: "Token no válido. Por favor Solicite un nuevo enlace de recuperación",
      duration: 5000,
      gravity: "top",
      position: 'center',
      stopOnFocus: true,
      style: {
        background: "red",
      },
    }).showToast();
    
    // Deshabilitar el formulario
    form.querySelector('button').disabled = true;
    return;
  }

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const contraseña = contraseñaInput.value;
    const confirmarContraseña = confirmarInput.value;

    // Validaciones
    if (!contraseña || !confirmarContraseña) {
      Toastify({
        text: "Por favor complete todos los campos",
        duration: 3000,
        gravity: "top",
        position: 'center',
        stopOnFocus: true,
        style: {
          background: "red",
        },
      }).showToast();
      return;
    }

    if (contraseña.length < 8) {
      Toastify({
        text: "La contraseña debe tener al menos 8 caracteres",
        duration: 3000,
        gravity: "top",
        position: 'center',
        stopOnFocus: true,
        style: {
          background: "red",
        },
      }).showToast();
      return;
    }

    if (contraseña !== confirmarContraseña) {
      Toastify({
        text: "Las contraseñas no coinciden",
        duration: 3000,
        gravity: "top",
        position: 'center',
        stopOnFocus: true,
        style: {
          background: "red",
        },
      }).showToast();
      return;
    }

    console.log(`Nueva contraseña: ${contraseña}`);

    try {
      const datos = {
        "token": token,
        "contraseña": contraseña,
      };

      const response = await fetch(`http://127.0.0.1:8080/api/v1/recuperar/nueva`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datos),
      });

      const mensaje = await response.json();

      if (response.ok) {
        console.log("Contraseña actualizada correctamente");
        
        Toastify({
          text: "Contraseña actualizada correctamente",
          duration: 3000,
          gravity: "top",
          position: 'center',
          stopOnFocus: true,
          style: {
            background: "green",
          },
          callback: () => {
            window.location.href = "login.html";
          }
        }).showToast();
      } else {
        Toastify({
          text: `Error: ${mensaje.Mensaje}`,
          duration: 3000,
          gravity: "top",
          position: 'center',
          stopOnFocus: true,
          style: {
            background: "red",
          },
        }).showToast();
      }
    } catch (error) {
      Toastify({
        text: "Error de conexión",
        duration: 3000,
        gravity: "top",
        position: 'center',
        stopOnFocus: true,
        style: {
          background: "red",
        },
      }).showToast();
    }
  });
});
