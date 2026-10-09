/* PALMA storefront: catalog, product modal, cart, checkout, custom order, contact. */
(function () {
  'use strict';
  var Core = window.PalmaCore, API = window.PalmaAPI, I18N = window.PalmaI18N;
  var $ = function (id) { return document.getElementById(id); };
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  var state = { data: null, camps: [], lang: 'ru', cat: 'all', cart: LS.get('palma.cart', []), profile: LS.get('palma.profile', {}), view: 'cart', mode: 'delivery', wa: false };

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function P(o) { return Core.pick(o, state.lang); }
  function t(k) { return I18N.t(k, state.lang); }
  function money(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ' + (state.data ? state.data.settings.currency : ''); }
  function img(u) { return API.img(u); }
  function prod(id) { return state.data.products.filter(function (p) { return p.id === id; })[0]; }
  function cat(id) { return state.data.categories.filter(function (c) { return c.id === id; })[0]; }
  function priceOf(p, v) { return Core.priceOf(p, v, state.camps); }
  function minPrice(p) { return Core.minPrice(p, state.camps); }
  function cfg() { return state.data.settings; }
  function toast(msg) {
    var el = $('toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('on'); }, 2800);
  }
  function openExternal(url) {
    var a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    document.body.appendChild(a); a.click(); a.remove();
  }
  function waNumber() { return state.data ? cfg().contact.whatsapp : ''; }
  function waLink(text) { return 'https://wa.me/' + waNumber() + '?text=' + encodeURIComponent(text); }
  function sendWa(text) {
    if (!waNumber()) { toast(t('prod.nowa')); return false; }
    openExternal(waLink(text)); return true;
  }
  function stockLabel(p) {
    if (p.soldOut) return { cls: 'out', text: t('cat.soldout') };
    if (p.stock != null && p.stock <= 3) return { cls: 'low', text: t('cat.left') + ' ' + p.stock };
    return { cls: '', text: t('cat.instock') };
  }
  function tag(p, pr) {
    var out = '';
    if (pr.percent > 0) out += '<span class="tag sale">−' + pr.percent + '%</span>';
    var b = P(p.badge);
    if (b) out += '<span class="tag">' + esc(b) + '</span>';
    return out;
  }

  /* ---------- static texts ---------- */
  function applyStatic() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll('[data-i]').forEach(function (n) { n.textContent = t(n.dataset.i); });
    document.querySelectorAll('[data-i-ph]').forEach(function (n) { n.placeholder = t(n.dataset.iPh); });
    $('year').textContent = new Date().getFullYear();
    var lang = $('lang');
    lang.innerHTML = I18N.langs.map(function (l) {
      return '<button type="button" data-lang="' + l + '" aria-pressed="' + (l === state.lang) + '">' + I18N.names[l] + '</button>';
    }).join('');
    document.title = 'PALMA — ' + ({ ru: 'цветочный бутик в Душанбе', tg: 'бутики гул дар Душанбе', en: 'flower boutique in Dushanbe', tr: 'Duşanbe çiçek butiği' })[state.lang];
  }

  /* ---------- hero, announce ---------- */
  function renderHero() {
    var h = cfg().hero;
    $('heroEyebrow').textContent = P(h.eyebrow);
    var title = P(h.title).trim(), i = title.lastIndexOf(' ');
    $('heroTitle').innerHTML = i > 0 ? esc(title.slice(0, i)) + ' <em>' + esc(title.slice(i + 1)) + '</em>' : esc(title);
    $('heroSub').textContent = P(h.subtitle);
    var hi = cfg().heroImage;
    if (hi) {
      var u = img(hi), vs = $('vStore'), bd = document.querySelector('.bd-store');
      if (vs) vs.poster = u; if (bd) bd.src = u;
    }
  }
  function renderAnnounce() {
    var a = cfg().announcement, el = $('announce'), c = state.camps[0], text = '';
    if (c) text = [P(c.badge), P(c.title), P(c.text)].filter(Boolean).join(' · ');
    else if (a.enabled) text = P(a.text);
    el.hidden = !text; $('announceText').textContent = text;
  }

  /* ---------- catalog ---------- */
  function renderChips() {
    var have = {};
    state.data.products.forEach(function (p) { have[p.categoryId] = 1; });
    var cats = state.data.categories.filter(function (c) { return have[c.id]; });
    if (state.cat !== 'all' && !have[state.cat]) state.cat = 'all';
    var html = '<button class="chip" role="tab" data-cat="all" aria-selected="' + (state.cat === 'all') + '">' + esc(t('cat.all')) + '</button>';
    cats.forEach(function (c) { html += '<button class="chip" role="tab" data-cat="' + esc(c.id) + '" aria-selected="' + (state.cat === c.id) + '">' + esc(P(c.name)) + '</button>'; });
    $('catChips').innerHTML = html;
  }
  function cardHTML(p) {
    var mp = minPrice(p), multi = p.variants && p.variants.length > 1, st = stockLabel(p);
    var alt = p.gallery && p.gallery[0] ? '<img class="alt" alt="" loading="lazy" decoding="async" src="' + esc(img(p.gallery[0])) + '">' : '';
    return '<article class="pc reveal' + (p.soldOut ? ' out' : '') + '" data-id="' + esc(p.id) + '">' +
      '<button class="pc-media" type="button" data-open="' + esc(p.id) + '" aria-label="' + esc(P(p.name)) + '">' +
      '<img alt="' + esc(P(p.name)) + '" loading="lazy" decoding="async" src="' + esc(img(p.image)) + '">' + alt + tag(p, mp) + '</button>' +
      '<div class="pc-body"><h3 class="pc-name">' + esc(P(p.name)) + '</h3>' +
      '<p class="pc-desc">' + esc(P(p.desc)) + '</p>' +
      '<span class="pc-stock ' + st.cls + '">' + esc(st.text) + '</span>' +
      '<div class="pc-foot"><span class="price">' + (multi ? '<small>' + esc(t('cat.from')) + '</small>' : '') +
      '<span class="now' + (mp.percent > 0 && mp.old ? ' sale' : '') + '">' + money(mp.price) + '</span>' + (mp.old ? '<s>' + money(mp.old) + '</s>' : '') + '</span>' +
      '<button class="pc-add" type="button" data-quick="' + esc(p.id) + '" aria-label="' + esc(t('cat.add')) + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></div></div></article>';
  }
  function renderGrid() {
    var list = state.data.products.filter(function (p) { return state.cat === 'all' || p.categoryId === state.cat; });
    $('grid').innerHTML = list.length ? list.map(cardHTML).join('') : '<p class="empty">' + esc(t('cat.empty')) + '</p>';
    observeReveal($('grid'));
  }

  /* ---------- product modal ---------- */
  var M = null;
  function openProduct(id) {
    var p = prod(id); if (!p) return;
    M = { id: id, variant: p.variants && p.variants.length ? p.variants[0].id : null, qty: 1, personal: '', img: 0, lastFocus: document.activeElement };
    renderModal(); showLayer('modal');
  }
  function renderModal() {
    var p = prod(M.id), pr = priceOf(p, M.variant), st = stockLabel(p);
    var imgs = [p.image].concat(p.gallery || []);
    var c = cat(p.categoryId);
    var opts = '';
    if (p.variants && p.variants.length > 1) {
      opts = '<div class="field"><span class="label">' + esc(t('prod.options')) + '</span><div class="opts" role="radiogroup">' +
        p.variants.map(function (v) {
          var vp = priceOf(p, v.id);
          return '<button type="button" class="opt" role="radio" data-variant="' + esc(v.id) + '" aria-checked="' + (v.id === M.variant) + '">' + esc(v.label) + '<small>' + money(vp.price) + '</small></button>';
        }).join('') + '</div></div>';
    }
    var personal = '';
    if (p.personalize && p.personalize.enabled) {
      personal = '<div class="field"><label for="pmPersonal">' + esc(P(p.personalize.label) || t('prod.personal')) + '</label><input id="pmPersonal" class="input" maxlength="40" value="' + esc(M.personal) + '" placeholder="' + esc(t('prod.personalHint')) + '" autocomplete="off"></div>';
    }
    $('modal').innerHTML =
      '<button class="modal-x" type="button" data-close aria-label="' + esc(t('common.close')) + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg></button>' +
      '<div class="pm"><div class="pm-gallery"><div class="pm-main"><img alt="' + esc(P(p.name)) + '" src="' + esc(img(imgs[M.img] || p.image)) + '"></div>' +
      (imgs.length > 1 ? '<div class="pm-thumbs">' + imgs.map(function (u, i) { return '<button type="button" data-thumb="' + i + '" class="' + (i === M.img ? 'on' : '') + '"><img alt="" src="' + esc(img(u)) + '"></button>'; }).join('') + '</div>' : '') +
      '</div><div class="pm-info">' +
      (c ? '<p class="pm-cat">' + esc(P(c.name)) + '</p>' : '') +
      '<h2 class="pm-name">' + esc(P(p.name)) + '</h2>' +
      '<p class="pm-price"><span class="' + (pr.percent > 0 && pr.old ? 'sale' : '') + '">' + money(pr.price) + '</span>' + (pr.old ? '<s>' + money(pr.old) + '</s>' : '') + '</p>' +
      '<p class="pm-desc">' + esc(P(p.desc)) + '</p>' + opts + personal +
      '<div class="pm-row"><div class="qty"><button type="button" data-qty="-1" aria-label="−">−</button><output id="pmQty">' + M.qty + '</output><button type="button" data-qty="1" aria-label="+">+</button></div><span class="pc-stock ' + st.cls + '">' + esc(st.text) + '</span></div>' +
      '<div class="pm-actions"><button class="btn btn-ink btn-block" type="button" data-add' + (p.soldOut ? ' disabled' : '') + '>' + esc(t('prod.cart')) + ' · ' + money(pr.price * M.qty) + '</button>' +
      '<button class="btn btn-wa btn-block" type="button" data-wa-product>' + esc(t('prod.wa')) + '</button></div>' +
      '</div></div>';
    var x = $('modal').querySelector('.modal-x'); if (x && !renderModal._focused) { x.focus({ preventScroll: true }); renderModal._focused = true; }
  }
  function modalItem() {
    var p = prod(M.id);
    if (p.personalize && p.personalize.enabled && !M.personal.trim()) { toast(t('prod.need')); var f = $('pmPersonal'); if (f) f.focus(); return null; }
    return { id: M.id, variant: M.variant, qty: M.qty, personal: M.personal.trim() };
  }
  function productWaText() {
    var p = prod(M.id), pr = priceOf(p, M.variant), L = { ru: 'Здравствуйте! Хочу заказать', tg: 'Салом! Мехоҳам фармоиш диҳам', en: 'Hello! I would like to order', tr: 'Merhaba! Sipariş vermek istiyorum' };
    return (L[state.lang] || L.ru) + ':\n• ' + P(p.name) + (pr.variant && p.variants.length > 1 ? ' (' + pr.variant.label + ')' : '') + (M.personal.trim() ? ' «' + M.personal.trim() + '»' : '') + ' × ' + M.qty + ' = ' + money(pr.price * M.qty) + '\n' + location.href.split('#')[0];
  }

  /* ---------- layers (modal / drawer) ---------- */
  var layer = null;
  function showLayer(kind) {
    var ov = $('overlay'), el = $(kind);
    if (layer && layer !== kind) hideLayer(true);
    layer = kind; ov.hidden = false; el.hidden = false;
    requestAnimationFrame(function () { ov.classList.add('on'); el.classList.add('on'); });
    document.body.classList.add('locked'); $('waFab').classList.add('hide');
  }
  function hideLayer(quick) {
    if (!layer) return;
    var kind = layer, el = $(kind), ov = $('overlay'); layer = null;
    el.classList.remove('on'); ov.classList.remove('on');
    document.body.classList.remove('locked'); $('waFab').classList.remove('hide');
    var done = function () { if (!layer) { ov.hidden = true; } el.hidden = true; };
    if (quick) done(); else setTimeout(done, 520);
    renderModal._focused = false;
    if (kind === 'modal' && M && M.lastFocus && M.lastFocus.focus) { try { M.lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  }

  /* ---------- cart ---------- */
  function saveCart() { LS.set('palma.cart', state.cart); renderCartBadge(); }
  function renderCartBadge() {
    var n = state.cart.reduce(function (a, i) { return a + i.qty; }, 0), b = $('cartCount');
    b.textContent = n; b.classList.toggle('on', n > 0);
  }
  function addToCart(it, silent) {
    var p = prod(it.id); if (!p || p.soldOut) return false;
    var key = [it.id, it.variant || '', it.personal || ''].join('|');
    var ex = state.cart.filter(function (c) { return c.key === key; })[0];
    var max = p.stock != null ? p.stock : 99;
    if (ex) ex.qty = Math.min(max, ex.qty + it.qty); else state.cart.push({ key: key, id: it.id, variant: it.variant || null, qty: Math.min(max, it.qty), personal: it.personal || '' });
    saveCart();
    var b = $('cartCount'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    if (!silent) toast(t('prod.added'));
    return true;
  }
  function cartLines() {
    var lines = [];
    state.cart = state.cart.filter(function (c) { return prod(c.id); });
    state.cart.forEach(function (c) {
      var p = prod(c.id), v = p.variants && p.variants.length ? (p.variants.filter(function (x) { return x.id === c.variant; })[0] || p.variants[0]) : null;
      var pr = priceOf(p, v ? v.id : null);
      lines.push({ c: c, p: p, v: v, pr: pr, sum: pr.price * c.qty });
    });
    return lines;
  }
  function totals(lines) {
    var d = cfg().delivery, sub = lines.reduce(function (a, l) { return a + l.sum; }, 0);
    var fee = 0;
    if (state.mode === 'delivery' && d.enabled) fee = (d.freeFrom > 0 && sub >= d.freeFrom) ? 0 : d.fee;
    return { sub: sub, fee: fee, total: sub + fee };
  }
  function openCart(view) { state.view = view || 'cart'; renderDrawer(); showLayer('drawer'); }

  function timeOptions(date) {
    var d = cfg().delivery, from = d.from.split(':'), to = d.to.split(':');
    var a = (+from[0]) * 60 + (+from[1]), b = (+to[0]) * 60 + (+to[1]), out = [];
    var now = new Date(), min = 0;
    if (date === Core.todayStr()) min = now.getHours() * 60 + now.getMinutes() + (d.leadMinutes || 0);
    for (var m = a; m <= b; m += 30) if (m >= min) out.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
    return out;
  }
  function timeSelect(date, cur) {
    var o = '<option value="">' + esc(t('co.asap')) + '</option>';
    timeOptions(date).forEach(function (x) { o += '<option value="' + x + '"' + (x === cur ? ' selected' : '') + '>' + x + '</option>'; });
    return o;
  }

  function renderDrawer() {
    var el = $('drawer'), lines = cartLines(), d = cfg().delivery, tt = totals(lines), pf = state.profile;
    var head = '<button class="drawer-x" type="button" data-close aria-label="' + esc(t('common.close')) + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg></button>';
    if (state.view === 'done') {
      var o = state.done;
      el.innerHTML = head + '<div class="drawer-body"><div class="ok"><div class="tick"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
        '<h3>' + esc(t('ok.title')) + '</h3><p class="muted">' + esc(t('ok.text')) + '</p><div class="no">' + esc(o.no) + '</div>' +
        '<button class="btn btn-wa btn-block" type="button" data-wa-order>' + esc(t('ok.wa')) + '</button><p></p>' +
        '<button class="btn btn-line btn-block" type="button" data-close>' + esc(t('common.close')) + '</button></div></div>';
      return;
    }
    if (state.view === 'cart') {
      var body;
      if (!lines.length) body = '<p class="muted" style="padding:30px 0">' + esc(t('cart.empty')) + '</p>';
      else body = lines.map(function (l) {
        return '<div class="ci"><img alt="" src="' + esc(img(l.p.image)) + '"><div><h4>' + esc(P(l.p.name)) + '</h4><p class="meta">' +
          esc([l.v && l.p.variants.length > 1 ? l.v.label : '', l.c.personal ? '«' + l.c.personal + '»' : ''].filter(Boolean).join(' · ')) + (l.p.soldOut ? ' <b style="color:var(--fuchsia)">' + esc(t('cat.soldout')) + '</b>' : '') + '</p>' +
          '<div class="ci-row"><div class="qty"><button type="button" data-cq="' + esc(l.c.key) + '" data-d="-1" aria-label="−">−</button><output>' + l.c.qty + '</output><button type="button" data-cq="' + esc(l.c.key) + '" data-d="1" aria-label="+">+</button></div><strong>' + money(l.sum) + '</strong></div>' +
          '<button class="linkbtn" type="button" data-rm="' + esc(l.c.key) + '">' + esc(t('cart.remove')) + '</button></div></div>';
      }).join('');
      var free = '';
      if (lines.length && d.enabled && d.freeFrom > 0) {
        var pct = Math.min(100, Math.round(tt.sub / d.freeFrom * 100));
        free = '<div class="freebar"><i style="width:' + pct + '%"></i></div><p class="freenote">' + (tt.sub >= d.freeFrom ? esc(t('cart.fee')) + ': ' + esc(t('cart.free')) : esc(t('cart.addMore')) + ' ' + money(d.freeFrom - tt.sub) + ' ' + esc(t('cart.toFree'))) + '</p>';
      }
      el.innerHTML = head + '<div class="drawer-head"><h3>' + esc(t('cart.title')) + '</h3></div><div class="drawer-body">' + body + '</div>' +
        (lines.length ? '<div class="drawer-foot">' + free + '<div class="sumrow total"><span>' + esc(t('cart.sub')) + '</span><span>' + money(tt.sub) + '</span></div><p></p><button class="btn btn-ink btn-block" type="button" data-checkout' + (lines.some(function (l) { return l.p.soldOut; }) ? ' disabled' : '') + '>' + esc(t('cart.checkout')) + '</button></div>' : '');
      return;
    }
    // checkout
    var pickupOK = d.pickup, delOK = d.enabled;
    if (state.mode === 'delivery' && !delOK) state.mode = 'pickup';
    if (state.mode === 'pickup' && !pickupOK) state.mode = 'delivery';
    var date = state.form && state.form.date || Core.todayStr();
    var rows = lines.map(function (l) { return '<div class="sumrow"><span>' + esc(P(l.p.name)) + ' × ' + l.c.qty + '</span><span>' + money(l.sum) + '</span></div>'; }).join('');
    el.innerHTML = head + '<div class="drawer-head"><h3>' + esc(t('co.title')) + '</h3></div><form class="drawer-body" id="coForm" novalidate>' +
      '<div class="modes">' + (delOK ? '<button type="button" class="opt" role="radio" data-mode="delivery" aria-checked="' + (state.mode === 'delivery') + '">' + esc(t('co.delivery')) + '</button>' : '') +
      (pickupOK ? '<button type="button" class="opt" role="radio" data-mode="pickup" aria-checked="' + (state.mode === 'pickup') + '">' + esc(t('co.pickup')) + '</button>' : '') + '</div>' +
      '<div class="field"><label for="coName">' + esc(t('co.name')) + '</label><input id="coName" class="input" autocomplete="name" value="' + esc(pf.name || '') + '"></div>' +
      '<div class="field"><label for="coPhone">' + esc(t('co.phone')) + '</label><input id="coPhone" class="input" type="tel" inputmode="tel" autocomplete="tel" value="' + esc(pf.phone || '') + '" placeholder="+992"></div>' +
      (state.mode === 'delivery' ? '<div class="field"><label for="coAddress">' + esc(t('co.address')) + '</label><input id="coAddress" class="input" autocomplete="street-address" value="' + esc(pf.address || '') + '"></div>' : '') +
      '<div class="row2"><div class="field"><label for="coDate">' + esc(t('co.date')) + '</label><input id="coDate" class="input" type="date" min="' + Core.todayStr() + '" value="' + date + '"></div>' +
      '<div class="field"><label for="coTime">' + esc(t('co.time')) + '</label><select id="coTime" class="input">' + timeSelect(date, '') + '</select></div></div>' +
      '<div class="field"><label for="coCard">' + esc(t('co.card')) + '</label><textarea id="coCard" class="input" rows="2" maxlength="400"></textarea></div>' +
      '<div class="field"><label for="coNote">' + esc(t('co.note')) + '</label><textarea id="coNote" class="input" rows="2" maxlength="500"></textarea></div>' +
      '<div style="margin:6px 0 4px">' + rows +
      (state.mode === 'delivery' && d.enabled ? '<div class="sumrow"><span>' + esc(t('cart.fee')) + '</span><span>' + (tt.fee ? money(tt.fee) : esc(t('cart.free'))) + '</span></div>' : '') +
      '<div class="sumrow total"><span>' + esc(t('cart.total')) + '</span><span>' + money(tt.total) + '</span></div></div>' +
      '<p class="form-error" id="coError" role="alert" hidden></p>' +
      '<div style="display:grid;gap:.7rem;padding-bottom:8px"><button class="btn btn-ink btn-block" type="submit" data-submit="site">' + esc(t('co.submit')) + '</button>' +
      '<button class="btn btn-wa btn-block" type="submit" data-submit="whatsapp">' + esc(t('co.submitWa')) + '</button></div></form>';
  }
  function showErr(id, msg, field) {
    var e = $(id); e.textContent = msg; e.hidden = false;
    if (field) { var f = $(field); if (f) { f.setAttribute('aria-invalid', 'true'); f.focus(); } }
  }
  var ERR = { name: 'co.err.name', phone: 'co.err.phone', address: 'co.err.address', date: 'co.err.date', minorder: 'co.err.minorder', soldout: 'co.err.soldout', stock: 'co.err.stock', rate: 'co.err.rate', product: 'co.err.soldout', custom: 'cu.err' };
  function errText(r) {
    var m = t(ERR[r.error] || 'co.err.generic');
    if (r.error === 'minorder') m += ': ' + money(r.min);
    return m;
  }

  async function submitCheckout(source, form) {
    var f = { name: $('coName').value.trim(), phone: $('coPhone').value.trim(), address: state.mode === 'delivery' ? $('coAddress').value.trim() : '', date: $('coDate').value, time: $('coTime').value, card: $('coCard').value.trim(), note: $('coNote').value.trim() };
    form.querySelectorAll('[aria-invalid]').forEach(function (x) { x.removeAttribute('aria-invalid'); });
    $('coError').hidden = true;
    if (f.name.length < 2) return showErr('coError', t('co.err.name'), 'coName');
    if (f.phone.replace(/\D/g, '').length < 7) return showErr('coError', t('co.err.phone'), 'coPhone');
    if (state.mode === 'delivery' && f.address.length < 5) return showErr('coError', t('co.err.address'), 'coAddress');
    if (f.date && f.date < Core.todayStr()) return showErr('coError', t('co.err.date'), 'coDate');
    state.profile = { name: f.name, phone: f.phone, address: f.address || state.profile.address || '' }; LS.set('palma.profile', state.profile);
    var btns = form.querySelectorAll('button[type=submit]'); btns.forEach(function (b) { b.disabled = true; });
    var lines = cartLines(), tt = totals(lines);
    var res = await API.post('/api/orders', {
      type: 'catalog', lang: state.lang, source: source, customer: { name: f.name, phone: f.phone },
      delivery: { mode: state.mode, address: f.address, date: f.date, time: f.time }, note: f.note, cardMessage: f.card,
      items: state.cart.map(function (c) { return { id: c.id, variant: c.variant, qty: c.qty, personal: c.personal }; })
    });
    btns.forEach(function (b) { b.disabled = false; });
    if (!res.ok) return showErr('coError', errText(res));
    state.done = {
      no: res.order.no, text: Core.orderText({ no: res.order.no, type: 'catalog', items: res.order.items, total: res.order.total, customer: { name: f.name, phone: f.phone }, delivery: { mode: state.mode, address: f.address, date: f.date, time: f.time, fee: res.order.fee }, note: f.note, cardMessage: f.card }, cfg(), state.lang)
    };
    state.cart = []; saveCart(); state.view = 'done'; renderDrawer(); refreshAfterOrder();
    if (source === 'whatsapp') sendWa(state.done.text);
  }
  async function refreshAfterOrder() { // stock changed on the server
    var r = await API.get('/api/public');
    if (r && r.ok) { state.data = r; state.camps = r.campaigns; renderChips(); renderGrid(); }
  }

  /* ---------- custom order ---------- */
  var CU = { style: '', colors: [], flowers: [], wrap: '' };
  var COLORS = { white: '#f6f2e8', pink: '#f0b5c8', fuchsia: '#b4125a', red: '#b3171f', peach: '#f2b48f', green: '#3f6b49' };
  var FLOWERS = ['rose', 'daisy', 'peony', 'tulip', 'lily', 'gypso'];
  var STYLES = ['soft', 'bright', 'minimal', 'classic'];
  var WRAPS = ['umbrella', 'paper', 'basket', 'box'];
  function renderCustom() {
    function chips(id, keys, pre, multi, extra) {
      $(id).innerHTML = keys.map(function (k) {
        var on = multi ? CU[multi].indexOf(k) >= 0 : CU[id === 'cuStyle' ? 'style' : 'wrap'] === k;
        return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-cu="' + id + '" data-k="' + k + '" aria-pressed="' + on + '">' + (extra ? '<i style="--sw:' + extra[k] + '"></i>' : '') + esc(t(pre + k)) + '</button>';
      }).join('');
    }
    chips('cuStyle', STYLES, 'cu.s.', null);
    chips('cuColors', Object.keys(COLORS), 'cu.c.', 'colors', COLORS);
    chips('cuFlowers', FLOWERS, 'cu.f.', 'flowers');
    chips('cuWrap', WRAPS, 'cu.w.', null);
    $('cuBudgetVal').textContent = money(+$('cuBudget').value);
    var d = $('cuDate'); d.min = Core.todayStr();
  }
  async function submitCustom(e) {
    e.preventDefault();
    var err = $('cuError'); err.hidden = true;
    var name = $('cuName').value.trim(), phone = $('cuPhone').value.trim(), addr = $('cuAddress').value.trim(), text = $('cuText').value.trim();
    if (!CU.style && !CU.colors.length && !text) { err.textContent = t('cu.err'); err.hidden = false; return; }
    if (name.length < 2) { err.textContent = t('co.err.name'); err.hidden = false; $('cuName').focus(); return; }
    if (phone.replace(/\D/g, '').length < 7) { err.textContent = t('co.err.phone'); err.hidden = false; $('cuPhone').focus(); return; }
    var pickup = !addr;
    var btn = $('cuSubmit'); btn.disabled = true;
    var L = function (pre, k) { return k ? t(pre + k) : ''; };
    var custom = { style: L('cu.s.', CU.style), colors: CU.colors.map(function (k) { return t('cu.c.' + k); }), flowers: CU.flowers.map(function (k) { return t('cu.f.' + k); }), wrap: L('cu.w.', CU.wrap), budget: +$('cuBudget').value, text: text };
    var res = await API.post('/api/orders', { type: 'custom', lang: state.lang, customer: { name: name, phone: phone }, delivery: { mode: pickup ? 'pickup' : 'delivery', address: addr, date: $('cuDate').value, time: '' }, custom: custom, items: [] });
    btn.disabled = false;
    if (!res.ok) { err.textContent = errText(res); err.hidden = false; return; }
    state.profile = { name: name, phone: phone, address: addr || state.profile.address || '' }; LS.set('palma.profile', state.profile);
    state.done = { no: res.order.no, text: Core.orderText({ no: res.order.no, type: 'custom', custom: custom, items: [], total: 0, customer: { name: name, phone: phone }, delivery: { mode: pickup ? 'pickup' : 'delivery', address: addr, date: $('cuDate').value, time: '' }, note: '', cardMessage: '' }, cfg(), state.lang) };
    state.view = 'done'; renderDrawer(); showLayer('drawer');
    $('customForm').reset(); CU = { style: '', colors: [], flowers: [], wrap: '' }; renderCustom();
  }

  /* ---------- delivery & contact ---------- */
  function renderDelivery() {
    var d = cfg().delivery, c = cfg().contact, f = [];
    if (d.enabled) {
      f.push([t('del.fee'), d.fee ? money(d.fee) : t('cart.free')]);
      if (d.freeFrom > 0) f.push([t('del.free'), money(d.freeFrom)]);
      f.push([t('del.lead'), d.leadMinutes + ' ' + t('del.min')]);
      f.push([t('del.window'), d.from + ' – ' + d.to]);
    }
    if (d.pickup) f.push([t('co.pickup'), t('cart.free')]);
    $('facts').innerHTML = f.map(function (r) { return '<li><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></li>'; }).join('');
    $('zones').textContent = P(d.zones);
    var rows = [];
    if (P(c.address)) rows.push([t('del.address'), esc(P(c.address))]);
    if (P(c.hours)) rows.push([t('del.hours'), esc(P(c.hours))]);
    if (c.phone) rows.push([t('del.phone'), '<a href="tel:' + esc(c.phone.replace(/[^\d+]/g, '')) + '">' + esc(c.phone) + '</a>']);
    if (c.instagram) rows.push(['Instagram', '<a href="https://instagram.com/' + esc(c.instagram) + '" target="_blank" rel="noopener">@' + esc(c.instagram) + '</a>']);
    if (c.telegram) rows.push(['Telegram', '<a href="https://t.me/' + esc(c.telegram) + '" target="_blank" rel="noopener">@' + esc(c.telegram) + '</a>']);
    if (c.email) rows.push(['Email', '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>']);
    $('contactList').innerHTML = rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd></div>'; }).join('');
    var map = c.mapUrl || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((P(c.address) || 'Dushanbe') + ' PALMA'));
    $('contactBtns').innerHTML = '<button class="btn btn-wa" type="button" data-wa="generic">WhatsApp</button>' +
      (c.phone ? '<a class="btn btn-ghost" href="tel:' + esc(c.phone.replace(/[^\d+]/g, '')) + '">' + esc(t('common.call')) + '</a>' : '') +
      '<a class="btn btn-ghost" href="' + esc(map) + '" target="_blank" rel="noopener">' + esc(t('del.map')) + '</a>';
    $('footIg').textContent = c.instagram ? '@' + c.instagram : '';
  }

  /* ---------- reveal / nav ---------- */
  var io = null;
  function observeReveal(root) {
    var nodes = (root || document).querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { nodes.forEach(function (n) { n.classList.add('in'); }); return; }
    if (!io) io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    nodes.forEach(function (n, i) { n.style.transitionDelay = Math.min(i % 4, 3) * 70 + 'ms'; io.observe(n); });
  }
  function navState() {
    var nav = $('nav'), y = 40, tone = 'story', sec = document.querySelectorAll('[data-tone]');
    nav.classList.toggle('scrolled', scrollY > 40);
    for (var i = 0; i < sec.length; i++) { var r = sec[i].getBoundingClientRect(); if (r.top <= y && r.bottom > y) { tone = sec[i].dataset.tone; break; } }
    var story = $('story').getBoundingClientRect();
    if (story.bottom > y && story.top <= y) tone = 'story';
    nav.classList.toggle('solid', tone === 'dark'); nav.classList.toggle('light', tone === 'light');
  }
  var navTick = 0;
  addEventListener('scroll', function () { if (!navTick) navTick = requestAnimationFrame(function () { navTick = 0; navState(); }); }, { passive: true });

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var q = function (s) { return e.target.closest(s); }, b;
    if ((b = q('[data-lang]'))) return setLang(b.dataset.lang);
    if ((b = q('[data-cat]'))) { state.cat = b.dataset.cat; renderChips(); renderGrid(); return; }
    if ((b = q('[data-open]'))) return openProduct(b.dataset.open);
    if ((b = q('[data-quick]'))) {
      var p = prod(b.dataset.quick);
      if ((p.variants && p.variants.length > 1) || (p.personalize && p.personalize.enabled)) return openProduct(p.id);
      return void addToCart({ id: p.id, variant: p.variants && p.variants[0] ? p.variants[0].id : null, qty: 1 });
    }
    if (q('[data-close]') || e.target === $('overlay')) return hideLayer();
    if (q('#cartBtn')) return openCart('cart');
    if (q('#burger')) { var n = $('nav'), open = !n.classList.contains('open'); n.classList.toggle('open', open); $('burger').setAttribute('aria-expanded', open); document.body.classList.toggle('locked', open); return; }
    if (q('#navLinks a')) { $('nav').classList.remove('open'); $('burger').setAttribute('aria-expanded', false); document.body.classList.remove('locked'); }
    if ((b = q('[data-wa]'))) { var L = { ru: 'Здравствуйте! Хочу заказать цветы.', tg: 'Салом! Мехоҳам гул фармоиш диҳам.', en: 'Hello! I would like to order flowers.', tr: 'Merhaba! Çiçek sipariş vermek istiyorum.' }; return void sendWa(L[state.lang]); }
    if (M && layer === 'modal') {
      if ((b = q('[data-variant]'))) { M.variant = b.dataset.variant; renderModal(); return; }
      if ((b = q('[data-thumb]'))) { M.img = +b.dataset.thumb; renderModal(); return; }
      if ((b = q('[data-qty]'))) { var pp = prod(M.id), max = pp.stock != null ? Math.max(1, pp.stock) : 99; M.qty = Math.max(1, Math.min(max, M.qty + (+b.dataset.qty))); renderModal(); return; }
      if (q('[data-add]')) { var it = modalItem(); if (it && addToCart(it)) { hideLayer(); } return; }
      if (q('[data-wa-product]')) { var it2 = modalItem(); if (it2) sendWa(productWaText()); return; }
    }
    if (layer === 'drawer') {
      if ((b = q('[data-cq]'))) { var c = state.cart.filter(function (x) { return x.key === b.dataset.cq; })[0]; if (c) { var pr = prod(c.id), mx = pr.stock != null ? Math.max(1, pr.stock) : 99; c.qty = Math.max(1, Math.min(mx, c.qty + (+b.dataset.d))); saveCart(); renderDrawer(); } return; }
      if ((b = q('[data-rm]'))) { state.cart = state.cart.filter(function (x) { return x.key !== b.dataset.rm; }); saveCart(); renderDrawer(); return; }
      if (q('[data-checkout]')) { state.view = 'checkout'; state.form = null; renderDrawer(); return; }
      if ((b = q('[data-mode]'))) { state.mode = b.dataset.mode; var v = ['coName', 'coPhone', 'coAddress'].reduce(function (a, id) { var f = $(id); if (f) a[id] = f.value; return a; }, {}); state.profile = { name: v.coName || '', phone: v.coPhone || '', address: v.coAddress || state.profile.address || '' }; renderDrawer(); return; }
      if (q('[data-wa-order]')) { sendWa(state.done.text); return; }
    }
    if ((b = q('[data-cu]'))) {
      var id = b.dataset.cu, k = b.dataset.k;
      if (id === 'cuStyle') CU.style = CU.style === k ? '' : k;
      else if (id === 'cuWrap') CU.wrap = CU.wrap === k ? '' : k;
      else { var arr = id === 'cuColors' ? CU.colors : CU.flowers, ix = arr.indexOf(k); if (ix >= 0) arr.splice(ix, 1); else arr.push(k); }
      renderCustom();
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.id === 'pmPersonal') M.personal = e.target.value;
    if (e.target.id === 'cuBudget') $('cuBudgetVal').textContent = money(+e.target.value);
    if (e.target.id === 'coDate') { var s = $('coTime'); s.innerHTML = timeSelect(e.target.value, ''); }
  });
  document.addEventListener('submit', function (e) {
    if (e.target.id === 'coForm') { e.preventDefault(); var s = e.submitter && e.submitter.dataset.submit || 'site'; submitCheckout(s, e.target); }
    if (e.target.id === 'customForm') submitCustom(e);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (layer) hideLayer(); else if ($('nav').classList.contains('open')) $('burger').click(); } });
  // gentle 3D tilt on product images (mouse only)
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var m = e.target.closest && e.target.closest('.pc-media');
    document.querySelectorAll('.pc-media.tilt').forEach(function (n) { if (n !== m) { n.classList.remove('tilt'); n.style.transform = ''; } });
    if (!m) return;
    var r = m.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    m.classList.add('tilt'); m.style.transform = 'rotateY(' + (x * 9).toFixed(2) + 'deg) rotateX(' + (-y * 9).toFixed(2) + 'deg) translateZ(0)';
  }, { passive: true });
  document.addEventListener('pointerleave', function () { document.querySelectorAll('.pc-media.tilt').forEach(function (n) { n.style.transform = ''; }); }, true);

  /* ---------- boot ---------- */
  function renderAll() {
    renderAnnounce(); renderHero(); renderChips(); renderGrid(); renderCustom(); renderDelivery(); renderCartBadge();
    if (layer === 'drawer') renderDrawer();
    if (layer === 'modal') renderModal();
  }
  function setLang(l) {
    if (I18N.langs.indexOf(l) < 0) return;
    state.lang = l; LS.set('palma.lang', l);
    applyStatic(); if (state.data) { renderAll(); window.dispatchEvent(new CustomEvent('palma:lang')); }
  }
  function detectLang() {
    var s = LS.get('palma.lang', null); if (s && I18N.langs.indexOf(s) >= 0) return s;
    var n = (navigator.language || 'ru').slice(0, 2).toLowerCase();
    return n === 'tg' || n === 'en' || n === 'tr' ? n : 'ru';
  }

  async function boot() {
    state.lang = detectLang(); applyStatic(); navState(); observeReveal(document);
    var res = await API.get('/api/public');
    if (!res || !res.ok) { $('grid').innerHTML = '<p class="empty">' + esc(t('co.err.generic')) + '</p>'; return; }
    state.data = res; state.camps = res.campaigns || [];
    renderAll();
    if ((await API.mode()) === 'demo') {
      var bn = $('demoBanner'); bn.innerHTML = esc(t('demo.banner')) + ' <a href="admin/" style="color:#fff;text-decoration:underline">Admin →</a>'; bn.hidden = false; document.body.classList.add('has-demo');
    }
    window.dispatchEvent(new CustomEvent('palma:data'));
    var v2 = $('vStore2');
    if (v2 && 'IntersectionObserver' in window) new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { v2.src = v2.dataset.src; v2.play().catch(function () {}); o.disconnect(); } }, { rootMargin: '300px' }).observe(v2);
  }

  window.PalmaApp = {
    get data() { return state.data; }, get lang() { return state.lang; },
    esc: esc, P: P, t: t, money: money, img: img, minPrice: minPrice, priceOf: priceOf, openProduct: openProduct, addToCart: addToCart, openCart: openCart, toast: toast,
    products: function () { return state.data ? state.data.products : []; }
  };
  boot();
})();
