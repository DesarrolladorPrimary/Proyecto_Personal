

const deleteUser = async()=>{
    fetch('http://localhost:8080/api/v1/usuarios/id')
}







document.addEventListener('DOMContentLoaded', () => {

    const button_confirm = document.querySelector("#confirm_delete");
    const modal_processing = document.querySelector("#modal-processing");
    const modal_success = document.querySelector("#modal-success");


    button_confirm.addEventListener('click', ()=>{
        deleteUser()
    })

    
});














