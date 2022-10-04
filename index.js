const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);

const fetch = require("node-fetch");

const { Server } = require("socket.io");
const io = new Server(server);

const sqlite3 = require("sqlite3").verbose();
const jwt = require('jsonwebtoken');

app.use(express.static("public")); //client-side css and js files

app.get('/', (req, res) => {
  res.sendFile(__dirname + "/pages/index.html");
});

app.get('/callback', (req, res) => {
  res.sendFile(__dirname + "/pages/callback.html");
});

app.get('/dashboard', (req, res) => {
  res.sendFile(__dirname + "/pages/dashboard.html");
});

app.get('/bingo/:invite', (req, res) => {
  res.sendFile(__dirname + "/pages/bingo.html");
});

//THIS HAS TO BE KEPT AT THE END OF THE ROUTING SECTION OF THE CODE
app.get('*', (req, res) => { //if user tries to go to a random subpage that doesn't exist,
  res.redirect('/'); //redirect them to the home page
});

console.log("Initializing database...");

let usersDb = new sqlite3.Database(__dirname + "/database/users.db", (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("connected to the database!");
  }
});

usersDb.serialize(() => {
  usersDb.run(`CREATE TABLE IF NOT EXISTS users(
    spotify_id TEXT PRIMARY KEY,
    display_name TEXT,
    bingo_card TEXT,
    bingo_responses TEXT,
    bingo_cards_archive TEXT,
    bingo_card_invite TEXT UNIQUE
  )`
  );

  //logging database, uncomment following code to log profiles in console at runtime:
  usersDb.all(`SELECT spotify_id, display_name, bingo_card, bingo_responses, bingo_cards_archive, bingo_card_invite FROM users`, [], (err, rows) => {
    if (err) {
      console.log(err);
    } else {
      rows.forEach(row => {
        console.log(row);
      });
    }
  });
});

usersDb.close((err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("Successfully initialized database!");
  }
});

