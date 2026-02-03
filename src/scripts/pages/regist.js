document.addEventListener('DOMContentLoaded', ()=> {
    let form = document.getElementById("form")
    let userInput = document.getElementById("user_regist")
    let correoInput = document.getElementById("correo_regist")
    let contraseñaInput = document.getElementById("password_regist")
    let contraseñaInputVery = document.getElementById("password_registVery")

    form.addEventListener('submit', async (e)=> {

        e.preventDefault();

        const username = userInput.value;
        const correo = correoInput.value;
        const contraseña = contraseñaInput.value;
        const contraseñaVery = contraseñaInputVery.value;

        if (username.length <= 2) {
            alert("El nombre es muy corto")
            return;
        }
        
        if (contraseña !== contraseñaVery)  {
            alert("Las contraseñas no coinciden")
            return;
        }
        else if(contraseña.length <= 2){
            alert("La contraseña es muy corta")
            return;
        }


        if (username == null) {
            alert("Campo de usuario vacio");
            return;
        }
        else if (correo == null){
            alert("Campo del correo vacio");
            return;
        }
        else if(contraseña == null){
            alert("Campo de la contraseña vacio");
            return;
        }
        else if (username == null && correo == null && contraseña == null){
            alert("Los campos estan vacios");
            return;
        }


        const datosUser = {
            "nombre": username,
            "correo": correo,
            "contraseña": contraseña
        }

        let mensaje = "";

        const response = await fetch("http://localhost:8080/api/v1/usuarios", {
            method : "POST",
            headers: {
                "Content-Type" : "application/json"
            },
            body: JSON.stringify(datosUser)
        });

        if (response.ok) {
            mensaje = await response.json();

            Toastify({
                text: mensaje.Mensaje,
                duration: 2000,
                gravity: "bottom",
                position: 'center',
                stopOnFocus: true,
                style: {
                    heigth: "200px",
                    background: "gray"
                },
                callback: ()=>{
                    window.location.href="../auth/login.html"
                }
            }).showToast();
            
            
        }
        else {
            mensaje = await response.json();
            Toastify({
                text: mensaje.Mensaje,
                duration: 2000,
                ravity: "bottom",
                position: 'center',
                stopOnFocus: true,
                style: {
                    heigth: "200px",
                    background: "red"
                },
            }).showToast();
        }
    })
});