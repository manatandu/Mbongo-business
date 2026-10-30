-- Code client : relier le téléphone d'un commerçant à sa fiche, sans compte ni mot de passe.
--
-- 1. La console donne à chaque client un code de huit caractères (ex. KX7P-29QD).
-- 2. Le commerçant le tape une fois dans Mbongo (Réglages). Le serveur rend au téléphone un jeton secret,
--    dont il ne garde que l'empreinte.
-- 3. Le téléphone envoie ses saisies avec ce jeton quand il a du réseau. Elles vont dans `saisies`, pour ce client
--    seulement. L'équipe TRK ne les lit toujours pas : elle voit les téléphones reliés et la date du dernier envoi.
--
-- Le code ne sert qu'à relier. Un code nouveau n'enlève pas les téléphones déjà reliés ; « Délier » les enlève.

-- Codes : 31 signes sans 0/O, 1/I/L. 31^8, près de mille milliards de codes : impossible à deviner au hasard.
create function prive.nouveau_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  signes constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  octets bytea := extensions.gen_random_bytes(8);
  code text := '';
begin
  for i in 0..7 loop
    code := code || substr(signes, (get_byte(octets, i) % 31) + 1, 1);
  end loop;
  return code;
end;
$$;

alter table public.clients add column code text unique;
update public.clients set code = prive.nouveau_code() where code is null;
alter table public.clients alter column code set default prive.nouveau_code();
alter table public.clients alter column code set not null;

-- Téléphones reliés.
create table public.appareils (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  empreinte text not null unique,         -- sha256 du jeton ; le jeton lui-même n'est jamais stocké
  nom text not null default '',           -- nom de l'entreprise tel qu'il est dans Mbongo
  lie_le timestamptz not null default now(),
  dernier_envoi timestamptz,
  saisies_recues integer not null default 0,
  actif boolean not null default true
);
create index appareils_client on public.appareils (client_id);
alter table public.appareils enable row level security;
revoke all on public.appareils from anon;
create policy "équipe : lit les téléphones reliés" on public.appareils for select to authenticated using ((select prive.est_equipe()));

-- Saisies : l'auteur est soit un compte connecté, soit un téléphone relié.
alter table public.saisies alter column auteur drop not null;
alter table public.saisies add column appareil uuid references public.appareils (id);
alter table public.saisies add constraint saisies_auteur_ou_appareil check (auteur is not null or appareil is not null);
alter table public.saisies drop constraint saisies_type_check;
alter table public.saisies add constraint saisies_type_check
  check (type in ('entreprise', 'exercice', 'compte', 'operation', 'tiers', 'immobilisation', 'sortie', 'inventaire', 'article', 'mouvement_stock'));
create index saisies_appareil on public.saisies (appareil);

-- Relier un téléphone : appelé par l'appli, sans connexion. Renvoie le jeton (une seule fois) et le nom du client.
create function public.lier_appareil(p_code text, p_nom text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  c public.clients;
  jeton text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  select * into c from public.clients
  where code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if c.id is null then
    perform pg_sleep(1);                  -- freine les essais au hasard
    raise exception 'Code inconnu. Vérifiez-le auprès de TRK Consulting.' using errcode = 'P0001';
  end if;
  if c.statut = 'resilie' then
    raise exception 'Ce compte client est clos. Contactez TRK Consulting.' using errcode = 'P0001';
  end if;
  insert into public.appareils (client_id, empreinte, nom)
  values (c.id, encode(extensions.digest(jeton, 'sha256'), 'hex'), left(coalesce(p_nom, ''), 120));
  return jsonb_build_object('jeton', jeton, 'client', c.nom);
end;
$$;

-- Recevoir des saisies : au plus 500 par appel. Un renvoi ne double rien (même identifiant = même saisie).
-- Les lignes de réglage (entreprise, exercice, compte, inventaire) sont remplacées par leur dernière version ;
-- les saisies comptables, elles, ne sont jamais modifiées.
create function public.envoyer_saisies(p_jeton text, p_lignes jsonb) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  a public.appareils;
  l jsonb;
  n integer := 0;
  k integer;
begin
  select * into a from public.appareils
  where empreinte = encode(extensions.digest(coalesce(p_jeton, ''), 'sha256'), 'hex') and actif;
  if a.id is null then
    raise exception 'Téléphone non relié.' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) > 500 then
    raise exception 'Envoi invalide.' using errcode = 'P0001';
  end if;
  for l in select * from jsonb_array_elements(p_lignes) loop
    insert into public.saisies (id, client_id, type, contenu, saisi_le, appareil)
    values ((l->>'id')::uuid, a.client_id, l->>'type', l->'contenu', coalesce((l->>'saisi_le')::timestamptz, now()), a.id)
    on conflict (id) do update set contenu = excluded.contenu, saisi_le = excluded.saisi_le, recu_le = now()
      where public.saisies.client_id = a.client_id
        and public.saisies.type in ('entreprise', 'exercice', 'compte', 'inventaire')
        and public.saisies.contenu is distinct from excluded.contenu;
    get diagnostics k = row_count;
    n := n + k;
  end loop;
  update public.appareils set dernier_envoi = now(), saisies_recues = saisies_recues + n where id = a.id;
  return n;
end;
$$;

-- Console : nouveau code (l'ancien ne relie plus de nouveau téléphone), délier un téléphone.
create function public.nouveau_code_client(p_client uuid) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  c text := prive.nouveau_code();
begin
  if not prive.est_equipe() then raise exception 'Réservé à l''équipe TRK.' using errcode = '42501'; end if;
  update public.clients set code = c where id = p_client;
  return c;
end;
$$;

create function public.delier_appareil(p_appareil uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not prive.est_equipe() then raise exception 'Réservé à l''équipe TRK.' using errcode = '42501'; end if;
  update public.appareils set actif = false where id = p_appareil;
end;
$$;

-- La valeur par défaut de clients.code s'exécute avec les droits de celui qui crée le client.
revoke execute on function prive.nouveau_code() from public, anon;
grant execute on function prive.nouveau_code() to authenticated;
revoke execute on function public.lier_appareil(text, text), public.envoyer_saisies(text, jsonb) from public;
grant execute on function public.lier_appareil(text, text), public.envoyer_saisies(text, jsonb) to anon, authenticated;
revoke execute on function public.nouveau_code_client(uuid), public.delier_appareil(uuid) from public, anon;
grant execute on function public.nouveau_code_client(uuid), public.delier_appareil(uuid) to authenticated;
