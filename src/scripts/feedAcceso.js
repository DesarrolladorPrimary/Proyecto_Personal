let token = localStorage.getItem("Token");

    if(!token){
        alert("Inicie sesion primero");
        window.location.href="../auth/login.html"
    }
