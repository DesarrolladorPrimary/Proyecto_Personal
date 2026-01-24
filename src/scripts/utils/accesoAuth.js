let token = localStorage.getItem("Token");

    if(!token){
        alert("Inicie sesion primero");
        window.location.href="/public/auth/login.html"
    }
