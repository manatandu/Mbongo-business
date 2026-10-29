/** Livres de l'entreprenant (AUDCG, art. 30 à 32). Données fictives. */
import { describe, expect, it } from 'vitest';
import { controler, livreEntreprenant, registreAchats } from '../../src/moteur';
import { annulation, dossierDeBase, op } from './outils';

const comptes = [
  { id: 'caisse', type: 'caisse' as const, libelle: 'Caisse', devise: 'CDF' as const },
  { id: 'mpesa', type: 'mobile' as const, libelle: 'M-Pesa', devise: 'CDF' as const },
  { id: 'usd', type: 'caisse' as const, libelle: 'Caisse dollars', devise: 'USD' as const },
];

describe("livre de l'entreprenant (art. 31)", () => {
  const venteCaisse = op({ id: 'v1', date: '2026-03-02', type: 'recette', nature: 'ventes', montant: 300_000 });
  const venteMpesa = op({ id: 'v2', date: '2026-03-03', compte: 'mpesa', type: 'recette', nature: 'ventes', montant: 120_000 });
  const venteDollars = op({ id: 'v3', date: '2026-03-04', compte: 'usd', type: 'recette', nature: 'ventes', montant: 5_000, devise: 'USD', taux: 2800 });
  const achat = op({ id: 'a1', date: '2026-03-05', type: 'depense', nature: 'achats_marchandises', montant: 200_000 });
  const depot = op({ id: 't1', date: '2026-03-06', type: 'transfert', nature: 'transfert', montant: 100_000, compteDestination: 'mpesa' });
  const d = dossierDeBase({
    comptes,
    soldesOuverture: { caisse: 1_000_000, mpesa: 0, usd: 0 },
    operations: [venteCaisse, venteMpesa, venteDollars, achat, depot, annulation(venteMpesa, '2026-03-20')],
  });

  it('distingue les espèces des autres modes et laisse de côté les transferts', () => {
    const l = livreEntreprenant(d, '2026-03-01', '2026-03-31');
    expect(l.lignes.map((x) => x.operation)).not.toContain('t1');
    expect(l.ressourcesEspeces).toBe(300_000 + 140_000); // 50 $ à 2 800 FC
    expect(l.ressourcesAutres).toBe(120_000 - 120_000);
    expect(l.emplois).toBe(200_000);
  });

  it("garde l'ordre chronologique et montre l'annulation en négatif", () => {
    const l = livreEntreprenant(d, '2026-03-01', '2026-03-31');
    expect(l.lignes.map((x) => x.date)).toEqual([...l.lignes.map((x) => x.date)].sort());
    const derniere = l.lignes[l.lignes.length - 1];
    expect(derniere).toMatchObject({ date: '2026-03-20', mode: 'autre', compte: 'M-Pesa', montantFC: -120_000 });
  });

  it('ne prend que la période demandée', () => {
    expect(livreEntreprenant(d, '2026-04-01', '2026-04-30').lignes).toEqual([]);
  });
});

describe('registre des achats (art. 32)', () => {
  const comptant = op({ id: 'a1', date: '2026-02-10', type: 'depense', nature: 'achats_marchandises', montant: 400_000, reference: 'R-12' });
  const fournitures = op({ id: 'a2', date: '2026-03-15', compte: 'banque', type: 'depense', nature: 'achats_fournitures', montant: 50_000 });
  const loyer = op({ id: 'l1', date: '2026-03-01', type: 'depense', nature: 'loyers', montant: 150_000 });
  const dette = { id: 'd1', date: '2026-03-20', facture: 'F-88', nom: 'Grossiste fictif', nature: 'achats_marchandises' as const, montant: 900_000, devise: 'CDF' as const, taux: null };
  const reglement = op({ id: 'r1', date: '2026-04-02', type: 'depense', nature: 'achats_marchandises', montant: 900_000, reglementDe: { genre: 'dette', ligne: 'd1' } });
  const d = dossierDeBase({ operations: [comptant, fournitures, loyer, reglement], dettes: [dette] });

  it('liste les achats payés et à crédit, avec mode de règlement et référence', () => {
    const r = registreAchats(d);
    expect(r.lignes.map((l) => [l.date, l.mode, l.reference])).toEqual([
      ['2026-02-10', 'especes', 'R-12'],
      ['2026-03-15', 'autre', ''],
      ['2026-03-20', 'credit', 'F-88'],
    ]);
  });

  it("ne compte pas le règlement d'un achat à crédit comme un second achat", () => {
    expect(registreAchats(d).total).toBe(400_000 + 50_000 + 900_000);
  });

  it('récapitule par mois', () => {
    expect(registreAchats(d).parMois).toEqual([
      { mois: '2026-02', total: 400_000 },
      { mois: '2026-03', total: 950_000 },
    ]);
  });
});

describe('seuil de l’entreprenant (art. 30)', () => {
  // Négoce : 60 M FCFA, soit 300 M FC à 5 FC pour 1 FCFA.
  const grosseVente = op({ date: '2026-05-01', type: 'recette', nature: 'ventes', montant: 310_000_000 });
  const codes = (p: Parameters<typeof dossierDeBase>[0]) => controler(dossierDeBase(p), '2026-06-30', { fcfaVersCdf: 5 }).map((a) => a.code);

  it("prévient la première année au-dessus du seuil, sans retirer le statut", () => {
    const c = codes({ entreprise: { nom: 'Fictif', secteur: 'negoce', statut: 'entreprenant' }, operations: [grosseVente] });
    expect(c).toContain('entreprenant_seuil');
    expect(c).not.toContain('entreprenant_statut');
  });

  it('signale la perte du statut après deux années de suite', () => {
    const c = codes({ entreprise: { nom: 'Fictif', secteur: 'negoce', statut: 'entreprenant' }, operations: [grosseVente], chiffreAffairesPrecedent: 305_000_000 });
    expect(c).toContain('entreprenant_statut');
  });

  it("ne dit rien à un commerçant immatriculé, ni sous le seuil", () => {
    expect(codes({ entreprise: { nom: 'Fictif', secteur: 'negoce', statut: 'commercant' }, operations: [grosseVente] })).not.toContain('entreprenant_seuil');
    expect(codes({ entreprise: { nom: 'Fictif', secteur: 'negoce', statut: 'entreprenant' }, chiffreAffairesPrecedent: 305_000_000 })).not.toContain('entreprenant_statut');
  });
});
