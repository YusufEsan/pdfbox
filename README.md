<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

<h1 align="center">🧰 PDF Araçları</h1>

<p align="center">
  <strong>Tarayıcıda çalışan, sunucuya hiçbir dosya göndermeyen, ücretsiz ve açık kaynaklı PDF düzenleme araçları.</strong>
</p>

<p align="center">
  <a href="https://yusufesan.github.io/pdfbox/">
    <img src="https://img.shields.io/badge/🌐_Canlı_Demo-yusufesan.github.io/pdfbox-blue?style=for-the-badge" />
  </a>
</p>

---

## ✨ Özellikler

| Araç                   | Açıklama                                     |
| ---------------------- | -------------------------------------------- |
| 📎 **PDF Birleştirme** | Birden fazla PDF'i tek dosyada birleştirin   |
| ✂️ **Sayfa Silme**     | İstenmeyen sayfaları kaldırın                |
| 💧 **Filigran Ekle**   | Metin tabanlı filigran ekleyin               |
| 🔄 **PDF Döndür**      | Sayfaları 90°, 180°, 270° döndürün           |
| ✂️ **PDF Böl**         | Belgeleri sayfalara ayırın                   |
| 🖼️ **Görselden PDF'e** | Fotoğrafları PDF formatına dönüştürün        |
| 🔒 **PDF Şifreleme**   | Dosyalarınıza parola ekleyin                 |
| 📷 **PDF'den Görsele** | Sayfaları yüksek kaliteli PNG/JPG'ye çevirin |
| 🔀 **Sayfa Sıralama**  | Sürükle-bırak ile sayfa sırasını değiştirin  |

---

## 🔐 Gizlilik Öncelikli

Tüm işlemler **tamamen tarayıcınızda** gerçekleşir.

- ❌ Dosyalar hiçbir sunucuya yüklenmez
- ❌ Üçüncü taraf hizmeti kullanılmaz
- ✅ %100 istemci tarafında işlem
- ✅ Gizliliğiniz garanti altında

---

## 🛠️ Teknolojiler

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Dil:** [TypeScript](https://www.typescriptlang.org/)
- **Stil:** [Tailwind CSS 4](https://tailwindcss.com/)
- **PDF İşleme:** [pdf-lib](https://pdf-lib.js.org/) ·
  [pdfjs-dist](https://mozilla.github.io/pdf.js/)
- **Animasyonlar:** [Framer Motion](https://motion.dev/)
- **İkonlar:** [Lucide React](https://lucide.dev/)
- **Dağıtım:** [GitHub Pages](https://pages.github.com/)

---

## 🚀 Yerel Kurulum

```bash
# Depoyu klonlayın
git clone https://github.com/YusufEsan/pdfbox.git
cd pdfbox

# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açın.

---

## 📦 Derleme ve Dağıtım

```bash
# Statik build oluşturun
npm run build

# Build çıktısı `out/` klasöründedir
```

Her `main` dalına yapılan push, **GitHub Actions** aracılığıyla otomatik olarak
[GitHub Pages](https://yusufesan.github.io/pdfbox/)'e dağıtılır.

<p align="center">
  <sub>⭐ Beğendiyseniz yıldız vermeyi unutmayın!</sub>
</p>
