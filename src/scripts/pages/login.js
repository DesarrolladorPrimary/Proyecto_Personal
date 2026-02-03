document.addEventListener("DOMContentLoaded", () => {
  console.log("Dom cargado");

  let form = document.getElementById("form");
  let correoInput = document.getElementById("login_email");
  let contraseñaInput = document.getElementById("login_password");

  console.log(`Campo correo cargado: ${correoInput}`);
  console.log(`Campo contraseña cargado: ${contraseñaInput}`);

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const correo = correoInput.value;
    const contraseña = contraseñaInput.value;

    if (contraseña.length <= 2) {
      alert("La contraseña es muy corta");
      contraseñaInput.focus();
      return;
    }

    console.log(`Correo recibido: ${correo}`);
    console.log(`Contraseña recibida: ${contraseña}`);

    try {
      const datosLogin = {
        "correo": correo,
        "contraseña": contraseña,
      };

      const response = await fetch(`http://127.0.0.1:8080/api/v1/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datosLogin),
      });

    let mensaje = "";

      if (response.ok) {
        console.log("Inicio de sesion correcto");
        mensaje = await response.json();

        localStorage.setItem("Token", mensaje.Token);
        
        Toastify({
          text: "Bienvenido, inicio de sesion correcto",
          duration: 2000,
          gravity: "top",
          position: 'center',
          stopOnFocus: true,
          style: {
              heigth: "500px",
              background: "gray",
          },
          callback: ()=>{
            window.location.href="../feed/feed-main.html"
          }
        }).showToast();
      } else {
        
        const mensaje = await response.json();

        Toastify({
          text: `Error: ${mensaje.Mensaje}`,
          duration: 3000,
          gravity: "top",
          position: 'center',
          stopOnFocus: true,
          style: {
              heigth: "300px",
              background: "red",
          },
        }).showToast();
      }
    } catch (error) {
       Toastify({
          text: error,
          duration: 3000,
          gravity: "top",
          position: 'center',
          stopOnFocus: true,
          style: {
              heigth: "300px",
              background: "red",
          },
        }).showToast();
    }
  });
});
