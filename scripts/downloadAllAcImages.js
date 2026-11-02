const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'public', 'images', 'products');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const acImages = [
  // ─── DAIKIN (Japan) ───
  {
    id: "prod-daikin-15-5star",
    name: "Daikin 1.5 Ton 5 Star Inverter Split AC (MTKM50U)",
    filename: "daikin-mtkm50u.jpg",
    url: "https://daikinindia.com/sites/default/files/inline-images/MTKM50XV16MKA+RKM50XV16MKA.jpg"
  },
  {
    id: "prod-daikin-10-3star",
    name: "Daikin 1.0 Ton 3 Star Inverter Split AC (FTKY35U)",
    filename: "daikin-ftky35u.jpg",
    url: "https://daikinindia.com/sites/default/files/inline-images/ftku35xv16vaa%2Brku35xv16vaa.jpg"
  },
  {
    id: "prod-daikin-20-5star",
    name: "Daikin 2.0 Ton 5 Star Heavy Duty Split AC (FTKM71U)",
    filename: "daikin-ftkm71u.jpg",
    url: "https://daikinindia.com/sites/default/files/inline-images/ftkl71xv16maa%2Brkl71xv16maa_3.jpg"
  },

  // ─── VOLTAS (Tata Product) ───
  {
    id: "prod-voltas-15-5star",
    name: "Voltas 1.5 Ton 5 Star Inverter Split AC (185V Vectra Elite)",
    filename: "voltas-185v.jpg",
    url: "https://www.voltas.com/cdn/shop/files/EliteGoldrevised.png"
  },
  {
    id: "prod-voltas-10-3star",
    name: "Voltas 1.0 Ton 3 Star Inverter Split AC (123V Vectra Elegant)",
    filename: "voltas-123v.jpg",
    url: "https://www.voltas.com/cdn/shop/files/B0GYWTQPBY-4504052.jpg?v=1781609844"
  },
  {
    id: "prod-voltas-15-window",
    name: "Voltas 1.5 Ton 3 Star Inverter Window AC (183V Vectra Pearl Window)",
    filename: "voltas-183v-window.jpg",
    url: "https://www.voltas.com/cdn/shop/files/1_1f88cb2b-e33e-42b7-ac3c-2033826d74b0.jpg?v=1778499856"
  },

  // ─── LG (Life's Good) ───
  {
    id: "prod-lg-15-5star",
    name: "LG 1.5 Ton 5 Star AI Dual Inverter Split AC (TS-Q19YNZE)",
    filename: "lg-ts-q19ynze.jpg",
    url: "https://www.lg.com/content/dam/channel/wcms/in/images/split-ac/ts-q19cnze_anlg_eail_in_c/gallery/TS-Q19CNZE-split-ac-Front-View-D-01.jpg"
  },
  {
    id: "prod-lg-10-4star",
    name: "LG 1.0 Ton 4 Star Dual Inverter Split AC (TS-Q14YNXE)",
    filename: "lg-ts-q14ynxe.jpg",
    url: "https://www.lg.com/content/dam/channel/wcms/in/images/split-ac/ts-q14cnze_anlg_eail_in_c/gallery/TS-Q14CNZE-split-ac-Front-View-D-01.jpg"
  },
  {
    id: "prod-lg-20-3star",
    name: "LG 2.0 Ton 3 Star Dual Inverter Split AC (TS-Q24ENXE)",
    filename: "lg-ts-q24enxe.jpg",
    url: "https://www.lg.com/content/dam/channel/wcms/in/images/split-ac/as-q24enxe-anlg-eail-in-c/gallery/new-img/AS-Q24ENXE-ANLG-450x450-1-v.jpg"
  },

  // ─── BLUE STAR (India's Cooling Expert) ───
  {
    id: "prod-bluestar-15-5star",
    name: "Blue Star 1.5 Ton 5 Star Inverter Split AC (IA518VNU)",
    filename: "bluestar-ia518vnu.jpg",
    url: "https://cdn.shopify.com/s/files/1/0888/8297/0937/files/GalleryImage01_5b3bb90b-0e29-45de-a99c-fa85c1ace85a.png?v=1773896346"
  },
  {
    id: "prod-bluestar-10-3star",
    name: "Blue Star 1.0 Ton 3 Star Inverter Split AC (IA312YNU)",
    filename: "bluestar-ia312ynu.jpg",
    url: "https://cdn.shopify.com/s/files/1/0888/8297/0937/files/GalleryImages01_75d5ded4-0d1e-4aa2-aa17-7e1e8549b0c0.png?v=1767783619"
  },
  {
    id: "prod-bluestar-20-4star",
    name: "Blue Star 2.0 Ton 4 Star Heavy Duty Inverter AC (IA424YNU)",
    filename: "bluestar-ia424ynu.jpg",
    url: "https://cdn.shopify.com/s/files/1/0888/8297/0937/files/GalleryImages01_c8d08ac8-f954-4be0-9fd7-176abebe6f39.png?v=1768484712"
  },

  // ─── PANASONIC (Japan) ───
  {
    id: "prod-panasonic-15-5star",
    name: "Panasonic 1.5 Ton 5 Star Smart Wi-Fi Inverter AC (CS/CU-NU18YKY5W)",
    filename: "panasonic-nu18yky5w.jpg",
    url: "https://store.in.panasonic.com/media/catalog/product/cache/b11e74dacaf724c92618cd828f5b816b/c/s/cscu-nu18bky5wx_info_28feb_1.jpg"
  },
  {
    id: "prod-panasonic-10-3star",
    name: "Panasonic 1.0 Ton 3 Star Smart Wi-Fi Inverter AC (CS/CU-SU12YKY3W)",
    filename: "panasonic-su12yky3w.jpg",
    url: "https://store.in.panasonic.com/media/catalog/product/cache/b11e74dacaf724c92618cd828f5b816b/c/s/cscu-su12bky3w_info_28feb_1.jpg"
  },
  {
    id: "prod-panasonic-20-5star",
    name: "Panasonic 2.0 Ton 5 Star Twin Cool Inverter AC (CS/CU-XU24YKYF)",
    filename: "panasonic-xu24ykyf.jpg",
    url: "https://store.in.panasonic.com/media/catalog/product/cache/b11e74dacaf724c92618cd828f5b816b/c/s/cscu-nu24bky5w_info_28feb_1.jpg"
  }
];

async function downloadImage(item) {
  const filePath = path.join(targetDir, item.filename);
  console.log(`Downloading [${item.id}] -> ${item.filename}...`);
  try {
    const res = await fetch(item.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/jpeg,image/png;q=0.9,image/*;q=0.8'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type') || '';
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);
    console.log(`✓ Saved ${item.filename} (${(buffer.length / 1024).toFixed(1)} KB, Content-Type: ${contentType})`);
    return { success: true, item, bytes: buffer.length, contentType };
  } catch (err) {
    console.error(`✗ Failed ${item.filename}:`, err.message);
    return { success: false, item, error: err.message };
  }
}

async function run() {
  console.log(`Starting download of ${acImages.length} authentic AC images...`);
  const results = [];
  for (const item of acImages) {
    const res = await downloadImage(item);
    results.push(res);
  }

  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n================================`);
  console.log(`Download Complete: ${succeeded.length}/${acImages.length} succeeded.`);
  if (failed.length > 0) {
    console.error(`Failed items:`, failed);
    process.exit(1);
  } else {
    console.log('All 15 authentic AC images downloaded successfully!');
  }
}

run();
