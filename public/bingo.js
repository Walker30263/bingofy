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

var socket = io();
var bc;
var alreadyWon = false;

let footer = document.getElementById("footer");
let loadingBingoContainer = document.getElementById("loadingBingoContainer");
let invalidContainer = document.getElementById("invalidContainer");
let bingoContainer = document.getElementById("bingoContainer");
let askForNameContainer = document.getElementById("askForNameContainer");
let inputName = document.getElementById("name");
let btnNext = document.getElementById("next");
let bingoCardContainer = document.getElementById("cardContainer");
let btnSubmit = document.getElementById("submit");
let thanksForUsingThisContainer = document.getElementById("thanksForUsingThis");

window.onload = function() {
  let url = window.location.href;
  let invite = url.substring(url.lastIndexOf('/') + 1).toLowerCase();

  socket.emit("getBingoCardFromInvite", invite);
}

socket.on("invalidBingoCardInvite", () => {
  loadingBingoContainer.style.display = "none";
  invalidContainer.style.display = "block";
  
  let x = 10;
  
  let countdown = setInterval(function() {
    if (x > 1) {
      document.getElementById("invalidSoRedirecting").textContent = "You will be redirected to the main page in " + x + " seconds."
    } else if (x === 1) {
      document.getElementById("invalidSoRedirecting").textContent = "You will be redirected to the main page in 1 second."
    } else {
      clearInterval(countdown);
      window.location.href = '/';
    }
    x--;
  }, 1000);
});

socket.on("bingoCardFromInvite", (data) => {
  document.title = `${data.display_name}'s Bingofy`;

  let ownersNameElements = document.getElementsByClassName("bingoOwner");
  for (let i = 0; i < ownersNameElements.length; i++) {
    ownersNameElements[i].textContent = data.display_name;
  }

  bc = new BingoCard(JSON.parse(data.bingo_card));
  bc.print();

  let bingoSquares = document.querySelectorAll("#bingo td .content > div");
  for (let i = 0; i < bingoSquares.length; i++) {
    bingoSquares[i].parentNode.parentNode.addEventListener("click", function() {
      bingoSquares[i].parentNode.parentNode.classList.toggle("selected");
      bc.toggleCrossed(i);

      if (!alreadyWon && bc.won()) { //if they haven't already "won" before, and they just won,
        Swal.fire({
          title: "Congrats!",
          text: `You won! Click the "Continue" button to keep crossing off artists, or send your response to ${data.display_name} right now by clicking the submit button!`,
          iconColor: swalAlertColor.iconColor,
          background: swalAlertColor.backgroundColor,
          color: swalAlertColor.color,
          confirmButtonText: `Continue`
        });
        alreadyWon = true;
      }
    });
  }
  
  loadingBingoContainer.style.display = "none";
  bingoContainer.style.display = "block";
  footer.style.display = "none";
});

btnNext.addEventListener("click", function() {
  askForNameContainer.style.display = "none";
  bingoCardContainer.style.display = "block";
});

btnSubmit.addEventListener("click", function() {
  let url = window.location.href;
  let invite = url.substring(url.lastIndexOf('/') + 1).toLowerCase();
  
  socket.emit("submitBingoCardResponse", invite, inputName.value, JSON.stringify(bc));

  bingoContainer.style.display = "none";
  thanksForUsingThisContainer.style.display = "block";
  footer.style.display = "block";
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