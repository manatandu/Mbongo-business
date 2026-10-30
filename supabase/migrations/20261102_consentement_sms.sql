-- Preuve de l'accord aux rappels SMS, et mention d'arrêt dans chaque SMS.
--
-- Code du numérique (ordonnance-loi n° 23/010) :
--   art. 196 : le responsable du traitement « est en mesure de démontrer » le consentement ;
--   art. 68 et 72 : un SMS qui promeut un service demande un accord préalable et donne le moyen d'y mettre fin.
-- Les rappels de renouvellement sont traités comme tels, par prudence.
--
-- 1. Fiche client : date et forme de l'accord (de vive voix, écrit, WhatsApp). Exigées quand l'accord est donné,
--    effacées quand il est retiré. Les fiches déjà cochées sans date restent valables ; la console les signale.
-- 2. Texte des rappels : se termine par « Répondez STOP pour ne plus recevoir ces messages. » (et en lingala).
--    À un STOP, l'équipe décoche la case : plus aucun rappel ne part.

alter table public.clients add column sms_consentement_le date;
alter table public.clients add column sms_consentement_forme text
  check (sms_consentement_forme in ('oral', 'ecrit', 'whatsapp'));

create function prive.dater_consentement_sms() returns trigger
language plpgsql set search_path = '' as $$
declare
  aujourdhui date := (now() at time zone 'Africa/Kinshasa')::date;
begin
  if not new.sms_accepte then
    -- Retrait de l'accord (ou jamais donné) : rien à prouver.
    new.sms_consentement_le := null;
    new.sms_consentement_forme := null;
  elsif tg_op = 'INSERT' or not old.sms_accepte
     or new.sms_consentement_le is distinct from old.sms_consentement_le
     or new.sms_consentement_forme is distinct from old.sms_consentement_forme then
    -- Accord nouveau, ou preuve modifiée : la forme est exigée ; la date est celle du jour si elle manque.
    new.sms_consentement_le := coalesce(new.sms_consentement_le, aujourdhui);
    if new.sms_consentement_forme is null then
      raise exception 'SMS : indiquez comment le client a donné son accord (de vive voix, par écrit ou par WhatsApp).' using errcode = '23514';
    end if;
    if new.sms_consentement_le > aujourdhui then
      raise exception 'SMS : la date de l''accord ne peut pas être dans le futur.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function prive.dater_consentement_sms() from public, anon, authenticated;

create trigger clients_consentement_sms
  before insert or update of sms_accepte, sms_consentement_le, sms_consentement_forme on public.clients
  for each row execute function prive.dater_consentement_sms();

-- La vue de la console reprend les nouvelles colonnes (c.* est figé à la création d'une vue).
drop view public.vue_clients;
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
revoke all on public.vue_clients from anon;
grant select on public.vue_clients to authenticated;

-- Texte des rappels : repris de 20261029_console_et_cloisonnement.sql, avec la mention d'arrêt à la fin.
create or replace function prive.texte_rappel(langue text, motif text, fin date, jours int, tel text) returns text
language sql immutable set search_path = '' as $$
  select case
    when langue = 'ln' then case motif
      when 'j0' then 'TRK Consulting : abonnement na yo ya Mbongo Business esili lelo. Mpo na kozongisa yango : ' || tel
      when 'retard' then 'TRK Consulting : abonnement na yo ya Mbongo Business esilaki na ' || to_char(fin, 'DD/MM/YYYY') || '. Benga biso mpo na kozongisa yango : ' || tel
      else 'TRK Consulting : abonnement na yo ya Mbongo Business ekosila na ' || to_char(fin, 'DD/MM/YYYY') || ', na mikolo ' || jours || '. Mpo na kozongisa yango : ' || tel
    end || '. Soki olingi lisusu te kozwa bansango oyo, zongisa STOP.'
    else case motif
      when 'j0' then 'TRK Consulting : votre abonnement Mbongo Business prend fin aujourd''hui. Pour le renouveler : ' || tel
      when 'retard' then 'TRK Consulting : votre abonnement Mbongo Business a pris fin le ' || to_char(fin, 'DD/MM/YYYY') || '. Pour le renouveler : ' || tel
      else 'TRK Consulting : votre abonnement Mbongo Business prend fin le ' || to_char(fin, 'DD/MM/YYYY') || ', dans ' || jours || ' jours. Pour le renouveler : ' || tel
    end || '. Répondez STOP pour ne plus recevoir ces messages.'
  end;
$$;
