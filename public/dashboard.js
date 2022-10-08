var socket = io();

const swalAlertColor = {
  iconColor: '#FFFFFF',
  backgroundColor: '#321a47',
  color: '#FFFFFF'
};

class BingoCard {
  //artists array must have 24 elements since 1 free spot
  //element at index 12 is free spot, which is crossed out by default
  constructor(artists, crossed = [12], viewingResponse = false) {
    this.elements = [];
    
    for (let i = 0; i < artists.length; i++) {
      if ((i === 12) && !viewingResponse) {
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

  print(elementStart) {
    for (let i = 0; i < this.elements.length; i++) {
      document.getElementById(`${elementStart}_${i}`).textContent = this.elements[i];
      //fitty(document.getElementById(`${elementStart}_${i}`).parentNode);
    }

    for (let i = 0; i < this.crossed.length; i++) {
      document.getElementById(`${elementStart}_${this.crossed[i]}`).parentNode.parentNode.classList.add("selected");
    }
  }

  deletePrint(elementStart) {
    for (let i = 0; i < this.elements.length; i++) {
      document.getElementById(`${elementStart}_${i}`).textContent = "";
    }

    for (let i = 0; i < this.crossed.length; i++) {
      document.getElementById(`${elementStart}_${this.crossed[i]}`).parentNode.parentNode.classList.remove("selected");
    }
  }

  won() {
    //if at least these squares are selected, they won:
    let winningArrays = [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24], [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24], [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]];

    let won = false;

    for (let i = 0; i < winningArrays.length; i++) {
      if (this.isSelected(winningArrays[i])) {
        won = true;
        break;
      }
    }

    return won;
  }

  //input is an array of indexes to check, only returns true if ALL are crossed
  isSelected(arr) {
    let result = true;

    for (let i = 0; i < arr.length; i++) {
      if (!this.crossed.includes(arr[i])) {
        result = false;
        break;
      }
    }

    return result;
  }
}


var bc;
var bingoResponses;
var bingoResponseIndex = 0;
var bc_ResponseView;

let loadingContainer = document.getElementById("loadingContainer");
let everythingElseContainer = document.getElementById("everythingElseContainer");
let btnCreateCard = document.getElementById("createCard");
let bingoCardContainer = document.getElementById("bingoCardContainer");
let btnCopyLinkToClipboard = document.getElementById("copyLinkToClipboard");
let bingoCardLink = document.getElementById("bingoCardLink");
let noResponsesYetContainer = document.getElementById("noResponsesYetContainer");
let responseContainer = document.getElementById("responseContainer");
let btnRefreshResponses = document.getElementById("refreshResponses");
let responderNameDisplay = document.getElementById("responderNameDisplay");
let responseInfoDisplay = document.getElementById("responseInfoDisplay");
let responseIndexDisplay = document.getElementById("responseIndexDisplay");
let btnNextResponse = document.getElementById("nextResponse");
let btnPreviousResponse = document.getElementById("previousResponse");

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
    bc.print("bingo_index");
    bingoCardLink.textContent = `bingofy.tk/bingo/${data.bingo_card_invite}`;
    bingoCardContainer.style.display = "block";
    btnCopyLinkToClipboard.style.display = "inline-block";
  }

  handleBingoResponses(JSON.parse(data.bingo_responses));
});

btnRefreshResponses.addEventListener("click", async function() {
  let token = localStorage.getItem("token");
  
  let newResponses = await fetchWrapper("POST", "/requestBingoResponses", {
    token: token
  });

  if (newResponses.error) {
    window.location.href = "/";
  } else {
    handleBingoResponses(JSON.parse(newResponses.data));
    Swal.fire({
      title: "Reloaded responses!",
      icon: "success",
      iconColor: swalAlertColor.iconColor,
      background: swalAlertColor.backgroundColor,
      color: swalAlertColor.color
    });
  }
});

//"responses" has to be an actual array not a JSON.stringify-ied string
function handleBingoResponses(responses) {
  bingoResponses = responses;
  
  if (responses.length === 0) {
    noResponsesYetContainer.style.display = "block";
  } else {
    noResponsesYetContainer.style.display = "none";
    responseContainer.style.display = "block";
    displayBingoResponse(bingoResponseIndex);
  }
}

function displayBingoResponse(index) {
  let response = bingoResponses[index];
  
  if (index === 0) {
    btnPreviousResponse.disabled = true;
  } else {
    btnPreviousResponse.disabled = false;
  }

  if (index === (bingoResponses.length - 1)) {
    btnNextResponse.disabled = true;
  } else {
    btnNextResponse.disabled = false;
  }

  let rcData = JSON.parse(response.bingoCard);
  
  bc_ResponseView = new BingoCard(rcData.elements, rcData.crossed, true);
  bc_ResponseView.print("response_bingo_index");

  responderNameDisplay.innerHTML = response.responderName;
  responseInfoDisplay.textContent = `'s Response - ${Math.round((rcData.crossed.length - 1)/24 * 100)}% Match`;
  responseIndexDisplay.textContent = `${index+1} / ${bingoResponses.length}`;
}

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
  bc.print("bingo_index");
  bingoCardLink.textContent = `bingofy.tk/bingo/${invite}`;
  btnCopyLinkToClipboard.style.display = "inline-block";
  creatingBingoContainer.style.display = "none";
  bingoCardContainer.style.display = "block";
});

btnCopyLinkToClipboard.addEventListener("click", function() {
  navigator.clipboard.writeText("https://" + bingoCardLink.textContent);
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

btnNextResponse.addEventListener("click", function() {
  bingoResponseIndex++;
  bc_ResponseView.deletePrint("response_bingo_index");
  displayBingoResponse(bingoResponseIndex);
});

btnPreviousResponse.addEventListener("click", function() {
  bingoResponseIndex--;
  bc_ResponseView.deletePrint("response_bingo_index");
  displayBingoResponse(bingoResponseIndex);
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

async function fetchWrapper(type = 'GET', url = '', data = {}) {
  const response = await fetch(url, {
    method: type,
    credentials: 'include',
    cache: 'no-cache',
    headers: new Headers({
      "content-type": "application/json"
    }),
    body: JSON.stringify(data)
  });
  return response.json(); //parses JSON response into JavaScript objects
}

//credit: https://www.30secondsofcode.org/js/s/is-alpha-numeric
let isAlphaNumeric = str => /^[a-z0-9]+$/gi.test(str);