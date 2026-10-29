/**
 * Compression d'une photo de pièce avant stockage : 1 280 px au plus sur le grand côté, JPEG qualité 0,6.
 * Une facture reste lisible pour environ 100 Ko, au lieu de 2 à 4 Mo sortis de l'appareil photo.
 */
const COTE_MAX = 1280;
const QUALITE = 0.6;

async function chargerImage(fichier: Blob): Promise<{ largeur: number; hauteur: number; dessiner: (c: CanvasRenderingContext2D, l: number, h: number) => void; liberer: () => void }> {
  if ('createImageBitmap' in window) {
    const bmp = await createImageBitmap(fichier);
    return { largeur: bmp.width, hauteur: bmp.height, dessiner: (c, l, h) => c.drawImage(bmp, 0, 0, l, h), liberer: () => bmp.close() };
  }
  const url = URL.createObjectURL(fichier);
  const img = new Image();
  img.src = url;
  await img.decode();
  return { largeur: img.naturalWidth, hauteur: img.naturalHeight, dessiner: (c, l, h) => c.drawImage(img, 0, 0, l, h), liberer: () => URL.revokeObjectURL(url) };
}

export async function compresserPhoto(fichier: Blob): Promise<Blob> {
  const image = await chargerImage(fichier);
  try {
    const echelle = Math.min(1, COTE_MAX / Math.max(image.largeur, image.hauteur));
    const l = Math.round(image.largeur * echelle);
    const h = Math.round(image.hauteur * echelle);
    const canvas = document.createElement('canvas');
    canvas.width = l;
    canvas.height = h;
    const c = canvas.getContext('2d');
    if (!c) return fichier;
    image.dessiner(c, l, h);
    const resultat = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', QUALITE));
    // Si la compression grossit le fichier (petite image déjà compressée), on garde l'original.
    return resultat && resultat.size < fichier.size ? resultat : fichier;
  } finally {
    image.liberer();
  }
}
