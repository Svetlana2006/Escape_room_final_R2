const isLocalHost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

window.ESCAPE_ROOM_CONFIG = {
  apiBaseUrl: isLocalHost
    ? window.location.origin
    : "https://escape-room-final-r2.onrender.com",
};
