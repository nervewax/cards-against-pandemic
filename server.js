const he = require("he");
const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const cards = require("./cards.json");

// Settings
const maxWhite = 7;

let gameState = {
  currentBlack: [],
  currentPlayer: {
    id: "",
    name: "nobody",
  },
  table: {},
  tableLength: 0,
  players: {},
  playersLength: 0,
  log: [],
  whiteDiscard: [],
  blackDiscard: [],
  blackDeck: cards.blackCards,
  whiteDeck: cards.whiteCards,
};

const clearTable = function () {
  // Move table card values to whiteDiscard.
  const tableCards = Object.values(gameState.table);
  gameState.whiteDiscard = gameState.whiteDiscard.concat(tableCards);

  // Put old black into blackDiscard.
  if (gameState.currentBlack.length > 0) {
    var card = gameState.currentBlack.shift();
    gameState.blackDiscard.push(card);
  }

  // Clear the table.
  gameState.table = {};
};

const setNextPlayer = function () {
  const current = gameState.currentPlayer.id;
  // Make an array of keys for the players object.
  let keys = Object.keys(gameState.players);
  let currentIndex = keys.indexOf(current);

  console.log(current);
  console.log(currentIndex);

  gameState.log.push(`${gameState.players[current].name}'s round ended.`);

  // If 1 or less players are connected, return to defaults.
  if (keys.length <= 1) {
    // Default next player to none.
    gameState.currentPlayer.id = "";
    gameState.currentPlayer.name = "nobody";
    gameState.log.push(
      `Not enough players, current player returned to default.`
    );
    return;
  }

  // Default next player to first.
  let nextPlayer = 0;
  // Check this isn't the last player in the list.
  if (currentIndex != keys.length - 1) {
    // Get the key after the current player
    nextPlayer = keys.indexOf(current) + 1;
  }
  const nextPlayerId = keys[nextPlayer];

  gameState.currentPlayer.id = nextPlayerId;
  gameState.currentPlayer.name = gameState.players[nextPlayerId].name;
  gameState.log.push(`${gameState.players[nextPlayerId].name}'s round begins.`);
};

/**
 * Randomly shuffle an array
 * https://stackoverflow.com/a/2450976/1293256
 * @param  {Array} array The array to shuffle
 * @return {String}      The first item in the shuffled array
 */
var shuffle = function (array) {
  var currentIndex = array.length;
  var temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
};

app.use(express.static("public"));
app.get("/", function (request, response) {
  response.sendFile(__dirname + "/public/index.html");
});

