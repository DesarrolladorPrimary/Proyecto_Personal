document.addEventListener("DOMContentLoaded", () => {
  let logoUser = document.getElementById("logo_user");
  let menuUser = document.getElementById("user");

  let buttonLogout = document.getElementById('logout');

  console.log(logoUser);
  console.log(menuUser);

    logoUser.addEventListener('click', ()=> {
        menuUser.classList.toggle('menu-user--visible');
    })


   buttonLogout.addEventListener('click', ()=> {
        localStorage.removeItem("Token");

        Toastify({
            text: "Sesion cerrada",
            duration: 2000,
            gravity: 'top',
            position: 'center',
            stopOnFocus: true,
            style: {
                with: "300px",
                background: "red"
            },
            callback: ()=>{
                window.location.href="/public/auth/login.html"
            }
        }).showToast();
   })


        
   
});
