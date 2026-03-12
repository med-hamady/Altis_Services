// =============================================================================
// Edge Function: notify-actions
// Envoie des emails de rappel aux agents pour les actions planifiées du jour
// Appelée par pg_cron toutes les heures (ou manuellement)
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const DEFAULT_FROM =
  Deno.env.get("EMAIL_FROM") || "Altis Services <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Traduction des types d'action
const ACTION_TYPE_LABELS: Record<string, string> = {
  call: "Appel",
  visit: "Visite",
  sms: "SMS",
  email: "Email",
  letter: "Courrier",
  meeting: "Réunion",
  other: "Autre",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildEmailHtml(notification: {
  case_reference: string;
  debtor_name: string;
  bank_name: string;
  next_action_type: string;
  next_action_date: string;
  next_action_notes: string | null;
  remaining_balance: number;
  agent_full_name: string;
}): string {
  const actionLabel =
    ACTION_TYPE_LABELS[notification.next_action_type] ||
    notification.next_action_type;
  const dateFormatted = formatDate(notification.next_action_date);
  const balanceFormatted = formatAmount(notification.remaining_balance);

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1e3a5f;padding:24px 32px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">⏰ Rappel d'action planifiée</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="color:#333;font-size:16px;margin:0 0 16px;">
                Bonjour <strong>${notification.agent_full_name}</strong>,
              </p>
              <p style="color:#333;font-size:16px;margin:0 0 24px;">
                Vous avez une action planifiée pour aujourd'hui :
              </p>

              <!-- Action Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef3fb;border-radius:8px;border-left:4px solid #1e3a5f;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="color:#1e3a5f;font-size:18px;font-weight:bold;margin:0 0 12px;">
                      ${actionLabel} — ${dateFormatted}
                    </p>
                    ${
                      notification.next_action_notes
                        ? `<p style="color:#555;font-size:14px;margin:0 0 8px;font-style:italic;">"${notification.next_action_notes}"</p>`
                        : ""
                    }
                  </td>
                </tr>
              </table>

              <!-- Details Table -->
              <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
                <tr>
                  <td style="color:#777;font-size:14px;border-bottom:1px solid #eee;width:40%;">Dossier</td>
                  <td style="color:#333;font-size:14px;font-weight:bold;border-bottom:1px solid #eee;">${notification.case_reference}</td>
                </tr>
                <tr>
                  <td style="color:#777;font-size:14px;border-bottom:1px solid #eee;">Débiteur</td>
                  <td style="color:#333;font-size:14px;font-weight:bold;border-bottom:1px solid #eee;">${notification.debtor_name}</td>
                </tr>
                <tr>
                  <td style="color:#777;font-size:14px;border-bottom:1px solid #eee;">Banque</td>
                  <td style="color:#333;font-size:14px;font-weight:bold;border-bottom:1px solid #eee;">${notification.bank_name}</td>
                </tr>
                <tr>
                  <td style="color:#777;font-size:14px;border-bottom:1px solid #eee;">Solde restant</td>
                  <td style="color:#e53e3e;font-size:14px;font-weight:bold;border-bottom:1px solid #eee;">${balanceFormatted} MRU</td>
                </tr>
              </table>

              <p style="color:#555;font-size:14px;margin:0;">
                Connectez-vous à la plateforme Altis Services pour traiter cette action.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
              <p style="color:#999;font-size:12px;margin:0;">
                Cet email a été envoyé automatiquement par Altis Services.<br/>
                Ne pas répondre à ce message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: DEFAULT_FROM,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error(`Erreur Resend pour ${to}:`, JSON.stringify(err));
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Erreur envoi email à ${to}:`, err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY non configurée" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Client Supabase avec service_role (bypass RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Récupérer les actions planifiées non notifiées
    const { data: notifications, error: fetchError } = await supabase.rpc(
      "get_pending_action_notifications"
    );

    if (fetchError) {
      console.error("Erreur récupération notifications:", fetchError);
      return new Response(
        JSON.stringify({
          error: "Erreur récupération des actions",
          detail: fetchError.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Aucune action planifiée à notifier",
          sent: 0,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`${notifications.length} notification(s) à envoyer`);

    let sent = 0;
    let failed = 0;

    for (const notif of notifications) {
      const actionLabel =
        ACTION_TYPE_LABELS[notif.next_action_type] || notif.next_action_type;
      const subject = `Rappel : ${actionLabel} prévu(e) — Dossier ${notif.case_reference}`;
      const html = buildEmailHtml(notif);

      const success = await sendEmail(notif.agent_email, subject, html);

      if (success) {
        // Marquer comme notifié
        const { error: markError } = await supabase.rpc(
          "mark_action_notification_sent",
          {
            p_action_id: notif.action_id,
            p_case_id: notif.case_id,
            p_agent_id: notif.agent_id,
          }
        );

        if (markError) {
          console.error(
            `Erreur marquage notification ${notif.action_id}:`,
            markError
          );
        }

        sent++;
        console.log(
          `Email envoyé à ${notif.agent_email} pour dossier ${notif.case_reference}`
        );
      } else {
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${sent} notification(s) envoyée(s), ${failed} échec(s)`,
        sent,
        failed,
        total: notifications.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err) {
    console.error("Erreur non gérée:", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne", detail: String(err) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
