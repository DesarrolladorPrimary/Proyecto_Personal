document.addEventListener("DOMContentLoaded", () => {
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

  window.addEventListener('click', (e)=>{
    if (e.target != logoUser && !menuUser.contains(e.target)) {
        menuUser.classList.remove("menu-user--visible");
    }


    if (!headerAside.contains(e.target) && !aside.contains(e.target)) {
        aside.classList.remove("aside--active");
    }

  })
});
