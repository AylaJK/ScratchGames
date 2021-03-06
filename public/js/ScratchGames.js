/* global io */

// Declare Global App Variable
let Scratch = function() {};

// Variable for all page JS functions
Scratch.locations = function() {};

/* 
 * ----------------------------------------
 * Custom jQuery Functions
 * ---------------------------------------- 
 */
(function($) {
  // This helps load in the external js files as needed. //
  // The jquery original version is unstable//
  $.loadScript = function(url, callback) {
    $.ajax({
      url: url,
      datatype: 'script',
      success: () => callback(null),
      error: (obj, status, textStatus) =>
        callback(new Scratch.error.ajax('At loadscript', url, textStatus)),
      async: true,
    });
  };

  $.fn.updateForm = function(newSettings) {
    for (let setting in newSettings) {
      let $setting = this.find('[name="' + setting + '"]');
      if ($setting.length === 0)
        return console.log('Update setting "' + setting + '" failed: element not found');
      switch ($setting.prop('nodeName')) {
        case 'SELECT':
          $setting
            .find('option[value="' + newSettings[setting] + '"]')
            .prop('selected', true);
          break;
        default:
          console.log(
            'Cannot update setting "' + setting + '" of unknow element type:',
            $setting.prop('nodeName')
          );
      }
    }
  };

  $.fn.serializeJSON = function() {
    let arr = this.serializeArray();
    let obj = {};
    for (let i of arr) {
      obj[i.name] = i.value;
    }
    return obj;
  };
})(jQuery);

/* 
 * ----------------------------------------
 * Scratch Navigation 
 * ---------------------------------------- 
 */
