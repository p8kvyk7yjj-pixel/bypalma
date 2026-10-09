# PALMA – Çiçekçi Sitesi

Scroll ile ilerleyen 3D vitrin hikâyesi (mağaza girişi → koridor → tabela), katalog, sepet/sipariş, özel sipariş, harf sepeti tasarlayıcı ve **Türkçe yönetim paneli**. Sitede RU / TG / EN / TR dilleri var. Hiçbir paket kurulumu gerekmez, yalnızca Node.js 18+ yeterli.

## Çalıştırma
```
node server.js          # http://localhost:3000
```
- Site: `/`   ·   Yönetim paneli: `/admin/`
- İlk açılışta panel şifre belirlemenizi ister (ya da `ADMIN_PASSWORD=...` ortam değişkeni verin).
- Ortam değişkenleri: `PORT` (3000), `DATA_DIR` (`./data`: veritabanı ve yüklenen fotoğraflar), `ADMIN_PASSWORD`.
- Docker: `docker build -t palma . && docker run -p 3000:3000 -v palma-data:/data palma`

## Panelden yönetilenler
Ürünler (fotoğraf, fiyat, kategori, stok, varyantlar, 4 dilde ad/açıklama), kategoriler, siparişler ve durumları (yeni / hazırlanıyor / hazır / teslim / iptal), ana sayfa (hero görseli, başlıklar, duyuru, öne çıkanlar), kampanyalar, iletişim ve teslimat bilgileri, şifre, Telegram bildirimi, yedek al / geri yükle.

## Yayına almadan önce
1. Panel → **Panel** sayfasındaki kontrol listesini doldurun: **WhatsApp numarası** (kodda sabit numara yoktur; "WhatsApp'tan sipariş ver" ürün adı ve fiyatı ile bu numaraya mesaj hazırlar), telefon, adres, çalışma saatleri.
2. Örnek ürünlerin **fiyatları yer tutucudur**; gerçek fiyat ve fotoğrafları girin.
3. İsterseniz Telegram bildirimini açın (Ayarlar → bot token + chat id).
4. HTTPS için Nginx/Caddy arkasında çalıştırın; `data/` klasörünü düzenli yedekleyin.

## Videoları değiştirme
`public/video/` içindeki `walk.mp4` (koridor, kareleri scroll ile sürülür; **her kare keyframe** olmalı), `storefront.mp4`, `sign.mp4` dosyalarını aynı adla değiştirin. Koridor için: `ffmpeg -i in.mov -vf scale=540:960 -c:v libx264 -g 1 -an walk.mp4`.

## Yapı
```
server.js            statik sunucu + /api (bağımlılıksız)
public/js/core.js    ortak mantık: veri, fiyat, kampanya, sipariş, admin API
public/js/api.js     sunucu ya da demo (localStorage) modu
public/js/story.js   scroll 3D sahne     app.js  mağaza     builder.js  harf tasarlayıcı
public/admin/        yönetim paneli
```
Sunucu yoksa site **demo modunda** (veriler tarayıcıda) çalışır.
