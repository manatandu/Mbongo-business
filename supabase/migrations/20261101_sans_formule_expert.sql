-- Plus de formule « Avec l'expert-comptable » dans les abonnements de TRK Consulting.
--
-- Loi n° 15/002, art. 50 : les honoraires de l'expert-comptable sont « exclusifs de toute autre rémunération,
-- même indirecte, d'un tiers, à quelque titre que ce soit ». L'expert partenaire facture et encaisse donc
-- lui-même ses missions (arrêté des états, fiscal, tenue déléguée) ; TRK ne les vend pas.
--
-- Les anciennes lignes « expert » restent telles quelles (historique, paiements rattachés) et peuvent encore être
-- modifiées sur leurs autres colonnes. Seules sont refusées : une nouvelle ligne « expert », et le passage d'une
-- ligne à « expert ». La contrainte de la table n'est pas touchée.

create function prive.refuser_formule_expert() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.formule = 'expert' and (tg_op = 'INSERT' or old.formule is distinct from 'expert') then
    raise exception 'La formule « Avec l''expert-comptable » n''est plus vendue par TRK Consulting : l''expert-comptable partenaire facture lui-même ses missions (loi n° 15/002, art. 50).'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function prive.refuser_formule_expert() from public, anon, authenticated;

create trigger abonnements_sans_formule_expert
  before insert or update of formule on public.abonnements
  for each row execute function prive.refuser_formule_expert();