(function() {
  /*
   * @param {string} location to switch to
   */
  Scratch.nav = function(loc) {
    let nav = {};
    /*
     * Nav Object Values
     * html: HTML snippet to load (or false)
     * modal: load into the modal window (boolean)
     *   (if true no history added, and as such title and location are ignored)
     * title: Window Title (false to keep same)
     * path: URL path (false to keep same)
     *   (must be the same as loc, or if using aliases same as one of loc's)
     * js: the javascript file to load (or false)
     * obj: the 'Scratch.locations.*' object with 'init' and 'leave' functions (or false)
     * call: The 'Scratch.*' call to make when loaded (or false)
     */
    switch (loc) {
      case 'profile':
        nav = {
          html: 'snippets/profile.html',
          modal: true,
          js: 'profile.js',
          obj: 'profile',
        };
        break;
      case 'leaderboard':
        nav = {
          html: 'snippets/leaderboard.html',
          modal: true,
          js: 'leaderboards.js',
          obj: 'leaderboards',
        };
        break;
      case 'createlobby':
        nav = {
          html: 'modals/createLobby.html',
          modal: true,
          js: false,
          call: 'locations.lobbylist.create.init',
        };
        break;
      case 'lobby':
        nav = {
          html: 'snippets/lobby.html',
          title: 'Scratch Games',
          path: 'lobby',
          js: 'lobby.js',
          obj: 'lobby',
        };
        break;
      case 'game':
        nav = {
          html: 'snippets/game.html',
          title: 'Scratch Games',
          path: 'game',
          js: false,
          call: 'games',
        };
        break;
      case 'joincode':
        nav = {
          html: 'snippets/joincode.html',
          modal: true,
          js: 'joincode.js',
          obj: 'joincode',
        };
        break;
      case 'lobbylist': // alias for home
      case 'home':
        nav = {
          html: 'snippets/lobbyList.html',
          title: 'Scratch Games',
          path: 'home',
          js: 'lobbylist.js',
          obj: 'lobbylist',
        };
        break;
      default:
        return undefined;
    }
    return nav;
  };

  /*
   * @param {string} location to switch to
   * @param {array} arguments to use for call [optional]
   * @param {function} function(err) which can have Scratch.error.* errors, null otherwise
   */
  Scratch.nav.goTo = function(loc, args, callback) {
    navigate(loc, args, callback);
  };

  /*
   * @param {string} location to switch to
   * @param {array} arguments to use for call [optional]
   * @param {function} function(err) which can have Scratch.error.* errors, null otherwise
   */
  Scratch.nav.redirect = function(loc, args, callback) {
    navigate(loc, args, { replaceState: true }, callback);
  };

  /*
   * @param {string} location to switch to
   * @param {array} arguments to use for call [optional]
   * @param {function} function(err) which can have Scratch.error.* errors, null otherwise
   */
  Scratch.nav.loadGame = function(loc, args, callback) {
    navigate(loc, args, { pushState: false }, callback);
  };

  /* Allow server to make nav calls */
  Scratch.nav.socketNavigate = function(nav, callback) {
    nav.opts = nav.opts || {};
    if (nav.redirect) nav.opts.replaceState = true;
    navigate(nav.loc, nav.args, nav.opts, callback);
  };

  /*
   * Page First Time Load or Page Reloaded
   * @param {function} function(err) where err can be a Scratch.error.* error, or null otherwise
   */
  Scratch.nav.init = function(cb) {
    // On Browser Nav (Back or Forward)
    window.onpopstate = function(event) {
      if (event.state)
        navigate(event.state.loc, { pushState: false }, Scratch.nav.callback);
    };

    /* Lookup which location to load */
    navigate(getCurrentLoc(), { pushState: false }, cb);
  };

  let currlocation;
  /*
   * -------------------------------------------------------------------
   * Internal Navigate
   * -------------------------------------------------------------------
   * @param {string} location requested to be loaded or {object} location object created by another Scratch.nav function
   * @param {array} arguments to nav.call [optional]
   * @param {object} options (should be provided only by other Scratch.nav functions) [optional]
   * @param {function} function(err) where err can be a Scratch.error.* error, or null otherwise
   */
  function navigate(newloc, args, opts, callback) {
    if (typeof newloc === 'string') newloc = { loc: newloc, nav: Scratch.nav(newloc) };
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (typeof args === 'function') {
      callback = args;
      args = undefined;
    } else if (!Array.isArray(args)) {
      opts = args;
      args = undefined;
    }
    if (typeof callback !== 'function')
      throw new Error('Navigate Callback is not a function');

    if (typeof newloc.nav === 'undefined')
      return callback(new Scratch.error.navUknownLocation(newloc.loc));

    if (!currlocation) {
      // If first load
      currlocation = { nav: {} };
      if (newloc.loc === 'lobby' || newloc.loc === 'game') {
        return Scratch.sockets.base.emit('lobby reload', {});
      }
    }

    let currloc = currlocation || { nav: {} };
    if (currloc.nav.modal) Scratch.base.hideModal();
    if (currloc.loc === 'game') Scratch.games.leave();

    currlocation = newloc;

    createHistory(newloc.loc, newloc.nav, opts);
    Promise.all([loadHTML(newloc.nav), loadJS(newloc.nav)])
      .then(() => {
        if (newloc.nav.obj) {
          Scratch.call(Scratch.locations, newloc.nav.obj + '.init')
            .then(() => {
              Scratch.call(Scratch, newloc.nav.call, args)
                .then(() => callback.call(Scratch.nav, null))
                .catch(err => callback.call(Scratch.nav, err));
            })
            .catch(err => callback.call(Scratch.nav, err));
        } else {
          Scratch.call(Scratch, newloc.nav.call, args)
            .then(() => callback.call(Scratch.nav, null))
            .catch(err => callback.call(Scratch.nav, err));
        }
      })
      .catch(err => callback.call(Scratch.nav, err));
  }

  function createHistory(loc, nav, opts) {
    opts = opts || {};
    nav = nav || {};
    opts.noHistory =
      typeof opts.noHistory !== 'undefined' ? opts.noHistory : nav.modal || false;
    if (opts.noHistory) return;

    /* Default Values */
    opts.pushState = typeof opts.pushState !== 'undefined' ? opts.pushState : true;
    opts.loc = opts.loc || loc;
    opts.title = opts.title || nav.title || document.title;
    opts.path = opts.path || nav.path || getURLLoc();

    opts.state = opts.state || {};
    opts.state.loc = opts.loc;

    if (opts.replaceState) history.replaceState(opts.state, opts.title, opts.path);
    else if (opts.pushState) history.pushState(opts.state, opts.title, opts.path);
    return;
  }

  function loadHTML(nav) {
    return new Promise((fulfill, reject) => {
      if (!nav.html) return fulfill();
      if (nav.modal)
        Scratch.base.loadModal(nav.html, err => {
          if (err) return reject(err);
          fulfill();
        });
      else
        Scratch.base.loadMain(nav.html, err => {
          if (err) return reject(err);
          fulfill();
        });
    });
  }

  function loadJS(nav) {
    return new Promise((fulfill, reject) => {
      if (!nav.js) return fulfill();
      $.loadScript(nav.js, err => {
        if (err) return reject(err);
        fulfill();
      });
    });
  }

  function getCurrentLoc() {
    let currentState = history.state || {};
    if (currentState.loc)
      return { loc: currentState.loc, nav: Scratch.nav(currentState.loc) };
    let loc = getURLLoc();
    let nav = Scratch.nav(loc);
    createHistory(loc, nav, { replaceState: true });
    return { loc, nav };
  }

  function getURLLoc() {
    return window.location.pathname
      .replace(/^\//g, '') // Remove leading '/'
      .replace(/#.*/g, '') // Remove any anchor
      .replace(/\?.*/g, ''); // Remove any get query
  }

  Scratch.nav.callback = function(err) {
    // TODO Include location in base html to display errors.
    if (err) console.log('Scratch Games Nav Error', err);
  };
})();

/* 
 * ----------------------------------------
 * Scratch Call
 * ---------------------------------------- 
 */
(function() {
  Scratch.call = function(context, call, args) {
    return new Promise((fulfill, reject) => {
      if (!call) return fulfill();
      if (!args) args = [];
      let namespaces = call.split('.');
      let func = namespaces.pop();
      for (let i = 0; i < namespaces.length; i++) {
        if (!(typeof context[namespaces[i]] !== 'undefined'))
          return reject(new Scratch.error.varUndefined(context, namespaces[i]));
        context = context[namespaces[i]];
      }
      if (typeof context[func] !== 'function')
        return reject(new Scratch.error.notAFunction(context, func));
      context[func].apply(Scratch.nav, args);
      fulfill();
    });
  };
})();

/* 
 * ----------------------------------------
 * Scratch Web Sockets
 * ---------------------------------------- 
 */
(function() {
  Scratch.sockets = function() {};
  Scratch.sockets.base = io();
  Scratch.sockets.lobby = null;

  /* Joining Lobby */

  Scratch.sockets.base.on('join lobby', lobby => Scratch.lobby.join(lobby));

  /* Server Navigate */

  Scratch.sockets.base.on('navigate', nav =>
    Scratch.nav.socketNavigate(nav, serverNavigateCallback)
  );

  function serverNavigateCallback(err) {
    // TODO Determine how to deal with errors on server navigate
    if (err) console.log(err);
  }
})();

/* 
 * ----------------------------------------
 * Scratch Current User Info
 * ---------------------------------------- 
 */
(function() {
  Scratch.me = {};
  Scratch.me.id = null;
  Scratch.me.name = null;
  Scratch.me.role = null;

  Scratch.sockets.base.on('whoami', function(you) {
    Scratch.me.id = you.id;
    Scratch.me.name = you.name;
  });

  Scratch.sockets.base.emit('whoami', {});
})();

/* 
 * ----------------------------------------
 * Scratch Lobby
 * ---------------------------------------- 
 */
(function() {
  Scratch.lobby = function() {};

  Scratch.lobby.join = function(lobby) {
    if (Scratch.sockets.lobby) {
      // TODO Already connected to a lobby
    } else {
      Scratch.sockets.lobby = io('/lobby');
    }
    Scratch.me.role = lobby.role;
    Scratch.chat.joinLobby(lobby);

    let socket = Scratch.sockets.lobby;

    socket.emit('join lobby', {});

    /* Allow hosts to kick members from the lobby */
    socket.on('leave lobby', () => Scratch.lobby.leave());

    /* Sync role updates to chat */
    socket.on('change role', role => Scratch.chat.updateRole(role));

    /* Pass on new round call to Game */
    socket.on('new round', (game, nsp) => Scratch.games.newRound(game, nsp));

    /* allow lobby socket to call navigation */
    socket.on('navigate', nav => Scratch.nav.socketNavigate(nav, Scratch.nav.callback));
  };

  Scratch.lobby.leave = function() {
    Scratch.chat.leaveLobby();
    Scratch.sockets.lobby.emit('leave lobby', {});
  };
})();

/* 
 * ----------------------------------------
 * Scratch Games
 * ---------------------------------------- 
 */
(function() {
  Scratch.games = function(game, nsp) {
    /* If no args, then function must have been called by user 
     * navigation (reload, browser back/forward) as opposed to server nav.
     */
    if (game === undefined) return Scratch.games.reload();
    Scratch.games.newRound(game, nsp);

    $('#leave-lobby').on('click', function() {
      Scratch.sockets.lobby.emit('leave lobby', {});
    });
  };

  Scratch.games.newRound = function(game, nsp) {
    if ($('iframe#game').attr('src') !== '') Scratch.games.leave();
    $('iframe#game').hide();
    $('iframe#game').attr('src', '/games/' + game + '.html');
    $('iframe#game')[0].onload = function() {
      $('iframe#game').show();
      $('iframe#game')[0].contentWindow.postMessage(
        JSON.stringify({ id: 'namespace', nsp }),
        '*'
      );
      $('iframe#game')[0].onload = null;
    };
  };

  Scratch.games.reload = function() {
    Scratch.sockets.base.emit('game reload', {});
  };

  Scratch.games.leave = function() {
    $('iframe#game')[0].contentWindow.postMessage(JSON.stringify({ id: 'leave' }), '*');
  };
})();

/* 
 * ----------------------------------------
 * Scratch Errors
 * ---------------------------------------- 
 */
(function() {
  Scratch.error = function() {};

  Scratch.error.varUndefined = function(context, variable) {
    this.name = 'Variable Undefined';
    this.message = 'Variable Undefined: ' + context + '.' + variable;
    this.context = context;
    this.variable = variable;
    this.stack = new Error().stack;
  };
  Scratch.error.varUndefined.prototype = new Error();

  Scratch.error.notAFunction = function(context, variable) {
    this.name = 'Not A Function';
    this.message = 'Variable is not a Function: ' + context + '.' + variable;
    this.context = context;
    this.variable = variable;
    this.stack = new Error().stack;
  };
  Scratch.error.notAFunction.prototype = new Error();

  Scratch.error.navUknownLocation = function(loc) {
    this.name = 'Scratch Nav Location Unknown';
    this.message = 'Unkown Nav Location: ' + loc;
    this.location = loc;
    this.stack = new Error().stack;
  };
  Scratch.error.navUknownLocation.prototype = new Error();

  Scratch.error.ajax = function(message, url, status) {
    this.name = 'AJAX Error';
    this.message = message + ' ' + url + ' Status: ' + status;
    this.url = url;
    this.status = status;
    this.stack = new Error().stack;
  };
  Scratch.error.ajax.prototype = new Error();
})();
