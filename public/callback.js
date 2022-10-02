var socket = io();

window.onload = function() {
  let urlParams = new URLSearchParams(window.location.search);

  if (urlParams.has("code")) {
    let code = urlParams.get("code");

    socket.emit("login", code);
  } else {
    window.location.href = "/";
  }
}

socket.on("loginError", () => {
  window.location.href = "/";
});