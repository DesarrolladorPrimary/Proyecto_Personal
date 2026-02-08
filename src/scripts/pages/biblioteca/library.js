import { dataToken } from "../../utils/dataToken.js"; 

document.addEventListener('DOMContentLoaded', ()=>{
    
    
    let inputLibrary = document.getElementById("input_library");
    console.log(inputLibrary);

    const {id} = dataToken;
    const token = localStorage.getItem("Token")

    inputLibrary.addEventListener('change', async ()=> {
        const nombreLibreria = inputLibrary.value;

        console.log(nombreLibreria);

        const data = {
                id: id,
                nameCategory: nombreLibreria
            }

        const response = await fetch(`http://localhost:8080/api/v1/shelves`, {
            method: "POST",
            headers:{
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(data)
        })


        console.log(await response);
        



        
    })
})