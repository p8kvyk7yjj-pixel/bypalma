/*
 * PALMA core: all business logic (catalog, pricing, campaigns, orders, admin API).
 * Runs unchanged in Node (server.js) and in the browser (demo mode, no server).
 * The only things that differ between the two are injected through `env`:
 *   env.load() / env.save(db)   storage
 *   env.hash(password, salt)    password hashing
 *   env.random(bytes)           random hex string
 *   env.saveImage(dataUrl)      returns a URL for an uploaded image
 *   env.notify(order, db)       optional, e.g. Telegram message
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PalmaCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LANGS = ['ru', 'tg', 'en', 'tr'];
  var STATUSES = ['new', 'preparing', 'ready', 'delivered', 'cancelled'];

  /* ---------- helpers ---------- */
  function pick(o, lang) {
    if (o == null) return '';
    if (typeof o === 'string') return o;
    return o[lang] || o.ru || o.en || o.tr || o.tg || '';
  }
  function uid(p) { return p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3); }
  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
  function str(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 500); }
  function num(v, d) { var n = Number(v); return isFinite(n) ? n : (d == null ? 0 : d); }
  function cleanMl(o, max) {
    var out = {};
    LANGS.forEach(function (l) { out[l] = str(o && typeof o === 'object' ? o[l] : (l === 'ru' ? o : ''), max || 2000); });
    return out;
  }
  function cleanImage(u) {
    u = str(u, 2200000);
    if (!u) return '';
    if (/^(\/uploads\/|img\/|\/img\/|https?:\/\/|data:image\/(jpeg|png|webp);base64,)/i.test(u)) return u;
    return '';
  }
  function todayStr(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function ml(ru, tg, en, tr) { return { ru: ru, tg: tg, en: en, tr: tr }; }

  /* ---------- pricing & campaigns ---------- */
  function activeCampaigns(settings, now) {
    now = now || Date.now();
    return (settings.campaigns || []).filter(function (c) {
      if (!c.active || !(num(c.percent) > 0)) return false;
      if (c.endsAt && new Date(c.endsAt + 'T23:59:59').getTime() < now) return false;
      return true;
    });
  }
  function campaignFor(p, camps) {
    var best = null;
    camps.forEach(function (c) {
      var ok = c.scope === 'all' ||
        (c.scope === 'category' && c.categoryId === p.categoryId) ||
        (c.scope === 'products' && (c.productIds || []).indexOf(p.id) >= 0);
      if (ok && (!best || c.percent > best.percent)) best = c;
    });
    return best;
  }
  function priceOf(p, variantId, camps) {
    var v = null;
    if (p.variants && p.variants.length) {
      v = p.variants.filter(function (x) { return x.id === variantId; })[0] || p.variants[0];
    }
    var base = v ? v.price : p.price;
    var c = campaignFor(p, camps || []);
    var price = c ? Math.round(base * (100 - c.percent) / 100) : base;
    var old = c ? base : (!v && p.oldPrice && p.oldPrice > base ? p.oldPrice : null);
    return { price: price, old: old, percent: c ? c.percent : (old ? Math.round((1 - base / old) * 100) : 0), campaignId: c ? c.id : null, variant: v };
  }
  function minPrice(p, camps) {
    if (p.variants && p.variants.length) {
      var best = null;
      p.variants.forEach(function (v) {
        var r = priceOf(p, v.id, camps);
        if (!best || r.price < best.price) best = r;
      });
      return best;
    }
    return priceOf(p, null, camps);
  }
  function soldOut(p) { return p.available === false || (p.stock != null && p.stock <= 0); }

  /* ---------- seed ---------- */
  function seed() {
    var now = Date.now();
    var cats = [
      { id: 'c-bouquets', name: ml('Букеты', 'Гулдастаҳо', 'Bouquets', 'Buketler'), sort: 1, image: 'img/daisies-sm.webp' },
      { id: 'c-compositions', name: ml('Корзины и композиции', 'Сабадҳо ва композитсияҳо', 'Baskets & arrangements', 'Sepetler ve kompozisyonlar'), sort: 2, image: 'img/basket-sm.webp' },
      { id: 'c-signature', name: ml('Авторские букеты', 'Гулдастаҳои муаллифӣ', 'Signature bouquets', 'Özel tasarımlar'), sort: 3, image: 'img/umbrella-sm.webp' },
      { id: 'c-plants', name: ml('Комнатные растения', 'Гиёҳҳои хонагӣ', 'House plants', 'Saksı bitkileri'), sort: 4, image: 'img/plant-sm.webp' }
    ];
    var products = [
      {
        id: 'p-umbrella', categoryId: 'c-signature', sort: 1, featured: true, visible: true, available: true, stock: 6,
        name: ml('Букет-зонтик «Белое облако»', 'Гулдастаи чатр «Абри сафед»', 'Umbrella bouquet "White Cloud"', 'Şemsiye buket "Beyaz Bulut"'),
        desc: ml('Ромашки, кремовые розы и гипсофила в прозрачной упаковке-зонтике с белой ручкой. Держится на ручке, стоит сам, не требует вазы.',
          'Бобунаҳо, садбаргҳои қаймоқӣ ва гипсофила дар печи шаффофи чатр бо дастаи сафед. Худаш меистад, ваза лозим нест.',
          'Daisies, cream roses and baby\'s breath in a transparent umbrella wrap with a white handle. Stands on its own, no vase needed.',
          'Papatya, krem güller ve cipso, şeffaf şemsiye ambalajda ve beyaz saplı. Kendi başına durur, vazo gerekmez.'),
        price: 480, oldPrice: null, variants: [], image: 'img/umbrella.webp', gallery: ['img/mix-roses.webp'], badge: ml('Хит', 'Хит', 'Bestseller', 'Çok satan'),
        personalize: { enabled: false, label: ml('', '', '', '') }
      },
      {
        id: 'p-daisies', categoryId: 'c-bouquets', sort: 2, featured: true, visible: true, available: true, stock: null,
        name: ml('Ромашки «Летний луг»', 'Бобунаҳо «Марғзори тобистон»', 'Daisies "Summer Meadow"', 'Papatyalar "Yaz Çayırı"'),
        desc: ml('Плотный букет белых кустовых хризантем с зелёной сердцевиной. Свежо, просто и всегда уместно.',
          'Гулдастаи зичи хризантемаҳои сафед бо маркази сабз. Тоза, оддӣ ва ҳамеша мувофиқ.',
          'A full bouquet of white spray chrysanthemums with green centres. Fresh, simple and always right.',
          'Yeşil merkezli beyaz kasımpatılardan oluşan dolgun bir buket. Taze, sade ve her zaman yerinde.'),
        price: 220, oldPrice: null, variants: [
          { id: 'v1', label: 'S · 9', price: 220 }, { id: 'v2', label: 'M · 15', price: 340 }, { id: 'v3', label: 'L · 25', price: 520 }
        ], image: 'img/daisies.webp', gallery: [], badge: ml('', '', '', ''),
        personalize: { enabled: false, label: ml('', '', '', '') }
      },
      {
        id: 'p-initial', categoryId: 'c-compositions', sort: 3, featured: true, visible: true, available: true, stock: null,
        name: ml('Корзина «Инициал»', 'Сабади «Ҳарфи ном»', 'Initial basket', 'Harfli sepet "İnisiyal"'),
        desc: ml('Фуксиевые кустовые розы с вашей буквой из белых роз. Любая буква кириллицы или латиницы.',
          'Садбаргҳои фуксияранг бо ҳарфи шумо аз садбаргҳои сафед. Ҳар ҳарфи кириллӣ ё лотинӣ.',
          'Fuchsia spray roses with your letter spelled out in white roses. Any Cyrillic or Latin letter.',
          'Fuşya sprey güller ve beyaz güllerle yazılmış sizin harfiniz. Kiril veya Latin, istediğiniz harf.'),
        price: 950, oldPrice: null, variants: [
          { id: 'v1', label: 'M', price: 950 }, { id: 'v2', label: 'L', price: 1400 }, { id: 'v3', label: 'XL', price: 2100 }
        ], image: 'img/basket.webp', gallery: ['img/basket-crop.webp'], badge: ml('Своя буква', 'Ҳарфи худатон', 'Your letter', 'Kendi harfin'),
        personalize: { enabled: true, label: ml('Буква или инициал', 'Ҳарф ё ҳарфи ном', 'Letter or initial', 'Harf veya inisiyal') }
      },
      {
        id: 'p-mix', categoryId: 'c-bouquets', sort: 4, featured: false, visible: true, available: true, stock: 10,
        name: ml('Нежный микс', 'Миксии нозук', 'Soft Mix', 'Narin Karışım'),
        desc: ml('Ромашки, кустовые розы персикового оттенка и гипсофила. Лёгкий, воздушный букет.',
          'Бобунаҳо, садбаргҳои шафтолуранг ва гипсофила. Гулдастаи сабук ва ҳавоӣ.',
          'Daisies, peach spray roses and baby\'s breath. A light, airy bouquet.',
          'Papatya, şeftali tonlarında sprey güller ve cipso. Hafif ve havadar bir buket.'),
        price: 350, oldPrice: 420, variants: [], image: 'img/mix-roses.webp', gallery: [], badge: ml('', '', '', ''),
        personalize: { enabled: false, label: ml('', '', '', '') }
      },
      {
        id: 'p-fuchsia', categoryId: 'c-compositions', sort: 5, featured: false, visible: true, available: true, stock: 4,
        name: ml('Корзина «Фуксия»', 'Сабади «Фуксия»', 'Fuchsia basket', 'Sepet "Fuşya"'),
        desc: ml('Насыщенные кустовые розы в белой плетёной корзине с ручкой. Подарок, который запоминают.',
          'Садбаргҳои ранги пурра дар сабади сафеди бофташуда. Тӯҳфае, ки ба ёд мемонад.',
          'Rich spray roses in a white woven basket with a handle. A gift that gets remembered.',
          'Beyaz örgü sepette canlı sprey güller. Akılda kalan bir hediye.'),
        price: 780, oldPrice: null, variants: [], image: 'img/basket-crop.webp', gallery: [], badge: ml('', '', '', ''),
        personalize: { enabled: false, label: ml('', '', '', '') }
      },
      {
        id: 'p-palm', categoryId: 'c-plants', sort: 6, featured: false, visible: true, available: true, stock: null,
        name: ml('Пальма Кентия', 'Нахли Кентия', 'Kentia palm', 'Kentia palmiye'),
        desc: ml('Живая пальма в белом кашпо. Высота и цена зависят от размера, уточняйте у флориста.',
          'Нахли зинда дар гулдони сафед. Баландӣ ва нарх вобаста ба андоза аст.',
          'Live palm in a white pot. Height and price depend on size, ask the florist.',
          'Beyaz saksıda canlı palmiye. Boy ve fiyat boyuta göre değişir, çiçekçiye sorun.'),
        price: 600, oldPrice: null, variants: [
          { id: 'v1', label: '60–80 cm', price: 600 }, { id: 'v2', label: '100–120 cm', price: 1100 }, { id: 'v3', label: '150+ cm', price: 1900 }
        ], image: 'img/plant.webp', gallery: [], badge: ml('', '', '', ''),
        personalize: { enabled: false, label: ml('', '', '', '') }
      }
    ].map(function (p) { p.createdAt = now; return p; });

    return {
      version: 1,
      counter: 0,
      admin: null, // { salt, hash } once the owner sets a password
      sessions: {},
      categories: cats,
      products: products,
      orders: [],
      settings: {
        brand: { name: 'PALMA' },
        currency: 'сом.',
        hero: {
          eyebrow: ml('Цветочный бутик · Душанбе', 'Бутики гул · Душанбе', 'Flower boutique · Dushanbe', 'Çiçek butiği · Duşanbe'),
          title: ml('Цветы, которые входят первыми', 'Гулҳое, ки аввал медароянд', 'Flowers that walk in first', 'Önce çiçekler girer'),
          subtitle: ml('Авторские букеты, корзины и живые растения. Собираем вручную, доставляем по Душанбе в день заказа.',
            'Гулдастаҳои муаллифӣ, сабадҳо ва гиёҳҳои зинда. Бо даст ҷамъ мекунем ва дар рӯзи фармоиш мерасонем.',
            'Signature bouquets, baskets and living plants. Arranged by hand, delivered across Dushanbe the same day.',
            'Özel buketler, sepetler ve canlı bitkiler. Elde hazırlanır, aynı gün Duşanbe\'ye teslim edilir.')
        },
        announcement: {
          enabled: true,
          text: ml('Доставка по Душанбе в день заказа', 'Расонидан дар Душанбе дар рӯзи фармоиш', 'Same-day delivery across Dushanbe', 'Duşanbe içinde aynı gün teslimat')
        },
        campaigns: [
          {
            id: 'cmp-welcome', active: false, percent: 10, scope: 'category', categoryId: 'c-bouquets', productIds: [], endsAt: '',
            badge: ml('−10%', '−10%', '−10%', '−%10'),
            title: ml('Неделя букетов', 'Ҳафтаи гулдастаҳо', 'Bouquet week', 'Buket haftası'),
            text: ml('Скидка 10% на все букеты', 'Тахфиф 10% ба ҳамаи гулдастаҳо', '10% off all bouquets', 'Tüm buketlerde %10 indirim')
          }
        ],
        featuredIds: ['p-umbrella', 'p-daisies', 'p-initial'],
        contact: {
          phone: '', whatsapp: '', instagram: 'by.palma.tj', telegram: '', email: '',
          address: ml('Душанбе', 'Душанбе', 'Dushanbe', 'Duşanbe'),
          hours: ml('Ежедневно 08:00 – 22:00', 'Ҳар рӯз 08:00 – 22:00', 'Daily 08:00 – 22:00', 'Her gün 08:00 – 22:00'),
          mapUrl: ''
        },
        delivery: {
          enabled: true, pickup: true, fee: 30, freeFrom: 500, minOrder: 0, leadMinutes: 90, from: '08:00', to: '21:00',
          zones: ml('По всему Душанбе. Стоимость зависит от района, точную сумму подтвердит флорист.',
            'Дар тамоми Душанбе. Нарх вобаста ба ноҳия аст, маблағи дақиқро флорист тасдиқ мекунад.',
            'All of Dushanbe. The price depends on the district; the florist confirms the exact amount.',
            'Tüm Duşanbe. Ücret bölgeye göre değişir, kesin tutarı çiçekçi onaylar.')
        },
        orders: { prefix: 'PL', whatsappEnabled: true, telegramToken: '', telegramChatId: '' },
        heroImage: ''
      }
    };
  }

  /* ---------- projections ---------- */
  function publicSettings(s) {
    var o = JSON.parse(JSON.stringify(s));
    delete o.orders.telegramToken;
    delete o.orders.telegramChatId;
    return o;
  }
  function publicProducts(db) {
    return db.products.filter(function (p) { return p.visible !== false; })
      .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); })
      .map(function (p) { var c = JSON.parse(JSON.stringify(p)); c.soldOut = soldOut(p); if (c.stock != null) c.stock = Math.min(c.stock, 99); return c; });
  }
  function stats(db) {
    var today = todayStr(), month = today.slice(0, 7);
    var s = { total: db.orders.length, byStatus: {}, today: 0, revenueToday: 0, revenueMonth: 0, lowStock: [] };
    STATUSES.forEach(function (k) { s.byStatus[k] = 0; });
    db.orders.forEach(function (o) {
      s.byStatus[o.status] = (s.byStatus[o.status] || 0) + 1;
      var d = (o.createdAt || '').slice(0, 10);
      if (d === today) s.today++;
      if (o.status !== 'cancelled') {
        if (d === today) s.revenueToday += o.total || 0;
        if (d.slice(0, 7) === month) s.revenueMonth += o.total || 0;
      }
    });
    db.products.forEach(function (p) { if (p.stock != null && p.stock <= 3) s.lowStock.push({ id: p.id, name: pick(p.name, 'ru'), stock: p.stock }); });
    return s;
  }

  /* ---------- sanitizers (admin input) ---------- */
  function cleanVariants(list) {
    return (Array.isArray(list) ? list : []).slice(0, 12).map(function (v) {
      return { id: str(v.id, 20) || uid('v'), label: str(v.label, 40), price: Math.max(0, Math.round(num(v.price))) };
    }).filter(function (v) { return v.label; });
  }
  function cleanProduct(i, old) {
    var p = old ? JSON.parse(JSON.stringify(old)) : { id: uid('p-'), createdAt: Date.now(), sort: 99 };
    if ('name' in i) p.name = cleanMl(i.name, 140);
    if ('desc' in i) p.desc = cleanMl(i.desc, 1500);
    if ('badge' in i) p.badge = cleanMl(i.badge, 30);
    if ('categoryId' in i) p.categoryId = str(i.categoryId, 40);
    if ('price' in i) p.price = Math.max(0, Math.round(num(i.price)));
    if ('oldPrice' in i) p.oldPrice = i.oldPrice ? Math.max(0, Math.round(num(i.oldPrice))) : null;
    if ('variants' in i) p.variants = cleanVariants(i.variants);
    if ('image' in i) p.image = cleanImage(i.image);
    if ('gallery' in i) p.gallery = (Array.isArray(i.gallery) ? i.gallery : []).slice(0, 6).map(cleanImage).filter(Boolean);
    if ('stock' in i) p.stock = (i.stock === null || i.stock === '' || i.stock === undefined) ? null : Math.max(0, Math.round(num(i.stock)));
    if ('available' in i) p.available = !!i.available;
    if ('visible' in i) p.visible = !!i.visible;
    if ('featured' in i) p.featured = !!i.featured;
    if ('sort' in i) p.sort = Math.round(num(i.sort, 99));
    if ('personalize' in i) p.personalize = { enabled: !!(i.personalize && i.personalize.enabled), label: cleanMl(i.personalize && i.personalize.label, 60) };
    if (!p.personalize) p.personalize = { enabled: false, label: cleanMl({}) };
    if (p.available === undefined) p.available = true;
    if (p.visible === undefined) p.visible = true;
    if (p.variants && p.variants.length) p.price = Math.min.apply(null, p.variants.map(function (v) { return v.price; }));
    return p;
  }
  function cleanCampaign(c) {
    var scope = ['all', 'category', 'products'].indexOf(c.scope) >= 0 ? c.scope : 'all';
    return {
      id: str(c.id, 30) || uid('cmp-'), active: !!c.active, percent: clamp(Math.round(num(c.percent)), 0, 90), scope: scope,
      categoryId: str(c.categoryId, 40), productIds: (Array.isArray(c.productIds) ? c.productIds : []).slice(0, 100).map(function (x) { return str(x, 40); }),
      endsAt: /^\d{4}-\d{2}-\d{2}$/.test(c.endsAt || '') ? c.endsAt : '',
      title: cleanMl(c.title, 80), text: cleanMl(c.text, 200), badge: cleanMl(c.badge, 20)
    };
  }
  function mergeSettings(cur, inc) {
    var s = JSON.parse(JSON.stringify(cur));
    if (inc.brand) s.brand.name = str(inc.brand.name, 40) || s.brand.name;
    if ('currency' in inc) s.currency = str(inc.currency, 10) || s.currency;
    if (inc.hero) {
      ['eyebrow', 'title', 'subtitle'].forEach(function (k) { if (inc.hero[k]) s.hero[k] = cleanMl(inc.hero[k], 300); });
    }
    if (inc.announcement) {
      s.announcement.enabled = !!inc.announcement.enabled;
      if (inc.announcement.text) s.announcement.text = cleanMl(inc.announcement.text, 160);
    }
    if (Array.isArray(inc.campaigns)) s.campaigns = inc.campaigns.slice(0, 20).map(cleanCampaign);
    if (Array.isArray(inc.featuredIds)) s.featuredIds = inc.featuredIds.slice(0, 12).map(function (x) { return str(x, 40); });
    if ('heroImage' in inc) s.heroImage = cleanImage(inc.heroImage);
    if (Array.isArray(inc.heroCards)) s.heroCards = inc.heroCards.slice(0, 8).map(cleanImage).filter(Boolean);
    if (inc.contact) {
      var c = inc.contact, d = s.contact;
      d.phone = str(c.phone, 30); d.whatsapp = String(c.whatsapp || '').replace(/[^\d]/g, '').slice(0, 15);
      d.instagram = str(c.instagram, 60).replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
      d.telegram = str(c.telegram, 60).replace(/^@/, ''); d.email = str(c.email, 80);
      d.address = cleanMl(c.address, 200); d.hours = cleanMl(c.hours, 200);
      d.mapUrl = /^https?:\/\//.test(c.mapUrl || '') ? str(c.mapUrl, 500) : '';
    }
    if (inc.delivery) {
      var x = inc.delivery, y = s.delivery;
      y.enabled = !!x.enabled; y.pickup = !!x.pickup;
      y.fee = Math.max(0, Math.round(num(x.fee))); y.freeFrom = Math.max(0, Math.round(num(x.freeFrom)));
      y.minOrder = Math.max(0, Math.round(num(x.minOrder))); y.leadMinutes = clamp(Math.round(num(x.leadMinutes, 90)), 0, 2880);
      y.from = /^\d{2}:\d{2}$/.test(x.from || '') ? x.from : y.from; y.to = /^\d{2}:\d{2}$/.test(x.to || '') ? x.to : y.to;
      if (x.zones) y.zones = cleanMl(x.zones, 400);
    }
    if (inc.orders) {
      s.orders.prefix = str(inc.orders.prefix, 6).replace(/[^A-Za-z0-9]/g, '') || s.orders.prefix;
      s.orders.whatsappEnabled = !!inc.orders.whatsappEnabled;
      if ('telegramToken' in inc.orders) s.orders.telegramToken = str(inc.orders.telegramToken, 120);
      if ('telegramChatId' in inc.orders) s.orders.telegramChatId = str(inc.orders.telegramChatId, 40);
    }
    return s;
  }

  /* ---------- orders ---------- */
  function fail(status, code, extra) { var e = { status: status, body: { ok: false, error: code } }; if (extra) Object.assign(e.body, extra); return e; }
  function ok(body, status) { return { status: status || 200, body: Object.assign({ ok: true }, body || {}) }; }

  function buildOrder(db, b) {
    var s = db.settings;
    var name = str(b.customer && b.customer.name, 80);
    var phone = str(b.customer && b.customer.phone, 30);
    if (name.length < 2) return fail(400, 'name');
    if (phone.replace(/\D/g, '').length < 7) return fail(400, 'phone');
    var type = b.type === 'custom' ? 'custom' : 'catalog';
    var mode = b.delivery && b.delivery.mode === 'pickup' ? 'pickup' : 'delivery';
    if (mode === 'pickup' && !s.delivery.pickup) mode = 'delivery';
    if (mode === 'delivery' && !s.delivery.enabled) mode = 'pickup';
    var address = str(b.delivery && b.delivery.address, 300);
    if (mode === 'delivery' && address.length < 5) return fail(400, 'address');
    var date = str(b.delivery && b.delivery.date, 10), time = str(b.delivery && b.delivery.time, 5);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, 'date');
    if (date && date < todayStr()) return fail(400, 'date');
    if (time && !/^\d{2}:\d{2}$/.test(time)) return fail(400, 'time');
    var camps = activeCampaigns(s);
    var items = [], subtotal = 0, touched = [];
    var list = Array.isArray(b.items) ? b.items.slice(0, 30) : [];
    if (type === 'catalog' && !list.length) return fail(400, 'empty');
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      var p = db.products.filter(function (x) { return x.id === it.id; })[0];
      if (!p || p.visible === false) return fail(400, 'product', { productId: it.id });
      var qty = clamp(Math.round(num(it.qty, 1)), 1, 99);
      if (soldOut(p)) return fail(409, 'soldout', { productId: p.id });
      if (p.stock != null && p.stock < qty) return fail(409, 'stock', { productId: p.id, left: p.stock });
      var pr = priceOf(p, it.variant, camps);
      var personal = p.personalize && p.personalize.enabled ? str(it.personal, 40) : '';
      if (p.personalize && p.personalize.enabled && !personal) return fail(400, 'personal', { productId: p.id });
      items.push({
        productId: p.id, name: pick(p.name, 'ru') || pick(p.name, 'en'), variant: pr.variant ? pr.variant.label : '',
        price: pr.price, qty: qty, personal: personal, image: p.image
      });
      subtotal += pr.price * qty;
      touched.push([p, qty]);
    }
    if (type === 'catalog' && s.delivery.minOrder && subtotal < s.delivery.minOrder) return fail(400, 'minorder', { min: s.delivery.minOrder });
    var fee = 0;
    if (mode === 'delivery' && type === 'catalog') fee = (s.delivery.freeFrom > 0 && subtotal >= s.delivery.freeFrom) ? 0 : s.delivery.fee;
    var custom = null;
    if (type === 'custom') {
      var c = b.custom || {};
      custom = {
        style: str(c.style, 60), colors: (Array.isArray(c.colors) ? c.colors : []).slice(0, 8).map(function (x) { return str(x, 30); }),
        flowers: (Array.isArray(c.flowers) ? c.flowers : []).slice(0, 10).map(function (x) { return str(x, 30); }),
        budget: Math.max(0, Math.round(num(c.budget))), wrap: str(c.wrap, 40), text: str(c.text, 800)
      };
      if (!custom.text && !custom.style && !custom.colors.length) return fail(400, 'custom');
    }
    db.counter = (db.counter || 0) + 1;
    var order = {
      id: uid('o-'), no: s.orders.prefix + '-' + String(db.counter).padStart(4, '0'), createdAt: new Date().toISOString(),
      status: 'new', type: type, lang: LANGS.indexOf(b.lang) >= 0 ? b.lang : 'ru', source: b.source === 'whatsapp' ? 'whatsapp' : 'site',
      customer: { name: name, phone: phone },
      delivery: { mode: mode, address: mode === 'delivery' ? address : '', date: date, time: time, fee: fee },
      items: items, subtotal: subtotal, total: subtotal + fee,
      note: str(b.note, 500), cardMessage: str(b.cardMessage, 400), custom: custom, adminNote: ''
    };
    touched.forEach(function (t) { if (t[0].stock != null) t[0].stock = Math.max(0, t[0].stock - t[1]); });
    db.orders.unshift(order);
    return { order: order };
  }

  /* ---------- API ---------- */
  function createApi(env) {
    var SESSION_MS = 30 * 24 * 3600 * 1000;

    async function loadDb() {
      var db = await env.load();
      if (!db) { db = seed(); await env.save(db); }
      return db;
    }
    function authed(db, token) {
      if (!token) return false;
      var exp = db.sessions && db.sessions[token];
      if (!exp) return false;
      if (exp < Date.now()) { delete db.sessions[token]; return false; }
      return true;
    }
    async function newSession(db) {
      var t = await env.random(24);
      var now = Date.now();
      Object.keys(db.sessions || {}).forEach(function (k) { if (db.sessions[k] < now) delete db.sessions[k]; });
      db.sessions = db.sessions || {};
      db.sessions[t] = now + SESSION_MS;
      return t;
    }
    function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
    function adminState(db) {
      return {
        settings: db.settings, categories: db.categories, products: db.products.slice().sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); }),
        orders: db.orders, stats: stats(db)
      };
    }

    /** req: { method, path, body, token } -> { status, body } */
    async function handle(req) {
      var m = req.method.toUpperCase(), path = req.path.replace(/\/+$/, ''), body = req.body || {};
      var db = await loadDb(), r;

      // ---- public ----
      if (m === 'GET' && path === '/api/public') {
        var s = db.settings;
        var hasCats = {};
        publicProducts(db).forEach(function (p) { hasCats[p.categoryId] = 1; });
        return ok({
          settings: publicSettings(s), campaigns: activeCampaigns(s),
          categories: db.categories.slice().sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); }),
          products: publicProducts(db)
        });
      }
      if (m === 'POST' && path === '/api/orders') {
        r = buildOrder(db, body);
        if (r.status) return r;
        await env.save(db);
        if (env.notify) { try { Promise.resolve(env.notify(r.order, db)).catch(function () {}); } catch (e) {} }
        return ok({ order: { no: r.order.no, total: r.order.total, subtotal: r.order.subtotal, fee: r.order.delivery.fee, items: r.order.items, id: r.order.id } }, 201);
      }

      // ---- admin auth ----
      if (m === 'GET' && path === '/api/admin/status') return ok({ needsSetup: !db.admin, authed: authed(db, req.token) });
      if (m === 'POST' && path === '/api/admin/setup') {
        if (db.admin) return fail(403, 'already');
        var pw = String(body.password || '');
        if (pw.length < 6) return fail(400, 'weak');
        var salt = await env.random(16);
        db.admin = { salt: salt, hash: await env.hash(pw, salt) };
        var t = await newSession(db); await env.save(db);
        return ok({ token: t });
      }
      if (m === 'POST' && path === '/api/admin/login') {
        if (!db.admin) return fail(403, 'setup');
        var h = await env.hash(String(body.password || ''), db.admin.salt);
        if (h !== db.admin.hash) return fail(401, 'badpass');
        var t2 = await newSession(db); await env.save(db);
        return ok({ token: t2 });
      }
      if (path.indexOf('/api/admin') === 0 && !authed(db, req.token)) return fail(401, 'auth');

      // ---- admin (authenticated) ----
      if (m === 'POST' && path === '/api/admin/logout') { delete db.sessions[req.token]; await env.save(db); return ok(); }
      if (m === 'GET' && path === '/api/admin/state') return ok(adminState(db));
      if (m === 'POST' && path === '/api/admin/password') {
        var h1 = await env.hash(String(body.old || ''), db.admin.salt);
        if (h1 !== db.admin.hash) return fail(401, 'badpass');
        if (String(body.password || '').length < 6) return fail(400, 'weak');
        var salt2 = await env.random(16);
        db.admin = { salt: salt2, hash: await env.hash(String(body.password), salt2) };
        db.sessions = {}; var t3 = await newSession(db); await env.save(db);
        return ok({ token: t3 });
      }
      if (m === 'PUT' && path === '/api/admin/settings') {
        db.settings = mergeSettings(db.settings, body); await env.save(db);
        return ok({ settings: db.settings });
      }
      if (m === 'POST' && path === '/api/admin/upload') {
        var du = String(body.dataUrl || '');
        if (!/^data:image\/(jpeg|png|webp);base64,/.test(du)) return fail(400, 'image');
        if (du.length > 6000000) return fail(413, 'toolarge');
        var url = await env.saveImage(du);
        return ok({ url: url });
      }
      if (m === 'POST' && path === '/api/admin/telegram-test') {
        if (!env.testTelegram) return fail(501, 'unsupported');
        var res = await env.testTelegram(db);
        return res.ok ? ok() : fail(502, 'telegram', { detail: res.detail });
      }
      if (m === 'POST' && path === '/api/admin/import') {
        var inc = body.data;
        if (!inc || !Array.isArray(inc.products) || !Array.isArray(inc.categories) || !inc.settings) return fail(400, 'format');
        inc.admin = db.admin; inc.sessions = db.sessions; inc.version = 1;
        inc.orders = Array.isArray(inc.orders) ? inc.orders : [];
        inc.counter = num(inc.counter, inc.orders.length);
        await env.save(inc);
        return ok();
      }
      if (m === 'GET' && path === '/api/admin/export') {
        var ex = JSON.parse(JSON.stringify(db)); delete ex.admin; delete ex.sessions;
        return ok({ data: ex });
      }

      // products
      var mm;
      if (m === 'POST' && path === '/api/admin/products') {
        var np = cleanProduct(body, null);
        if (!np.name.ru && !np.name.en && !np.name.tr && !np.name.tg) return fail(400, 'name');
        if (!byId(db.categories, np.categoryId)) np.categoryId = db.categories[0] ? db.categories[0].id : '';
        np.sort = db.products.reduce(function (a, p) { return Math.max(a, p.sort || 0); }, 0) + 1;
        db.products.push(np); await env.save(db); return ok({ product: np }, 201);
      }
      if ((mm = path.match(/^\/api\/admin\/products\/([\w-]+)$/))) {
        var cur = byId(db.products, mm[1]);
        if (!cur) return fail(404, 'notfound');
        if (m === 'PUT') {
          var up = cleanProduct(body, cur);
          db.products[db.products.indexOf(cur)] = up; await env.save(db); return ok({ product: up });
        }
        if (m === 'DELETE') {
          db.products = db.products.filter(function (p) { return p.id !== cur.id; });
          db.settings.featuredIds = (db.settings.featuredIds || []).filter(function (x) { return x !== cur.id; });
          await env.save(db); return ok();
        }
      }
      if (m === 'POST' && path === '/api/admin/products-order') {
        var ids = Array.isArray(body.ids) ? body.ids : [];
        ids.forEach(function (id, i) { var p = byId(db.products, id); if (p) p.sort = i + 1; });
        await env.save(db); return ok();
      }

      // categories
      if (m === 'POST' && path === '/api/admin/categories') {
        var nm = cleanMl(body.name, 60);
        if (!nm.ru && !nm.en && !nm.tr && !nm.tg) return fail(400, 'name');
        var c = { id: uid('c-'), name: nm, image: cleanImage(body.image), sort: db.categories.reduce(function (a, x) { return Math.max(a, x.sort || 0); }, 0) + 1 };
        db.categories.push(c); await env.save(db); return ok({ category: c }, 201);
      }
      if ((mm = path.match(/^\/api\/admin\/categories\/([\w-]+)$/))) {
        var ct = byId(db.categories, mm[1]);
        if (!ct) return fail(404, 'notfound');
        if (m === 'PUT') {
          if ('name' in body) ct.name = cleanMl(body.name, 60);
          if ('image' in body) ct.image = cleanImage(body.image);
          if ('sort' in body) ct.sort = Math.round(num(body.sort, ct.sort));
          await env.save(db); return ok({ category: ct });
        }
        if (m === 'DELETE') {
          var used = db.products.some(function (p) { return p.categoryId === ct.id; });
          if (used) return fail(409, 'categoryused');
          db.categories = db.categories.filter(function (x) { return x.id !== ct.id; });
          await env.save(db); return ok();
        }
      }

      // orders
      if ((mm = path.match(/^\/api\/admin\/orders\/([\w-]+)$/))) {
        var od = byId(db.orders, mm[1]);
        if (!od) return fail(404, 'notfound');
        if (m === 'PUT') {
          if ('status' in body) {
            if (STATUSES.indexOf(body.status) < 0) return fail(400, 'status');
            // returning stock when an order is cancelled, taking it back if restored
            if (body.status === 'cancelled' && od.status !== 'cancelled') {
              od.items.forEach(function (it) { var p = byId(db.products, it.productId); if (p && p.stock != null) p.stock += it.qty; });
            } else if (od.status === 'cancelled' && body.status !== 'cancelled') {
              od.items.forEach(function (it) { var p = byId(db.products, it.productId); if (p && p.stock != null) p.stock = Math.max(0, p.stock - it.qty); });
            }
            od.status = body.status;
          }
          if ('adminNote' in body) od.adminNote = str(body.adminNote, 500);
          await env.save(db); return ok({ order: od });
        }
        if (m === 'DELETE') { db.orders = db.orders.filter(function (x) { return x.id !== od.id; }); await env.save(db); return ok(); }
      }

      return fail(404, 'notfound');
    }

    return { handle: handle, loadDb: loadDb };
  }

  /* text of an order for WhatsApp / Telegram / admin copy */
  function orderText(order, settings, lang, opts) {
    opts = opts || {};
    var cur = settings.currency || '';
    var L = {
      ru: { hi: 'Здравствуйте! Хочу заказать:', no: 'Заказ', total: 'Итого', name: 'Имя', phone: 'Телефон', deliv: 'Доставка', pick: 'Самовывоз', addr: 'Адрес', when: 'Когда', card: 'Открытка', note: 'Комментарий', personal: 'Надпись', fee: 'Доставка', custom: 'Индивидуальный заказ', budget: 'Бюджет', style: 'Стиль', colors: 'Цвета', flowers: 'Цветы', wrap: 'Упаковка', wish: 'Пожелания' },
      tg: { hi: 'Салом! Мехоҳам фармоиш диҳам:', no: 'Фармоиш', total: 'Ҷамъ', name: 'Ном', phone: 'Телефон', deliv: 'Расонидан', pick: 'Худам мегирам', addr: 'Суроға', when: 'Кай', card: 'Корт', note: 'Ёддошт', personal: 'Навишта', fee: 'Расонидан', custom: 'Фармоиши инфиродӣ', budget: 'Буҷет', style: 'Услуб', colors: 'Рангҳо', flowers: 'Гулҳо', wrap: 'Печ', wish: 'Хоҳишҳо' },
      en: { hi: 'Hello! I would like to order:', no: 'Order', total: 'Total', name: 'Name', phone: 'Phone', deliv: 'Delivery', pick: 'Pickup', addr: 'Address', when: 'When', card: 'Card message', note: 'Note', personal: 'Inscription', fee: 'Delivery', custom: 'Custom order', budget: 'Budget', style: 'Style', colors: 'Colours', flowers: 'Flowers', wrap: 'Wrap', wish: 'Wishes' },
      tr: { hi: 'Merhaba! Sipariş vermek istiyorum:', no: 'Sipariş', total: 'Toplam', name: 'Ad', phone: 'Telefon', deliv: 'Teslimat', pick: 'Mağazadan alım', addr: 'Adres', when: 'Ne zaman', card: 'Kart mesajı', note: 'Not', personal: 'Yazı', fee: 'Teslimat', custom: 'Özel sipariş', budget: 'Bütçe', style: 'Stil', colors: 'Renkler', flowers: 'Çiçekler', wrap: 'Ambalaj', wish: 'İstekler' }
    };
    var t = L[lang] || L.ru;
    
    var lines = [];
    if (!opts.plain) lines.push(t.hi);
    lines.push(t.no + ' ' + order.no);
    if (order.type === 'custom' && order.custom) {
      var c = order.custom;
      lines.push(t.custom);
      if (c.style) lines.push(t.style + ': ' + c.style);
      if (c.colors.length) lines.push(t.colors + ': ' + c.colors.join(', '));
      if (c.flowers.length) lines.push(t.flowers + ': ' + c.flowers.join(', '));
      if (c.wrap) lines.push(t.wrap + ': ' + c.wrap);
      if (c.budget) lines.push(t.budget + ': ' + c.budget + ' ' + cur);
      if (c.text) lines.push(t.wish + ': ' + c.text);
    }
    order.items.forEach(function (it) {
      lines.push('• ' + it.name + (it.variant ? ' (' + it.variant + ')' : '') + (it.personal ? ' «' + it.personal + '»' : '') + ' × ' + it.qty + ' = ' + it.price * it.qty + ' ' + cur);
    });
    if (order.items.length) {
      if (order.delivery.fee) lines.push(t.fee + ': ' + order.delivery.fee + ' ' + cur);
      lines.push(t.total + ': ' + order.total + ' ' + cur);
    }
    lines.push(t.name + ': ' + order.customer.name);
    lines.push(t.phone + ': ' + order.customer.phone);
    lines.push(order.delivery.mode === 'delivery' ? t.addr + ': ' + order.delivery.address : t.pick);
    if (order.delivery.date || order.delivery.time) lines.push(t.when + ': ' + [order.delivery.date, order.delivery.time].filter(Boolean).join(' '));
    if (order.cardMessage) lines.push(t.card + ': ' + order.cardMessage);
    if (order.note) lines.push(t.note + ': ' + order.note);
    return lines.join('\n');
  }

  return {
    LANGS: LANGS, STATUSES: STATUSES, seed: seed, createApi: createApi, pick: pick, priceOf: priceOf, minPrice: minPrice,
    soldOut: soldOut, activeCampaigns: activeCampaigns, campaignFor: campaignFor, orderText: orderText, todayStr: todayStr, uid: uid
  };
});
