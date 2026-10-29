-- Console de TRK Consulting et cloisonnement des données des clients.
-- Projet Supabase « mbongo ». Montants en entiers : francs congolais ; centimes pour l'USD.
--
-- Qui voit quoi (règles RLS) :
--   administrateur TRK : clients, abonnements, paiements, suivi, SMS. Pas les saisies comptables des clients.
--   membre d'un client (commerçant, assistant, expert) : la fiche de ce client, ses abonnements et paiements,
--     et ses saisies. Rien d'un autre client.
--   commerçant : seul à pouvoir ajouter des saisies, et seulement pour son entreprise. Personne ne les modifie.

create schema if not exists prive;
revoke all on schema prive from public, anon;
grant usage on schema prive to authenticated;

-- Équipe TRK Consulting -----------------------------------------------------

create table public.administrateurs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nom text not null default '',
  cree_le timestamptz not null default now()
);

-- Adresses à faire administrateur dès leur inscription. Lue seulement par le serveur.
create table public.invitations_admin (
  email text primary key check (email = lower(email))
);

create function prive.est_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.administrateurs a where a.user_id = (select auth.uid()));
$$;

create function prive.apres_inscription() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.invitations_admin i where i.email = lower(new.email)) then
    insert into public.administrateurs (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger inscription_admin after insert on auth.users
  for each row execute function prive.apres_inscription();

-- Clients ---------------------------------------------------------------------

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (length(trim(nom)) > 0),
  responsable text not null default '',
  telephone text not null check (telephone ~ '^\+[0-9]{8,15}$'),
  commune text not null default '',
  activite text not null default '',
  secteur text not null check (secteur in ('negoce', 'artisanat', 'services')),
  langue text not null default 'fr' check (langue in ('fr', 'ln')),
  -- Consentement du client aux SMS (Code du numérique) : sans lui, aucun rappel.
  sms_accepte boolean not null default false,
  statut text not null default 'actif' check (statut in ('prospect', 'actif', 'suspendu', 'resilie')),
  note text not null default '',
  cree_le timestamptz not null default now()
);

-- Comptes de connexion rattachés à un client : c'est la clé du cloisonnement.
create table public.membres (
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  role text not null check (role in ('commercant', 'assistant', 'expert')),
  primary key (user_id, client_id)
);
create index membres_client on public.membres (client_id);

create function prive.membre_de(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.membres m where m.client_id = c and m.user_id = (select auth.uid()));
$$;

create function prive.commercant_de(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.membres m where m.client_id = c and m.user_id = (select auth.uid()) and m.role = 'commercant');
$$;

grant execute on function prive.est_admin(), prive.membre_de(uuid), prive.commercant_de(uuid) to authenticated;

-- Abonnements, paiements, suivi -------------------------------------------------

create table public.abonnements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  formule text not null check (formule in ('essentiel', 'suivi', 'expert')),
  debut date not null,
  fin date not null,
  montant bigint not null check (montant >= 0),
  cree_le timestamptz not null default now(),
  check (fin >= debut)
);
create index abonnements_client on public.abonnements (client_id, fin desc);

create table public.paiements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  abonnement_id uuid references public.abonnements (id) on delete set null,
  date date not null default current_date,
  montant bigint not null check (montant > 0),
  devise text not null default 'CDF' check (devise in ('CDF', 'USD')),
  mode text not null check (mode in ('especes', 'mpesa', 'orange', 'airtel', 'banque')),
  reference text not null default '',
  cree_le timestamptz not null default now()
);
create index paiements_client on public.paiements (client_id, date desc);
create index paiements_abonnement on public.paiements (abonnement_id);

-- Journal des contacts avec le client : visites, appels, formations, contrôles.
create table public.suivis (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null default current_date,
  type text not null check (type in ('visite', 'appel', 'formation', 'controle', 'autre')),
  note text not null check (length(trim(note)) > 0),
  auteur uuid default auth.uid() references auth.users (id) on delete set null,
  cree_le timestamptz not null default now()
);
create index suivis_client on public.suivis (client_id, date desc);
create index suivis_auteur on public.suivis (auteur);

-- Rappels SMS ------------------------------------------------------------------