io.on("connection", function (socket) {
  socket.on("newPlayer", (name) => {
    gameState.players[socket.id] = {
      name,
      hand: [],
      score: 0,
    };
    gameState.log.push(`${name} joined the game`);
  });

  socket.on("drawWhite", () => {
    // Check player.
    const player = gameState.players[socket.id];
    if (!player) return;

    shuffle(gameState.whiteDeck);

    // Check if player already had max.
    if (player.hand.length >= maxWhite) return;

    // Check if whiteDeck is empty.
    // If so, shuffle whiteDiscard and add to whiteDeck.
    if (gameState.whiteDeck.length < 1) {
      shuffle(gameState.whiteDiscard);
      gameState.whiteDeck = gameState.whiteDeck.concat(gameState.whiteDiscard);
      gameState.log.push(
        "The white deck ran out, so the discard was shuffled and added back to it."
      );
    }

    // Draw new white card from whiceCardsDeck
    var card = gameState.whiteDeck.shift();
    player.hand.push(he.decode(card));
  });

  socket.on("drawBlack", () => {
    // Check player.
    const player = gameState.players[socket.id];
    if (!player) return;

    shuffle(gameState.blackDeck);

    // Check if there is a current player.
    if (gameState.currentPlayer.id == "") {
      // If not, set this player.
      gameState.currentPlayer.id = socket.id;
      gameState.currentPlayer.name = gameState.players[socket.id].name;
    }

    // If this player is not currentPlayer, return.
    if (gameState.currentPlayer.id != socket.id) return;

    // Put old black into blackDiscard.
    if (gameState.currentBlack.length > 0) {
      var card = gameState.currentBlack.shift();
      gameState.blackDiscard.push(card);
    }

    // Check if blackDeck is empty.
    // If so, shuffle blackDiscard and add to blackDeck.
    if (gameState.blackDeck.length < 1) {
      shuffle(gameState.blackDiscard);
      gameState.blackDeck = gameState.blackDeck.concat(gameState.blackDiscard);
      gameState.blackDiscard = [];
      gameState.log.push(
        "The black deck ran out, so the discard was shuffled and added back to it."
      );
    }

    // Draw new currentBlack from blackDeck.

    var card = gameState.blackDeck.shift();
    card.text = he.decode(card.text);
    gameState.currentBlack.push(card);
    gameState.log.push(
      `${player.name} drew a black card. Everyone else, pick ${card.pick} white card(s).`
    );
  });

  socket.on("playWhite", (i) => {
    // Check player.
    const player = gameState.players[socket.id];
    if (!player) return;

    // If this player is currentPlayer, return.
    if (gameState.currentPlayer.id === socket.id) return;

    // If there's no black card in play, return.
    if (gameState.currentBlack[0] == undefined) return;
    if (gameState.currentBlack[0].pick == undefined) return;

    console.log(i);
    console.log(player.hand[i]);
    // Check if the player has played.
    if (socket.id in gameState.table) {
      // If player has not played all their cards.
      if (gameState.table[socket.id].length < gameState.currentBlack[0].pick) {
        // Take the player hand.index and move it to gamestate.table
        gameState.table[socket.id].push(player.hand[i]);
        // Remove played card from hand.
        player.hand = player.hand.filter((v) => v != player.hand[i]);
      }
    } else {
      // If player has not played yet, make an array in table with their first card.
      gameState.table[socket.id] = [player.hand[i]];
      player.hand = player.hand.filter((v) => v != player.hand[i]);
    }
  });

  socket.on("winner", (i) => {
    // Check player.
    const player = gameState.players[socket.id];
    if (!player) return;

    // If this player is not currentPlayer, return.
    if (gameState.currentPlayer.id != socket.id) return;

    // Set the winner as the chosen cards player.
    const winner = gameState.players[i];
    if (!winner) return;

    // +1 score of chosen cards player.
    if (winner != undefined) {
      winner.score++;
      gameState.log.push(`${winner.name} is the winner!`);
    }

    // Clear table.
    clearTable();

    // Set next current player.
    setNextPlayer();
  });

  socket.on("disconnect", () => {
    const leaver = gameState.players[socket.id];

    if (leaver != undefined && leaver.name != undefined) {
      gameState.log.push(`${leaver.name} left the game`);
    }

    // Put leavers hand into discard.
    if (leaver != undefined && leaver.hand != undefined) {
      gameState.whiteDiscard = gameState.whiteDiscard.concat(leaver.hand);
    }

    // Remove leavers played card from the table.
    if (gameState.table[socket.id] != undefined) {
      gameState.whiteDiscard.push(gameState.table[socket.id]);
      delete gameState.table[socket.id];
    }

    // If leaver is currentPlayer, get next player.
    if (gameState.currentPlayer.id == socket.id) {
      // Clear table.
      clearTable();

      // Set next current player.
      setNextPlayer();
    }

    // Rm leaver from players.
    delete gameState.players[socket.id];
  });
});

setInterval(() => {
  gameState.tableLength = Object.keys(gameState.table).length;
  gameState.playersLength = Object.keys(gameState.players).length;
  io.sockets.emit("state", gameState);
}, 1000 / 30);

const listener = http.listen(process.env.PORT, function () {
  console.log("Your app is listening on port " + listener.address().port);
});
