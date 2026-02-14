// =============================================================================
// Edge Function: finalize-import
// Crée les dossiers et débiteurs à partir des lignes approuvées
// bank_id provient TOUJOURS de l'import record (selectedBankId), pas de la ligne
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface NormalizedRow {
  debtor_type: string;
  debtor_name?: string;
  debtor_first_name?: string;
  phone_1?: string;
  phone_2?: string;
  email?: string;
  address?: string;
  city?: string;
  sector?: string;
  region?: string;
  id_type?: string;
  id_number?: string;
  contract_ref?: string;
  product_type?: string;
  open_date?: string;
  default_date?: string;
  amount_principal: number;
  amount_interest: number;
  amount_penalties: number;
  amount_fees: number;
  total_due?: number;
  remaining_balance?: number;
  currency?: string;
  treatment_type?: string;
  bank_reference?: string;
  guarantee_type?: string;
  guarantee_description?: string;
  notes?: string;
  employer?: string;
  occupation?: string;
  sector_activity?: string;
  rc_number?: string;
  nif?: string;
  legal_rep_name?: string;
  legal_rep_title?: string;
  legal_rep_phone?: string;
  agent_email?: string;
  [key: string]: unknown;
}

// Generate case reference: YYYY-XXXXXX
function generateReference(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${year}-${rand}`;
}

Deno.serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { import_id, approved_row_ids } = await req.json();
    if (!import_id) {
      return new Response(JSON.stringify({ error: "import_id requis" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Get the import record
    const { data: importData, error: importError } = await supabase
      .from("imports")
      .select("*")
      .eq("id", import_id)
      .single();

    if (importError || !importData) {
      return new Response(
        JSON.stringify({ error: "Import introuvable", detail: importError?.message }),
        { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (importData.status !== "ready_for_review" && importData.status !== "failed") {
      return new Response(
        JSON.stringify({ error: `Import non prêt pour validation (status: ${importData.status})` }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // bank_id vient TOUJOURS de l'import record (sélectionné par l'admin)
    const bankId = importData.bank_id;
    if (!bankId) {
      return new Response(
        JSON.stringify({ error: "Aucune banque associée à cet import" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 2. Get approved rows
    let query = supabase
      .from("import_rows")
      .select("*")
      .eq("import_id", import_id);

    if (approved_row_ids && approved_row_ids.length > 0) {
      query = query.in("id", approved_row_ids);
    } else {
      query = query.eq("is_approved", true);
    }

    const { data: rows, error: rowsError } = await query.order("row_number");

    if (rowsError) {
      return new Response(
        JSON.stringify({ error: "Erreur récupération lignes", detail: rowsError.message }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucune ligne approuvée à créer" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 3. Pre-load agents for resolution
    const { data: agents } = await supabase
      .from("agents")
      .select("id, email");

    const agentMap = new Map<string, string>();
    for (const agent of agents || []) {
      if (agent.email) agentMap.set(agent.email.toLowerCase().trim(), agent.id);
    }

    // 4. Process each approved row
    const created: string[] = [];
    const errors: { row_number: number; error: string }[] = [];

    for (const row of rows) {
      try {
        const data = row.proposed_json as NormalizedRow;

        // Resolve agent
        let assignedAgentId: string | null = null;
        if (data.agent_email) {
          assignedAgentId = agentMap.get(data.agent_email.toLowerCase().trim()) || null;
        }

        // 4a. Upsert debtor
        let debtorPpId: string | null = null;
        let debtorPmId: string | null = null;

        if (data.debtor_type === "pm") {
          // Personne Morale
          const companyName = data.debtor_name || "Entreprise inconnue";

          let existing = null;

          if (data.rc_number) {
            const { data: byRc } = await supabase
              .from("debtors_pm")
              .select("id")
              .eq("rc_number", data.rc_number)
              .limit(1);
            if (byRc && byRc.length > 0) existing = byRc[0];
          }

          if (!existing && data.phone_1) {
            const { data: byPhone } = await supabase
              .from("debtors_pm")
              .select("id")
              .eq("phone_primary", data.phone_1)
              .eq("company_name", companyName)
              .limit(1);
            if (byPhone && byPhone.length > 0) existing = byPhone[0];
          }

          if (existing) {
            debtorPmId = existing.id;
          } else {
            let legalRepName = data.legal_rep_name || null;
            if (legalRepName && data.legal_rep_title) {
              legalRepName = `${data.legal_rep_title} - ${legalRepName}`;
            }

            const { data: newDebtor, error: debtorErr } = await supabase
              .from("debtors_pm")
              .insert({
                company_name: companyName,
                rc_number: data.rc_number || null,
                nif: data.nif || null,
                legal_rep_name: legalRepName,
                legal_rep_phone: data.legal_rep_phone || null,
                phone_primary: data.phone_1 || null,
                phone_secondary: data.phone_2 || null,
                email: data.email || null,
                address_street: data.address || null,
                address_city: data.city || null,
                address_region: data.sector || data.region || null,
                sector_activity: data.sector_activity || null,
                notes: data.notes || null,
              })
              .select("id")
              .single();

            if (debtorErr) throw new Error(`Erreur création débiteur PM: ${debtorErr.message}`);
            debtorPmId = newDebtor.id;
          }
        } else {
          // Personne Physique (default)
          const lastName = data.debtor_name || "Inconnu";
          const firstName = data.debtor_first_name || "";

          let existing = null;

          if (data.id_number) {
            const { data: byId } = await supabase
              .from("debtors_pp")
              .select("id")
              .eq("id_number", data.id_number)
              .limit(1);
            if (byId && byId.length > 0) existing = byId[0];
          }

          if (!existing && data.phone_1) {
            const { data: byPhone } = await supabase
              .from("debtors_pp")
              .select("id")
              .eq("phone_primary", data.phone_1)
              .eq("last_name", lastName)
              .limit(1);
            if (byPhone && byPhone.length > 0) existing = byPhone[0];
          }

          if (existing) {
            debtorPpId = existing.id;
          } else {
            const { data: newDebtor, error: debtorErr } = await supabase
              .from("debtors_pp")
              .insert({
                first_name: firstName,
                last_name: lastName,
                id_type: data.id_type || null,
                id_number: data.id_number || null,
                phone_primary: data.phone_1 || null,
                phone_secondary: data.phone_2 || null,
                email: data.email || null,
                address_street: data.address || null,
                address_city: data.city || null,
                address_region: data.sector || data.region || null,
                employer: data.employer || null,
                occupation: data.occupation || null,
                photo_url: data.photo_url || null,
                notes: data.notes || null,
              })
              .select("id")
              .single();

            if (debtorErr) throw new Error(`Erreur création débiteur PP: ${debtorErr.message}`);
            debtorPpId = newDebtor.id;
          }
        }

        // 4b. Create case
        const reference = generateReference();

        let amountPrincipal = Number(data.amount_principal) || 0;
        const amountInterest = Number(data.amount_interest) || 0;
        const amountPenalties = Number(data.amount_penalties) || 0;
        const amountFees = Number(data.amount_fees) || 0;
        const totalDue = Number(data.total_due) || 0;

        if (amountPrincipal === 0 && amountInterest === 0 && amountPenalties === 0 && amountFees === 0 && totalDue > 0) {
          amountPrincipal = totalDue;
        }

        // Map treatment_type to phase
        let phase = "amicable";
        if (data.treatment_type) {
          const tt = data.treatment_type.toLowerCase();
          if (tt === "pre_legal") phase = "pre_legal";
          else if (tt === "legal") phase = "legal";
          else phase = "amicable";
        }

        const caseInsert: Record<string, unknown> = {
          reference,
          bank_reference: data.bank_reference || null,
          bank_id: bankId,
          debtor_pp_id: debtorPpId,
          debtor_pm_id: debtorPmId,
          assigned_agent_id: assignedAgentId,
          status: "new",
          phase,
          product_type: data.product_type || null,
          contract_reference: data.contract_ref || null,
          default_date: data.default_date || null,
          amount_principal: amountPrincipal,
          amount_interest: amountInterest,
          amount_penalties: amountPenalties,
          amount_fees: amountFees,
          guarantee_type: data.guarantee_type || null,
          guarantee_description: data.guarantee_description || null,
          notes: data.notes || null,
          created_by: importData.uploaded_by,
        };

        console.log("Inserting case:", JSON.stringify(caseInsert));

        const { data: newCase, error: caseErr } = await supabase
          .from("cases")
          .insert(caseInsert)
          .select("id, reference")
          .single();

        if (caseErr) throw new Error(`Erreur création dossier: ${caseErr.message}`);

        created.push(newCase.reference);
        console.log("Case created:", newCase.reference);

        // 4c. Update import_row with created case info
        await supabase
          .from("import_rows")
          .update({
            proposed_json: {
              ...data,
              _case_id: newCase.id,
              _case_reference: newCase.reference,
            },
          })
          .eq("id", row.id);

        // 4d. Audit log
        await supabase.from("audit_logs").insert({
          table_name: "cases",
          record_id: newCase.id,
          operation: "INSERT",
          new_data: { source: "import", import_id, row_number: row.row_number },
          user_id: importData.uploaded_by,
          user_type: "admin",
        });
      } catch (rowErr) {
        console.error("Row error:", row.row_number, String(rowErr));
        errors.push({
          row_number: row.row_number,
          error: String(rowErr),
        });
      }
    }

    // 5. Update import status
    const finalStatus = errors.length === rows.length ? "failed" : "approved";
    await supabase
      .from("imports")
      .update({
        status: finalStatus,
        approved_at: new Date().toISOString(),
        approved_by: importData.uploaded_by,
        error_message: errors.length > 0
          ? `${errors.length} erreur(s): ${errors.map(e => `Ligne ${e.row_number}: ${e.error}`).join("; ")}`
          : null,
      })
      .eq("id", import_id);

    return new Response(
      JSON.stringify({
        success: true,
        created_count: created.length,
        created_references: created,
        error_count: errors.length,
        errors,
      }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
