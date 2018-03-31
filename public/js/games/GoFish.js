/* global io */
(function() {

  let socket; /* Links to app/games/gofish/index.js */ 
  
  class GoFish {
    constructor() {
      this.turn = null;
      this.loby = {};
      this.leader = null;
      this.me = {};
      this.gameStarted = false;
      console.log('SETUP');
    }
    get numberPlayers() {
      return Object.keys(this.loby).length;
    }
    updateGameState(state) {
      for (let i in state) {
        let player = state[i];
        if (player['uid'] == this.me['uid']) {
          this.me = player;
          console.log('NEW CARDS');
          console.log(this.me);
        } 
        else {
          this.loby[player['uid']] = player;
        }
      }
    }
    updateMe(data) {
      this.me = data;
    }
    addUser(user) {
      this.loby[user['uid']] = user;
    }
    userLeft(user) {
      delete this.loby[user];
    }
    setLeader(leader) {
      this.leader = leader;
    }
    amLeader() {
      return this.leader == this.me['uid'];
    }
    startGame() {
      this.gameStarted = true;
    }
  }


  let goFish = new GoFish();
  let buttonsActive = false;

  function updateUsers(withButton = false) {
    let otherPlayers = '';
    let angleDif = Math.PI / (goFish.numberPlayers - 1);
    let curAngle = 0;
    let userMessages = '';
    for (let i in goFish.loby) {
      let xLoc = 50 - (Math.cos(curAngle) * 40 + 10);
      let yLoc = 50 - (Math.sin(curAngle) * 40 + 10);

      let us = goFish.loby[i];
      userMessages +=
        "<div class='user-message' id='user-message-" +
        us['uid'] +
        "' style='left: " +
        (xLoc + 20) +
        '%; top: ' +
        yLoc +
        "%; display: none;'></div>";
      let curUser =
        "<div class='player-spot' id='player-" +
        us['uid'] +
        "' style='left:" +
        xLoc +
        '%; top: ' +
        yLoc +
        "%'>" +
        us['uid'];
      console.log('CURUSER');
      curUser +=
        "<button id='choose-player-" +
        us['uid'] +
        "' class='choose-player-button' style='display: none;'>Choose</button>";
      curUser += "<div class='cards-in-hand'></div>";
      curUser += '</div>';

      curAngle += angleDif;
      otherPlayers += curUser;
    }
    $('#other-players').html(otherPlayers);
    $('#user-messages').html(userMessages);
    if (withButton) {
      for (let i in goFish.loby) {
        let us = goFish.loby[i];
        $('#choose-player-' + us['uid']).show();
      }
    }
    else {
      for (let i in goFish.loby) {
        let us = goFish.loby[i];
        $('#choose-player-' + us['uid']).hide();
      }
    }

    activateButtons();
  }
  
  let firstTurn = true;
  function showUserButtons() {
    for (let i in goFish.loby) {
      let us = goFish.loby[i];
      console.log('SHOWING');
      console.log(us);
      $('#choose-player-' + us['uid']).show();
    }
  }

  function hideUserButtons() {
    for (let i in goFish.loby) {
      let us = goFish.loby[i];
      $('#choose-player-' + us['uid']).hide();
    }
  }

  function clickedUser() {
    if (chosenPlayer != null) {
      $('#choose-player-' + chosenPlayer).show();
    }
    if (selectedCard != null) {
      $('#' + selectedCard).css({ width: '60px', height: '86px' });
      selectedCard = null;
    }
    let chosenPlayerId = $(this)
      .attr('id')
      .replace('choose-player-', '');
    chosenPlayer = chosenPlayerId;
    $('#choose-player-' + chosenPlayer).hide();
    myTurnPartTwo();
    console.log('ABC');
  }

  function activateButtons() {
    for (let i in goFish.loby) {
      let us = goFish.loby[i];
      console.log(us['uid']);
      $('#choose-player-' + us['uid']).off(clickedUser);
      $('#choose-player-' + us['uid']).click(clickedUser);
    }
  }

  function addUserToGame(user) {
    goFish.addUser(user);
    updateUsers();
  }

  function userLeft(sid) {
    userLeft(sid);
    updateUsers();
  }

  function startGame() {
    console.log(socket);
  }

  function askFor() {
    socket.emit('ask-for', {
      uid: goFish.me.uid,
      asks: chosenPlayer,
      asksFor: selectedCard.split('-of-')[0],
    });
  }

  let selectedCard;
  let chosenPlayer;
  function myTurnPartTwo(player) {
    $('#instructions-wording').html(
      'Select a card to ask ' + chosenPlayer + 'for from your hand'
    );
    for (let i in goFish.me.hand) {
      let card = goFish.me.hand[i];
      console.log(card);
      $('#' + card['num'] + '-of-' + card['suit']).click(function() {
        if (selectedCard != null) {
          $('#' + selectedCard).css({ width: '60px', height: '86px' });
        }
        selectedCard = $(this).attr('id');
        $(this).css({ width: '70px', height: '100px' });
        let selectedNumber = selectedCard.split('-of-')[0];
        $('#instructions-wording').html('Ask for the ' + selectedNumber + '?');
        $('#ask-button').show();
      });
    }
  }

  function myTurn() {
    $('#instructions-wording').html('Its your turn. Choose a player to ask');
    showUserButtons();
    //updateUsers(true);
  }

  function updateGame() {
    if (!cardsDealt) {
      console.log('DEALING CARDS');
      console.log(goFish.numberPlayers - 1);
      let angleDif = Math.PI / (goFish.numberPlayers - 1);
      let curAngle = 0;
      let counter = 0;
      for (let i in goFish.loby) {
        let xLoc = 50 - (Math.cos(curAngle) * 40 + 10) + 5;
        let yLoc = 50 - (Math.sin(curAngle) * 40 + 10) + 5;
        console.log(Math.cos(curAngle));
        for (let x = 0; x < goFish.loby[i]['hand']; x++) {
          console.log('left: ' + xLoc + '%, top: ' + yLoc + '%');
          let card = $('.card-deck-card:nth-child(' + counter + ')');
          card.delay(counter * 500).animate(
            {
              left: xLoc + '%',
              top: yLoc + '%',
            },
            1500
          );
          counter += 1;
          card.addClass('card-player-' + i);
        }
        curAngle += angleDif;
      }
      console.log(goFish.me);
      for (let x = 0; x < goFish.me['hand'].length; x++) {
        let card = $('.card-deck-card:nth-child(' + counter + ')');
        card.attr('suit', goFish.me['hand'][x]['suit']);
        card.attr('num', goFish.me['hand'][x]['num']);
        let xLoc = x * 60;
        card.delay(counter * 500).animate(
          {
            left: xLoc + 'px',
            top: '80%',
          },
          1500,
          function() {
            $(this).addClass('card-player-me');
            //card-flip
            let crd = $(this).attr('card');
            console.log('CARD = ');
            console.log(crd);
            $('#' + $(this).attr('num') + '-of-' + $(this).attr('suit')).addClass(
              'card-flip'
            );
          }
        );
        counter += 1;
      }
    }

    for (let i in goFish.loby) {
      let player = goFish.loby[i];
      if (goFish.me['uid'] != player['uid']) {
        $('#player-' + player['uid'] + '>.cards-in-hand')
          .first()
          .html(player['hand']);
      }
    }
    fillHand();
  }

  function fillHand() {
    let cards = '';
    for (let i in goFish.me.hand) {
      let card = goFish.me.hand[i];
      cards += "<div class='card card-suit-" + card['suit'];
      if (cardsDealt) {
        cards += ' card-flipped';
      }
      cards +=
        "' id='" +
        card['num'] +
        '-of-' +
        card['suit'] +
        "'>" +
        card['num'] +
        '</div>';
    }
    $('#my-cards').html(cards);
    if (!cardsDealt) {
      cardsDealt = true;
    }
  }

  function stringBooks(books) {
    let ret = '';
    if (books.length > 0) {
      ret = 'I made a book of ' + books[0];
      let counter = 1;
      while (counter < books.length) {
        ret + ' and ' + books[counter];
      }
    }
    return ret;
  }


  /* Socket Functions */

  socketFunctions = function() {};
  
  socketFunctions.disconnect = function() {
    socketFunctions.unhook();
    socket.emit('leave', {});
  };

  socketFunctions.hook = function() {
    socket.on('status', socketFunctions.status);
    socket.on('user-joined', socketFunctions.userJoined);
    socket.on('user-left', socketFunctions.userLeft);
    socket.on('game-state', socketFunctions.gameState);
    socket.on('players-turn', socketFunctions.playersTurn);
    socket.on('game-info', socketFunctions.gameInfo);
    socket.on('player-books', socketFunctions.playerBooks);
    socket.on('game-over', socketFunctions.gameOver);
  };

  socketFunctions.unhook = function() {
    socket.removeListener('status', socketFunctions.status);
    socket.removeListener('user-joined', socketFunctions.userJoined);
    socket.removeListener('user-left', socketFunctions.userLeft);
    socket.removeListener('game-state', socketFunctions.gameState);
    socket.removeListener('players-turn', socketFunctions.playersTurn);
    socket.removeListener('game-info', socketFunctions.gameInfo);
    socket.removeListener('player-books', socketFunctions.playerBooks);
    socket.removeListener('game-over', socketFunctions.gameOver);
  };

  socketFunctions.status = function(status) {
    console.log(status);
    for (let i in status['players']) {
      let join = status['players'][i];
      if (join.sid == socket.id) {
        goFish.updateMe(join);
      } 
      else {
        addUserToGame(join);
      }
    }
    goFish.setLeader(status['leader']);
    if (goFish.amLeader()) {
      console.log('YOU ARE THE LEADER');
      $('#start-game').show();
      $('#start-game').click(function() {
        goFish.startGame();
        $('#start-game').hide();
        socket.emit('start-game', '');
      });
    }
  };

  socketFunctions.userJoined = function(join) {
    if (join.sid == socket.id) {
      goFish.updateMe(join);
    } 
    else {
      addUserToGame(join);
    }
  };

  socketFunctions.userLeft = function(left) {
    userLeft(left);
  };

  socketFunctions.gameState = function(state) {
    console.log(state);
    goFish.updateGameState(state);
    updateGame();
  };

  socketFunctions.playersTurn = function(pl) {
    if (firstTurn) {
      updateUsers();
      firstTurn = false;
    }
    $('#instructions-wording').html('');
    if (pl == goFish.me['uid']) {
      console.log('MY TURN');
      $('#instructions-turn').html('It is your turn');
      myTurn();
    } 
    else {
      hideUserButtons();
      //updateUsers();
      $('#ask-button').hide();
      $('#instructions-turn').html('It is ' + pl + "'s turn");
    }
  };

  socketFunctions.gameInfo = function(res) {
    if (res.player == goFish.me.uid) {
      let message = $('#my-messages');
      $('#my-messages').html(res.message);
      $('#my-messages').show();

      setTimeout(function() {
        $('#my-messages').hide();
      }, 5000);
    } 
    else {
      let message = $('#user-message-' + res.player);
      $('#user-message-' + res.player).html(res.message);
      $('#user-message-' + res.player).show();

      setTimeout(function() {
        $('#user-message-' + res.player).hide();
      }, 5000);
    }
  };

  socketFunctions.playerBooks = function(books) {
    // TODO it appears 'res' would not be visible in this function
    if (res.player == goFish.me.uid) {
      let message = $('#my-messages');
      $('#my-messages').html(stringBooks(books));
      $('#my-messages').show();

      setTimeout(function() {
        $('#my-messages').hide();
      }, 5000);
    } 
    else {
      let message = $('#user-message-' + res.player);
      $('#user-message-' + res.player).html(stringBooks(books));
      $('#user-message-' + res.player).show();

      setTimeout(function() {
        $('#user-message-' + res.player).hide();
      }, 5000);
    }
  };
  socketFunctions.gameOver = function(books) {
	  // Winners is a array
	  // TODO: How do we want to display this?
  };

  /* On Window Message */

  window.addEventListener('message', function(e) {
    /* if (e.origin != 'http://localhost') {
      return;
    } */

    let json;
    try {
      json = JSON.parse(e.data);
    } catch (err) {
      return console.error('Invalid json: %o', err);
    }
    
    console.log('GoFish Init', json.nsp);
    socket = io(json.nsp);
    socket.on('hello', () => socket.emit('hello', {}));
    socketFunctions.hook();
  },
  false);


  /* On HTML Ready */

  let cardsDealt = false;
  $(function(nsp) {
    for (let i = 0; i < 52; i++) {
      $('#game-table').append("<div class='card-deck-card'></div>");
    }
    $('#ask-button').click(function() {
      askFor();
    });
  });

})();
