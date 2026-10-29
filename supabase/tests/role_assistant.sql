-- Essai du rôle assistant et de la gestion de l'équipe. Tout est annulé à la fin ;
-- le message d'erreur final dit « ESSAI RÉUSSI » ou liste les échecs.
do $$
declare
  uadm uuid := gen_random_uuid(); uass uuid := gen_random_uuid(); ucom uuid := gen_random_uuid();
  c uuid; nouv uuid; n int; echecs text[] := '{}';
begin
  insert into auth.users (id, email) values (uadm, 'adm.essai@exemple.invalid'), (uass, 'ass.essai@exemple.invalid'), (ucom, 'com.essai@exemple.invalid');
  insert into public.administrateurs (user_id, role, email) values (uadm, 'admin', 'adm.essai@exemple.invalid'), (uass, 'assistant', 'ass.essai@exemple.invalid');
  insert into public.clients (nom, telephone, secteur) values ('Client essai', '+243810000009', 'negoce') returning id into c;
  insert into public.abonnements (client_id, formule, debut, fin, montant) values (c, 'essentiel', current_date, current_date + 29, 25000);
  insert into public.saisies (id, client_id, type, contenu, saisi_le, auteur) values (gen_random_uuid(), c, 'operation', '{}', now(), uadm);

  -- L'assistant lit et note le suivi, rien d'autre.
  perform set_config('request.jwt.claims', json_build_object('sub', uass, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.vue_clients where id = c; if n <> 1 then echecs := array_append(echecs, 'assistant ne voit pas le client'); end if;
  select count(*) into n from public.abonnements where client_id = c; if n <> 1 then echecs := array_append(echecs, 'assistant ne voit pas l''abonnement'); end if;
  select count(*) into n from public.saisies; if n <> 0 then echecs := array_append(echecs, 'assistant voit les saisies'); end if;
  begin insert into public.clients (nom, telephone, secteur) values ('x', '+243810000010', 'negoce'); echecs := array_append(echecs, 'assistant crée un client'); exception when insufficient_privilege then null; end;
  begin insert into public.abonnements (client_id, formule, debut, fin, montant) values (c, 'suivi', current_date, current_date, 1); echecs := array_append(echecs, 'assistant crée un abonnement'); exception when insufficient_privilege then null; end;
  begin insert into public.paiements (client_id, montant, mode) values (c, 1000, 'mpesa'); echecs := array_append(echecs, 'assistant crée un paiement'); exception when insufficient_privilege then null; end;
  update public.clients set nom = 'modifié' where id = c; get diagnostics n = row_count; if n <> 0 then echecs := array_append(echecs, 'assistant modifie un client'); end if;
  begin insert into public.suivis (client_id, type, note) values (c, 'appel', 'Appel de relance'); exception when others then echecs := array_append(echecs, 'assistant ne peut pas noter : ' || sqlerrm); end;
  begin perform public.lancer_rappels(); echecs := array_append(echecs, 'assistant lance les rappels'); exception when others then null; end;
  begin perform public.creer_membre_equipe('pirate@exemple.invalid', '12345678', 'admin'); echecs := array_append(echecs, 'assistant crée un membre'); exception when others then null; end;
  select count(*) into n from public.administrateurs; if n <> 1 then echecs := array_append(echecs, 'assistant voit ' || n || ' membres'); end if;

  -- L'administrateur gère l'équipe.
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', uadm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  nouv := public.creer_membre_equipe('Nouvel.Assistant@exemple.invalid', 'motdepasse1', 'assistant');
  select count(*) into n from public.administrateurs where user_id = nouv and role = 'assistant' and email = 'nouvel.assistant@exemple.invalid'; if n <> 1 then echecs := array_append(echecs, 'membre non créé'); end if;
  perform public.changer_role_equipe(nouv, 'admin');
  select count(*) into n from public.administrateurs where user_id = nouv and role = 'admin'; if n <> 1 then echecs := array_append(echecs, 'rôle non changé'); end if;
  begin perform public.changer_role_equipe(uadm, 'assistant'); echecs := array_append(echecs, 'admin se rétrograde'); exception when others then null; end;
  perform public.reinitialiser_mot_de_passe(nouv, 'autremotdepasse');
  perform public.retirer_membre_equipe(nouv);
  select count(*) into n from public.administrateurs where user_id = nouv; if n <> 0 then echecs := array_append(echecs, 'membre non retiré'); end if;
  reset role;
  select count(*) into n from auth.users where id = nouv and encrypted_password = extensions.crypt('autremotdepasse', encrypted_password); if n <> 1 then echecs := array_append(echecs, 'mot de passe non réinitialisé'); end if;

  if cardinality(echecs) = 0 then raise exception 'ESSAI RÉUSSI (tout est annulé)'; else raise exception 'ÉCHECS : %', array_to_string(echecs, ' ; '); end if;
end $$;
