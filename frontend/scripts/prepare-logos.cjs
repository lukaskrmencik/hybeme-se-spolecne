// Generates cropped, transparent logo variants from the originals in assets/images/logos.
// Run: node scripts/prepare-logos.cjs
const path = require('path');
const Jimp = require('jimp-compact');

const dir = path.join(__dirname, '..', 'assets', 'images', 'logos');

function contentBounds(img, isContent) {
  const { width, height, data } = img.bitmap;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (isContent(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

// Removes a white background while keeping anti-aliased edges clean ("color to alpha").
function whiteToAlpha(img, strength = 150) {
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, i) {
    const d = this.bitmap.data;
    const a = Math.min(1, Math.max(255 - d[i], 255 - d[i + 1], 255 - d[i + 2]) / strength);
    if (a <= 0.02) {
      d[i + 3] = 0;
      return;
    }
    for (let c = 0; c < 3; c++) {
      d[i + c] = Math.max(0, Math.min(255, Math.round((d[i + c] - (1 - a) * 255) / a)));
    }
    d[i + 3] = Math.round(a * 255);
  });
  return img;
}

const saturated = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) > 40;

async function cropTo(img, bounds, padRatio) {
  const w = bounds.maxX - bounds.minX + 1;
  const h = bounds.maxY - bounds.minY + 1;
  const pad = Math.round(Math.max(w, h) * padRatio);
  const x = Math.max(0, bounds.minX - pad);
  const y = Math.max(0, bounds.minY - pad);
  return img.crop(
    x,
    y,
    Math.min(img.bitmap.width - x, w + pad * 2),
    Math.min(img.bitmap.height - y, h + pad * 2)
  );
}

(async () => {
  const hss = await Jimp.read(path.join(dir, 'logo_hss.png'));
  const hssBounds = contentBounds(hss, saturated);
  await cropTo(hss, hssBounds, 0.02);
  const side = Math.max(hss.bitmap.width, hss.bitmap.height);
  const square = new Jimp(side, side, 0xffffffff);
  square.composite(hss, Math.round((side - hss.bitmap.width) / 2), Math.round((side - hss.bitmap.height) / 2));
  whiteToAlpha(square).resize(512, 512).write(path.join(dir, 'logo_hss_mark.png'));

  const sko = await Jimp.read(path.join(dir, 'škoenergo.png'));
  await cropTo(sko, contentBounds(sko, saturated), 0.01);
  whiteToAlpha(sko).write(path.join(dir, 'skoenergo_wordmark.png'));

  console.log('hss bounds', hssBounds, '-> logo_hss_mark.png 512x512');
  console.log('skoenergo ->', sko.bitmap.width, 'x', sko.bitmap.height);
})();
