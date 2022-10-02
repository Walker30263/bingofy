const swalAlertColor = {
  iconColor: '#FFFFFF',
  backgroundColor: '#321a47',
  color: '#FFFFFF'
};

class BingoCard {
  //artists array must have 24 elements since 1 free spot
  //element at index 12 is free spot, which is crossed out by default
  constructor(artists, crossed = [12]) {
    this.elements = [];
    
    for (let i = 0; i < 12; i++) {
      this.elements.push(artists[i]);
    }
    
    this.elements.push("FREE");
    
    for (let i = 12; i < 24; i++) {
      this.elements.push(artists[i]);
    }

    this.crossed = crossed;
  }
}

var bc;
var socket = io();

let loadingContainer = document.getElementById("loadingContainer");
let everythingElseContainer = document.getElementById("everythingElseContainer");
let btnCreateCard = document.getElementById("createCard");
let bingoCardContainer = document.getElementById("bingoCardContainer");
let btnCopyLinkToClipboard = document.getElementById("copyLinkToClipboard");
let bingoCardLink = document.getElementById("bingoCardLink");

window.onload = function() {
  let token = localStorage.getItem("token");
  let spotifyAccessToken = localStorage.getItem("spotifyAccessToken");
  
  if (token && spotifyAccessToken) {
    socket.emit("getBingoCardsData", token);
  } else {
    window.location.href = "/";
  }
}

socket.on("bingoCardsData", (data) => {
  loadingContainer.style.display = "none";
  everythingElseContainer.style.display = "block";
  
  if (data.bingo_card === "[]") { //aka empty JSON array
    btnCreateCard.style.display = "block";
  } else {
    bc = new BingoCard(JSON.parse(data.bingo_card));
    bingoCardContainer.style.display = "block";
  }
});

socket.on("redirectToHomepage", () => {
  window.location.href = "/";
});

btnCreateCard.addEventListener("click", function() {
  btnCreateCard.style.display = "none";
  creatingBingoContainer.style.display = "block";

  socket.emit("getTopArtists", localStorage.getItem("token"), localStorage.getItem("spotifyAccessToken"));
});

socket.on("notEnoughArtists", function() {
  swalError("Not enough artists!", "You didn't listen to at least 24 different artists/band in the past 6 months.");
});

socket.on("topArtists", (topArtists) => {
  bc = new BingoCard(topArtists);
  creatingBingoContainer.style.display = "none";
  bingoCardContainer.style.display = "block";
});

btnCopyLinkToClipboard.addEventListener("click", function() {
  navigator.clipboard.writeText(bingoCardLink.textContent);
  alertify.notify('Copied to clipboard!', 'success', 5); 
});

//helper functions:
socket.on("error", (errorTitle, errorMessage) => {
  swalError(errorTitle, errorMessage);
});

function swalError(errorTitle, errorMessage) {
  Swal.fire({
    title: errorTitle,
    text: errorMessage,
    icon: "error",
    iconColor: swalAlertColor.iconColor,
    background: swalAlertColor.backgroundColor,
    color: swalAlertColor.color
  });
}

function swalSuccess(successTitle, successMessage) {
  Swal.fire({
    title: successTitle,
    text: successMessage,
    icon: "success",
    iconColor: swalAlertColor.iconColor,
    background: swalAlertColor.backgroundColor,
    color: swalAlertColor.color
  });
}