/*
 * Scroll story: the visitor walks through the shop door.
 * Everything is the owner's real footage: storefront video -> door -> plant corridor (scrubbed by scroll) -> gold sign plate.
 * Catalog photos fly past in CSS 3D. No WebGL, so it stays light on phones.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var story = $('story'), stage = $('stage'), scene = $('scene');
  if (!story || !stage) return;

  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) document.documentElement.classList.add('reduced');

  var el = {
    store: $('pStore'), walk: $('pWalk'), plate: $('plate'), cards: $('cards'),
    vStore: $('vStore'), vWalk: $('vWalk'), vSign: $('vSign'),
    bdStore: stage.querySelector('.bd-store'), bdWalk: stage.querySelector('.bd-walk'),
    chA: $('chA'), chB: $('chB'), chC: $('chC'), chD: $('chD'), hint: $('hint'), dots: $('dots'), canvas: $('petals')
  };
  var chapters = [el.chA, el.chB, el.chC, el.chD];

  var W = innerWidth, H = innerHeight, mobile = W < 760, vh = H;
  var cardEls = [], cardDefs = [];
  var p = 0, ps = 0, inView = true, raf = 0, last = 0, speed = 0, lastY = scrollY;
  var mx = 0, my = 0, rx = 0, ry = 0;
  var walkDur = 6.3, lastWalkT = -1;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(v, a, b) { return clamp((v - a) / (b - a), 0, 1); }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function out(t) { return 1 - Math.pow(1 - t, 3); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ---------- cards from the catalog ---------- */
  // desktop: x/y as fraction of stage; z in px (further = more negative); r = tilt
  var DEF = [
    { x: .56, y: -.14, r: -5, z: -700 }, { x: .60, y: .16, r: 4, z: -1250 },
    { x: -.60, y: -.10, r: 5, z: -1850 }, { x: -.54, y: .18, r: -4, z: -2400 },
    { x: -.58, y: -.20, r: 3, z: -2950 }, { x: -.62, y: .12, r: -3, z: -3500 }
  ];
  function buildCards() {
    var app = window.PalmaApp;
    if (!app || !app.data) return;
    var list = app.data.products.filter(function (x) { return !x.soldOut; });
    var feat = (app.data.settings.featuredIds || []).map(function (id) { return list.filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
    list.forEach(function (x) { if (feat.indexOf(x) < 0) feat.push(x); });
    feat = feat.slice(0, 6);
    el.cards.innerHTML = '';
    cardEls = []; cardDefs = [];
    feat.forEach(function (prod, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'card3d'; b.tabIndex = -1;
      var mp = app.minPrice(prod);
      b.innerHTML = '<span class="c-img"><img alt="" decoding="async" loading="lazy" src="' + app.img(prod.image) + '"></span>' +
        '<span class="c-cap"><span>' + app.esc(app.P(prod.name)) + '</span><b>' + app.money(mp.price) + '</b></span>';
      b.addEventListener('click', function () { app.openProduct(prod.id); });
      el.cards.appendChild(b);
      cardEls.push(b); cardDefs.push(DEF[i % DEF.length]);
    });
    layout();
  }

  /* ---------- layout / measure ---------- */
  function layout() {
    W = innerWidth; H = innerHeight; mobile = W < 760; vh = H;
    var h = reduced ? 1 : (mobile ? 6.2 : 7.6);
    story.style.height = reduced ? '' : (h * 100) + 'vh';
    var cv = el.canvas;
    var dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    petalDpr = dpr;
    update(true);
  }

  function progress() {
    var r = story.getBoundingClientRect();
    var total = r.height - H;
    return total > 0 ? clamp(-r.top / total, 0, 1) : 0;
  }

  /* ---------- the choreography ---------- */
  var FX = { arch: 0 };
  function render(t, time) {
    var cx = mobile ? 0 : 1; // horizontal moves only on wide screens
    var aw = el.store.getBoundingClientRect().width || 300;
    var ah = aw * 16 / 9;

    // A: storefront (hero) -> B: step through the door
    var push = ease(seg(t, 0, .2));
    var go = ease(seg(t, .13, .34));                 // dolly toward the door
    var storeX = cx * lerp(.2 * W, .13 * W, ease(seg(t, .08, .3)));
    var s = lerp(1 + push * .06, 3.6, go);
    var doorX = (.48 - .5) * aw, doorY = (.66 - .5) * ah;     // where the entrance is inside the frame
    var tx = storeX - doorX * (s - 1), ty = -doorY * (s - 1);
    var sOp = 1 - ease(seg(t, .22, .33));
    el.store.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')';
    el.store.style.opacity = sOp.toFixed(3);
    el.store.style.visibility = sOp <= .001 ? 'hidden' : 'visible';

    // walk-in corridor (scrubbed)
    var wIn = ease(seg(t, .2, .36));
    var wOut = ease(seg(t, .78, .9));
    var walkX = lerp(.13 * W, -.13 * W, ease(seg(t, .48, .62)));
    walkX = cx * lerp(walkX, 0, ease(seg(t, .74, .88)));
    var ws = lerp(.5, 1, out(wIn)) * lerp(1, 1.5, wOut) * (1 + seg(t, .36, .78) * .08);
    var wop = wIn * (1 - wOut);
    el.walk.style.transform = 'translate3d(' + walkX.toFixed(1) + 'px,0,0) scale(' + ws.toFixed(4) + ')';
    el.walk.style.opacity = wop.toFixed(3);
    el.walk.style.visibility = wop <= .001 ? 'hidden' : 'visible';

    // sign plate
    var pl = ease(seg(t, .76, .9));
    var py = lerp(120, 0, pl), prot = lerp(68, 0, pl), ps2 = lerp(.7, 1, pl);
    el.plate.style.opacity = pl.toFixed(3);
    el.plate.style.transform = 'translate3d(0,' + py.toFixed(1) + 'px,' + lerp(-300, 0, pl).toFixed(1) + 'px) rotateX(' + prot.toFixed(2) + 'deg) scale(' + ps2.toFixed(3) + ')';

    // backdrop glow follows whichever clip is on screen
    el.bdStore.style.opacity = (1 - ease(seg(t, .2, .36))).toFixed(3);
    el.bdWalk.style.opacity = (ease(seg(t, .2, .36)) * (1 - .55 * ease(seg(t, .76, .9)))).toFixed(3);

    // video time follows the scroll
    if (el.vWalk.readyState >= 2 && !reduced) {
      var vt = seg(t, .3, .78) * (walkDur - .08);
      if (Math.abs(vt - lastWalkT) > .02) { try { el.vWalk.currentTime = vt; } catch (e) {} lastWalkT = vt; }
    }
    if (t > .72 && el.vSign.paused && !reduced) el.vSign.play().catch(function () {});
    if (t < .6 && !el.vSign.paused) el.vSign.pause();

    // catalog photos fly past the camera
    var camZ = ease(seg(t, .1, .92)) * (mobile ? 3900 : 4300);
    for (var i = 0; i < cardEls.length; i++) {
      var d = cardDefs[i], zr = d.z + camZ;
      var fade = clamp((zr + 2900) / 1000, 0, 1) * (1 - clamp((zr - 120) / 520, 0, 1));
      if (d.x < 0) fade *= seg(t, .46, .53); // left-hand photos wait until the left text has gone
      var f = mobile ? .62 : 1;
      var bob = Math.sin(time / 1700 + i * 1.7) * 7;
      var xx = d.x * W * f, yy = d.y * H + bob;
      var c = cardEls[i];
      c.style.opacity = fade.toFixed(3);
      c.style.transform = 'translate3d(' + xx.toFixed(1) + 'px,' + yy.toFixed(1) + 'px,' + zr.toFixed(1) + 'px) rotateZ(' + d.r + 'deg)';
      var hot = fade > .75 && zr < 40;
      if (hot !== c._hot) { c._hot = hot; c.classList.toggle('hot', hot); c.tabIndex = hot ? 0 : -1; }
    }

    // chapters
    var cs = [
      [1 - seg(t, .1, .17), 0],
      [seg(t, .3, .37) * (1 - seg(t, .46, .51)), 0],
      [seg(t, .52, .58) * (1 - seg(t, .69, .74)), 0],
      [seg(t, .8, .87), 0]
    ];
    cs.forEach(function (v, k) {
      var o = clamp(v[0], 0, 1), ch = chapters[k];
      var yy = (1 - o) * 36 * (k === 0 ? -1 : 1);
      ch.style.setProperty('--o', o.toFixed(3));
      ch.style.setProperty('--y', yy.toFixed(1) + 'px');
      var on = o > .55;
      if (on !== ch._on) { ch._on = on; ch.classList.toggle('on', on); }
    });
    var cur = t < .27 ? 0 : t < .5 ? 1 : t < .76 ? 2 : 3;
    var bts = el.dots.querySelectorAll('button');
    for (var k2 = 0; k2 < bts.length; k2++) bts[k2].classList.toggle('on', k2 === cur);
    el.hint.style.setProperty('--ho', (1 - seg(t, .0, .05)).toFixed(2));

    // pointer parallax on wide screens
    if (!mobile && !reduced) {
      rx += (my * -2.2 - rx) * .06; ry += (mx * 3 - ry) * .06;
      scene.style.transform = 'rotateX(' + rx.toFixed(3) + 'deg) rotateY(' + ry.toFixed(3) + 'deg)';
    }
  }

  /* ---------- falling petals (2D canvas, reacts to scroll speed) ---------- */
  var petalDpr = 1, petals = [];
  function initPetals() {
    var n = mobile ? 10 : 22;
    petals = [];
    for (var i = 0; i < n; i++) petals.push(newPetal(true));
  }
  function newPetal(anywhere) {
    var pink = Math.random() < .18;
    return {
      x: Math.random() * W, y: anywhere ? Math.random() * H : -30, s: 7 + Math.random() * 12,
      vy: 18 + Math.random() * 30, ph: Math.random() * 6.28, sw: 14 + Math.random() * 30, rot: Math.random() * 6.28, vr: (Math.random() - .5) * 1.4,
      c0: pink ? '#d8337f' : '#fffaf0', c1: pink ? '#8f0f49' : '#e7dcc4', a: .5 + Math.random() * .4
    };
  }
  function drawPetals(dt, time) {
    var cv = el.canvas, g = cv.getContext('2d');
    g.setTransform(petalDpr, 0, 0, petalDpr, 0, 0);
    g.clearRect(0, 0, W, H);
    var wind = clamp(speed * .06, -140, 140);
    for (var i = 0; i < petals.length; i++) {
      var q = petals[i];
      q.y += (q.vy + Math.abs(wind) * .5) * dt;
      q.x += (Math.sin(time / 1400 + q.ph) * q.sw * .6 + wind) * dt;
      q.rot += q.vr * dt * (1 + Math.abs(wind) * .01);
      if (q.y > H + 30 || q.x < -50 || q.x > W + 50) { var n = newPetal(false); n.x = Math.random() * W; petals[i] = q = n; }
      g.save(); g.translate(q.x, q.y); g.rotate(q.rot); g.scale(1, .55 + .45 * Math.abs(Math.sin(time / 900 + q.ph)));
      var gr = g.createRadialGradient(0, -q.s * .2, 1, 0, 0, q.s);
      gr.addColorStop(0, q.c0); gr.addColorStop(1, q.c1);
      g.globalAlpha = q.a; g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, -q.s); g.bezierCurveTo(q.s * .9, -q.s * .6, q.s * .8, q.s * .6, 0, q.s); g.bezierCurveTo(-q.s * .8, q.s * .6, -q.s * .9, -q.s * .6, 0, -q.s); g.fill();
      g.restore();
    }
  }

  /* ---------- loop ---------- */
  function update(force) {
    p = progress();
    if (reduced) p = 0;
    if (force) ps = p;
  }
  function loop(now) {
    raf = 0;
    if (!inView) return;
    var dt = Math.min((now - (last || now)) / 1000, .05); last = now;
    update(false);
    ps += (p - ps) * Math.min(1, dt * 9);
    if (Math.abs(p - ps) < .0003) ps = p;
    var y = scrollY; speed += ((y - lastY) / Math.max(dt, .001) - speed) * .12; lastY = y;
    render(ps, now);
    if (!reduced) drawPetals(dt, now);
    raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && inView) { last = 0; raf = requestAnimationFrame(loop); } }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      inView = es[0].isIntersecting;
      if (inView) { kick(); if (el.vStore.paused && !reduced) el.vStore.play().catch(function () {}); }
      else { if (!el.vStore.paused) el.vStore.pause(); if (!el.vSign.paused) el.vSign.pause(); }
    }, { rootMargin: '120px 0px' }).observe(story);
  }

  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', function () { layout(); initPetals(); kick(); });
  addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; kick(); } }, { passive: true });
  el.vWalk.addEventListener('loadedmetadata', function () { walkDur = el.vWalk.duration || walkDur; });
  el.vWalk.addEventListener('loadeddata', function () { lastWalkT = -1; kick(); });
  el.vStore.play && el.vStore.play().catch(function () {});

  el.dots.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-go]');
    if (!b) return;
    var top = story.getBoundingClientRect().top + scrollY;
    var total = story.offsetHeight - H;
    scrollTo({ top: top + total * parseFloat(b.dataset.go), behavior: 'smooth' });
  });

  window.addEventListener('palma:data', buildCards);
  window.addEventListener('palma:lang', buildCards);
  layout(); initPetals(); buildCards(); kick();
  window.PalmaStory = { progress: function () { return ps; }, layout: layout };
})();
