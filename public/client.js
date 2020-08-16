var socket = window.io();
var socketID;

document.addEventListener("click", function (e) {
  if (e.target && e.target.classList.contains("play-white")) {
    onPlayWhite(e.target.dataset.index);
  }
  if (e.target && e.target.classList.contains("winner")) {
    onWinner(e.target.dataset.index);
  }
});

socket.on("state", onState);

socket.on("connect", () => {
  socketID = socket.id;
});

socket.on("disconnect", () => {
  document.body.classList.remove("alive");
});

function onPlayWhite(i) {
  socket.emit("playWhite", i);
}

function onWinner(i) {
  socket.emit("winner", i);
}

function onState(data) {
  app.output = data;
  app.log = data.log;
  app.table = data.table;
  app.tableLength = data.tableLength;
  app.currentBlack = data.currentBlack;
  app.currentPlayer = data.currentPlayer;
  app.players = data.players;
  app.playersLength = data.playersLength;
  if (data.players[socketID]) {
    app.player = data.players[socketID];
  }
}

// Vue to always match game state.
var app = new Vue({
  el: "#app",
  data: {
    output: "",
    log: [],
    player: {
      name: "",
      hand: [],
      score: 0,
    },
    players: [],
    playersLength: 0,
    table: [],
    tableLength: 0,
    currentBlack: [],
    currentPlayer: {
      id: "",
      name: "nobody",
    },
    username: "",
  },
  methods: {
    enter: function () {
      console.log("enter");
      document.body.classList.replace("on-login", "on-table");
      socket.emit("newPlayer", this.username);
    },
    drawBlack: function () {
      console.log("draw black");
      socket.emit("drawBlack");
    },
    drawWhite: function () {
      console.log("draw white");
      socket.emit("drawWhite");
    },
    viewTable: function () {
      document.body.classList.remove(
        "on-login",
        "on-table",
        "on-hand",
        "on-info"
      );
      document.body.classList.add("on-table");
    },
    viewHand: function () {
      document.body.classList.remove(
        "on-login",
        "on-table",
        "on-hand",
        "on-info"
      );
      document.body.classList.add("on-hand");
    },
    viewInfo: function () {
      document.body.classList.remove(
        "on-login",
        "on-table",
        "on-hand",
        "on-info"
      );
      document.body.classList.add("on-info");
    },
  },
});
