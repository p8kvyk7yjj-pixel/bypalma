/* PALMA admin panel (Turkish). Everything the owner needs, without touching code. */
(function () {
  'use strict';
  var Core = window.PalmaCore, API = window.PalmaAPI;
  var $ = function (id) { return document.getElementById(id); };
  var LANGS = ['ru', 'tg', 'en', 'tr'], LN = { ru: 'RU', tg: 'ТҶ', en: 'EN', tr: 'TR' };
  var STATUS = { new: 'Yeni', preparing: 'Hazırlanıyor', ready: 'Hazır', delivered: 'Teslim edildi', cancelled: 'İptal edildi' };
  var TABS = [['dash', 'Panel'], ['orders', 'Siparişler'], ['products', 'Ürünler'], ['cats', 'Kategoriler'], ['home', 'Ana sayfa'], ['promo', 'Kampanyalar'], ['contact', 'İletişim ve teslimat'], ['settings', 'Ayarlar']];
  var ERR = {
    auth: 'Oturum süresi doldu, tekrar giriş yapın.', badpass: 'Şifre yanlış.', weak: 'Şifre en az 6 karakter olmalı.', name: 'İsim gerekli.',
    categoryused: 'Bu kategoride ürün var. Önce ürünleri başka kategoriye taşıyın veya silin.', quota: 'Tarayıcı depolama alanı doldu (demo). Daha küçük fotoğraf kullanın.',
    toolarge: 'Fotoğraf çok büyük.', image: 'Geçersiz fotoğraf dosyası.', network: 'Sunucuya ulaşılamadı. İnternet bağlantısını kontrol edin.', rate: 'Çok fazla deneme. Birkaç dakika bekleyin.',
    telegram: 'Telegram mesajı gönderilemedi. Token ve chat id değerlerini kontrol edin.', format: 'Dosya geçerli bir PALMA yedeği değil.', already: 'Şifre zaten oluşturulmuş.', notfound: 'Kayıt bulunamadı.'
  };

  var S = null, tab = (location.hash || '#dash').slice(1), mode = 'server';
  var OF = { status: 'all', q: '' }, PF = { q: '', cat: 'all' };
  var E = null; // item being edited in the sheet
  var pendingDelete = null;

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ' + (S ? S.settings.currency : ''); }
  function P(o) { return Core.pick(o, 'tr') || Core.pick(o, 'ru'); }
  function img(u) { return API.img(u); }
  function toast(msg, err) {
    var t = $('toast'); t.textContent = msg; t.classList.toggle('err', !!err); t.classList.add('on');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('on'); }, err ? 4500 : 2600);
  }
  function fmtDate(iso) { try { return new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; } }
  async function call(p) {
    var r = await p;
    if (!r.ok) {
      if (r.error === 'auth') { gate('login'); }
      toast(ERR[r.error] || 'Bir hata oluştu (' + r.error + ').', true);
    }
    return r;
  }
  function beep() {
    try {
      var a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain();
      o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(.15, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + .6);
      o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + .6);
    } catch (e) {}
  }
  function fileToDataUrl(file, max, q) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () {
        var im = new Image();
        im.onload = function () {
          var k = Math.min(1, max / Math.max(im.width, im.height)), w = Math.round(im.width * k), h = Math.round(im.height * k);
          var c = document.createElement('canvas'); c.width = w; c.height = h;
          var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(im, 0, 0, w, h);
          res(c.toDataURL('image/jpeg', q));
        };
        im.onerror = rej; im.src = fr.result;
      };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }
  async function uploadImage(file) {
    var small = mode === 'demo';
    var dataUrl;
    try { dataUrl = await fileToDataUrl(file, small ? 800 : 1500, small ? .78 : .86); } catch (e) { toast(ERR.image, true); return null; }
    var r = await call(API.post('/api/admin/upload', { dataUrl: dataUrl }));
    return r.ok ? r.url : null;
  }

  /* ---------- multilingual input ---------- */
  function ml(name, val, o) {
    o = o || {}; val = val || {};
    var tabs = LANGS.map(function (l, i) { return '<button type="button" role="tab" data-mltab="' + l + '" aria-selected="' + (i === 0) + '" class="' + (val[l] ? 'has' : '') + '">' + LN[l] + '</button>'; }).join('');
    var ins = LANGS.map(function (l, i) {
      var h = i ? ' hidden' : '';
      return o.area ? '<textarea class="in" data-ml-input="' + l + '" rows="4"' + h + '>' + esc(val[l] || '') + '</textarea>'
        : '<input class="in" data-ml-input="' + l + '" value="' + esc(val[l] || '') + '"' + h + (o.max ? ' maxlength="' + o.max + '"' : '') + '>';
    }).join('');
    return '<div class="ml" data-ml="' + name + '"><div class="ml-tabs" role="tablist">' + tabs + '</div>' + ins + '</div>';
  }
  function getMl(root, name) {
    var o = {};
    root.querySelectorAll('[data-ml="' + name + '"] [data-ml-input]').forEach(function (i) { o[i.dataset.mlInput] = i.value.trim(); });
    return o;
  }
  function sw(id, label, on) { return '<label class="switch"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><i></i><span>' + esc(label) + '</span></label>'; }
  function val(id) { var e = $(id); return e ? e.value : ''; }
  function checked(id) { var e = $(id); return !!(e && e.checked); }

  /* ---------- sheet ---------- */
  function openSheet(html) {
    $('sheet').innerHTML = html; $('sheet').hidden = false; $('sheetBg').hidden = false; document.body.style.overflow = 'hidden';
    $('sheet').scrollTop = 0;
  }
  function closeSheet() { $('sheet').hidden = true; $('sheetBg').hidden = true; document.body.style.overflow = ''; E = null; pendingDelete = null; }

  /* ---------- gate (login / first-time setup) ---------- */
  function gate(kind) {
    $('app').hidden = true; var g = $('gate'); g.hidden = false; closeSheet();
    API.token.set('');
    var setup = kind === 'setup';
    g.innerHTML = '<form class="gate-card" id="gateForm"><div class="logo"><svg viewBox="0 0 64 80" width="22" height="28" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M32 78V40"/><path d="M32 40C30 28 31 14 32 4C33 14 34 28 32 40Z"/><path d="M32 42C24 32 16 24 6 20C14 30 22 38 32 44"/><path d="M32 42C40 32 48 24 58 20C50 30 42 38 32 44"/></svg>PALMA</div>' +
      '<h2>' + (setup ? 'Yönetici şifresi oluştur' : 'Yönetim paneli') + '</h2>' +
      '<p>' + (setup ? 'İlk kurulum. Bu şifre ile siteyi yöneteceksiniz. En az 6 karakter, kimseyle paylaşmayın.' : 'Devam etmek için şifrenizi girin.') + '</p>' +
      '<div class="field"><label for="gPass">' + (setup ? 'Yeni şifre' : 'Şifre') + '</label><input class="in" id="gPass" type="password" autocomplete="' + (setup ? 'new-password' : 'current-password') + '" required></div>' +
      (setup ? '<div class="field"><label for="gPass2">Şifre (tekrar)</label><input class="in" id="gPass2" type="password" autocomplete="new-password" required></div>' : '') +
      '<button class="btn gold" style="width:100%" type="submit">' + (setup ? 'Şifreyi kaydet ve gir' : 'Giriş yap') + '</button>' +
      '<p class="sm" style="margin:16px 0 0"><a href="../">← Siteye dön</a></p></form>';
    $('gPass').focus();
    $('gateForm').onsubmit = async function (e) {
      e.preventDefault();
      var pw = val('gPass');
      if (setup && pw !== val('gPass2')) return toast('Şifreler aynı değil.', true);
      var r = await call(API.post(setup ? '/api/admin/setup' : '/api/admin/login', { password: pw }));
      if (r.ok) { API.token.set(r.token); start(); }
    };
  }

  /* ---------- data ---------- */
  var lastNewest = null;
  async function load(silent) {
    var r = silent ? await API.get('/api/admin/state') : await call(API.get('/api/admin/state'));
    if (!r.ok) { if (silent && r.error === 'auth') gate('login'); return false; }
    S = r; return true;
  }
  async function start() {
    mode = await API.mode();
    var st = await API.get('/api/admin/status');
    if (!st.ok) return toast(ERR[st.error] || 'Sunucuya ulaşılamadı.', true);
    if (st.needsSetup) return gate('setup');
    if (!st.authed) return gate('login');
    if (!(await load())) return;
    $('gate').hidden = true; $('app').hidden = false; $('demoNote').hidden = mode !== 'demo';
    lastNewest = S.orders[0] ? S.orders[0].id : null;
    render();
  }
  async function refresh() { if (await load()) render(); }

  /* ---------- shell ---------- */
  function renderTabs() {
    var n = S.stats.byStatus.new || 0;
    $('tabs').innerHTML = TABS.map(function (t) {
      return '<button class="tab" type="button" data-tab="' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + t[1] + (t[0] === 'orders' && n ? '<span class="n">' + n + '</span>' : '') + '</button>';
    }).join('');
    document.title = (n ? '(' + n + ') ' : '') + 'PALMA Yönetim Paneli';
  }
  function render() {
    if (!VIEWS[tab]) tab = 'dash';
    renderTabs();
    $('view').innerHTML = VIEWS[tab]();
    window.scrollTo(0, 0);
  }

  /* ---------- views ---------- */
  var VIEWS = {};

  VIEWS.dash = function () {
    var s = S.stats, c = S.settings.contact;
    var steps = [
      [!!c.whatsapp, 'WhatsApp numarasını girin', 'Müşteriler “WhatsApp’tan sipariş ver” düğmesine basınca bu numaraya mesaj gider.', 'contact'],
      [!!c.phone, 'Telefon numarasını girin', 'Sitede “Ara” düğmesi ve iletişim bölümünde görünür.', 'contact'],
      [!!(c.address && (c.address.ru || '').trim() && (c.address.ru || '').trim() !== 'Душанбе' || (c.address.tr || '').length > 12), 'Tam adresi yazın', 'Teslimat ve harita bölümünde gösterilir.', 'contact'],
      [!!(S.settings.orders.telegramToken && S.settings.orders.telegramChatId), 'Telegram bildirimini açın (isteğe bağlı)', 'Yeni sipariş gelince telefonunuza anında mesaj düşer.', 'settings'],
      [S.products.some(function (p) { return p.visible !== false; }), 'Ürünlerinizi ve fiyatlarınızı gözden geçirin', 'Örnek ürünler ve fiyatlar yer tutucudur. Kendi fotoğraf ve fiyatlarınızla değiştirin.', 'products']
    ];
    var low = s.lowStock.length ? '<div class="card"><h2>Stok azalıyor</h2><div class="list">' + s.lowStock.map(function (x) { return '<div class="item" style="grid-template-columns:1fr auto"><h3>' + esc(x.name) + '</h3><span class="pill warn">' + (x.stock === 0 ? 'Tükendi' : 'Kalan: ' + x.stock) + '</span></div>'; }).join('') + '</div></div>' : '';
    return '<div class="page-head"><div><h1>Panel</h1><p>Bugünün özeti</p></div><a class="btn line" href="../" target="_blank" rel="noopener">Siteyi gör</a></div>' +
      '<div class="grid g4"><div class="tile hot"><b>' + (s.byStatus.new || 0) + '</b><span>Yeni sipariş</span></div><div class="tile"><b>' + s.today + '</b><span>Bugünkü sipariş</span></div><div class="tile"><b>' + money(s.revenueToday) + '</b><span>Bugünkü ciro</span></div><div class="tile"><b>' + money(s.revenueMonth) + '</b><span>Bu ay ciro</span></div></div>' +
      '<div class="grid g2"><div class="card"><h2>Kurulum kontrol listesi</h2><ul class="check">' + steps.map(function (x) {
        return '<li class="' + (x[0] ? 'ok' : 'todo') + '"><span class="dot">' + (x[0] ? '✓' : '') + '</span><div><b>' + x[1] + '</b><p class="hint">' + x[2] + '</p>' + (x[0] ? '' : '<button class="btn line sm" style="margin-top:6px" type="button" data-tab="' + x[3] + '">Aç</button>') + '</div></li>';
      }).join('') + '</ul></div>' +
      '<div class="card pad0"><div style="padding:20px 20px 6px"><h2>Son siparişler</h2></div>' + (S.orders.length ? S.orders.slice(0, 6).map(orderRow).join('') : '<p class="empty">Henüz sipariş yok. İlk sipariş geldiğinde burada görünür.</p>') + '</div></div>' + low;
  };

  /* orders */
  function orderRow(o) {
    var sum = o.type === 'custom' ? 'Özel sipariş' : o.items.map(function (i) { return i.name + (i.qty > 1 ? ' ×' + i.qty : ''); }).join(', ');
    return '<button class="order-row" type="button" data-order="' + esc(o.id) + '"><span><b>' + esc(o.no) + '</b> · ' + esc(o.customer.name) + '</span><span class="pill ' + o.status + '">' + STATUS[o.status] + '</span>' +
      '<span class="sub">' + esc(fmtDate(o.createdAt)) + ' · ' + esc(sum.slice(0, 90)) + (o.total ? ' · <b>' + money(o.total) + '</b>' : '') + (o.delivery.date ? ' · ' + esc(o.delivery.date + ' ' + (o.delivery.time || '')) : '') + '</span></button>';
  }
  VIEWS.orders = function () {
    var counts = S.stats.byStatus, q = OF.q.toLowerCase();
    var list = S.orders.filter(function (o) {
      if (OF.status !== 'all' && o.status !== OF.status) return false;
      if (!q) return true;
      return (o.no + ' ' + o.customer.name + ' ' + o.customer.phone + ' ' + o.items.map(function (i) { return i.name; }).join(' ')).toLowerCase().indexOf(q) >= 0;
    });
    var chips = [['all', 'Tümü', S.orders.length]].concat(Object.keys(STATUS).map(function (k) { return [k, STATUS[k], counts[k] || 0]; }));
    return '<div class="page-head"><div><h1>Siparişler</h1><p>Siteden ve WhatsApp düğmesinden gelen tüm siparişler.</p></div></div>' +
      '<div class="chips">' + chips.map(function (c) { return '<button class="chip" type="button" data-ofilter="' + c[0] + '" aria-pressed="' + (OF.status === c[0]) + '">' + c[1] + '<span class="n">' + c[2] + '</span></button>'; }).join('') + '</div>' +
      '<input class="in" id="oSearch" type="search" placeholder="Ara: sipariş no, isim, telefon, ürün" value="' + esc(OF.q) + '">' +
      '<div class="card pad0" id="oList">' + (list.length ? list.map(orderRow).join('') : '<p class="empty">Bu filtrede sipariş yok.</p>') + '</div>';
  };
  var WAMSG = {
    ru: { new: 'Здравствуйте! Мы получили ваш заказ {no}. Подтверждаем детали.', preparing: 'Ваш заказ {no} принят и готовится.', ready: 'Ваш заказ {no} готов!', delivered: 'Спасибо за заказ {no}! Будем рады видеть вас снова.', cancelled: 'Заказ {no} отменён. Если это ошибка, напишите нам.' },
    tg: { new: 'Салом! Фармоиши шумо {no} қабул шуд. Тафсилотро тасдиқ мекунем.', preparing: 'Фармоиши шумо {no} қабул шуд ва омода карда мешавад.', ready: 'Фармоиши шумо {no} омода аст!', delivered: 'Ташаккур барои фармоиши {no}! Боз мунтазир мешавем.', cancelled: 'Фармоиши {no} бекор шуд. Агар хато бошад, ба мо нависед.' },
    en: { new: 'Hello! We received your order {no}. Confirming the details.', preparing: 'Your order {no} is accepted and being prepared.', ready: 'Your order {no} is ready!', delivered: 'Thank you for order {no}! See you again soon.', cancelled: 'Order {no} was cancelled. If this is a mistake, please message us.' },
    tr: { new: 'Merhaba! {no} numaralı siparişinizi aldık. Detayları onaylıyoruz.', preparing: '{no} numaralı siparişiniz alındı ve hazırlanıyor.', ready: '{no} numaralı siparişiniz hazır!', delivered: '{no} numaralı siparişiniz için teşekkürler! Tekrar bekleriz.', cancelled: '{no} numaralı sipariş iptal edildi. Bir yanlışlık varsa yazın.' }
  };
  function waDigits(p) { var d = String(p).replace(/\D/g, ''); return d.length === 9 ? '992' + d : d; }
  function orderSheet(id) {
    var o = S.orders.filter(function (x) { return x.id === id; })[0]; if (!o) return;
    E = { type: 'order', id: id };
    var lines = o.items.map(function (i) { return '<tr><td>' + esc(i.name) + (i.variant ? ' <span class="mute">(' + esc(i.variant) + ')</span>' : '') + (i.personal ? ' <b>«' + esc(i.personal) + '»</b>' : '') + ' × ' + i.qty + '</td><td>' + money(i.price * i.qty) + '</td></tr>'; }).join('');
    var cu = o.custom ? '<div class="card" style="margin:14px 0"><h3 style="margin-bottom:8px">Özel sipariş isteği</h3><dl class="kv">' +
      [['Stil', o.custom.style], ['Renkler', o.custom.colors.join(', ')], ['Çiçekler', o.custom.flowers.join(', ')], ['Ambalaj', o.custom.wrap], ['Bütçe', o.custom.budget ? money(o.custom.budget) : ''], ['İstekler', o.custom.text]].filter(function (r) { return r[1]; }).map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl></div>' : '';
    var msg = (WAMSG[o.lang] || WAMSG.ru)[o.status].replace('{no}', o.no);
    var wa = 'https://wa.me/' + waDigits(o.customer.phone) + '?text=' + encodeURIComponent(msg);
    var del = o.delivery;
    openSheet('<div class="sheet-head"><div><h2>' + esc(o.no) + ' <span class="pill ' + o.status + '">' + STATUS[o.status] + '</span></h2><p class="mute sm" style="margin:2px 0 0">' + esc(fmtDate(o.createdAt)) + ' · ' + (o.source === 'whatsapp' ? 'WhatsApp düğmesi' : 'Site') + ' · dil: ' + o.lang.toUpperCase() + '</p></div><button class="btn line sm" data-act="close" type="button">Kapat</button></div>' +
      '<div class="status-row no-print" style="margin-bottom:16px">' + Object.keys(STATUS).map(function (k) { return '<button type="button" class="btn sm ' + (k === o.status ? 'gold on' : 'line') + '" data-setstatus="' + k + '">' + STATUS[k] + '</button>'; }).join('') + '</div>' +
      '<div class="card" style="margin-bottom:14px"><dl class="kv"><dt>Müşteri</dt><dd><b>' + esc(o.customer.name) + '</b></dd><dt>Telefon</dt><dd><a href="tel:' + esc(o.customer.phone.replace(/[^\d+]/g, '')) + '">' + esc(o.customer.phone) + '</a></dd>' +
      '<dt>Teslimat</dt><dd>' + (del.mode === 'delivery' ? 'Adrese teslim: ' + esc(del.address) : 'Mağazadan alım') + '</dd>' +
      (del.date || del.time ? '<dt>Zaman</dt><dd><b>' + esc(del.date) + ' ' + esc(del.time || 'en kısa sürede') + '</b></dd>' : '') +
      (o.cardMessage ? '<dt>Kart mesajı</dt><dd>' + esc(o.cardMessage) + '</dd>' : '') + (o.note ? '<dt>Not</dt><dd>' + esc(o.note) + '</dd>' : '') + '</dl></div>' + cu +
      (o.items.length ? '<table class="lines"><tbody>' + lines + (del.fee ? '<tr><td>Teslimat</td><td>' + money(del.fee) + '</td></tr>' : '') + '<tr><td><b>Toplam</b></td><td><b>' + money(o.total) + '</b></td></tr></tbody></table>' : '') +
      '<div class="field no-print" style="margin-top:16px"><label for="oNote">Sizin notunuz (müşteri görmez)</label><textarea class="in" id="oNote" rows="2">' + esc(o.adminNote || '') + '</textarea></div>' +
      '<div class="sheet-foot no-print"><button class="btn danger" type="button" data-act="del-order">Siparişi sil</button><button class="btn line" type="button" onclick="window.print()">Yazdır</button><a class="btn wa" href="' + esc(wa) + '" target="_blank" rel="noopener">Müşteriye WhatsApp</a><button class="btn gold" type="button" data-act="save-note">Notu kaydet</button></div>');
  }

  /* products */
  function stockPill(p) {
    if (p.available === false) return '<span class="pill off">Satışta değil</span>';
    if (p.stock == null) return '<span class="pill soft">Stok: sınırsız</span>';
    if (p.stock <= 0) return '<span class="pill warn">Tükendi</span>';
    return '<span class="pill ' + (p.stock <= 3 ? 'warn' : 'soft') + '">Stok: ' + p.stock + '</span>';
  }
  function catName(id) { var c = S.categories.filter(function (x) { return x.id === id; })[0]; return c ? P(c.name) : '—'; }
  VIEWS.products = function () {
    var q = PF.q.toLowerCase();
    var list = S.products.filter(function (p) {
      if (PF.cat !== 'all' && p.categoryId !== PF.cat) return false;
      return !q || (Object.keys(p.name).map(function (k) { return p.name[k]; }).join(' ')).toLowerCase().indexOf(q) >= 0;
    });
    var chips = '<button class="chip" type="button" data-pcat="all" aria-pressed="' + (PF.cat === 'all') + '">Tümü<span class="n">' + S.products.length + '</span></button>' + S.categories.map(function (c) {
      return '<button class="chip" type="button" data-pcat="' + esc(c.id) + '" aria-pressed="' + (PF.cat === c.id) + '">' + esc(P(c.name)) + '</button>';
    }).join('');
    return '<div class="page-head"><div><h1>Ürünler</h1><p>Fotoğraf, fiyat, stok ve açıklamaları buradan değiştirin. Değişiklikler siteye hemen yansır.</p></div><button class="btn gold" type="button" data-act="new-product">+ Yeni ürün</button></div>' +
      '<div class="chips">' + chips + '</div><input class="in" id="pSearch" type="search" placeholder="Ürün ara" value="' + esc(PF.q) + '">' +
      '<div class="card pad0 list">' + (list.length ? list.map(function (p, i) {
        var pr = Core.minPrice(p, []);
        return '<div class="item"><img class="thumb" alt="" src="' + esc(img(p.image)) + '"><div><h3>' + esc(P(p.name)) + '</h3><div class="meta"><span>' + esc(catName(p.categoryId)) + '</span><b style="color:var(--text)">' + (p.variants.length > 1 ? 'itibaren ' : '') + money(pr.price) + '</b>' + stockPill(p) + (p.visible === false ? '<span class="pill off">Gizli</span>' : '') + (p.featured ? '<span class="pill soft">Öne çıkan</span>' : '') + '</div></div>' +
          '<div class="acts"><label class="switch" title="Sitede göster"><input type="checkbox" data-quick="visible" data-id="' + esc(p.id) + '"' + (p.visible !== false ? ' checked' : '') + '><i></i><span>Görünür</span></label>' +
          '<label class="switch" title="Satışa açık"><input type="checkbox" data-quick="available" data-id="' + esc(p.id) + '"' + (p.available !== false ? ' checked' : '') + '><i></i><span>Satışta</span></label>' +
          '<button class="btn line sm" type="button" data-move="-1" data-id="' + esc(p.id) + '" aria-label="Yukarı">↑</button><button class="btn line sm" type="button" data-move="1" data-id="' + esc(p.id) + '" aria-label="Aşağı">↓</button>' +
          '<button class="btn sm" type="button" data-edit-product="' + esc(p.id) + '">Düzenle</button></div></div>';
      }).join('') : '<p class="empty">Ürün bulunamadı.</p>') + '</div>';
  };
  function blankProduct() {
    return { id: '', name: {}, desc: {}, badge: {}, categoryId: S.categories[0] ? S.categories[0].id : '', price: 0, oldPrice: null, variants: [], image: '', gallery: [], stock: null, available: true, visible: true, featured: false, personalize: { enabled: false, label: {} } };
  }
  function varRow(v) { return '<div class="r"><input class="in" data-vl placeholder="Örn: M · 15 çiçek" value="' + esc(v.label || '') + '"><input class="in" data-vp type="number" min="0" placeholder="Fiyat" value="' + (v.price || '') + '"><button class="x" type="button" data-act="rm-var" aria-label="Sil">✕</button></div>'; }
  function galHTML() { return E.data.gallery.map(function (u, i) { return '<div class="g"><img alt="" src="' + esc(img(u)) + '"><button type="button" data-rmgal="' + i + '" aria-label="Kaldır">✕</button></div>'; }).join(''); }
  function productSheet(id) {
    var p = id ? JSON.parse(JSON.stringify(S.products.filter(function (x) { return x.id === id; })[0])) : blankProduct();
    E = { type: 'product', id: id || '', data: p };
    var cats = S.categories.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === p.categoryId ? ' selected' : '') + '>' + esc(P(c.name)) + '</option>'; }).join('');
    openSheet('<div class="sheet-head"><h2>' + (id ? 'Ürünü düzenle' : 'Yeni ürün') + '</h2><button class="btn line sm" data-act="close" type="button">Kapat</button></div>' +
      '<div class="field"><span class="lbl">Ana fotoğraf</span><div class="imgbox"><img class="pv" id="pImgPv" alt="" src="' + esc(img(p.image)) + '"' + (p.image ? '' : ' hidden') + '><span class="btn line file">Fotoğraf seç<input type="file" accept="image/*" id="pImg"></span></div><p class="hint">Dikey (4:5) fotoğraflar en iyi görünür. Telefondan çekilen fotoğraf otomatik küçültülür.</p></div>' +
      '<div class="field"><span class="lbl">Ürün adı</span>' + ml('name', p.name, { max: 140 }) + '<p class="hint">Dil sekmelerinden diğer dilleri de doldurun. Boş diller Rusça (yoksa İngilizce/Türkçe) metne düşer.</p></div>' +
      '<div class="field"><span class="lbl">Açıklama</span>' + ml('desc', p.desc, { area: true }) + '</div>' +
      '<div class="row c2"><div class="field"><label for="pCat">Kategori</label><select class="in" id="pCat">' + cats + '</select></div><div class="field"><span class="lbl">Rozet (isteğe bağlı)</span>' + ml('badge', p.badge, { max: 30 }) + '</div></div>' +
      '<div class="row c3"><div class="field"><label for="pPrice">Fiyat (' + esc(S.settings.currency) + ')</label><input class="in" id="pPrice" type="number" min="0" value="' + (p.price || '') + '"></div>' +
      '<div class="field"><label for="pOld">Eski fiyat (üstü çizili)</label><input class="in" id="pOld" type="number" min="0" value="' + (p.oldPrice || '') + '"></div>' +
      '<div class="field"><label for="pStock">Stok adedi</label><input class="in" id="pStock" type="number" min="0" placeholder="Sınırsız" value="' + (p.stock == null ? '' : p.stock) + '"><p class="hint">Boş bırakırsanız stok takip edilmez.</p></div></div>' +
      '<div class="field"><span class="lbl">Boyut / seçenekler</span><div class="rep" id="vars">' + p.variants.map(varRow).join('') + '</div><button class="btn line sm" type="button" data-act="add-var" style="justify-self:start">+ Seçenek ekle</button><p class="hint">Seçenek eklerseniz fiyat seçeneklerden alınır (örn. S 220, M 340, L 520).</p></div>' +
      '<div class="field"><span class="lbl">Ek fotoğraflar</span><div class="gal" id="gal">' + galHTML() + '</div><span class="btn line file" style="justify-self:start">+ Fotoğraf ekle<input type="file" accept="image/*" id="pGal" multiple></span></div>' +
      '<div class="field">' + sw('pPers', 'Müşteriden yazı/harf iste (örn. harfli sepet)', p.personalize.enabled) + '<div style="margin-top:8px">' + ml('persLabel', p.personalize.label, { max: 60 }) + '</div><p class="hint">Açıksa müşteri sipariş verirken harf/isim girmek zorundadır. Etiket örn. “Harf veya inisiyal”.</p></div>' +
      '<div class="row c3"><div class="field">' + sw('pVis', 'Sitede göster', p.visible !== false) + '</div><div class="field">' + sw('pAvail', 'Satışa açık', p.available !== false) + '</div><div class="field">' + sw('pFeat', 'Öne çıkan (ana sahne)', !!p.featured) + '</div></div>' +
      '<div class="sheet-foot">' + (id ? '<button class="btn danger" type="button" data-act="del-product">Ürünü sil</button>' : '') + '<button class="btn line" type="button" data-act="close">Vazgeç</button><button class="btn gold" type="button" data-act="save-product">Kaydet</button></div>');
  }
  async function saveProduct() {
    var s = $('sheet'), d = E.data;
    var payload = {
      name: getMl(s, 'name'), desc: getMl(s, 'desc'), badge: getMl(s, 'badge'), categoryId: val('pCat'),
      price: +val('pPrice') || 0, oldPrice: val('pOld') ? +val('pOld') : null, stock: val('pStock') === '' ? null : +val('pStock'),
      image: d.image, gallery: d.gallery, available: checked('pAvail'), visible: checked('pVis'), featured: checked('pFeat'),
      personalize: { enabled: checked('pPers'), label: getMl(s, 'persLabel') },
      variants: Array.prototype.map.call(s.querySelectorAll('#vars .r'), function (r) { return { id: r.dataset.id || '', label: r.querySelector('[data-vl]').value, price: +r.querySelector('[data-vp]').value || 0 }; }).filter(function (v) { return v.label.trim(); })
    };
    if (!Object.keys(payload.name).some(function (k) { return payload.name[k]; })) return toast('Ürün adı gerekli.', true);
    if (!payload.variants.length && !(payload.price > 0)) return toast('Fiyat girin veya seçenek ekleyin.', true);
    if (!payload.image) return toast('Ana fotoğraf ekleyin.', true);
    // keep existing variant ids
    var old = E.id ? S.products.filter(function (p) { return p.id === E.id; })[0] : null;
    payload.variants.forEach(function (v, i) { v.id = (old && old.variants[i] && old.variants[i].id) || ''; });
    var r = await call(E.id ? API.put('/api/admin/products/' + E.id, payload) : API.post('/api/admin/products', payload));
    if (r.ok) { closeSheet(); toast('Ürün kaydedildi'); await refresh(); }
  }

  /* categories */
  VIEWS.cats = function () {
    return '<div class="page-head"><div><h1>Kategoriler</h1><p>Sitede filtre düğmeleri olarak görünür. Ürünü olmayan kategori sitede gizlenir.</p></div><button class="btn gold" type="button" data-act="new-cat">+ Yeni kategori</button></div>' +
      '<div class="card pad0 list">' + S.categories.map(function (c) {
        var n = S.products.filter(function (p) { return p.categoryId === c.id; }).length;
        return '<div class="item"><img class="thumb" alt="" src="' + esc(img(c.image)) + '"' + (c.image ? '' : ' hidden') + '><div' + (c.image ? '' : ' style="grid-column:1/3"') + '><h3>' + esc(P(c.name)) + '</h3><div class="meta"><span>' + n + ' ürün</span></div></div><div class="acts"><button class="btn sm" type="button" data-edit-cat="' + esc(c.id) + '">Düzenle</button></div></div>';
      }).join('') + '</div>';
  };
  function catSheet(id) {
    var c = id ? JSON.parse(JSON.stringify(S.categories.filter(function (x) { return x.id === id; })[0])) : { name: {}, image: '' };
    E = { type: 'cat', id: id || '', data: c };
    openSheet('<div class="sheet-head"><h2>' + (id ? 'Kategoriyi düzenle' : 'Yeni kategori') + '</h2><button class="btn line sm" data-act="close" type="button">Kapat</button></div>' +
      '<div class="field"><span class="lbl">Kategori adı</span>' + ml('name', c.name, { max: 60 }) + '</div>' +
      '<div class="field"><span class="lbl">Kapak fotoğrafı (isteğe bağlı)</span><div class="imgbox"><img class="pv sq" id="cImgPv" alt="" src="' + esc(img(c.image)) + '"' + (c.image ? '' : ' hidden') + '><span class="btn line file">Fotoğraf seç<input type="file" accept="image/*" id="cImg"></span></div></div>' +
      '<div class="sheet-foot">' + (id ? '<button class="btn danger" type="button" data-act="del-cat">Sil</button>' : '') + '<button class="btn line" type="button" data-act="close">Vazgeç</button><button class="btn gold" type="button" data-act="save-cat">Kaydet</button></div>');
  }

  /* home page */
  VIEWS.home = function () {
    var s = S.settings, h = s.hero, feat = s.featuredIds || [];
    return '<div class="page-head"><div><h1>Ana sayfa</h1><p>Açılış sahnesindeki başlıklar, duyuru ve öne çıkan ürünler.</p></div><button class="btn gold" type="button" data-act="save-home">Kaydet</button></div>' +
      '<div class="card"><h2>Açılış sahnesi</h2>' +
      '<div class="field"><span class="lbl">Kapak fotoğrafı</span><div class="imgbox"><img class="pv" id="hImgPv" alt="" src="' + esc(img(s.heroImage)) + '"' + (s.heroImage ? '' : ' hidden') + '><span class="btn line file">Fotoğraf seç<input type="file" accept="image/*" id="hImg"></span><button class="btn line sm" type="button" data-act="clear-hero"' + (s.heroImage ? '' : ' hidden') + ' id="hImgClear">Kaldır</button></div><p class="hint">Mağaza girişi videosu yüklenirken ve video oynatılamayan cihazlarda gösterilir. Boşsa mağaza videosunun kendi karesi kullanılır.</p></div>' +
      '<div class="field"><span class="lbl">Üst yazı</span>' + ml('eyebrow', h.eyebrow, { max: 80 }) + '</div>' +
      '<div class="field"><span class="lbl">Ana başlık (son kelime italik ve altın görünür)</span>' + ml('title', h.title, { max: 100 }) + '</div>' +
      '<div class="field"><span class="lbl">Alt başlık</span>' + ml('subtitle', h.subtitle, { area: true }) + '</div></div>' +
      '<div class="card"><h2>Duyuru şeridi</h2><div class="field">' + sw('aOn', 'Sayfanın en üstünde duyuru göster', s.announcement.enabled) + '</div><div class="field">' + ml('aText', s.announcement.text, { max: 160 }) + '<p class="hint">Aktif bir kampanya varsa şerit otomatik olarak kampanya metnini gösterir.</p></div></div>' +
      '<div class="card"><h2>Öne çıkan ürünler</h2><p class="hint" style="margin-bottom:10px">3D giriş sahnesinde yanınızdan geçen fotoğraflar. İlk 6 ürün kullanılır, işaretlemediyseniz tüm ürünlerden seçilir.</p><div class="checks">' + S.products.filter(function (p) { return p.visible !== false; }).map(function (p) {
        return '<label><input type="checkbox" data-feat="' + esc(p.id) + '"' + (feat.indexOf(p.id) >= 0 ? ' checked' : '') + '> ' + esc(P(p.name)) + '</label>';
      }).join('') + '</div></div>';
  };
  async function saveSettings(partial, msg) {
    var r = await call(API.put('/api/admin/settings', partial));
    if (r.ok) { S.settings = r.settings; toast(msg || 'Kaydedildi'); renderTabs(); }
    return r.ok;
  }

  /* campaigns */
  function campState(c) {
    if (!c.active) return '<span class="pill off">Pasif</span>';
    if (c.endsAt && new Date(c.endsAt + 'T23:59:59') < new Date()) return '<span class="pill warn">Süresi doldu</span>';
    return '<span class="pill ready">Yayında</span>';
  }
  VIEWS.promo = function () {
    var list = S.settings.campaigns;
    return '<div class="page-head"><div><h1>Kampanyalar</h1><p>İndirim yüzdesi ürün fiyatlarına otomatik uygulanır; sitede üstü çizili eski fiyat ve rozet görünür.</p></div><button class="btn gold" type="button" data-act="new-promo">+ Yeni kampanya</button></div>' +
      '<div class="card pad0 list">' + (list.length ? list.map(function (c) {
        var scope = c.scope === 'all' ? 'Tüm ürünler' : c.scope === 'category' ? 'Kategori: ' + catName(c.categoryId) : (c.productIds || []).length + ' seçili ürün';
        return '<div class="item" style="grid-template-columns:1fr auto"><div><h3>' + esc(P(c.title) || 'Kampanya') + ' · −%' + c.percent + '</h3><div class="meta">' + campState(c) + '<span>' + esc(scope) + '</span>' + (c.endsAt ? '<span>Bitiş: ' + esc(c.endsAt) + '</span>' : '') + '</div></div><div class="acts"><label class="switch"><input type="checkbox" data-promo-toggle="' + esc(c.id) + '"' + (c.active ? ' checked' : '') + '><i></i><span>Aktif</span></label><button class="btn sm" type="button" data-edit-promo="' + esc(c.id) + '">Düzenle</button></div></div>';
      }).join('') : '<p class="empty">Henüz kampanya yok.</p>') + '</div>';
  };
  function promoSheet(id) {
    var c = id ? JSON.parse(JSON.stringify(S.settings.campaigns.filter(function (x) { return x.id === id; })[0])) : { id: '', active: true, percent: 10, scope: 'all', categoryId: S.categories[0] ? S.categories[0].id : '', productIds: [], endsAt: '', title: {}, text: {}, badge: {} };
    E = { type: 'promo', id: id || '', data: c };
    openSheet('<div class="sheet-head"><h2>' + (id ? 'Kampanyayı düzenle' : 'Yeni kampanya') + '</h2><button class="btn line sm" data-act="close" type="button">Kapat</button></div>' +
      '<div class="row c3"><div class="field"><label for="kPct">İndirim (%)</label><input class="in" id="kPct" type="number" min="1" max="90" value="' + c.percent + '"></div><div class="field"><label for="kEnd">Bitiş tarihi (boş: süresiz)</label><input class="in" id="kEnd" type="date" value="' + esc(c.endsAt) + '"></div><div class="field"><span class="lbl">Durum</span>' + sw('kOn', 'Aktif', c.active) + '</div></div>' +
      '<div class="field"><label for="kScope">Hangi ürünlere?</label><select class="in" id="kScope"><option value="all"' + (c.scope === 'all' ? ' selected' : '') + '>Tüm ürünler</option><option value="category"' + (c.scope === 'category' ? ' selected' : '') + '>Bir kategori</option><option value="products"' + (c.scope === 'products' ? ' selected' : '') + '>Seçtiğim ürünler</option></select></div>' +
      '<div class="field" id="kCatBox"' + (c.scope === 'category' ? '' : ' hidden') + '><label for="kCat">Kategori</label><select class="in" id="kCat">' + S.categories.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === c.categoryId ? ' selected' : '') + '>' + esc(P(x.name)) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field" id="kProdBox"' + (c.scope === 'products' ? '' : ' hidden') + '><span class="lbl">Ürünler</span><div class="checks">' + S.products.map(function (p) { return '<label><input type="checkbox" data-kprod="' + esc(p.id) + '"' + ((c.productIds || []).indexOf(p.id) >= 0 ? ' checked' : '') + '> ' + esc(P(p.name)) + '</label>'; }).join('') + '</div></div>' +
      '<div class="field"><span class="lbl">Başlık</span>' + ml('title', c.title, { max: 80 }) + '</div><div class="field"><span class="lbl">Kısa metin</span>' + ml('text', c.text, { max: 200 }) + '</div><div class="field"><span class="lbl">Rozet (örn. −10%)</span>' + ml('badge', c.badge, { max: 20 }) + '</div>' +
      '<div class="sheet-foot">' + (id ? '<button class="btn danger" type="button" data-act="del-promo">Sil</button>' : '') + '<button class="btn line" type="button" data-act="close">Vazgeç</button><button class="btn gold" type="button" data-act="save-promo">Kaydet</button></div>');
  }

  /* contact & delivery */
  VIEWS.contact = function () {
    var c = S.settings.contact, d = S.settings.delivery;
    return '<div class="page-head"><div><h1>İletişim ve teslimat</h1><p>Sitenin her yerinde ve WhatsApp mesajlarında kullanılır.</p></div><button class="btn gold" type="button" data-act="save-contact">Kaydet</button></div>' +
      '<div class="card"><h2>İletişim bilgileri</h2><div class="row c2"><div class="field"><label for="cWa">WhatsApp numarası</label><input class="in" id="cWa" inputmode="tel" placeholder="992XXXXXXXXX" value="' + esc(c.whatsapp) + '"><p class="hint">Ülke koduyla, artı ve boşluk olmadan. Örn. Tacikistan: 992901234567. Sipariş düğmeleri bu numaraya yazar.</p></div>' +
      '<div class="field"><label for="cPhone">Telefon (arama)</label><input class="in" id="cPhone" inputmode="tel" placeholder="+992 90 123 45 67" value="' + esc(c.phone) + '"></div></div>' +
      '<div class="row c3"><div class="field"><label for="cIg">Instagram kullanıcı adı</label><input class="in" id="cIg" value="' + esc(c.instagram) + '"></div><div class="field"><label for="cTg">Telegram kullanıcı adı</label><input class="in" id="cTg" value="' + esc(c.telegram) + '"></div><div class="field"><label for="cMail">E-posta</label><input class="in" id="cMail" type="email" value="' + esc(c.email) + '"></div></div>' +
      '<div class="field"><span class="lbl">Adres</span>' + ml('address', c.address, { max: 200 }) + '</div><div class="field"><span class="lbl">Çalışma saatleri</span>' + ml('hours', c.hours, { max: 200 }) + '</div>' +
      '<div class="field"><label for="cMap">Harita bağlantısı (Google Maps / 2GIS, isteğe bağlı)</label><input class="in" id="cMap" type="url" placeholder="https://" value="' + esc(c.mapUrl) + '"><p class="hint">Boşsa harita düğmesi adres metniyle arama yapar.</p></div></div>' +
      '<div class="card"><h2>Teslimat</h2><div class="row c2"><div class="field">' + sw('dOn', 'Adrese teslimat var', d.enabled) + '</div><div class="field">' + sw('dPick', 'Mağazadan alım var', d.pickup) + '</div></div>' +
      '<div class="row c3"><div class="field"><label for="dFee">Teslimat ücreti (' + esc(S.settings.currency) + ')</label><input class="in" id="dFee" type="number" min="0" value="' + d.fee + '"></div><div class="field"><label for="dFree">Ücretsiz teslimat sınırı</label><input class="in" id="dFree" type="number" min="0" value="' + d.freeFrom + '"><p class="hint">0 yazarsanız hep ücretli.</p></div><div class="field"><label for="dMin">Minimum sipariş tutarı</label><input class="in" id="dMin" type="number" min="0" value="' + d.minOrder + '"></div></div>' +
      '<div class="row c3"><div class="field"><label for="dLead">Hazırlık süresi (dakika)</label><input class="in" id="dLead" type="number" min="0" value="' + d.leadMinutes + '"><p class="hint">Aynı gün teslimat saatlerinden bu kadar sonrası seçilebilir.</p></div><div class="field"><label for="dFrom">Teslimat başlangıç saati</label><input class="in" id="dFrom" type="time" value="' + d.from + '"></div><div class="field"><label for="dTo">Teslimat bitiş saati</label><input class="in" id="dTo" type="time" value="' + d.to + '"></div></div>' +
      '<div class="field"><span class="lbl">Teslimat bölgeleri / açıklama</span>' + ml('zones', d.zones, { area: true }) + '</div></div>';
  };

  /* settings */
  VIEWS.settings = function () {
    var o = S.settings.orders;
    return '<div class="page-head"><div><h1>Ayarlar</h1><p>Şifre, bildirimler, yedek.</p></div></div>' +
      '<div class="grid g2"><div class="card"><h2>Genel</h2><div class="row c2"><div class="field"><label for="gCur">Para birimi simgesi</label><input class="in" id="gCur" maxlength="10" value="' + esc(S.settings.currency) + '"></div><div class="field"><label for="gPre">Sipariş numarası öneki</label><input class="in" id="gPre" maxlength="6" value="' + esc(o.prefix) + '"></div></div><button class="btn gold" type="button" data-act="save-general">Kaydet</button></div>' +
      '<div class="card"><h2>Şifreyi değiştir</h2><div class="field"><label for="pwOld">Mevcut şifre</label><input class="in" id="pwOld" type="password" autocomplete="current-password"></div><div class="field"><label for="pwNew">Yeni şifre</label><input class="in" id="pwNew" type="password" autocomplete="new-password"></div><button class="btn" type="button" data-act="save-pass">Şifreyi güncelle</button></div></div>' +
      '<div class="card"><h2>Telegram bildirimi</h2><p class="mute">Yeni sipariş gelince Telegram’dan anında mesaj alırsınız. Bir kez kurulur:</p><ol class="steps"><li>Telegram’da <b>@BotFather</b>’a yazıp <span class="code">/newbot</span> ile bot oluşturun, verdiği <b>token</b>’ı kopyalayın.</li><li>Oluşturduğunuz bota bir mesaj gönderin (örn. “merhaba”).</li><li><b>@userinfobot</b>’a yazıp <b>Id</b> numaranızı öğrenin.</li><li>Aşağıya ikisini yapıştırıp “Test mesajı gönder”e basın.</li></ol>' +
      '<div class="row c2"><div class="field"><label for="tgTok">Bot token</label><input class="in" id="tgTok" autocomplete="off" value="' + esc(o.telegramToken) + '"></div><div class="field"><label for="tgChat">Chat id</label><input class="in" id="tgChat" autocomplete="off" value="' + esc(o.telegramChatId) + '"></div></div>' +
      '<div class="chips"><button class="btn gold" type="button" data-act="save-tg">Kaydet</button><button class="btn line" type="button" data-act="test-tg">Test mesajı gönder</button></div>' + (mode === 'demo' ? '<p class="hint" style="margin-top:10px">Demo modunda Telegram çalışmaz; sunucuya kurulumda çalışır.</p>' : '') + '</div>' +
      '<div class="card"><h2>Yedek</h2><p class="mute">Ürünler, kategoriler, siparişler ve ayarlar tek dosyada. Düzenli yedek alın.</p><div class="chips"><button class="btn line" type="button" data-act="export">Yedeği indir</button><span class="btn line file">Yedeği geri yükle<input type="file" accept="application/json,.json" id="importFile"></span></div></div>' +
      '<div class="card"><h2>Oturum</h2><div class="chips"><button class="btn line" type="button" data-act="logout">Çıkış yap</button>' + (mode === 'demo' ? '<button class="btn danger" type="button" data-act="reset-demo">Demo verilerini sıfırla</button>' : '') + '</div></div>';
  };

  /* ---------- events ---------- */
  document.addEventListener('click', async function (e) {
    var b, t = e.target;
    var q = function (s) { return t.closest ? t.closest(s) : null; };
    if ((b = q('[data-tab]'))) { tab = b.dataset.tab; location.hash = tab; render(); return; }
    if ((b = q('[data-mltab]'))) {
      var box = b.closest('.ml'), l = b.dataset.mltab;
      box.querySelectorAll('[data-mltab]').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
      box.querySelectorAll('[data-ml-input]').forEach(function (x) { x.hidden = x.dataset.mlInput !== l; });
      return;
    }
    if (t.id === 'sheetBg') return closeSheet();
    if ((b = q('[data-order]'))) return orderSheet(b.dataset.order);
    if ((b = q('[data-ofilter]'))) { OF.status = b.dataset.ofilter; render(); return; }
    if ((b = q('[data-pcat]'))) { PF.cat = b.dataset.pcat; render(); return; }
    if ((b = q('[data-edit-product]'))) return productSheet(b.dataset.editProduct);
    if ((b = q('[data-edit-cat]'))) return catSheet(b.dataset.editCat);
    if ((b = q('[data-edit-promo]'))) return promoSheet(b.dataset.editPromo);
    if ((b = q('[data-setstatus]'))) {
      var r = await call(API.put('/api/admin/orders/' + E.id, { status: b.dataset.setstatus }));
      if (r.ok) { await load(true); toast('Durum: ' + STATUS[b.dataset.setstatus]); orderSheet(E.id); renderTabs(); if (tab !== 'orders' && tab !== 'dash') return; var y = scrollY; $('view').innerHTML = VIEWS[tab](); scrollTo(0, y); }
      return;
    }
    if ((b = q('[data-move]'))) {
      var ids = S.products.map(function (p) { return p.id; }), i = ids.indexOf(b.dataset.id), j = i + (+b.dataset.move);
      if (j < 0 || j >= ids.length) return;
      ids.splice(j, 0, ids.splice(i, 1)[0]);
      var r2 = await call(API.post('/api/admin/products-order', { ids: ids })); if (r2.ok) await refresh(); return;
    }
    if ((b = q('[data-rmgal]'))) { E.data.gallery.splice(+b.dataset.rmgal, 1); $('gal').innerHTML = galHTML(); return; }
    if ((b = q('[data-act]'))) return act(b.dataset.act, b);
  });

  document.addEventListener('change', async function (e) {
    var t = e.target;
    if (t.dataset.quick) {
      var body = {}; body[t.dataset.quick] = t.checked;
      var r = await call(API.put('/api/admin/products/' + t.dataset.id, body));
      if (r.ok) { await load(true); toast(t.checked ? 'Açıldı' : 'Kapatıldı'); render(); } else t.checked = !t.checked;
      return;
    }
    if (t.dataset.promoToggle) {
      var camps = S.settings.campaigns.map(function (c) { return c.id === t.dataset.promoToggle ? Object.assign({}, c, { active: t.checked }) : c; });
      if (await saveSettings({ campaigns: camps }, t.checked ? 'Kampanya yayında' : 'Kampanya durduruldu')) render();
      return;
    }
    if (t.id === 'kScope') { $('kCatBox').hidden = t.value !== 'category'; $('kProdBox').hidden = t.value !== 'products'; return; }
    if (t.id === 'pImg' || t.id === 'cImg' || t.id === 'hImg') {
      var f = t.files[0]; if (!f) return;
      toast('Fotoğraf yükleniyor…');
      var url = await uploadImage(f); t.value = '';
      if (!url) return;
      if (t.id === 'pImg') { E.data.image = url; var pv = $('pImgPv'); pv.src = img(url); pv.hidden = false; }
      if (t.id === 'cImg') { E.data.image = url; var cv = $('cImgPv'); cv.src = img(url); cv.hidden = false; }
      if (t.id === 'hImg') { if (await saveSettings({ heroImage: url }, 'Kapak fotoğrafı güncellendi')) render(); }
      else toast('Fotoğraf hazır');
      return;
    }
    if (t.id === 'pGal') {
      var files = Array.prototype.slice.call(t.files, 0, 6 - E.data.gallery.length); t.value = '';
      for (var k = 0; k < files.length; k++) { toast('Fotoğraf yükleniyor… ' + (k + 1) + '/' + files.length); var u = await uploadImage(files[k]); if (u) E.data.gallery.push(u); }
      $('gal').innerHTML = galHTML(); toast('Fotoğraflar hazır'); return;
    }
    if (t.id === 'importFile') {
      var file = t.files[0]; if (!file) return; t.value = '';
      var data; try { data = JSON.parse(await file.text()); } catch (er) { return toast(ERR.format, true); }
      if (!window.confirm || true) {
        openSheet('<div class="sheet-head"><h2>Yedeği geri yükle</h2></div><p>Mevcut tüm ürün, sipariş ve ayarlar bu yedekle <b>değiştirilecek</b>. Şifreniz korunur.</p><div class="sheet-foot"><button class="btn line" type="button" data-act="close">Vazgeç</button><button class="btn gold" type="button" data-act="do-import">Evet, geri yükle</button></div>');
        E = { type: 'import', data: data };
      }
    }
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'oSearch') { OF.q = t.value; var q = OF.q.toLowerCase(); var list = S.orders.filter(function (o) { if (OF.status !== 'all' && o.status !== OF.status) return false; return !q || (o.no + ' ' + o.customer.name + ' ' + o.customer.phone + ' ' + o.items.map(function (i) { return i.name; }).join(' ')).toLowerCase().indexOf(q) >= 0; }); $('oList').innerHTML = list.length ? list.map(orderRow).join('') : '<p class="empty">Bu filtrede sipariş yok.</p>'; }
    if (t.id === 'pSearch') { PF.q = t.value; var pos = t.selectionStart; render(); var n = $('pSearch'); n.focus(); n.setSelectionRange(pos, pos); }
    if (t.dataset && t.dataset.mlInput) { var tabBtn = t.closest('.ml').querySelector('[data-mltab="' + t.dataset.mlInput + '"]'); if (tabBtn) tabBtn.classList.toggle('has', !!t.value.trim()); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('sheet').hidden) closeSheet(); });
  window.addEventListener('hashchange', function () { var h = location.hash.slice(1); if (S && VIEWS[h] && h !== tab) { tab = h; render(); } });

  async function act(a, b) {
    switch (a) {
      case 'close': return closeSheet();
      case 'new-product': return productSheet('');
      case 'save-product': return saveProduct();
      case 'add-var': $('vars').insertAdjacentHTML('beforeend', varRow({})); return;
      case 'rm-var': b.closest('.r').remove(); return;
      case 'del-product':
        if (pendingDelete !== 'p') { pendingDelete = 'p'; b.textContent = 'Emin misiniz? Tekrar basın'; return; }
        var r = await call(API.del('/api/admin/products/' + E.id)); if (r.ok) { closeSheet(); toast('Ürün silindi'); await refresh(); } return;
      case 'new-cat': return catSheet('');
      case 'save-cat': {
        var nm = getMl($('sheet'), 'name');
        if (!Object.keys(nm).some(function (k) { return nm[k]; })) return toast('Kategori adı gerekli.', true);
        var body = { name: nm, image: E.data.image || '' };
        var r1 = await call(E.id ? API.put('/api/admin/categories/' + E.id, body) : API.post('/api/admin/categories', body));
        if (r1.ok) { closeSheet(); toast('Kategori kaydedildi'); await refresh(); } return;
      }
      case 'del-cat':
        if (pendingDelete !== 'c') { pendingDelete = 'c'; b.textContent = 'Emin misiniz? Tekrar basın'; return; }
        var r3 = await call(API.del('/api/admin/categories/' + E.id)); if (r3.ok) { closeSheet(); toast('Kategori silindi'); await refresh(); } return;
      case 'save-note': {
        var r4 = await call(API.put('/api/admin/orders/' + E.id, { adminNote: val('oNote') })); if (r4.ok) { await load(true); toast('Not kaydedildi'); } return;
      }
      case 'del-order':
        if (pendingDelete !== 'o') { pendingDelete = 'o'; b.textContent = 'Emin misiniz? Tekrar basın'; return; }
        var r5 = await call(API.del('/api/admin/orders/' + E.id)); if (r5.ok) { closeSheet(); toast('Sipariş silindi'); await refresh(); } return;
      case 'save-home': {
        var feat = Array.prototype.map.call(document.querySelectorAll('[data-feat]:checked'), function (x) { return x.dataset.feat; });
        var v = $('view');
        if (await saveSettings({ hero: { eyebrow: getMl(v, 'eyebrow'), title: getMl(v, 'title'), subtitle: getMl(v, 'subtitle') }, announcement: { enabled: checked('aOn'), text: getMl(v, 'aText') }, featuredIds: feat }, 'Ana sayfa kaydedildi')) render();
        return;
      }
      case 'clear-hero': if (await saveSettings({ heroImage: '' }, 'Kapak fotoğrafı kaldırıldı')) render(); return;
      case 'new-promo': return promoSheet('');
      case 'save-promo': {
        var s = $('sheet'), c = E.data;
        var camp = { id: c.id, active: checked('kOn'), percent: +val('kPct') || 0, scope: val('kScope'), categoryId: val('kCat'), productIds: Array.prototype.map.call(s.querySelectorAll('[data-kprod]:checked'), function (x) { return x.dataset.kprod; }), endsAt: val('kEnd'), title: getMl(s, 'title'), text: getMl(s, 'text'), badge: getMl(s, 'badge') };
        if (!(camp.percent > 0)) return toast('İndirim yüzdesi girin.', true);
        if (camp.scope === 'products' && !camp.productIds.length) return toast('En az bir ürün seçin.', true);
        var list = S.settings.campaigns.slice();
        if (E.id) list = list.map(function (x) { return x.id === E.id ? camp : x; }); else list.push(camp);
        if (await saveSettings({ campaigns: list }, 'Kampanya kaydedildi')) { closeSheet(); render(); }
        return;
      }
      case 'del-promo':
        if (pendingDelete !== 'k') { pendingDelete = 'k'; b.textContent = 'Emin misiniz? Tekrar basın'; return; }
        if (await saveSettings({ campaigns: S.settings.campaigns.filter(function (x) { return x.id !== E.id; }) }, 'Kampanya silindi')) { closeSheet(); render(); } return;
      case 'save-contact': {
        var v2 = $('view'), d = S.settings.delivery;
        var ok = await saveSettings({
          contact: { whatsapp: val('cWa'), phone: val('cPhone'), instagram: val('cIg'), telegram: val('cTg'), email: val('cMail'), address: getMl(v2, 'address'), hours: getMl(v2, 'hours'), mapUrl: val('cMap') },
          delivery: { enabled: checked('dOn'), pickup: checked('dPick'), fee: val('dFee'), freeFrom: val('dFree'), minOrder: val('dMin'), leadMinutes: val('dLead'), from: val('dFrom') || d.from, to: val('dTo') || d.to, zones: getMl(v2, 'zones') }
        }, 'İletişim ve teslimat kaydedildi');
        if (ok) render(); return;
      }
      case 'save-general': { var o = S.settings.orders; if (await saveSettings({ currency: val('gCur'), orders: { prefix: val('gPre'), whatsappEnabled: true, telegramToken: o.telegramToken, telegramChatId: o.telegramChatId } }, 'Ayarlar kaydedildi')) render(); return; }
      case 'save-pass': {
        var r6 = await call(API.post('/api/admin/password', { old: val('pwOld'), password: val('pwNew') }));
        if (r6.ok) { API.token.set(r6.token); toast('Şifre güncellendi'); $('pwOld').value = ''; $('pwNew').value = ''; } return;
      }
      case 'save-tg': return void (await saveSettings({ orders: { prefix: S.settings.orders.prefix, whatsappEnabled: true, telegramToken: val('tgTok'), telegramChatId: val('tgChat') } }, 'Telegram ayarları kaydedildi'));
      case 'test-tg': {
        if (!(await saveSettings({ orders: { prefix: S.settings.orders.prefix, whatsappEnabled: true, telegramToken: val('tgTok'), telegramChatId: val('tgChat') } }, 'Kaydedildi'))) return;
        var r7 = await call(API.post('/api/admin/telegram-test', {})); if (r7.ok) toast('Test mesajı gönderildi, Telegram’ı kontrol edin.'); return;
      }
      case 'export': {
        var r8 = await call(API.get('/api/admin/export')); if (!r8.ok) return;
        var blob = new Blob([JSON.stringify(r8.data, null, 1)], { type: 'application/json' });
        var a2 = document.createElement('a'); a2.href = URL.createObjectURL(blob); a2.download = 'palma-yedek-' + Core.todayStr() + '.json'; document.body.appendChild(a2); a2.click(); a2.remove();
        toast('Yedek indirildi'); return;
      }
      case 'do-import': { var r9 = await call(API.post('/api/admin/import', { data: E.data })); if (r9.ok) { closeSheet(); toast('Yedek geri yüklendi'); await refresh(); } return; }
      case 'logout': await API.post('/api/admin/logout', {}); gate('login'); return;
      case 'reset-demo': API.resetDemo(); API.token.set(''); location.reload(); return;
    }
  }

  /* new-order polling: toast + sound + badge */
  setInterval(async function () {
    if (!S || $('app').hidden || document.hidden) return;
    var before = S.orders.length, newest = S.orders[0] ? S.orders[0].id : null;
    if (!(await load(true))) return;
    var after = S.orders[0] ? S.orders[0].id : null;
    if (after && after !== newest && S.orders.length > before) {
      beep(); toast('Yeni sipariş: ' + S.orders[0].no + ' · ' + S.orders[0].customer.name);
      renderTabs();
      if (($('sheet').hidden) && (tab === 'orders' || tab === 'dash')) { var y = scrollY; $('view').innerHTML = VIEWS[tab](); scrollTo(0, y); }
    } else renderTabs();
  }, 25000);

  $('logout').addEventListener('click', function () { act('logout'); });
  start();
})();
