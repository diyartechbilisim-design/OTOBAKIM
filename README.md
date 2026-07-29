# 🚗 Araç Bakım Sistemi

Oto servis / araç bakım işletmeleri için web tabanlı yönetim sistemi.

## Özellikler
- 🚙 Müşteri & araç kaydı (plaka, marka/model, kilometre)
- 🔧 Servis & bakım kayıtları (yapılan işlem, araç KM, işçilik ücreti, sonraki bakım tarihi)
- 🔔 Yaklaşan bakım uyarıları (30 gün içinde / geçmiş bakımlar dashboard'da)
- 📦 Yedek parça stok takibi ve yaşlandırma analizi
- 🏭 Tedarikçi ve parça alım yönetimi (borç/ödeme takibi)
- 💸 Gider takibi, 📊 raporlar (servis, alım, gider, müşteri, stok, kârlılık)
- 🖨️ Fiş ve rapor yazdırma
- 🔑 Admin / 👷 Personel rolleri

## Giriş Bilgileri
| Rol | Şifre |
|---|---|
| Admin | `otobakim2024` |
| Personel | `personel123` |

> Şifreleri `index.html` içindeki `PASSWORDS` sabitinden değiştirebilirsiniz.

## Railway'e Deploy

1. Bu projeyi GitHub'a yükleyin:
   ```bash
   git init
   git add .
   git commit -m "Araç bakım sistemi"
   git branch -M main
   git remote add origin https://github.com/KULLANICI_ADINIZ/arac-bakim-sistemi.git
   git push -u origin main
   ```
2. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → bu repoyu seçin.
3. Aynı projeye **PostgreSQL** ekleyin: **+ New** → **Database** → **Add PostgreSQL**.
4. Uygulama servisinizde **Variables** sekmesine gidin ve ekleyin:
   - `DATABASE_URL` → `${{Postgres.DATABASE_URL}}` (referans olarak seçin)
   - `NODE_ENV` → `production`
5. **Settings → Networking → Generate Domain** ile genel adres oluşturun.

Tablolar ilk açılışta otomatik oluşturulur; ayrıca migration gerekmez.

## Yerel Çalıştırma
```bash
npm install
DATABASE_URL=postgres://user:pass@localhost:5432/aracbakim npm start
```
Tarayıcıda `http://localhost:8080` adresini açın.
