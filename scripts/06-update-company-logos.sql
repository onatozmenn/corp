-- Hibrit Logo API yaklaşımı: Google Favicon + Clearbit
-- Önce Google Favicon'u deneyelim, çalışmayanlar için Clearbit kullanalım

-- Önce mevcut logo_url'leri temizle
UPDATE companies SET logo_url = NULL WHERE logo_url IS NOT NULL;

-- 1. ADIM: Google Favicon ile çalışan şirketler (test edilmiş)
-- Bu şirketler Google Favicon'da güvenilir şekilde çalışıyor

UPDATE companies SET logo_url = 'https://www.google.com/s2/favicons?domain=garantibbva.com.tr&sz=64' WHERE name = 'Garanti BBVA';
UPDATE companies SET logo_url = 'https://www.google.com/s2/favicons?domain=arcelik.com.tr&sz=64' WHERE name = 'Arçelik';
UPDATE companies SET logo_url = 'https://www.google.com/s2/favicons?domain=trendyol.com&sz=64' WHERE name = 'Trendyol';
UPDATE companies SET logo_url = 'https://www.google.com/s2/favicons?domain=getir.com&sz=64' WHERE name = 'Getir';
UPDATE companies SET logo_url = 'https://www.google.com/s2/favicons?domain=hepsiburada.com&sz=64' WHERE name = 'Hepsiburada';
UPDATE companies SET logo_url = 'https://www.google.com/s2/favicons?domain=akbank.com&sz=64' WHERE name = 'Akbank';
UPDATE companies SET logo_url = 'https://www.google.com/s2/favicons?domain=migros.com.tr&sz=64' WHERE name = 'Migros';
UPDATE companies SET logo_url = 'https://www.google.com/s2/favicons?domain=isbank.com.tr&sz=64' WHERE name = 'İş Bankası';
UPDATE companies SET logo_url = 'https://www.google.com/s2/favicons?domain=flypgs.com&sz=64' WHERE name = 'Pegasus';
UPDATE companies SET logo_url = 'https://www.google.com/s2/favicons?domain=turkishairlines.com&sz=64' WHERE name = 'Turkish Airlines';
UPDATE companies SET logo_url = 'https://www.google.com/s2/favicons?domain=vodafone.com.tr&sz=64' WHERE name = 'Vodafone Türkiye';
UPDATE companies SET logo_url = 'https://www.google.com/s2/favicons?domain=bim.com.tr&sz=64' WHERE name = 'BİM';
UPDATE companies SET logo_url = 'https://www.google.com/s2/favicons?domain=a101.com.tr&sz=64' WHERE name = 'A101';
UPDATE companies SET logo_url = 'https://www.google.com/s2/favicons?domain=ziraatbank.com.tr&sz=64' WHERE name = 'Ziraat Bankası';
UPDATE companies SET logo_url = 'https://www.google.com/s2/favicons?domain=halkbank.com.tr&sz=64' WHERE name = 'Halkbank';
UPDATE companies SET logo_url = 'https://www.google.com/s2/favicons?domain=enka.com&sz=64' WHERE name = 'Enka';
UPDATE companies SET logo_url = 'https://www.google.com/s2/favicons?domain=dogusgrubu.com.tr&sz=64' WHERE name = 'Doğuş Grubu';

-- 2. ADIM: Clearbit ile çalışan şirketler (daha iyi logo kalitesi)
-- Bu şirketler Clearbit'te daha iyi logo kalitesi sunuyor

UPDATE companies SET logo_url = 'https://logo.clearbit.com/turktelekom.com.tr' WHERE name = 'Türk Telekom';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/sabanci.com' WHERE name = 'Sabancı Holding';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/koc.com.tr' WHERE name = 'Koç Holding';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/turkcell.com.tr' WHERE name = 'Turkcell';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/anadoluefes.com' WHERE name = 'Anadolu Efes';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/yapikredi.com.tr' WHERE name = 'Yapı Kredi';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/tav.aero' WHERE name = 'TAV';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/ulker.com.tr' WHERE name = 'Ülker';

-- Alternatif olarak, eğer Google Favicon çalışmazsa Clearbit'e fallback
-- Bu komutları yukarıdakiler çalışmazsa kullanabilirsiniz:

/*
UPDATE companies SET logo_url = 'https://logo.clearbit.com/turktelekom.com.tr' WHERE name = 'Türk Telekom';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/garantibbva.com.tr' WHERE name = 'Garanti BBVA';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/arcelik.com.tr' WHERE name = 'Arçelik';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/trendyol.com' WHERE name = 'Trendyol';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/getir.com' WHERE name = 'Getir';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/hepsiburada.com' WHERE name = 'Hepsiburada';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/akbank.com' WHERE name = 'Akbank';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/sabanci.com' WHERE name = 'Sabancı Holding';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/koc.com.tr' WHERE name = 'Koç Holding';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/migros.com.tr' WHERE name = 'Migros';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/turkcell.com.tr' WHERE name = 'Turkcell';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/isbank.com.tr' WHERE name = 'İş Bankası';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/anadoluefes.com' WHERE name = 'Anadolu Efes';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/ulker.com.tr' WHERE name = 'Ülker';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/flypgs.com' WHERE name = 'Pegasus';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/turkishairlines.com' WHERE name = 'Turkish Airlines';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/yapikredi.com.tr' WHERE name = 'Yapı Kredi';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/vodafone.com.tr' WHERE name = 'Vodafone Türkiye';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/bim.com.tr' WHERE name = 'BİM';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/a101.com.tr' WHERE name = 'A101';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/ziraatbank.com.tr' WHERE name = 'Ziraat Bankası';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/halkbank.com.tr' WHERE name = 'Halkbank';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/tav.aero' WHERE name = 'TAV';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/enka.com' WHERE name = 'Enka';
UPDATE companies SET logo_url = 'https://logo.clearbit.com/dogusgrubu.com.tr' WHERE name = 'Doğuş Grubu';
*/

-- Güncelleme sonrası kontrol
SELECT id, name, logo_url FROM companies WHERE logo_url IS NOT NULL ORDER BY id; 