create table public.reglages_console (
  cle text primary key,
  valeur text not null
);
insert into public.reglages_console values
  ('sms_mode', 'test'),                 -- test : les SMS sont journalisés, pas envoyés
  ('telephone_trk', '+243 983 510 725');

create table public.sms (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  abonnement_id uuid not null references public.abonnements (id) on delete cascade,
  motif text not null check (motif in ('j10', 'j3', 'j0', 'retard')),
  telephone text not null,
  texte text not null,
  statut text not null check (statut in ('simule', 'a_envoyer', 'envoye', 'echec')),
  prevu_le date not null,
  cree_le timestamptz not null default now(),
  envoye_le timestamptz,
  erreur text,
  -- Un même rappel ne part jamais deux fois pour un abonnement.
  unique (abonnement_id, motif)
);
create index sms_client on public.sms (client_id, cree_le desc);

-- Saisies du commerçant envoyées depuis le téléphone (étape suivante) -------------

create table public.saisies (
  id uuid primary key,                  -- identifiant créé sur le téléphone : un renvoi ne double rien
  client_id uuid not null references public.clients (id) on delete cascade,
  type text not null check (type in ('entreprise', 'exercice', 'compte', 'operation', 'tiers', 'immobilisation', 'sortie', 'inventaire')),
  contenu jsonb not null,
  saisi_le timestamptz not null,
  recu_le timestamptz not null default now(),
  auteur uuid not null default auth.uid() references auth.users (id)
);
create index saisies_client on public.saisies (client_id, saisi_le);
create index saisies_auteur on public.saisies (auteur);

-- Vue de la console : un client, son dernier abonnement, ce qu'il a payé -----------

create view public.vue_clients with (security_invoker = true) as
select
  c.*,
  a.id as abonnement_id,
  a.formule,
  a.debut,
  a.fin,
  a.montant as montant_abonnement,
  (a.fin - (now() at time zone 'Africa/Kinshasa')::date) as jours_restants,
  coalesce((select sum(p.montant) from public.paiements p where p.abonnement_id = a.id and p.devise = 'CDF'), 0) as paye_cdf
from public.clients c
left join lateral (
  select * from public.abonnements a where a.client_id = c.id order by a.fin desc limit 1
) a on true;

-- Règles d'accès -----------------------------------------------------------------

alter table public.administrateurs enable row level security;
alter table public.invitations_admin enable row level security;
alter table public.clients enable row level security;
alter table public.membres enable row level security;
alter table public.abonnements enable row level security;
alter table public.paiements enable row level security;
alter table public.suivis enable row level security;
alter table public.reglages_console enable row level security;
alter table public.sms enable row level security;
alter table public.saisies enable row level security;

-- Rien pour les visiteurs non connectés.
revoke all on all tables in schema public from anon;

create policy "admin : se voit" on public.administrateurs for select to authenticated
  using (user_id = (select auth.uid()) or (select prive.est_admin()));

create policy "admin : clients" on public.clients for all to authenticated
  using ((select prive.est_admin())) with check ((select prive.est_admin()));
create policy "membre : sa fiche" on public.clients for select to authenticated
  using ((select prive.membre_de(id)));

create policy "admin : membres" on public.membres for all to authenticated
  using ((select prive.est_admin())) with check ((select prive.est_admin()));
create policy "membre : ses rattachements" on public.membres for select to authenticated
  using (user_id = (select auth.uid()));

create policy "admin : abonnements" on public.abonnements for all to authenticated
  using ((select prive.est_admin())) with check ((select prive.est_admin()));
create policy "membre : ses abonnements" on public.abonnements for select to authenticated
  using ((select prive.membre_de(client_id)));

create policy "admin : paiements" on public.paiements for all to authenticated
  using ((select prive.est_admin())) with check ((select prive.est_admin()));
create policy "membre : ses paiements" on public.paiements for select to authenticated
  using ((select prive.membre_de(client_id)));

create policy "admin : suivis" on public.suivis for all to authenticated
  using ((select prive.est_admin())) with check ((select prive.est_admin()));

create policy "admin : réglages" on public.reglages_console for all to authenticated
  using ((select prive.est_admin())) with check ((select prive.est_admin()));

create policy "admin : sms" on public.sms for select to authenticated
  using ((select prive.est_admin()));

