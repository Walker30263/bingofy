let client_id = "6e700888c3614a68b82c793d070bd82e";
let redirect_uri = "http://bingofy.tk/callback";
let btnLogin = document.getElementById("btnLogin");

btnLogin.addEventListener("click", function() {
  let url = "https://accounts.spotify.com/authorize";
  url += "?client_id=" + client_id;
  url += "&response_type=code";
  url += "&redirect_uri=" + encodeURI(redirect_uri);
  url += "&show_dialog=true";
  url += "&scope=user-read-private user-read-email user-top-read";
  
  window.location.href = url;
});