-- Essai du code client : relier un téléphone, envoyer des saisies, cloisonnement. Tout est annulé à la fin ;
-- le message d'erreur final dit « ESSAI RÉUSSI » ou liste les échecs.
do $$
declare
  uass uuid := gen_random_uuid();
  c1 uuid; c2 uuid; code1 text; code2 text; r jsonb; jeton text; jeton2 text; n int; op uuid := gen_random_uuid(); ent uuid := gen_random_uuid();
  echecs text[] := '{}';
begin
  insert into auth.users (id, email) values (uass, 'ass.code@exemple.invalid');
  insert into public.administrateurs (user_id, role, email) values (uass, 'assistant', 'ass.code@exemple.invalid');
  insert into public.clients (nom, telephone, secteur) values ('Boutique A (essai)', '+243810000021', 'negoce') returning id, code into c1, code1;
  insert into public.clients (nom, telephone, secteur) values ('Boutique B (essai)', '+243810000022', 'negoce') returning id, code into c2, code2;
  if code1 !~ '^[A-HJKMNP-Z2-9]{8}$' then echecs := array_append(echecs, 'code mal formé : ' || code1); end if;

  -- Un visiteur sans compte relie son téléphone avec le code, tapé avec tiret et minuscules.
  set local role anon;
  r := public.lier_appareil(lower(left(code1, 4) || '-' || right(code1, 4)), 'Boutique A');
  jeton := r->>'jeton';
  if r->>'client' <> 'Boutique A (essai)' or length(jeton) <> 64 then echecs := array_append(echecs, 'liaison : ' || r::text); end if;
  begin perform public.lier_appareil('ZZZZZZZZ', 'x'); echecs := array_append(echecs, 'code faux accepté'); exception when others then null; end;

  -- Il envoie ; un renvoi ne double rien ; une saisie comptable n'est jamais modifiée.
  n := public.envoyer_saisies(jeton, jsonb_build_array(
    jsonb_build_object('id', op, 'type', 'operation', 'contenu', '{"montant": 5000}'::jsonb, 'saisi_le', now()),
    jsonb_build_object('id', ent, 'type', 'entreprise', 'contenu', '{"nom": "A"}'::jsonb)));
  if n <> 2 then echecs := array_append(echecs, 'envoi : ' || n); end if;
  n := public.envoyer_saisies(jeton, jsonb_build_array(
    jsonb_build_object('id', op, 'type', 'operation', 'contenu', '{"montant": 999}'::jsonb),
    jsonb_build_object('id', ent, 'type', 'entreprise', 'contenu', '{"nom": "A2"}'::jsonb)));
  if n <> 1 then echecs := array_append(echecs, 'renvoi : ' || n); end if;
  begin perform public.envoyer_saisies('faux', '[]'::jsonb); echecs := array_append(echecs, 'jeton faux accepté'); exception when others then null; end;
  begin select count(*) into n from public.appareils; echecs := array_append(echecs, 'visiteur lit les téléphones : ' || n); exception when insufficient_privilege then null; end;
  begin perform public.nouveau_code_client(c1); echecs := array_append(echecs, 'visiteur change un code'); exception when others then null; end;
  reset role;
  select count(*) into n from public.saisies where id = op and client_id = c1 and contenu->>'montant' = '5000'; if n <> 1 then echecs := array_append(echecs, 'saisie comptable modifiée ou absente'); end if;
  select count(*) into n from public.saisies where id = ent and contenu->>'nom' = 'A2'; if n <> 1 then echecs := array_append(echecs, 'fiche entreprise non mise à jour'); end if;

  -- Le téléphone de B ne peut pas écrire chez A, même en reprenant l'identifiant d'une saisie de A.
  set local role anon;
  jeton2 := public.lier_appareil(code2, 'Boutique B')->>'jeton';
  n := public.envoyer_saisies(jeton2, jsonb_build_array(jsonb_build_object('id', ent, 'type', 'entreprise', 'contenu', '{"nom": "pirate"}'::jsonb)));
  reset role;
  select count(*) into n from public.saisies where id = ent and client_id = c1 and contenu->>'nom' = 'A2'; if n <> 1 then echecs := array_append(echecs, 'B a écrit chez A'); end if;

  -- L'assistant voit les téléphones reliés, pas les saisies ; il change le code et délie.
  perform set_config('request.jwt.claims', json_build_object('sub', uass, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.appareils where client_id = c1 and saisies_recues = 3; if n <> 1 then echecs := array_append(echecs, 'assistant ne voit pas le téléphone'); end if;
  select count(*) into n from public.saisies; if n <> 0 then echecs := array_append(echecs, 'assistant voit les saisies'); end if;
  if public.nouveau_code_client(c1) = code1 then echecs := array_append(echecs, 'code inchangé'); end if;
  perform public.delier_appareil((select id from public.appareils where client_id = c1));
  reset role;
  set local role anon;
  begin perform public.envoyer_saisies(jeton, '[]'::jsonb); echecs := array_append(echecs, 'téléphone délié accepté'); exception when others then null; end;
  begin perform public.lier_appareil(code1, 'x'); echecs := array_append(echecs, 'ancien code accepté'); exception when others then null; end;
  reset role;

  if cardinality(echecs) = 0 then raise exception 'ESSAI RÉUSSI (tout est annulé)'; else raise exception 'ÉCHECS : %', array_to_string(echecs, ' ; '); end if;
end $$;
