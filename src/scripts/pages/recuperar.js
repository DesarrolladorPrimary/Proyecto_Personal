document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM cargado - Página de recuperación de contraseña");

  let form = document.getElementById("form");
  let correoInput = document.getElementById("correo");

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const correo = correoInput.value;

    if (!correo) {
      alert("Por favor ingrese su correo");
      return;
    }

    console.log(`Correo enviado: ${correo}`);

    try {
      const datos = {
        "correo": correo,
      };

      const response = await fetch(`http://127.0.0.1:8080/api/v1/recuperar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datos),
      });

      const mensaje = await response.json();

      if (response.ok) {
        console.log("Solicitud enviada correctamente");
        
        Toastify({
          text: "Correo enviado. Revisa tu bandeja de entrada.",
          duration: 4000,
          gravity: "top",
          position: 'center',
          stopOnFocus: true,
          style: {
            background: "green",
          },
          callback: () => {
            window.location.href = "recovery_passwd_messaje.html";
          },
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
