-- Essai du cloisonnement et des rappels, à lancer sur le projet (éditeur SQL ou outil execute_sql).
-- Tout se passe dans un bloc qui finit par une erreur volontaire : rien n'est gardé dans la base.
-- Le message d'erreur final donne le résultat : « ESSAI RÉUSSI » ou la liste des échecs.
do $$
declare
  ua uuid := gen_random_uuid();   -- commerçant du client A
  ub uuid := gen_random_uuid();   -- commerçant du client B
  ux uuid := gen_random_uuid();   -- administrateur TRK
  ca uuid; cb uuid; cc uuid; aa uuid; ab uuid;
  n int;
  echecs text[] := '{}';
  jour date := date '2027-03-20';
begin
  insert into public.invitations_admin values ('admin.essai@exemple.invalid');
  insert into auth.users (id, email) values (ua, 'a.essai@exemple.invalid'), (ub, 'b.essai@exemple.invalid'), (ux, 'admin.essai@exemple.invalid');

  insert into public.clients (nom, telephone, secteur, sms_accepte) values ('Boutique A (essai)', '+243810000001', 'negoce', true) returning id into ca;
  insert into public.clients (nom, telephone, secteur, sms_accepte, langue) values ('Atelier B (essai)', '+243810000002', 'artisanat', true, 'ln') returning id into cb;
  insert into public.membres values (ua, ca, 'commercant'), (ub, cb, 'commercant');
  insert into public.saisies (id, client_id, type, contenu, saisi_le, auteur) values
    (gen_random_uuid(), ca, 'operation', '{"montant": 85000}', now(), ua),
    (gen_random_uuid(), cb, 'operation', '{"montant": 12000}', now(), ub);
  insert into public.abonnements (client_id, formule, debut, fin, montant) values (ca, 'essentiel', date '2027-02-27', date '2027-03-27', 25000) returning id into aa;
  insert into public.abonnements (client_id, formule, debut, fin, montant) values (cb, 'suivi', date '2027-02-21', date '2027-03-21', 50000) returning id into ab;

  -- Le commerçant A ne voit que son client et ses saisies.
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.clients;            if n <> 1 then echecs := array_append(echecs, ('A voit ' || n || ' clients')); end if;
  select count(*) into n from public.saisies;            if n <> 1 then echecs := array_append(echecs, ('A voit ' || n || ' saisies')); end if;
  select count(*) into n from public.saisies where client_id = cb; if n <> 0 then echecs := array_append(echecs, 'A voit les saisies de B'); end if;
  select count(*) into n from public.sms;                if n <> 0 then echecs := array_append(echecs, 'A voit les SMS'); end if;

  -- A ne peut pas écrire chez B, ni modifier ni effacer une saisie.
  begin
    insert into public.saisies (id, client_id, type, contenu, saisi_le) values (gen_random_uuid(), cb, 'operation', '{}', now());
    echecs := array_append(echecs, 'A a écrit chez B');
  exception when insufficient_privilege then null; end;
  begin
    insert into public.saisies (id, client_id, type, contenu, saisi_le) values (gen_random_uuid(), ca, 'operation', '{}', now());
  exception when others then echecs := array_append(echecs, ('A ne peut pas écrire chez lui : ' || sqlerrm)); end;
  begin
    update public.saisies set contenu = '{}' where client_id = ca;
    echecs := array_append(echecs, 'A a modifié une saisie');
  exception when insufficient_privilege then null; end;
  begin
    delete from public.saisies where client_id = ca;
    echecs := array_append(echecs, 'A a effacé une saisie');
  exception when insufficient_privilege then null; end;
  begin
    update public.clients set nom = 'piraté' where id = ca;
    get diagnostics n = row_count; if n <> 0 then echecs := array_append(echecs, 'A a modifié sa fiche client'); end if;
  exception when insufficient_privilege then null; end;
  begin
    perform public.lancer_rappels();
    echecs := array_append(echecs, 'A a lancé les rappels');
  exception when others then null; end;

  -- L'administrateur voit les deux clients, pas leurs saisies.
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ux, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.clients where id in (ca, cb); if n <> 2 then echecs := array_append(echecs, ('admin voit ' || n || ' clients')); end if;
  select count(*) into n from public.saisies;            if n <> 0 then echecs := array_append(echecs, 'admin voit les saisies'); end if;
  select count(*) into n from public.vue_clients where id in (ca, cb) and jours_restants is not null; if n <> 2 then echecs := array_append(echecs, 'vue_clients incomplète'); end if;

  -- Rappels du 20/03/2027 : A finit le 27 (dans 7 jours, j10), B le 21 (dans 1 jour, j3).
  reset role;
  perform prive.planifier_rappels(jour);
  select count(*) into n from public.sms where abonnement_id = aa and motif = 'j10' and statut = 'simule'; if n <> 1 then echecs := array_append(echecs, 'pas de j10 pour A'); end if;
  select count(*) into n from public.sms where abonnement_id = ab and motif = 'j3' and texte like '%mikolo 1%'; if n <> 1 then echecs := array_append(echecs, 'pas de j3 en lingala pour B'); end if;
  perform prive.planifier_rappels(jour);
  select count(*) into n from public.sms where client_id in (ca, cb); if n <> 2 then echecs := array_append(echecs, ('rappels en double : ' || n)); end if;
  perform prive.planifier_rappels(date '2027-03-21');
  select count(*) into n from public.sms where abonnement_id = ab and motif = 'j0'; if n <> 1 then echecs := array_append(echecs, 'pas de j0 pour B'); end if;
  perform prive.planifier_rappels(date '2027-03-25');
  select count(*) into n from public.sms where abonnement_id = ab and motif = 'retard'; if n <> 1 then echecs := array_append(echecs, 'pas de retard pour B'); end if;
  -- B renouvelle : plus de rappel sur l'ancien abonnement.
  insert into public.abonnements (client_id, formule, debut, fin, montant) values (cb, 'suivi', date '2027-03-26', date '2027-04-25', 50000);
  perform prive.planifier_rappels(date '2027-03-26');
  select count(*) into n from public.sms where client_id = cb and prevu_le = date '2027-03-26'; if n <> 0 then echecs := array_append(echecs, 'rappel après renouvellement'); end if;
  -- Sans consentement, aucun SMS, même à l'échéance.
  insert into public.clients (nom, telephone, secteur) values ('Dépôt C (essai, sans consentement)', '+243810000003', 'negoce') returning id into cc;
  insert into public.abonnements (client_id, formule, debut, fin, montant) values (cc, 'essentiel', date '2027-02-22', date '2027-03-22', 25000);
  perform prive.planifier_rappels(date '2027-03-22');
  select count(*) into n from public.sms where client_id = cc; if n <> 0 then echecs := array_append(echecs, 'SMS sans consentement'); end if;

  if cardinality(echecs) = 0 then
    raise exception 'ESSAI RÉUSSI (tout est annulé)';
  else
    raise exception 'ÉCHECS : %', array_to_string(echecs, ' ; ');
  end if;
end;
$$;
