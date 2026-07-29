const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => { console.error('DB error:', err.message); });

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS urunler (id SERIAL PRIMARY KEY, ad VARCHAR(255) NOT NULL, kategori VARCHAR(100) DEFAULT '', birim VARCHAR(50) DEFAULT 'Adet', stok DECIMAL(10,2) DEFAULT 0, maliyet DECIMAL(10,2) DEFAULT 0, satis_fiyat DECIMAL(10,2) DEFAULT 0, son_hareket DATE DEFAULT CURRENT_DATE, created_at TIMESTAMP DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS musteriler (id SERIAL PRIMARY KEY, ad VARCHAR(255) NOT NULL, tel VARCHAR(50) DEFAULT '', adres TEXT DEFAULT '', plaka VARCHAR(20) DEFAULT '', arac VARCHAR(255) DEFAULT '', sase VARCHAR(50) DEFAULT '', km INTEGER DEFAULT 0, toplam_borc DECIMAL(10,2) DEFAULT 0, odenen DECIMAL(10,2) DEFAULT 0, created_at TIMESTAMP DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS saticilar (id SERIAL PRIMARY KEY, ad VARCHAR(255) NOT NULL, tel VARCHAR(50) DEFAULT '', toplam_borc DECIMAL(10,2) DEFAULT 0, odenen DECIMAL(10,2) DEFAULT 0, created_at TIMESTAMP DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS alislar (id SERIAL PRIMARY KEY, tarih DATE NOT NULL, saat VARCHAR(10) DEFAULT '', satici_id INTEGER, satici_ad VARCHAR(255) DEFAULT '', urunler JSONB DEFAULT '[]', toplam DECIMAL(10,2) DEFAULT 0, odeme_durumu VARCHAR(50) DEFAULT 'bekliyor', odened DECIMAL(10,2) DEFAULT 0, aciklama TEXT DEFAULT '', created_at TIMESTAMP DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS satislar (id SERIAL PRIMARY KEY, tarih DATE NOT NULL, saat VARCHAR(10) DEFAULT '', musteri_id INTEGER, musteri_ad VARCHAR(255) DEFAULT '', urun_id INTEGER, urun_ad VARCHAR(255) DEFAULT '', miktar DECIMAL(10,2) DEFAULT 0, satis_fiyat DECIMAL(10,2) DEFAULT 0, toplam DECIMAL(10,2) DEFAULT 0, odeme_durumu VARCHAR(50) DEFAULT 'bekliyor', odened DECIMAL(10,2) DEFAULT 0, aciklama TEXT DEFAULT '', islem TEXT DEFAULT '', km INTEGER DEFAULT 0, sonraki_bakim DATE, created_at TIMESTAMP DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS giderler (id SERIAL PRIMARY KEY, tarih DATE NOT NULL, saat VARCHAR(10) DEFAULT '', aciklama TEXT DEFAULT '', kategori VARCHAR(100) DEFAULT 'Genel', tutar DECIMAL(10,2) DEFAULT 0, created_at TIMESTAMP DEFAULT NOW());
      ALTER TABLE musteriler ADD COLUMN IF NOT EXISTS plaka VARCHAR(20) DEFAULT '';
      ALTER TABLE musteriler ADD COLUMN IF NOT EXISTS arac VARCHAR(255) DEFAULT '';
      ALTER TABLE musteriler ADD COLUMN IF NOT EXISTS km INTEGER DEFAULT 0;
      ALTER TABLE musteriler ADD COLUMN IF NOT EXISTS sase VARCHAR(50) DEFAULT '';
      ALTER TABLE satislar ADD COLUMN IF NOT EXISTS islem TEXT DEFAULT '';
      ALTER TABLE satislar ADD COLUMN IF NOT EXISTS km INTEGER DEFAULT 0;
      ALTER TABLE satislar ADD COLUMN IF NOT EXISTS sonraki_bakim DATE;
    `);
    console.log('DB ready');
  } finally { client.release(); }
}

const fu = u => ({ id: u.id, ad: u.ad, kategori: u.kategori||'', birim: u.birim||'Adet', stok: parseFloat(u.stok||0), maliyet: parseFloat(u.maliyet||0), satisFiyat: parseFloat(u.satis_fiyat||0), sonH: u.son_hareket });
const fm = m => ({ id: m.id, ad: m.ad, tel: m.tel||'', adres: m.adres||'', plaka: m.plaka||'', arac: m.arac||'', sase: m.sase||'', km: parseInt(m.km||0), toplamBorc: parseFloat(m.toplam_borc||0), odenen: parseFloat(m.odenen||0) });
const ft = t => ({ id: t.id, ad: t.ad, tel: t.tel||'', toplamBorc: parseFloat(t.toplam_borc||0), odenen: parseFloat(t.odenen||0) });
const fa = a => ({ id: a.id, tarih: a.tarih, saat: a.saat||'', saticiId: a.satici_id, saticiAd: a.satici_ad||'', urunler: a.urunler||[], toplam: parseFloat(a.toplam||0), odemeDurumu: a.odeme_durumu||'bekliyor', odened: parseFloat(a.odened||0), aciklama: a.aciklama||'' });
const fs = s => ({ id: s.id, tarih: s.tarih, saat: s.saat||'', musteriId: s.musteri_id, musteriAd: s.musteri_ad||'', urunId: s.urun_id, urunAd: s.urun_ad||'', miktar: parseFloat(s.miktar||0), satisFiyat: parseFloat(s.satis_fiyat||0), toplam: parseFloat(s.toplam||0), odemeDurumu: s.odeme_durumu||'bekliyor', odened: parseFloat(s.odened||0), aciklama: s.aciklama||'', islem: s.islem||'', km: parseInt(s.km||0), sonrakiBakim: s.sonraki_bakim });
const fg = g => ({ id: g.id, tarih: g.tarih, saat: g.saat||'', aciklama: g.aciklama||'', kategori: g.kategori||'Genel', tutar: parseFloat(g.tutar||0) });

app.get('/api/urunler', async (req, res) => { try { const r = await pool.query('SELECT * FROM urunler ORDER BY id'); res.json(r.rows.map(fu)); } catch(e) { console.error('GET urunler:', e.message); res.status(500).json({ error: e.message }); } });
app.post('/api/urunler', async (req, res) => { try { const { ad, kategori, birim, stok, maliyet, satisFiyat } = req.body; const r = await pool.query('INSERT INTO urunler (ad,kategori,birim,stok,maliyet,satis_fiyat) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [ad, kategori||'', birim||'Adet', stok||0, maliyet||0, satisFiyat||0]); res.json(fu(r.rows[0])); } catch(e) { console.error('POST urunler:', e.message); res.status(500).json({ error: e.message }); } });
app.put('/api/urunler/:id', async (req, res) => { try { const { ad, kategori, birim, stok, maliyet, satisFiyat, sonH } = req.body; await pool.query('UPDATE urunler SET ad=$1,kategori=$2,birim=$3,stok=$4,maliyet=$5,satis_fiyat=$6,son_hareket=$7 WHERE id=$8', [ad, kategori||'', birim||'Adet', stok||0, maliyet||0, satisFiyat||0, sonH||new Date().toISOString().split('T')[0], req.params.id]); res.json({ ok: true }); } catch(e) { console.error('PUT urunler:', e.message); res.status(500).json({ error: e.message }); } });
app.delete('/api/urunler/:id', async (req, res) => { try { await pool.query('DELETE FROM urunler WHERE id=$1', [req.params.id]); res.json({ ok: true }); } catch(e) { res.status(500).json({ error: e.message }); } });

app.get('/api/musteriler', async (req, res) => { try { const r = await pool.query('SELECT * FROM musteriler ORDER BY id'); res.json(r.rows.map(fm)); } catch(e) { console.error('GET musteriler:', e.message); res.status(500).json({ error: e.message }); } });
app.post('/api/musteriler', async (req, res) => { try { const { ad, tel, adres, plaka, arac, sase, km } = req.body; const r = await pool.query('INSERT INTO musteriler (ad,tel,adres,plaka,arac,sase,km) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [ad, tel||'', adres||'', plaka||'', arac||'', sase||'', km||0]); res.json(fm(r.rows[0])); } catch(e) { console.error('POST musteriler:', e.message); res.status(500).json({ error: e.message }); } });
app.put('/api/musteriler/:id', async (req, res) => { try { const { ad, tel, adres, plaka, arac, sase, km, toplamBorc, odenen } = req.body; await pool.query('UPDATE musteriler SET ad=$1,tel=$2,adres=$3,plaka=$4,arac=$5,sase=$6,km=$7,toplam_borc=$8,odenen=$9 WHERE id=$10', [ad, tel||'', adres||'', plaka||'', arac||'', sase||'', km||0, toplamBorc||0, odenen||0, req.params.id]); res.json({ ok: true }); } catch(e) { console.error('PUT musteriler:', e.message); res.status(500).json({ error: e.message }); } });
app.delete('/api/musteriler/:id', async (req, res) => { try { await pool.query('DELETE FROM musteriler WHERE id=$1', [req.params.id]); res.json({ ok: true }); } catch(e) { res.status(500).json({ error: e.message }); } });

app.get('/api/saticilar', async (req, res) => { try { const r = await pool.query('SELECT * FROM saticilar ORDER BY id'); res.json(r.rows.map(ft)); } catch(e) { console.error('GET saticilar:', e.message); res.status(500).json({ error: e.message }); } });
app.post('/api/saticilar', async (req, res) => { try { const { ad, tel } = req.body; const r = await pool.query('INSERT INTO saticilar (ad,tel) VALUES ($1,$2) RETURNING *', [ad, tel||'']); res.json(ft(r.rows[0])); } catch(e) { console.error('POST saticilar:', e.message); res.status(500).json({ error: e.message }); } });
app.put('/api/saticilar/:id', async (req, res) => { try { const { ad, tel, toplamBorc, odenen } = req.body; await pool.query('UPDATE saticilar SET ad=$1,tel=$2,toplam_borc=$3,odenen=$4 WHERE id=$5', [ad, tel||'', toplamBorc||0, odenen||0, req.params.id]); res.json({ ok: true }); } catch(e) { console.error('PUT saticilar:', e.message); res.status(500).json({ error: e.message }); } });
app.delete('/api/saticilar/:id', async (req, res) => { try { await pool.query('DELETE FROM saticilar WHERE id=$1', [req.params.id]); res.json({ ok: true }); } catch(e) { res.status(500).json({ error: e.message }); } });

app.get('/api/alislar', async (req, res) => { try { const r = await pool.query('SELECT * FROM alislar ORDER BY tarih DESC, saat DESC'); res.json(r.rows.map(fa)); } catch(e) { console.error('GET alislar:', e.message); res.status(500).json({ error: e.message }); } });
app.post('/api/alislar', async (req, res) => { 
  try { 
    const { tarih, saat, saticiId, saticiAd, urunler, toplam, odemeDurumu, odened, aciklama } = req.body;
    console.log('POST alislar body:', JSON.stringify(req.body));
    const r = await pool.query('INSERT INTO alislar (tarih,saat,satici_id,satici_ad,urunler,toplam,odeme_durumu,odened,aciklama) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *', [tarih, saat||'', saticiId||null, saticiAd||'', JSON.stringify(urunler||[]), toplam||0, odemeDurumu||'bekliyor', odened||0, aciklama||'']); 
    res.json(fa(r.rows[0])); 
  } catch(e) { 
    console.error('POST alislar ERROR:', e.message); 
    res.status(500).json({ error: e.message }); 
  } 
});
app.put('/api/alislar/:id', async (req, res) => { try { const { tarih, saat, saticiId, saticiAd, urunler, toplam, odemeDurumu, odened, aciklama } = req.body; await pool.query('UPDATE alislar SET tarih=$1,saat=$2,satici_id=$3,satici_ad=$4,urunler=$5,toplam=$6,odeme_durumu=$7,odened=$8,aciklama=$9 WHERE id=$10', [tarih, saat||'', saticiId||null, saticiAd||'', JSON.stringify(urunler||[]), toplam||0, odemeDurumu||'bekliyor', odened||0, aciklama||'', req.params.id]); res.json({ ok: true }); } catch(e) { console.error('PUT alislar:', e.message); res.status(500).json({ error: e.message }); } });
app.delete('/api/alislar/:id', async (req, res) => { try { await pool.query('DELETE FROM alislar WHERE id=$1', [req.params.id]); res.json({ ok: true }); } catch(e) { res.status(500).json({ error: e.message }); } });

app.get('/api/satislar', async (req, res) => { try { const r = await pool.query('SELECT * FROM satislar ORDER BY tarih DESC, saat DESC'); res.json(r.rows.map(fs)); } catch(e) { console.error('GET satislar:', e.message); res.status(500).json({ error: e.message }); } });
app.post('/api/satislar', async (req, res) => { try { const { tarih, saat, musteriId, musteriAd, urunId, urunAd, miktar, satisFiyat, toplam, odemeDurumu, odened, aciklama, islem, km, sonrakiBakim } = req.body; const r = await pool.query('INSERT INTO satislar (tarih,saat,musteri_id,musteri_ad,urun_id,urun_ad,miktar,satis_fiyat,toplam,odeme_durumu,odened,aciklama,islem,km,sonraki_bakim) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *', [tarih, saat||'', musteriId||null, musteriAd||'', urunId||null, urunAd||'', miktar||0, satisFiyat||0, toplam||0, odemeDurumu||'bekliyor', odened||0, aciklama||'', islem||'', km||0, sonrakiBakim||null]); res.json(fs(r.rows[0])); } catch(e) { console.error('POST satislar:', e.message); res.status(500).json({ error: e.message }); } });
app.put('/api/satislar/:id', async (req, res) => { try { const { tarih, saat, musteriId, musteriAd, urunId, urunAd, miktar, satisFiyat, toplam, odemeDurumu, odened, aciklama, islem, km, sonrakiBakim } = req.body; await pool.query('UPDATE satislar SET tarih=$1,saat=$2,musteri_id=$3,musteri_ad=$4,urun_id=$5,urun_ad=$6,miktar=$7,satis_fiyat=$8,toplam=$9,odeme_durumu=$10,odened=$11,aciklama=$12,islem=$13,km=$14,sonraki_bakim=$15 WHERE id=$16', [tarih, saat||'', musteriId||null, musteriAd||'', urunId||null, urunAd||'', miktar||0, satisFiyat||0, toplam||0, odemeDurumu||'bekliyor', odened||0, aciklama||'', islem||'', km||0, sonrakiBakim||null, req.params.id]); res.json({ ok: true }); } catch(e) { console.error('PUT satislar:', e.message); res.status(500).json({ error: e.message }); } });
app.delete('/api/satislar/:id', async (req, res) => { try { await pool.query('DELETE FROM satislar WHERE id=$1', [req.params.id]); res.json({ ok: true }); } catch(e) { res.status(500).json({ error: e.message }); } });

app.get('/api/giderler', async (req, res) => { try { const r = await pool.query('SELECT * FROM giderler ORDER BY tarih DESC'); res.json(r.rows.map(fg)); } catch(e) { res.status(500).json({ error: e.message }); } });
app.post('/api/giderler', async (req, res) => { try { const { tarih, saat, aciklama, kategori, tutar } = req.body; const r = await pool.query('INSERT INTO giderler (tarih,saat,aciklama,kategori,tutar) VALUES ($1,$2,$3,$4,$5) RETURNING *', [tarih, saat||'', aciklama||'', kategori||'Genel', tutar||0]); res.json(fg(r.rows[0])); } catch(e) { res.status(500).json({ error: e.message }); } });
app.put('/api/giderler/:id', async (req, res) => { try { const { tarih, saat, aciklama, kategori, tutar } = req.body; await pool.query('UPDATE giderler SET tarih=$1,saat=$2,aciklama=$3,kategori=$4,tutar=$5 WHERE id=$6', [tarih, saat||'', aciklama||'', kategori||'Genel', tutar||0, req.params.id]); res.json({ ok: true }); } catch(e) { res.status(500).json({ error: e.message }); } });
app.delete('/api/giderler/:id', async (req, res) => { try { await pool.query('DELETE FROM giderler WHERE id=$1', [req.params.id]); res.json({ ok: true }); } catch(e) { res.status(500).json({ error: e.message }); } });

app.get('/api/sorgula', async (req, res) => {
  try {
    const temizle = v => String(v||'').toUpperCase().replace(/İ/g,'I').replace(/[^A-Z0-9]/g,'');
    const plaka = temizle(req.query.plaka);
    const sase = temizle(req.query.sase);
    if(!plaka || sase.length < 6) return res.status(400).json({ error: 'Plaka ve şasi numarasının son 6 hanesi gereklidir.' });
    const r = await pool.query(
      "SELECT * FROM musteriler WHERE REGEXP_REPLACE(UPPER(plaka),'[^A-Z0-9]','','g')=$1 AND RIGHT(REGEXP_REPLACE(UPPER(sase),'[^A-Z0-9]','','g'),6)=$2",
      [plaka, sase.slice(-6)]);
    if(!r.rows.length){
      console.log('Sorgu eşleşmedi -> plaka:', plaka, 'sase son6:', sase.slice(-6));
      return res.status(404).json({ error: 'Bu plaka ve şasi numarasıyla eşleşen araç bulunamadı.' });
    }
    const m = r.rows[0];
    const s = await pool.query('SELECT * FROM satislar WHERE musteri_id=$1 ORDER BY tarih DESC, saat DESC', [m.id]);
    res.json({ arac: { plaka: m.plaka, arac: m.arac||'', km: parseInt(m.km||0) }, servisler: s.rows.map(fs) });
  } catch(e) { console.error('GET sorgula:', e.message); res.status(500).json({ error: e.message }); }
});

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

process.on('uncaughtException', (err) => { console.error('Uncaught:', err.message); });
process.on('unhandledRejection', (err) => { console.error('Unhandled:', err); });

const PORT = process.env.PORT || 8080;
initDB().then(() => {
  app.listen(PORT, () => { console.log('Arac Bakim Sistemi running on port ' + PORT); });
}).catch(err => { console.error('DB init error:', err.message); process.exit(1); });
