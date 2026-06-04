const API_HOST = window.location.hostname;
const PORT = 8000;

export const API_BASE = `http://${API_HOST}:${PORT}/api`;
export const WS_BASE = `ws://${API_HOST}:${PORT}/api/ws`;
export const DATA_BASE = `http://${API_HOST}:${PORT}`;
