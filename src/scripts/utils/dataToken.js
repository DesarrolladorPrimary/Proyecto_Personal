import { parseTokenSafely } from "./auth-session.js";

export const dataToken = () => parseTokenSafely() || {};
