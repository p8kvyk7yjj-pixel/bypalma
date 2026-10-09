/* "Your letter in white roses": live sketch of the initial basket. Feeds the cart with the chosen letter and size. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('iniCanvas'); if (!cv) return;
  var ctx = cv.getContext('2d');
  var S = 900, CX = 450, CY = 405, RX = 350, RY = 300;
  var app = null, product = null, variant = null, letter = 'M';
  var dots = [], t0 = 0, raf = 0;

  var mask = document.createElement('canvas'); mask.width = mask.height = 140;
  var mctx = mask.getContext('2d', { willReadFrequently: true });

  function lattice() {
    dots = [];
    var step = .092, row = 0;
    for (var v = -1; v <= 1.001; v += step * .88, row++) {
      for (var u = -1 + (row % 2) * step / 2; u <= 1.001; u += step) {
        if (u * u + v * v > .93) continue;
        var j = function () { return (Math.random() - .5) * .018; };
        dots.push({ u: u + j(), v: v + j(), white: false, d: Math.hypot(u, v), seed: Math.random() * 6.28, s: 0 });
      }
    }
    dots.sort(function (a, b) { return a.v - b.v; });
  }

  function sampleLetter() {
    var txt = letter.slice(0, 2);
    mctx.clearRect(0, 0, 140, 140);
    mctx.fillStyle = '#000'; mctx.textAlign = 'center'; mctx.textBaseline = 'alphabetic';
    var fs = txt.length > 1 ? 88 : 134;
    mctx.font = '800 ' + fs + 'px Manrope, "Arial Black", Arial, sans-serif';
    var m = mctx.measureText(txt), asc = fs * .72;
    mctx.fillText(txt, 70, 70 + asc / 2);
    var data = mctx.getImageData(0, 0, 140, 140).data;
    dots.forEach(function (d) {
      var mu = d.u / .8, mv = d.v / .72;
      if (!txt || Math.abs(mu) > 1 || Math.abs(mv) > 1) { d.white = false; return; }
      var x = Math.round((mu * .5 + .5) * 139), y = Math.round((mv * .5 + .5) * 139);
      d.white = data[(y * 140 + x) * 4 + 3] > 110;
    });
  }

  function easeOutBack(t) { var c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

  function rose(x, y, r, white, seed, k) {
    var g = ctx.createRadialGradient(x - r * .25, y - r * .3, r * .1, x, y, r);
    if (white) { g.addColorStop(0, '#fffdf4'); g.addColorStop(.7, '#f1e8cb'); g.addColorStop(1, '#cdbf93'); }
    else { g.addColorStop(0, '#e8478f'); g.addColorStop(.62, '#c01766'); g.addColorStop(1, '#6e0a3a'); }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * k, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = white ? 'rgba(143,122,72,.55)' : 'rgba(60,0,28,.5)'; ctx.lineWidth = Math.max(1, r * .06);
    ctx.beginPath();
    for (var a = 0; a < 9; a += .35) { var rr = r * k * (.12 + a * .09); ctx.lineTo(x + Math.cos(a + seed) * rr, y + Math.sin(a + seed) * rr * .92); }
    ctx.stroke();
  }

  function draw(now) {
    ctx.clearRect(0, 0, S, S);
    // basket body
    var bx = CX, by = CY + RY * .55;
    var body = ctx.createLinearGradient(0, by, 0, by + 250);
    body.addColorStop(0, '#fbf8f0'); body.addColorStop(1, '#cfc8b8');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.moveTo(bx - RX * .86, by); ctx.bezierCurveTo(bx - RX * .86, by + 270, bx + RX * .86, by + 270, bx + RX * .86, by); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(40,36,28,.28)'; ctx.lineWidth = 3;
    for (var i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(bx - RX, by + 30 + i * 36); ctx.quadraticCurveTo(bx, by + 62 + i * 36, bx + RX, by + 30 + i * 36); ctx.stroke(); }
    ctx.restore();
    // dome of roses
    ctx.save(); ctx.translate(CX, CY);
    for (var n = 0; n < dots.length; n++) {
      var d = dots[n];
      var life = Math.min(1, Math.max(0, (now - t0 - d.d * 260) / 520));
      var k = life >= 1 ? 1 : easeOutBack(life);
      if (life <= 0) k = 0;
      var dome = 1 - d.v * d.v * .0 - d.d * d.d * .22;
      var x = d.u * RX, y = d.v * RY * (1 - .08 * d.u * d.u);
      var r = 23 * (.8 + dome * .3);
      rose(x, y, r, d.white, d.seed, Math.max(0, k));
    }
    ctx.restore();
    // rim shadow + front rim
    var rim = ctx.createLinearGradient(0, by - 24, 0, by + 28);
    rim.addColorStop(0, '#fffdf8'); rim.addColorStop(1, '#d9d2c1');
    ctx.fillStyle = rim;
    ctx.beginPath(); ctx.ellipse(bx, by + 4, RX * .88, 30, 0, 0, Math.PI); ctx.lineTo(bx - RX * .88, by + 4); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(bx, by + 4, RX * .88, 30, 0, 0.05, Math.PI - .05); ctx.stroke();
    // handle over the roses
    ctx.strokeStyle = '#f4efe2'; ctx.lineWidth = 17;
    ctx.beginPath(); ctx.moveTo(CX - RX * .8, CY + 70); ctx.bezierCurveTo(CX - RX * .95, CY - RY * 1.6, CX + RX * .95, CY - RY * 1.6, CX + RX * .8, CY + 70); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 3; ctx.stroke();
  }

  function loop(now) {
    raf = 0; draw(now);
    if (now - t0 < 1400) raf = requestAnimationFrame(loop);
  }
  function replay() { t0 = performance.now(); if (!raf) raf = requestAnimationFrame(loop); }

  function render() {
    app = window.PalmaApp; if (!app || !app.data) return;
    product = app.products().filter(function (p) { return p.personalize && p.personalize.enabled && !p.soldOut; })[0];
    $('initial').hidden = !product;
    document.querySelectorAll('a[href="#initial"]').forEach(function (a) { a.hidden = !product; });
    if (!product) return;
    if (!variant || !product.variants.some(function (v) { return v.id === variant; })) variant = product.variants[0] ? product.variants[0].id : null;
    var sizes = $('iniSizes');
    sizes.innerHTML = product.variants.length > 1 ? product.variants.map(function (v) {
      return '<button type="button" class="chip' + (v.id === variant ? ' on' : '') + '" data-ivar="' + app.esc(v.id) + '">' + app.esc(v.label) + '</button>';
    }).join('') : '';
    sizes.parentNode.hidden = product.variants.length < 2;
    price();
  }
  function price() { if (!product) return; $('iniPrice').textContent = app.money(app.priceOf(product, variant).price); }

  function clean(v) { return (v || '').replace(/[^\p{L}\p{N}]/gu, '').toUpperCase().slice(0, 2); }

  $('iniLetter').addEventListener('input', function (e) {
    var v = clean(e.target.value); if (v !== e.target.value) e.target.value = v;
    letter = v; sampleLetter(); replay();
  });
  $('iniSizes').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ivar]'); if (!b) return;
    variant = b.dataset.ivar; render();
  });
  $('iniAdd').addEventListener('click', function () {
    if (!product) return;
    if (!letter) { app.toast(app.t('prod.need')); $('iniLetter').focus(); return; }
    app.addToCart({ id: product.id, variant: variant, qty: 1, personal: letter });
  });
  var stage = $('iniStage'), tilt = $('iniTilt');
  stage.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    tilt.style.transform = 'rotateY(' + (x * 14).toFixed(2) + 'deg) rotateX(' + (-y * 12).toFixed(2) + 'deg)';
  });
  stage.addEventListener('pointerleave', function () { tilt.style.transform = ''; });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) replay(); }, { threshold: .35 }).observe(stage);
  }

  lattice(); sampleLetter(); t0 = -9999; draw(1);
  window.addEventListener('palma:data', render);
  window.addEventListener('palma:lang', render);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { sampleLetter(); draw(performance.now() + 9999 + 0); t0 = performance.now(); replay(); });
})();
