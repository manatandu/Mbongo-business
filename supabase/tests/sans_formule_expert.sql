-- Essai : plus de nouvelle formule « Avec l'expert-comptable » (migration 20261101_sans_formule_expert.sql).
-- Tout est annulé à la fin ; le message d'erreur final dit « ESSAI RÉUSSI » ou liste les échecs.
do $$
declare
  ux uuid := gen_random_uuid();
  c uuid; ancien uuid; a uuid; n int;
  echecs text[] := '{}';
begin
  insert into auth.users (id, email) values (ux, 'admin.formule@exemple.invalid');
  insert into public.administrateurs (user_id, role, email) values (ux, 'admin', 'admin.formule@exemple.invalid');
  insert into public.clients (nom, telephone, secteur) values ('Client formule (essai)', '+243810000041', 'negoce') returning id into c;

  -- Ligne « expert » d'avant la migration.
  alter table public.abonnements disable trigger abonnements_sans_formule_expert;
  insert into public.abonnements (client_id, formule, debut, fin, montant) values (c, 'expert', date '2026-09-01', date '2026-09-30', 0) returning id into ancien;
  alter table public.abonnements enable trigger abonnements_sans_formule_expert;

  perform set_config('request.jwt.claims', json_build_object('sub', ux, 'role', 'authenticated')::text, true);
  set local role authenticated;
  -- Nouvelle ligne « expert » : refusée, même par l'administrateur.
  begin
    insert into public.abonnements (client_id, formule, debut, fin, montant) values (c, 'expert', date '2026-10-01', date '2026-10-31', 100000);
    echecs := array_append(echecs, 'nouvelle formule expert acceptée');
  exception when check_violation then null; end;
  -- Une formule de TRK passe ; elle ne peut pas devenir « expert ».
  insert into public.abonnements (client_id, formule, debut, fin, montant) values (c, 'suivi', date '2026-10-01', date '2026-10-31', 50000) returning id into a;
  begin
    update public.abonnements set formule = 'expert' where id = a;
    echecs := array_append(echecs, 'passage à la formule expert accepté');
  exception when check_violation then null; end;
  -- L'ancienne ligne reste lisible et modifiable sur ses autres colonnes.
  begin
    update public.abonnements set montant = 0, fin = date '2026-09-29' where id = ancien;
  exception when others then echecs := array_append(echecs, 'ancienne ligne bloquée : ' || sqlerrm); end;
  select count(*) into n from public.abonnements where client_id = c; if n <> 2 then echecs := array_append(echecs, 'lignes : ' || n); end if;
  select count(*) into n from public.vue_clients where id = c and formule = 'suivi'; if n <> 1 then echecs := array_append(echecs, 'vue_clients'); end if;
  reset role;

  if cardinality(echecs) = 0 then raise exception 'ESSAI RÉUSSI (tout est annulé)'; else raise exception 'ÉCHECS : %', array_to_string(echecs, ' ; '); end if;
end $$;
