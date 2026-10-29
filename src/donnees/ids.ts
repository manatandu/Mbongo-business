/**
 * Identifiants UUID v7, créés sur le téléphone sans passer par le serveur.
 * Ordonnés dans le temps : ils se trient comme les saisies.
 */
export function nouvelId(maintenant: number = Date.now()): string {
  const o = new Uint8Array(16);
  crypto.getRandomValues(o);
  let t = maintenant;
  for (let i = 5; i >= 0; i--) {
    o[i] = t % 256;
    t = Math.floor(t / 256);
  }
  o[6] = ((o[6] ?? 0) & 0x0f) | 0x70;
  o[8] = ((o[8] ?? 0) & 0x3f) | 0x80;
  const h = [...o].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
