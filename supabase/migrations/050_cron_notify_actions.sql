-- =============================================================================
-- Migration 050: Cron job pour les notifications d'actions planifiées
-- Déclenche l'edge function notify-actions toutes les heures (8h-18h)
-- =============================================================================

-- Activer l'extension pg_cron si pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Activer pg_net pour les appels HTTP depuis PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================================================
-- Cron job : notify-actions
-- S'exécute toutes les heures de 8h à 18h (heure serveur UTC)
-- Appelle l'edge function notify-actions via pg_net
-- =============================================================================

-- Supprimer le job s'il existe déjà (pour éviter les doublons lors de re-run)
SELECT cron.unschedule('notify-actions-hourly')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'notify-actions-hourly'
);

-- Créer le cron job
-- Exécution toutes les heures entre 7h et 19h UTC (8h-20h heure locale GMT+1)
SELECT cron.schedule(
  'notify-actions-hourly',
  '0 7-19 * * *',  -- toutes les heures de 7h à 19h UTC
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/notify-actions',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- =============================================================================
-- ALTERNATIVE : Si pg_cron/pg_net ne sont pas disponibles sur votre plan Supabase,
-- vous pouvez utiliser un cron externe (GitHub Actions, Vercel Cron, etc.)
-- qui appelle l'endpoint :
--
--   POST https://<project-ref>.supabase.co/functions/v1/notify-actions
--   Headers:
--     Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
--     Content-Type: application/json
--
-- Exemple avec cURL :
--   curl -X POST \
--     https://<project-ref>.supabase.co/functions/v1/notify-actions \
--     -H "Authorization: Bearer <service_role_key>" \
--     -H "Content-Type: application/json"
-- =============================================================================
