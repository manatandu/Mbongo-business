-- Équipe de la console : deux rôles.
--   admin     : tout, plus la gestion de l'équipe.
--   assistant : lit clients, abonnements, paiements et SMS ; note le suivi. N'écrit rien d'autre.
-- Les comptes de l'équipe se créent depuis la console (fonction réservée aux administrateurs), sans e-mail.

alter table public.administrateurs add column role text not null default 'admin' check (role in ('admin', 'assistant'));
alter table public.administrateurs add column email text not null default '';
update public.administrateurs a set email = lower(u.email) from auth.users u where u.id = a.user_id;
alter table public.invitations_admin add column role text not null default 'admin' check (role in ('admin', 'assistant'));

create or replace function prive.est_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.administrateurs a where a.user_id = (select auth.uid()) and a.role = 'admin');
$$;

create function prive.est_equipe() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.administrateurs a where a.user_id = (select auth.uid()));
$$;
grant execute on function prive.est_equipe() to authenticated;

create or replace function prive.apres_inscription() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.administrateurs (user_id, role, email)
  select new.id, i.role, lower(new.email) from public.invitations_admin i where i.email = lower(new.email)
  on conflict do nothing;
  return new;
end;
$$;
revoke execute on function prive.apres_inscription() from public, authenticated;

-- Lecture pour toute l'équipe ; l'écriture reste aux règles « admin : … » déjà en place.
create policy "équipe : lit les clients" on public.clients for select to authenticated using ((select prive.est_equipe()));
create policy "équipe : lit les abonnements" on public.abonnements for select to authenticated using ((select prive.est_equipe()));
create policy "équipe : lit les paiements" on public.paiements for select to authenticated using ((select prive.est_equipe()));
create policy "équipe : lit le suivi" on public.suivis for select to authenticated using ((select prive.est_equipe()));
create policy "équipe : note le suivi" on public.suivis for insert to authenticated
  with check ((select prive.est_equipe()) and auteur = (select auth.uid()));
drop policy "admin : sms" on public.sms;
create policy "équipe : lit les SMS" on public.sms for select to authenticated using ((select prive.est_equipe()));
create policy "équipe : lit les réglages" on public.reglages_console for select to authenticated using ((select prive.est_equipe()));

-- Gestion de l'équipe -----------------------------------------------------------

create function public.creer_membre_equipe(p_email text, p_mot_de_passe text, p_role text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  e text := lower(trim(p_email));
  uid uuid;
begin
  if not prive.est_admin() then raise exception 'réservé aux administrateurs'; end if;
  if p_role not in ('admin', 'assistant') then raise exception 'rôle inconnu'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'adresse e-mail invalide'; end if;
  if length(p_mot_de_passe) < 8 then raise exception 'mot de passe trop court : 8 caractères au moins'; end if;

  select id into uid from auth.users where lower(email) = e;
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', e,
            extensions.crypt(p_mot_de_passe, extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, json_build_object('sub', uid::text, 'email', e, 'email_verified', true), 'email', now(), now(), now());
  else
    update auth.users set encrypted_password = extensions.crypt(p_mot_de_passe, extensions.gen_salt('bf')), updated_at = now() where id = uid;
  end if;

  insert into public.administrateurs (user_id, role, email) values (uid, p_role, e)
  on conflict (user_id) do update set role = excluded.role, email = excluded.email;
  return uid;
end;
$$;

create function public.changer_role_equipe(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not prive.est_admin() then raise exception 'réservé aux administrateurs'; end if;
  if p_role not in ('admin', 'assistant') then raise exception 'rôle inconnu'; end if;
  if p_user = auth.uid() then raise exception 'on ne change pas son propre rôle'; end if;
  update public.administrateurs set role = p_role where user_id = p_user;
end;
$$;

create function public.retirer_membre_equipe(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not prive.est_admin() then raise exception 'réservé aux administrateurs'; end if;
  if p_user = auth.uid() then raise exception 'on ne se retire pas soi-même'; end if;
  delete from public.administrateurs where user_id = p_user;
end;
$$;

create function public.reinitialiser_mot_de_passe(p_user uuid, p_mot_de_passe text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not prive.est_admin() then raise exception 'réservé aux administrateurs'; end if;
  if length(p_mot_de_passe) < 8 then raise exception 'mot de passe trop court : 8 caractères au moins'; end if;
  if not exists (select 1 from public.administrateurs where user_id = p_user) then raise exception 'membre inconnu'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_mot_de_passe, extensions.gen_salt('bf')), updated_at = now() where id = p_user;
end;
$$;

revoke execute on function public.creer_membre_equipe(text, text, text), public.changer_role_equipe(uuid, text),
  public.retirer_membre_equipe(uuid), public.reinitialiser_mot_de_passe(uuid, text) from public, anon;
grant execute on function public.creer_membre_equipe(text, text, text), public.changer_role_equipe(uuid, text),
  public.retirer_membre_equipe(uuid), public.reinitialiser_mot_de_passe(uuid, text) to authenticated;
