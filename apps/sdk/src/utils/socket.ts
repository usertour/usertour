import { io } from "socket.io-client";

// "undefined" means the URL will be computed from the `window.location` object
// const URL = "http://localhost:3000";
const URL = import.meta.env.VITE_WS_URI;

export const socket = io(URL, { withCredentials: false });
