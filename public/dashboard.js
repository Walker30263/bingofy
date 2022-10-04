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
    
    for (let i = 0; i < artists.length; i++) {
      if (i === 12) {
        this.elements.push("FREE"); 
      }

      this.elements.push(artists[i]);
    }

    this.crossed = crossed;
  }

  toggleCrossed(index) {
    if (this.crossed.includes(index)) { //already crossed, uncross it:
      this.crossed = this.crossed.filter(function(el) {
        return el !== index
      });
    } else { //not crossed, cross it
      this.crossed.push(index);
    }
  }

  print() {
    for (let i = 0; i < this.elements.length; i++) {
      document.getElementById(`bingo_index_${i}`).textContent = this.elements[i];
    }
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
    bc.print();
    bingoCardLink.textContent = `bingofy.tk/bingo/${data.bingo_card_invite}`;
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

socket.on("topArtists", (topArtists, invite) => {
  bc = new BingoCard(topArtists);
  bc.print();
  bingoCardLink.textContent = `bingofy.tk/bingo/${invite}`;
  creatingBingoContainer.style.display = "none";
  bingoCardContainer.style.display = "block";
});

btnCopyLinkToClipboard.addEventListener("click", function() {
  navigator.clipboard.writeText(bingoCardLink.textContent);
  alertify.notify('Copied to clipboard!', 'success', 5); 
});

bingoCardLink.addEventListener("click", function() {
  btnCopyLinkToClipboard.click();
});

btnCopyLinkToClipboard.addEventListener("contextmenu", function(e) {
  e.preventDefault();
  requestNewInviteCodeSwal();
});

bingoCardLink.addEventListener("contextmenu", function(e) {
  e.preventDefault();
  requestNewInviteCodeSwal();
});


async function requestNewInviteCodeSwal() {
  let { value: requestedInviteCode } = await Swal.fire({
    title: "Custom Bingofy Invite Code",
    input: "text",
    inputLabel: "Invite Code:",
    showCancelButton: true,
    inputValidator: (value) => {
      if (!isAlphaNumeric(value)) {
        return "The new invite code that you're requesting has to be alphanumeric (characters a-z, A-Z, 0-9) with no spaces, since it's going to be part of the link to your Bingofy.";
      }
    },
    background: swalAlertColor.backgroundColor,
    color: swalAlertColor.color
  });

  if (requestedInviteCode) {
    let token = localStorage.getItem("token");
    socket.emit("requestCustomInviteCode", token, requestedInviteCode);
  }
}

socket.on("updatedInviteCode", (newCode) => {
  bingoCardLink.textContent = `bingofy.tk/bingo/${newCode}`;
});

//helper functions:
socket.on("error", (errorTitle, errorMessage) => {
  swalError(errorTitle, errorMessage);
});

socket.on("success", (successTitle, successMessage) => {
  swalSuccess(successTitle, successMessage);
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

//credit: https://www.30secondsofcode.org/js/s/is-alpha-numeric
let isAlphaNumeric = str => /^[a-z0-9]+$/gi.test(str);