io.on("connection", (socket) => {
  //relying on Spotify for authentication
  //user's Bingofy accounts are directly associated with their Spotify account/Spotify account ID
  socket.on("login", (code) => {
    fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${Buffer.from(process.env['CLIENT_ID'] + ':' + process.env['CLIENT_SECRET']).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURI("http://bingofy.tk/callback")}&client_id=${process.env['CLIENT_ID']}&client_secret=${process.env["CLIENT_SECRET"]}`
    })
    .then(response => response.json())
    .then(async data => {
      if (data.error) {
        socket.emit("loginError", data.error);
      } else {
        //now that we have the access token, GET their spotify id and name to add to our database of users
        let profile = await fetch('https://api.spotify.com/v1/me', {
          headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.access_token}`
          }
        }).then(response => response.json());

        let user = {
          id: profile.id
        };

        let usersDb = new sqlite3.Database(__dirname + "/database/users.db");

        //check if there's already an entry in the database associated with the user's spotify id:
        usersDb.all(`SELECT spotify_id FROM users WHERE spotify_id = ?`, [profile.id], function(err, rows) {
          if (err) {
            console.log(err);
            usersDb.close();
          } else {
            if (rows.length === 0) { //if there aren't any (they're a new user), add them to the database
              usersDb.run(`INSERT INTO users (spotify_id, display_name, bingo_card, bingo_responses, bingo_cards_archive, bingo_card_invite) VALUES(?, ?, ?, ?, ?, ?)`, [profile.id, profile.display_name, "[]", "{}", "[]", profile.id], function(err) {
                usersDb.close();
                if (err) {
                  console.log(err);
                } else {
                  jwt.sign(user, process.env['JWT_PRIVATE_KEY'], (err, token) => {
                    if (err) {
                      console.log(err);
                    } else {
                      socket.emit("redirectToDashboard", token, data.access_token);
                    }
                  });
                }
              });
            } else { //if they're an old user, just check if they updated their display name:
              usersDb.run(`UPDATE users SET display_name = ? WHERE spotify_id = ?`, [profile.display_name, profile.id], function(err) {
                usersDb.close();
                if (err) {
                  console.log(err);
                } else {
                  jwt.sign(user, process.env['JWT_PRIVATE_KEY'], (err, token) => {
                    if (err) {
                      console.log(err);
                    } else {
                      socket.emit("redirectToDashboard", token, data.access_token);
                    }
                  });
                }
              });
            }
          }
        });
      }
    });
  });

  socket.on("getBingoCardsData", (token) => {
    jwt.verify(token, process.env["JWT_PRIVATE_KEY"], (err, user) => {
      if (err) {
        socket.emit("redirectToHomepage");
      } else {
        let usersDb = new sqlite3.Database(__dirname + "/database/users.db");

        usersDb.get("SELECT bingo_card, bingo_responses, bingo_cards_archive, bingo_card_invite FROM users WHERE spotify_id = ?", [user.id], function(err, row) {
          usersDb.close();
          if (err) {
            console.log(row);
          } else {
            socket.emit("bingoCardsData", row);
          }
        });
      }
    });
  });

  socket.on("getTopArtists", (token, spotifyAccessToken) => {
    jwt.verify(token, process.env["JWT_PRIVATE_KEY"], async (err, user) => {
      if (err) {
        socket.emit("redirectToHomepage");
      } else {
        let topArtists = await fetch('https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=24', {
          headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${spotifyAccessToken}`
          }
        }).then(response => response.json());

        let bingoArtists = [];
        
        topArtists.items.forEach(artist => {
          bingoArtists.push(artist.name);
        });

        if (bingoArtists.length < 24) {
          socket.emit("notEnoughArtists");
        } else {
          
        }

        let usersDb = new sqlite3.Database(__dirname + "/database/users.db");

        usersDb.run(`UPDATE users SET bingo_card = ? WHERE spotify_id = ?`, [JSON.stringify(bingoArtists), user.id], function(err) {
          if (err) {
            console.log(err);
            usersDb.close();
          } else {
            usersDb.get(`SELECT bingo_card_invite FROM users WHERE spotify_id = ?`, [user.id], function(err, row) {
              if (err) {
                console.log(err);
                usersDb.close();
              } else {
                socket.emit("topArtists", bingoArtists, row.bingo_card_invite);
              }
            });
          }
        });
      }
    });
  });

  socket.on("requestCustomInviteCode", (token, requestedInviteCode) => {
    if (isAlphaNumeric(requestedInviteCode)) {
      jwt.verify(token, process.env["JWT_PRIVATE_KEY"], (err, user) => {
        if (err) {
          socket.emit("redirectToHomepage");
        } else {
          let usersDb = new sqlite3.Database(__dirname + "/database/users.db");
  
          usersDb.get("SELECT display_name FROM users WHERE bingo_card_invite = ?", [requestedInviteCode], function(err, row) {
            if (err) {
              console.log(err);
              usersDb.close();
            } else {
              if (row) {
                usersDb.close();
                socket.emit("error", "Invite Code Taken", "Sorry, another user has chosen that invite code for their Bingofy. Please request a different custom invite code, or stick with your Spotify username for your invite code.");
              } else {
                usersDb.run("UPDATE users SET bingo_card_invite = ? WHERE spotify_id = ?", [requestedInviteCode, user.id], function(err) {
                  usersDb.close();
                  if (err) {
                    console.log(err);
                  }
                  socket.emit("updatedInviteCode", requestedInviteCode);
                });
              }
            }
          });
        }
      });
    } else {
      socket.emit("error", "Invalid Invite Code Request", "Your invite code must be alphanumeric and cannot contain any spaces!");
    }
  });

  socket.on("getBingoCardFromInvite", (invite) => {
    let usersDb = new sqlite3.Database(__dirname + "/database/users.db");

    usersDb.get(`SELECT display_name, bingo_card FROM users WHERE bingo_card_invite = ?`, [invite], function(err, row) {
      usersDb.close();
      
      if (err) {
        console.log(err);
      } else {
        if (row) {
          let arr = JSON.parse(row.bingo_card);
          shuffleArray(arr); //shuffle bingo card just for fun
          
          row.bingo_card = JSON.stringify(arr); //stringify for security purposes or whatever idk luna said to
          
          socket.emit("bingoCardFromInvite", row);
        } else {
          socket.emit("invalidBingoCardInvite");
        }
      }
    });
  });
});

server.listen(process.env['PORT'], () => {
  console.log("running <3");
});

//credit: https://stackoverflow.com/a/12646864
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

//credit: https://www.30secondsofcode.org/js/s/is-alpha-numeric
let isAlphaNumeric = str => /^[a-z0-9]+$/gi.test(str);
