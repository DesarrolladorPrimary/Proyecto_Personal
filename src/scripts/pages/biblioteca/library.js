import { dataToken } from "../../utils/dataToken.js";


document.addEventListener('DOMContentLoaded', async () => {
    let idShelf = 0;
    let inputLibrary = document.getElementById("input_library");
    const { id } = dataToken();
    const token = localStorage.getItem("Token");
    const storageKey = `shelfName:${id}`;

    const savedName = sessionStorage.getItem(storageKey);
    if (savedName) {
        inputLibrary.value = savedName;
    }

    inputLibrary.addEventListener('input', () => {
        sessionStorage.setItem(storageKey, inputLibrary.value);
    });

    inputLibrary.addEventListener('change', async () => {
        const nombreLibreria = inputLibrary.value;
        sessionStorage.setItem(storageKey, nombreLibreria);

        const data = {
            id: id,
            nameCategory: nombreLibreria
        };

        const response = await fetch(`http://localhost:8080/api/v1/shelves`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        console.log(await response.json());
        
    });
})
