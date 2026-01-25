let token = localStorage.getItem("Token");
let rutaActual = window.location.pathname;

    if(rutaActual.includes("/feed/")){
        if (!token) {
            window.location.href="/public/auth/login.html"
        }
    }
    else {
        if (rutaActual.includes("login") || rutaActual.includes("regist")) {
            if (token) {
                window.location.href="/public/feed/feed-main.html"
            }
        }
    }

    

    