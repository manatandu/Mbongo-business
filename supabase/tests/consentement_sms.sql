-- Essai de la preuve de l'accord aux SMS et de la mention STOP (migration 20261102_consentement_sms.sql).
-- Tout est annulé à la fin ; le message d'erreur final dit « ESSAI RÉUSSI » ou liste les échecs.
do $$
declare
  ux uuid := gen_random_uuid();   -- administrateur TRK
  c1 uuid; c2 uuid; c3 uuid; a1 uuid; a2 uuid;
  r public.clients;
  t text; n int;
  aujourdhui date := (now() at time zone 'Africa/Kinshasa')::date;
  echecs text[] := '{}';
begin
  insert into auth.users (id, email) values (ux, 'admin.sms@exemple.invalid');
  insert into public.administrateurs (user_id, role, email) values (ux, 'admin', 'admin.sms@exemple.invalid');
  perform set_config('request.jwt.claims', json_build_object('sub', ux, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- Case cochée sans dire comment : refusé.
  begin
    insert into public.clients (nom, telephone, secteur, sms_accepte) values ('Sans preuve (essai)', '+243810000031', 'negoce', true);
    echecs := array_append(echecs, 'accord sans forme accepté');
  exception when check_violation then null; end;
  -- Forme inconnue ou date future : refusé.
  begin
    insert into public.clients (nom, telephone, secteur, sms_accepte, sms_consentement_forme) values ('Forme inconnue (essai)', '+243810000032', 'negoce', true, 'sms');
    echecs := array_append(echecs, 'forme inconnue acceptée');
  exception when check_violation then null; end;
  begin
    insert into public.clients (nom, telephone, secteur, sms_accepte, sms_consentement_forme, sms_consentement_le) values ('Futur (essai)', '+243810000033', 'negoce', true, 'oral', aujourdhui + 3);
    echecs := array_append(echecs, 'date future acceptée');
  exception when check_violation then null; end;

  -- Accord par WhatsApp sans date : daté du jour. Accord écrit daté : la date est gardée.
  insert into public.clients (nom, telephone, secteur, sms_accepte, sms_consentement_forme) values ('Boutique WhatsApp (essai)', '+243810000034', 'negoce', true, 'whatsapp') returning * into r;
  c1 := r.id;
  if r.sms_consentement_le is distinct from aujourdhui then echecs := array_append(echecs, 'accord non daté du jour : ' || coalesce(r.sms_consentement_le::text, 'null')); end if;
  insert into public.clients (nom, telephone, secteur, sms_accepte, sms_consentement_forme, sms_consentement_le, langue) values ('Atelier écrit (essai)', '+243810000035', 'artisanat', true, 'ecrit', date '2026-10-01', 'ln') returning id into c2;
  select count(*) into n from public.vue_clients where id = c2 and sms_consentement_le = date '2026-10-01' and sms_consentement_forme = 'ecrit';
  if n <> 1 then echecs := array_append(echecs, 'vue_clients sans la preuve'); end if;

  -- Sans case cochée, rien n'est gardé, même si on l'envoie.
  insert into public.clients (nom, telephone, secteur, sms_consentement_forme, sms_consentement_le) values ('Refus (essai)', '+243810000036', 'services', 'oral', date '2026-10-01') returning * into r;
  if r.sms_consentement_le is not null or r.sms_consentement_forme is not null then echecs := array_append(echecs, 'preuve gardée sans accord'); end if;

  -- Retrait (STOP) : la case décochée efface la preuve.
  update public.clients set sms_accepte = false where id = c1 returning * into r;
  if r.sms_consentement_le is not null or r.sms_consentement_forme is not null then echecs := array_append(echecs, 'preuve gardée après retrait'); end if;
  -- Nouvel accord : la forme est à nouveau exigée.
  begin
    update public.clients set sms_accepte = true where id = c1;
    echecs := array_append(echecs, 'nouvel accord sans forme accepté');
  exception when check_violation then null; end;
  update public.clients set sms_accepte = true, sms_consentement_forme = 'oral' where id = c1;
  reset role;

  -- Fiche ancienne, cochée avant cette migration, sans preuve : elle reste lisible et modifiable.
  alter table public.clients disable trigger clients_consentement_sms;
  insert into public.clients (nom, telephone, secteur, sms_accepte) values ('Ancienne fiche (essai)', '+243810000037', 'negoce', true) returning id into c3;
  alter table public.clients enable trigger clients_consentement_sms;
  perform set_config('request.jwt.claims', json_build_object('sub', ux, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.clients set note = 'appelé', commune = 'Kalamu' where id = c3;
    perform public.nouveau_code_client(c3);
  exception when others then echecs := array_append(echecs, 'ancienne fiche bloquée : ' || sqlerrm); end;
  reset role;

  -- Texte des rappels : chaque SMS finit par la mention STOP, en français et en lingala.
  foreach t in array array['j10', 'j3', 'j0', 'retard'] loop
    if prive.texte_rappel('fr', t, date '2027-03-27', 7, '+243 983 510 725') not like '%. Répondez STOP pour ne plus recevoir ces messages.' then
      echecs := array_append(echecs, 'pas de STOP en français pour ' || t);
    end if;
    if prive.texte_rappel('ln', t, date '2027-03-27', 7, '+243 983 510 725') not like '%. Soki olingi lisusu te kozwa bansango oyo, zongisa STOP.' then
      echecs := array_append(echecs, 'pas de STOP en lingala pour ' || t);
    end if;
  end loop;
  if prive.texte_rappel('fr', 'j10', date '2027-03-27', 7, '+243 983 510 725') not like 'TRK Consulting : votre abonnement Mbongo Business prend fin le 27/03/2027, dans 7 jours. Pour le renouveler : +243 983 510 725.%' then
    echecs := array_append(echecs, 'texte français changé');
  end if;

  -- Les rappels préparés portent la mention.
  insert into public.abonnements (client_id, formule, debut, fin, montant) values (c1, 'essentiel', date '2027-02-27', date '2027-03-27', 25000) returning id into a1;
  insert into public.abonnements (client_id, formule, debut, fin, montant) values (c2, 'suivi', date '2027-02-21', date '2027-03-21', 50000) returning id into a2;
  perform prive.planifier_rappels(date '2027-03-20');
  select count(*) into n from public.sms where abonnement_id = a1 and texte like '%Répondez STOP%'; if n <> 1 then echecs := array_append(echecs, 'rappel français sans STOP'); end if;
  select count(*) into n from public.sms where abonnement_id = a2 and texte like '%zongisa STOP.'; if n <> 1 then echecs := array_append(echecs, 'rappel lingala sans STOP'); end if;

  if cardinality(echecs) = 0 then raise exception 'ESSAI RÉUSSI (tout est annulé)'; else raise exception 'ÉCHECS : %', array_to_string(echecs, ' ; '); end if;
end $$;
