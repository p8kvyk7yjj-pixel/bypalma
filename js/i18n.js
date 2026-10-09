/* Storefront UI strings. Order in every row: ru, tg, en, tr. Product/hero text comes from the admin panel instead. */
(function () {
  'use strict';
  var L = ['ru', 'tg', 'en', 'tr'];
  var S = {};
  function t(k, ru, tg, en, tr) { S[k] = { ru: ru, tg: tg, en: en, tr: tr }; }

  t('nav.story', 'Вход', 'Даромад', 'Enter', 'Giriş');
  t('nav.catalog', 'Каталог', 'Феҳрист', 'Catalog', 'Katalog');
  t('nav.initial', 'Буква', 'Ҳарф', 'Initial', 'Harf');
  t('nav.custom', 'Свой букет', 'Гулдастаи шахсӣ', 'Custom', 'Özel sipariş');
  t('nav.delivery', 'Доставка', 'Расонидан', 'Delivery', 'Teslimat');
  t('nav.contact', 'Контакты', 'Тамос', 'Contact', 'İletişim');
  t('nav.cart', 'Корзина', 'Сабад', 'Cart', 'Sepet');
  t('nav.menu', 'Меню', 'Меню', 'Menu', 'Menü');
  t('common.close', 'Закрыть', 'Пӯшидан', 'Close', 'Kapat');
  t('common.call', 'Позвонить', 'Занг задан', 'Call', 'Ara');
  t('common.copy', 'Скопировать', 'Нусха', 'Copy', 'Kopyala');
  t('common.copied', 'Скопировано', 'Нусха шуд', 'Copied', 'Kopyalandı');

  t('hero.catalog', 'Смотреть каталог', 'Дидани феҳрист', 'View catalog', 'Kataloğu gör');
  t('hero.whatsapp', 'Написать в WhatsApp', 'Дар WhatsApp нависед', 'Message on WhatsApp', 'WhatsApp\'tan yaz');
  t('hero.scroll', 'Листайте вниз, чтобы войти', 'Барои даромадан поён равед', 'Scroll to walk in', 'İçeri girmek için kaydırın');

  t('story.b.eyebrow', 'Шаг первый', 'Қадами аввал', 'Step one', 'Birinci adım');
  t('story.b.title', 'Заходите. Мы уже собираем ваш букет.', 'Дароед. Гулдастаи шуморо ҷамъ карда истодаем.', 'Come in. Your bouquet is already being made.', 'İçeri gelin. Buketiniz hazırlanıyor.');
  t('story.b.text', 'У входа вас встречают живые композиции, а за дверью начинается зелёный коридор.', 'Дар даромад композитсияҳои зинда пешвоз мегиранд, паси дар долони сабз оғоз мешавад.', 'Living arrangements greet you at the door, and a green corridor begins right behind it.', 'Kapıda canlı kompozisyonlar karşılar, kapının ardında yeşil bir koridor başlar.');
  t('story.c.eyebrow', 'Внутри', 'Дарун', 'Inside', 'İçeride');
  t('story.c.title', 'Каждый день свежие цветы и растения', 'Ҳар рӯз гулҳо ва гиёҳҳои тоза', 'Fresh flowers and plants every day', 'Her gün taze çiçek ve bitki');
  t('story.c.text', 'Палмы, зелень и сотни роз на мраморном полу. Каждый букет флорист собирает вручную.', 'Нахлҳо, сабзӣ ва садҳо садбарг дар фарши мармарӣ. Ҳар гулдастаро флорист бо даст ҷамъ мекунад.', 'Palms, greenery and hundreds of roses on a marble floor. Every bouquet is arranged by hand.', 'Mermer zeminde palmiyeler, yeşillik ve yüzlerce gül. Her buket elde hazırlanır.');
  t('story.d.eyebrow', 'Ваш выбор', 'Интихоби шумо', 'Your pick', 'Sizin seçiminiz');
  t('story.d.title', 'Выберите букет прямо отсюда', 'Гулдастаро аз ҳамин ҷо интихоб кунед', 'Choose a bouquet from right here', 'Buketinizi buradan seçin');
  t('story.d.text', 'Букеты, которые мы показываем в зале, можно заказать на сайте. Доставим по Душанбе в день заказа.', 'Гулдастаҳои дар толор дидаатон онро дар сайт фармоиш диҳед. Дар рӯзи фармоиш мерасонем.', 'The bouquets you saw in the shop can be ordered on this site. We deliver across Dushanbe the same day.', 'Mağazada gördüğünüz buketleri bu siteden sipariş edebilirsiniz. Aynı gün teslim ederiz.');
  t('story.d.cta', 'Открыть каталог', 'Кушодани феҳрист', 'Open the catalog', 'Kataloğu aç');

  t('cat.title', 'Каталог', 'Феҳрист', 'Catalog', 'Katalog');
  t('cat.sub', 'Цены в сомони. Свежесть и фото соответствуют тому, что вы получите.', 'Нархҳо бо сомонӣ. Тозагӣ ва акс мутобиқи он чӣ мегиред.', 'Prices in somoni. What you see is what you receive.', 'Fiyatlar somoni cinsinden. Gördüğünüz neyse onu alırsınız.');
  t('cat.all', 'Все', 'Ҳама', 'All', 'Tümü');
  t('cat.from', 'от', 'аз', 'from', 'itibaren');
  t('cat.add', 'В корзину', 'Ба сабад', 'Add to cart', 'Sepete ekle');
  t('cat.details', 'Подробнее', 'Муфассал', 'Details', 'Detay');
  t('cat.soldout', 'Нет в наличии', 'Мавҷуд нест', 'Sold out', 'Tükendi');
  t('cat.instock', 'В наличии', 'Мавҷуд аст', 'In stock', 'Stokta');
  t('cat.left', 'Осталось', 'Монд', 'Left', 'Kalan');
  t('cat.empty', 'В этой категории пока ничего нет.', 'Дар ин категория ҳоло чизе нест.', 'Nothing in this category yet.', 'Bu kategoride henüz ürün yok.');
  t('cat.sale', 'Акция', 'Аксия', 'Sale', 'Kampanya');
  t('cat.featured', 'Выбор флориста', 'Интихоби флорист', 'Florist\'s pick', 'Çiçekçinin seçimi');

  t('prod.options', 'Размер или вариант', 'Андоза ё намуд', 'Size or option', 'Boyut veya seçenek');
  t('prod.qty', 'Количество', 'Миқдор', 'Quantity', 'Adet');
  t('prod.cart', 'Добавить в корзину', 'Илова ба сабад', 'Add to cart', 'Sepete ekle');
  t('prod.wa', 'Заказать в WhatsApp', 'Дар WhatsApp фармоиш додан', 'Order on WhatsApp', 'WhatsApp\'tan sipariş ver');
  t('prod.personal', 'Буква или инициал', 'Ҳарф ё ҳарфи ном', 'Letter or initial', 'Harf veya inisiyal');
  t('prod.personalHint', 'Например: М', 'Масалан: М', 'For example: M', 'Örneğin: M');
  t('prod.added', 'Добавлено в корзину', 'Ба сабад илова шуд', 'Added to cart', 'Sepete eklendi');
  t('prod.need', 'Укажите букву', 'Ҳарфро нависед', 'Enter the letter', 'Harfi yazın');
  t('prod.nowa', 'Номер WhatsApp ещё не указан в админ-панели', 'Рақами WhatsApp дар панел ҳоло нест', 'WhatsApp number is not set in the admin panel yet', 'WhatsApp numarası admin panelinde henüz ayarlanmadı');

  t('cart.title', 'Ваш заказ', 'Фармоиши шумо', 'Your order', 'Siparişiniz');
  t('cart.empty', 'Корзина пуста. Выберите букет в каталоге.', 'Сабад холӣ аст. Дар феҳрист гулдаста интихоб кунед.', 'Your cart is empty. Pick a bouquet from the catalog.', 'Sepetiniz boş. Katalogdan bir buket seçin.');
  t('cart.sub', 'Сумма', 'Маблағ', 'Subtotal', 'Ara toplam');
  t('cart.fee', 'Доставка', 'Расонидан', 'Delivery', 'Teslimat');
  t('cart.free', 'бесплатно', 'ройгон', 'free', 'ücretsiz');
  t('cart.total', 'Итого', 'Ҷамъ', 'Total', 'Toplam');
  t('cart.checkout', 'Оформить заказ', 'Расмӣ кардани фармоиш', 'Checkout', 'Siparişi tamamla');
  t('cart.remove', 'Убрать', 'Хориҷ', 'Remove', 'Kaldır');
  t('cart.freeFrom', 'Бесплатная доставка от', 'Расонидани ройгон аз', 'Free delivery from', 'Ücretsiz teslimat şu tutardan');
  t('cart.addMore', 'Добавьте ещё на', 'Боз илова кунед ба маблағи', 'Add', 'Ücretsiz için');
  t('cart.toFree', 'для бесплатной доставки', 'барои расонидани ройгон', 'more for free delivery', 'daha ekleyin');

  t('co.title', 'Оформление заказа', 'Расмӣ кардани фармоиш', 'Checkout', 'Sipariş detayları');
  t('co.name', 'Ваше имя', 'Номи шумо', 'Your name', 'Adınız');
  t('co.phone', 'Телефон', 'Телефон', 'Phone', 'Telefon');
  t('co.delivery', 'Доставка', 'Расонидан', 'Delivery', 'Teslimat');
  t('co.pickup', 'Самовывоз', 'Худам мегирам', 'Pickup', 'Mağazadan alım');
  t('co.address', 'Адрес доставки', 'Суроғаи расонидан', 'Delivery address', 'Teslimat adresi');
  t('co.date', 'Дата', 'Сана', 'Date', 'Tarih');
  t('co.time', 'Время', 'Вақт', 'Time', 'Saat');
  t('co.card', 'Текст открытки', 'Матни кортчаи табрикӣ', 'Card message', 'Kart mesajı');
  t('co.note', 'Комментарий к заказу', 'Ёддошт ба фармоиш', 'Order note', 'Sipariş notu');
  t('co.submit', 'Отправить заказ', 'Фиристодани фармоиш', 'Place order', 'Siparişi gönder');
  t('co.submitWa', 'Заказать через WhatsApp', 'Тавассути WhatsApp фармоиш додан', 'Order via WhatsApp', 'WhatsApp ile sipariş ver');
  t('co.sending', 'Отправляем…', 'Фиристода истодаем…', 'Sending…', 'Gönderiliyor…');
  t('co.asap', 'Как можно скорее', 'Ҳарчи зудтар', 'As soon as possible', 'En kısa sürede');
  t('co.err.name', 'Введите имя', 'Номро ворид кунед', 'Enter your name', 'Adınızı yazın');
  t('co.err.phone', 'Введите телефон', 'Телефонро ворид кунед', 'Enter your phone', 'Telefon numaranızı yazın');
  t('co.err.address', 'Укажите адрес доставки', 'Суроғаро нависед', 'Enter the delivery address', 'Teslimat adresini yazın');
  t('co.err.date', 'Выберите дату не раньше сегодняшней', 'Санаро аз имрӯз барвақттар интихоб накунед', 'Choose today or a later date', 'Bugün veya sonrası bir tarih seçin');
  t('co.err.minorder', 'Минимальная сумма заказа', 'Ҳадди ақали маблағи фармоиш', 'Minimum order amount', 'Minimum sipariş tutarı');
  t('co.err.soldout', 'Этот товар уже закончился. Обновите корзину.', 'Ин маҳсулот тамом шуд. Сабадро навсозӣ кунед.', 'This item just sold out. Please update your cart.', 'Bu ürün tükendi. Lütfen sepeti güncelleyin.');
  t('co.err.stock', 'Не хватает товара на складе', 'Дар анбор кофӣ нест', 'Not enough stock', 'Stok yetersiz');
  t('co.err.generic', 'Не удалось отправить заказ. Попробуйте ещё раз или напишите нам в WhatsApp.', 'Фармоиш фиристода нашуд. Боз кӯшиш кунед ё дар WhatsApp нависед.', 'Could not send the order. Try again or message us on WhatsApp.', 'Sipariş gönderilemedi. Tekrar deneyin veya WhatsApp\'tan yazın.');
  t('co.err.rate', 'Слишком много попыток. Подождите несколько минут.', 'Кӯшишҳо хеле зиёданд. Якчанд дақиқа интизор шавед.', 'Too many attempts. Please wait a few minutes.', 'Çok fazla deneme. Birkaç dakika bekleyin.');
  t('ok.title', 'Заказ принят', 'Фармоиш қабул шуд', 'Order received', 'Siparişiniz alındı');
  t('ok.text', 'Флорист свяжется с вами, чтобы подтвердить детали. Номер вашего заказа:', 'Флорист барои тасдиқи тафсилот бо шумо тамос мегирад. Рақами фармоиши шумо:', 'The florist will contact you to confirm the details. Your order number:', 'Çiçekçi detayları onaylamak için sizinle iletişime geçecek. Sipariş numaranız:');
  t('ok.wa', 'Отправить копию в WhatsApp', 'Нусхаро ба WhatsApp фиристодан', 'Send a copy on WhatsApp', 'Kopyayı WhatsApp\'tan gönder');

  t('ini.eyebrow', 'Конструктор', 'Конструктор', 'Builder', 'Tasarım aracı');
  t('ini.title', 'Ваша буква из белых роз', 'Ҳарфи шумо аз садбаргҳои сафед', 'Your letter in white roses', 'Beyaz güllerle sizin harfiniz');
  t('ini.text', 'Введите букву и посмотрите, как будет выглядеть корзина. Мы соберём её по этому эскизу.', 'Ҳарфро ворид кунед ва бубинед, ки сабад чӣ гуна мешавад. Мо аз рӯи ҳамин нақша месозем.', 'Type a letter and see how the basket will look. We build it from this sketch.', 'Bir harf yazın, sepetin nasıl görüneceğini izleyin. Tam bu taslağa göre hazırlarız.');
  t('ini.letter', 'Буква', 'Ҳарф', 'Letter', 'Harf');
  t('ini.size', 'Размер', 'Андоза', 'Size', 'Boyut');
  t('ini.add', 'Добавить в корзину', 'Илова ба сабад', 'Add to cart', 'Sepete ekle');
  t('ini.price', 'Цена', 'Нарх', 'Price', 'Fiyat');

  t('cu.eyebrow', 'Индивидуальный заказ', 'Фармоиши инфиродӣ', 'Custom order', 'Özel sipariş');
  t('cu.title', 'Соберём букет под ваш повод', 'Гулдастаро барои муносибати шумо месозем', 'We will compose a bouquet for your occasion', 'Vesileniz için özel bir buket hazırlayalım');
  t('cu.text', 'Расскажите о стиле, цветах и бюджете. Флорист предложит вариант и подтвердит цену до оплаты.', 'Дар бораи услуб, рангҳо ва буҷет нависед. Флорист вариант пешниҳод мекунад ва нархро пеш аз пардохт тасдиқ мекунад.', 'Tell us the style, colours and budget. The florist suggests a design and confirms the price before you pay.', 'Stili, renkleri ve bütçeyi anlatın. Çiçekçi bir tasarım önerir ve ödemeden önce fiyatı onaylar.');
  t('cu.style', 'Стиль', 'Услуб', 'Style', 'Stil');
  t('cu.colors', 'Цвета', 'Рангҳо', 'Colours', 'Renkler');
  t('cu.flowers', 'Цветы', 'Гулҳо', 'Flowers', 'Çiçekler');
  t('cu.budget', 'Бюджет', 'Буҷет', 'Budget', 'Bütçe');
  t('cu.wrap', 'Упаковка', 'Печ', 'Wrap', 'Ambalaj');
  t('cu.wish', 'Пожелания и повод', 'Хоҳишҳо ва муносибат', 'Wishes and occasion', 'İstekler ve vesile');
  t('cu.wishHint', 'Например: день рождения мамы, любит светлые тона', 'Масалан: зодрӯзи модар, рангҳои равшанро дӯст медорад', 'For example: mum\'s birthday, loves light colours', 'Örneğin: annemin doğum günü, açık renkleri sever');
  t('cu.submit', 'Отправить заявку', 'Фиристодани дархост', 'Send request', 'Talebi gönder');
  t('cu.s.soft', 'Нежный', 'Нозук', 'Soft', 'Narin');
  t('cu.s.bright', 'Яркий', 'Дурахшон', 'Bright', 'Canlı');
  t('cu.s.minimal', 'Минимализм', 'Минимализм', 'Minimal', 'Minimal');
  t('cu.s.classic', 'Классика', 'Классикӣ', 'Classic', 'Klasik');
  t('cu.c.white', 'Белый', 'Сафед', 'White', 'Beyaz');
  t('cu.c.pink', 'Розовый', 'Гулобӣ', 'Pink', 'Pembe');
  t('cu.c.fuchsia', 'Фуксия', 'Фуксия', 'Fuchsia', 'Fuşya');
  t('cu.c.red', 'Красный', 'Сурх', 'Red', 'Kırmızı');
  t('cu.c.peach', 'Персиковый', 'Шафтолуранг', 'Peach', 'Şeftali');
  t('cu.c.green', 'Зелёный', 'Сабз', 'Green', 'Yeşil');
  t('cu.f.rose', 'Розы', 'Садбаргҳо', 'Roses', 'Güller');
  t('cu.f.daisy', 'Ромашки', 'Бобунаҳо', 'Daisies', 'Papatyalar');
  t('cu.f.peony', 'Пионы', 'Пионҳо', 'Peonies', 'Şakayıklar');
  t('cu.f.tulip', 'Тюльпаны', 'Лолаҳо', 'Tulips', 'Laleler');
  t('cu.f.lily', 'Лилии', 'Савсанҳо', 'Lilies', 'Zambaklar');
  t('cu.f.gypso', 'Гипсофила', 'Гипсофила', 'Baby\'s breath', 'Cipso');
  t('cu.w.umbrella', 'Прозрачный зонтик', 'Чатри шаффоф', 'Transparent umbrella', 'Şeffaf şemsiye');
  t('cu.w.paper', 'Бумага', 'Коғаз', 'Paper', 'Kağıt');
  t('cu.w.basket', 'Корзина', 'Сабад', 'Basket', 'Sepet');
  t('cu.w.box', 'Шляпная коробка', 'Қуттии кулоҳӣ', 'Hat box', 'Şapka kutusu');
  t('cu.ok', 'Заявка отправлена. Флорист свяжется с вами.', 'Дархост фиристода шуд. Флорист бо шумо тамос мегирад.', 'Request sent. The florist will contact you.', 'Talep gönderildi. Çiçekçi sizinle iletişime geçecek.');
  t('cu.err', 'Расскажите хотя бы о стиле или цветах', 'Ҳадди аққал дар бораи услуб ё рангҳо нависед', 'Please tell us at least the style or colours', 'Lütfen en azından stili veya renkleri belirtin');

  t('del.eyebrow', 'Доставка и контакты', 'Расонидан ва тамос', 'Delivery & contact', 'Teslimat ve iletişim');
  t('del.title', 'Привезём в день заказа', 'Дар рӯзи фармоиш мерасонем', 'Delivered the same day', 'Aynı gün kapınızda');
  t('del.fee', 'Стоимость доставки', 'Нархи расонидан', 'Delivery fee', 'Teslimat ücreti');
  t('del.free', 'Бесплатно от', 'Ройгон аз', 'Free from', 'Ücretsiz, tutar');
  t('del.lead', 'Минимальное время подготовки', 'Вақти ҳадди ақали тайёрӣ', 'Minimum preparation time', 'Minimum hazırlık süresi');
  t('del.min', 'мин', 'дақ', 'min', 'dk');
  t('del.window', 'Доставляем', 'Мерасонем', 'We deliver', 'Teslimat saatleri');
  t('del.pickup', 'Самовывоз из магазина бесплатный.', 'Худ гирифтан аз мағоза ройгон аст.', 'Pickup from the shop is free.', 'Mağazadan teslim almak ücretsizdir.');
  t('del.address', 'Адрес', 'Суроға', 'Address', 'Adres');
  t('del.hours', 'Часы работы', 'Соатҳои корӣ', 'Opening hours', 'Çalışma saatleri');
  t('del.phone', 'Телефон', 'Телефон', 'Phone', 'Telefon');
  t('del.map', 'Открыть на карте', 'Дар харита кушодан', 'Open on the map', 'Haritada aç');
  t('foot.rights', 'Все права защищены', 'Ҳамаи ҳуқуқҳо ҳифз шудаанд', 'All rights reserved', 'Tüm hakları saklıdır');
  t('foot.admin', 'Вход для владельца', 'Вуруд барои соҳиб', 'Owner login', 'Yönetici girişi');
  t('demo.banner', 'Демо-режим: данные хранятся только в этом браузере.', 'Демо: маълумот танҳо дар ин браузер нигоҳ дошта мешавад.', 'Demo mode: data is stored in this browser only.', 'Demo modu: veriler yalnızca bu tarayıcıda saklanır.');

  window.PalmaI18N = {
    langs: L,
    names: { ru: 'RU', tg: 'ТҶ', en: 'EN', tr: 'TR' },
    t: function (key, lang) { var r = S[key]; return r ? (r[lang] || r.ru) : key; },
    has: function (key) { return !!S[key]; }
  };
})();
