// Leonida Nights — input: keyboard + mouse, with a debug hook for
// automated play-tests. Keys: WASD/arrows move, E carjack, F fire,
// 1-8 weapons, Q wheel, M mission select, R radio, C character,
// P pause, Shift sprint/nitro. Exposes a synthetic setter so the
// CDP play-test can drive the game without a real keyboard.
(function () {
  'use strict';

  function createInput(document, window) {
    var state = {
      forward: false, back: false, left: false, right: false,
      sprint: false, fire: false, mouseDown: false, mouseX: 0, mouseY: 0
    };
    var pressed = {}; // edge-triggered keys, consumed by the game loop
    var listeners = {};

    function on(name, fn) {
      listeners[name] = listeners[name] || [];
      listeners[name].push(fn);
    }

    function emit(name, arg) {
      (listeners[name] || []).forEach(function (fn) { fn(arg); });
    }

    function keyDown(e) {
      var k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') state.forward = true;
      if (k === 's' || k === 'arrowdown') state.back = true;
      if (k === 'a' || k === 'arrowleft') state.left = true;
      if (k === 'd' || k === 'arrowright') state.right = true;
      if (k === 'shift') state.sprint = true;
      if (k === 'f') state.fire = true;
      if (!pressed[k]) { pressed[k] = true; emit('press', k); }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) >= 0) e.preventDefault();
    }

    function keyUp(e) {
      var k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') state.forward = false;
      if (k === 's' || k === 'arrowdown') state.back = false;
      if (k === 'a' || k === 'arrowleft') state.left = false;
      if (k === 'd' || k === 'arrowright') state.right = false;
      if (k === 'shift') state.sprint = false;
      if (k === 'f') state.fire = false;
      pressed[k] = false;
    }

    document.addEventListener('keydown', keyDown);
    document.addEventListener('keyup', keyUp);
    document.addEventListener('mousedown', function (e) {
      state.mouseDown = true; state.mouseX = e.clientX; state.mouseY = e.clientY;
      emit('mousedown', { x: e.clientX, y: e.clientY });
    });
    document.addEventListener('mouseup', function () { state.mouseDown = false; });

    // Synthetic input for the automated play-test (window.Leonida.debug).
    function setSynthetic(patch) {
      Object.keys(patch).forEach(function (k) { state[k] = patch[k]; });
    }

    function pressSynthetic(k) { emit('press', k); }

    return {
      state: state, on: on, setSynthetic: setSynthetic, pressSynthetic: pressSynthetic
    };
  }

  window.Leonida.input = { createInput: createInput };
})();
