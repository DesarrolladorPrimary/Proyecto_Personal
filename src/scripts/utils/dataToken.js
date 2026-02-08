export const dataToken = () => {
    let token = localStorage.getItem("Token");

    let tokenPayload = token.split(".");

    let datosPayload = atob(tokenPayload[1]);

    let datos = JSON.parse(datosPayload);

    return datos;

}