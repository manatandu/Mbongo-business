/** Équipe de la console : administrateurs et assistants. Réservé aux administrateurs. */
import { useState, type FormEvent } from 'react';
import { Carte, Fenetre, Message, Pastille } from '../bureau/ui';
import { traduireErreur } from './Console';
import { LIBELLE_ROLE, type RoleEquipe } from './role';
import { sb, useLecture } from './supabase';

interface Membre {
  user_id: string;
  email: string;
  role: RoleEquipe;
  cree_le: string;
}

export function Equipe({ moi }: { moi: string }) {
  const membres = useLecture<Membre[]>(() => sb.from('administrateurs').select('user_id, email, role, cree_le').order('cree_le'), []);
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [role, setRole] = useState<RoleEquipe>('assistant');
  const [message, setMessage] = useState<{ ton: 'ok' | 'danger'; texte: string } | null>(null);

  const dire = (error: { message: string } | null, ok: string) => {
    setMessage(error ? { ton: 'danger', texte: traduireErreur(error.message) } : { ton: 'ok', texte: ok });
    if (!error) membres.relire();
    return !error;
  };

  async function ajouter(e: FormEvent) {
    e.preventDefault();
    const { error } = await sb.rpc('creer_membre_equipe', { p_email: email, p_mot_de_passe: mdp, p_role: role });
    if (dire(error, `${email} peut se connecter avec le mot de passe donné. Demandez-lui de le changer dans « Mon compte ».`)) {
      setEmail('');
      setMdp('');
    }
  }

  async function changerRole(m: Membre, r: RoleEquipe) {
    const { error } = await sb.rpc('changer_role_equipe', { p_user: m.user_id, p_role: r });
    dire(error, `${m.email} est maintenant ${LIBELLE_ROLE[r].toLowerCase()}.`);
  }

  async function reinitialiser(m: Membre) {
    const nouveau = window.prompt(`Nouveau mot de passe pour ${m.email} (8 caractères au moins)`);
    if (!nouveau) return;
    const { error } = await sb.rpc('reinitialiser_mot_de_passe', { p_user: m.user_id, p_mot_de_passe: nouveau });
    dire(error, `Mot de passe de ${m.email} changé.`);
  }

  async function retirer(m: Membre) {
    if (!window.confirm(`Retirer l'accès de ${m.email} à la console ?`)) return;
    const { error } = await sb.rpc('retirer_membre_equipe', { p_user: m.user_id });
    dire(error, `${m.email} n'a plus accès à la console.`);
  }

  return (
    <Fenetre titre="Équipe" droite={<span className="text-chrome-text-dim">{membres.donnees?.length ?? 0} membre(s)</span>}>
      <div className="flex flex-col gap-3">
        <Carte titre="Ajouter un membre">
          <form className="flex flex-wrap gap-3 items-end" onSubmit={(e) => void ajouter(e)}>
            <label>
              <span className="libelle">Adresse e-mail</span>
              <input className="champ w-64" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              <span className="libelle">Mot de passe provisoire</span>
              <input className="champ w-48" type="text" minLength={8} value={mdp} onChange={(e) => setMdp(e.target.value)} required />
            </label>
            <label>
              <span className="libelle">Rôle</span>
              <select className="champ" value={role} onChange={(e) => setRole(e.target.value as RoleEquipe)}>
                <option value="assistant">Assistant</option>
                <option value="admin">Administrateur</option>
              </select>
            </label>
            <button className="btn btn-principal">Ajouter</button>
          </form>
          <p className="m-0 text-text-dim text-[13px]">
            Assistant : voit les clients, abonnements, paiements et SMS, et note le suivi. Administrateur : tout, plus l'équipe. La console ne montre à aucun des deux les saisies comptables des
            clients ; le tableau de bord du serveur Supabase, où elles sont rangées, est réservé à l'administrateur technique.
          </p>
        </Carte>
        {message && <Message ton={message.ton}>{message.texte}</Message>}
        {membres.erreur && <Message ton="danger">{membres.erreur}</Message>}
        <div className="overflow-auto">
          <table className="grille">
            <thead>
              <tr>
                <th>Adresse</th>
                <th>Rôle</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(membres.donnees ?? []).map((m) => (
                <tr key={m.user_id}>
                  <td className="font-semibold">
                    {m.email}
                    {m.user_id === moi && <span className="text-text-dim font-normal"> (vous)</span>}
                  </td>
                  <td>
                    <Pastille ton={m.role === 'admin' ? 'neutre' : 'ok'}>{LIBELLE_ROLE[m.role]}</Pastille>
                  </td>
                  <td>
                    {m.user_id !== moi && (
                      <div className="flex flex-wrap gap-2">
                        <button className="btn btn-neutre" onClick={() => void changerRole(m, m.role === 'admin' ? 'assistant' : 'admin')}>
                          Passer {m.role === 'admin' ? 'assistant' : 'administrateur'}
                        </button>
                        <button className="btn btn-neutre" onClick={() => void reinitialiser(m)}>
                          Nouveau mot de passe
                        </button>
                        <button className="btn btn-neutre" onClick={() => void retirer(m)}>
                          Retirer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Fenetre>
  );
}