-- Saisies : en ajout seulement. Aucune règle de modification ni de suppression.
create policy "commerçant : ajoute ses saisies" on public.saisies for insert to authenticated
  with check ((select prive.commercant_de(client_id)) and auteur = (select auth.uid()));
create policy "membre : lit ses saisies" on public.saisies for select to authenticated
  using ((select prive.membre_de(client_id)));
revoke update, delete on public.saisies from authenticated;

-- Calcul des rappels --------------------------------------------------------------

create function prive.texte_rappel(langue text, motif text, fin date, jours int, tel text) returns text
language sql immutable set search_path = '' as $$
  select case
    when langue = 'ln' then case motif
      when 'j0' then 'TRK Consulting : abonnement na yo ya Mbongo Business esili lelo. Mpo na kozongisa yango : ' || tel
      when 'retard' then 'TRK Consulting : abonnement na yo ya Mbongo Business esilaki na ' || to_char(fin, 'DD/MM/YYYY') || '. Benga biso mpo na kozongisa yango : ' || tel
      else 'TRK Consulting : abonnement na yo ya Mbongo Business ekosila na ' || to_char(fin, 'DD/MM/YYYY') || ', na mikolo ' || jours || '. Mpo na kozongisa yango : ' || tel
    end
    else case motif
      when 'j0' then 'TRK Consulting : votre abonnement Mbongo Business prend fin aujourd''hui. Pour le renouveler : ' || tel
      when 'retard' then 'TRK Consulting : votre abonnement Mbongo Business a pris fin le ' || to_char(fin, 'DD/MM/YYYY') || '. Pour le renouveler : ' || tel
      else 'TRK Consulting : votre abonnement Mbongo Business prend fin le ' || to_char(fin, 'DD/MM/YYYY') || ', dans ' || jours || ' jours. Pour le renouveler : ' || tel
    end
  end;
$$;

-- Prépare les rappels du jour pour le dernier abonnement de chaque client actif qui a accepté les SMS.
-- Fenêtres plutôt que jours exacts : un jour sans passage ne fait perdre aucun rappel.
--   j10 : fin dans 4 à 10 jours ; j3 : dans 1 à 3 jours ; j0 : le jour même ; retard : fini depuis 1 à 30 jours.
create function prive.planifier_rappels(jour date default (now() at time zone 'Africa/Kinshasa')::date) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  mode text := coalesce((select valeur from public.reglages_console where cle = 'sms_mode'), 'test');
  tel text := coalesce((select valeur from public.reglages_console where cle = 'telephone_trk'), '');
  n integer;
begin
  with derniers as (
    select distinct on (a.client_id) a.*, c.telephone, c.langue
    from public.abonnements a
    join public.clients c on c.id = a.client_id
    where c.statut = 'actif' and c.sms_accepte
    order by a.client_id, a.fin desc
  ), a_faire as (
    select d.*, (d.fin - jour) as reste,
      case
        when d.fin - jour between 4 and 10 then 'j10'
        when d.fin - jour between 1 and 3 then 'j3'
        when d.fin = jour then 'j0'
        when jour - d.fin between 1 and 30 then 'retard'
      end as motif
    from derniers d
  )
  insert into public.sms (client_id, abonnement_id, motif, telephone, texte, statut, prevu_le)
  select client_id, id, motif, telephone, prive.texte_rappel(langue, motif, fin, reste, tel),
         case when mode = 'test' then 'simule' else 'a_envoyer' end, jour
  from a_faire
  where motif is not null
  on conflict (abonnement_id, motif) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function prive.planifier_rappels(date), prive.apres_inscription() from public, authenticated;

-- Bouton « Lancer les rappels » de la console.
create function public.lancer_rappels() returns integer
language plpgsql security definer set search_path = '' as $$
begin
  if not prive.est_admin() then
    raise exception 'réservé aux administrateurs';
  end if;
  return prive.planifier_rappels();
end;
$$;
revoke execute on function public.lancer_rappels() from public, anon;
grant execute on function public.lancer_rappels() to authenticated;

-- Tous les jours à 8 h, heure de Kinshasa (7 h UTC).
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('rappels-abonnements', '0 7 * * *', 'select prive.planifier_rappels()');
