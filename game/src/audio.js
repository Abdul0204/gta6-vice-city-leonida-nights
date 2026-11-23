// Leonida Nights — audio: synthesized radio, sirens, gunshots, engine.
// Everything is generated with WebAudio oscillators so the game ships
// zero audio files. All calls are guarded: in a headless or muted
// environment the mixer simply stays dormant and never throws.
(function () {
  'use strict';

  function createAudio() {
    var ctx = null;
    var master = null;
    var station = 0;
    var radioTimer = null;
    var muted = false;
    var cfg = window.Leonida.config;

    function ensure() {
      if (ctx) return true;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.22;
        master.connect(ctx.destination);
        return true;
      } catch (e) { return false; }
    }

    function tone(freq, dur, type, vol, when) {
      if (!ctx || muted) return;
      try {
        var t = when || ctx.currentTime;
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = type || 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(vol || 0.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + dur + 0.05);
      } catch (e) { /* audio is best-effort */ }
    }

    function noiseBurst(dur, vol) {
      if (!ctx || muted) return;
      try {
        var len = Math.floor(ctx.sampleRate * dur);
        var buf = ctx.createBuffer(1, len, ctx.sampleRate);
        var data = buf.getChannelData(0);
        for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        var src = ctx.createBufferSource();
        src.buffer = buf;
        var g = ctx.createGain();
        g.gain.value = vol || 0.3;
        src.connect(g); g.connect(master);
        src.start();
      } catch (e) { /* best-effort */ }
    }

    // One radio "song": a short looping bass + arp pattern per station.
    var STATION_PATTERNS = [
      { base: 110, steps: [0, 3, 5, 7, 10, 7, 5, 3], wave: 'sawtooth' },
      { base: 130, steps: [0, 0, 7, 0, 5, 0, 3, 2], wave: 'square' },
      { base: 98,  steps: [0, 4, 7, 4, 0, 4, 7, 12], wave: 'triangle' },
      { base: 146, steps: [0, 2, 4, 7, 9, 7, 4, 2], wave: 'sine' }
    ];

    function playRadioStep() {
      if (!ctx || muted) return;
      var pat = STATION_PATTERNS[station % STATION_PATTERNS.length];
      var st = cfg.RADIO[station % cfg.RADIO.length];
      if (!st || st.bpm === 0) return; // talk station: no music bed
      var stepDur = 60 / st.bpm / 2;
      for (var i = 0; i < 8; i++) {
        var f = pat.base * Math.pow(2, pat.steps[i] / 12);
        tone(f, stepDur * 0.9, pat.wave, 0.10, ctx.currentTime + i * stepDur);
        tone(f / 2, stepDur * 0.95, 'sine', 0.14, ctx.currentTime + i * stepDur);
      }
    }

    function startRadio() {
      if (!ensure()) return false;
      stopRadio();
      radioTimer = setInterval(playRadioStep, 1400);
      playRadioStep();
      return true;
    }

    function stopRadio() {
      if (radioTimer) { clearInterval(radioTimer); radioTimer = null; }
    }

    function nextStation() {
      station = (station + 1) % cfg.RADIO.length;
      if (ctx) playRadioStep();
      return cfg.RADIO[station];
    }

    function gunshot() { noiseBurst(0.16, 0.5); tone(160, 0.1, 'square', 0.25); }
    function siren() { if (!ctx || muted) return; tone(720, 0.5, 'sine', 0.12); tone(960, 0.5, 'sine', 0.12, ctx.currentTime + 0.5); }
    function cash() { if (!ctx || muted) return; tone(880, 0.12, 'sine', 0.2); tone(1318, 0.2, 'sine', 0.2, ctx.currentTime + 0.12); }
    function busted() { if (!ctx || muted) return; tone(220, 0.4, 'sawtooth', 0.25); tone(165, 0.6, 'sawtooth', 0.25, ctx.currentTime + 0.4); }
    function engineHum(on) {
      if (!ctx || muted) return;
      if (on) tone(55, 0.5, 'sawtooth', 0.06);
    }

    return {
      ensure: ensure, startRadio: startRadio, stopRadio: stopRadio,
      nextStation: nextStation, gunshot: gunshot, siren: siren,
      cash: cash, busted: busted, engineHum: engineHum,
      get station() { return cfg.RADIO[station]; },
      setMuted: function (m) { muted = !!m; }
    };
  }

  window.Leonida.audio = { createAudio: createAudio };
})();
