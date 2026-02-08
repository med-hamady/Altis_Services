// =============================================================================
// Edge Function: process-import
// Parse un fichier Excel (format officiel FR), valide et normalise chaque ligne
// La banque est déterminée par l'import record (selectedBankId), PAS par le fichier
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// =============================================================================
// FORMAT OFFICIEL : Mapping colonnes FR → clés internes
// La colonne "Banque" n'est PAS dans le format officiel.
// Si présente, on la tolère avec un warning global.
// =============================================================================

const FRENCH_COLUMNS: Record<string, string> = {
  "type debiteur (pp/pm)": "debtor_type",
  "type debiteur (pp/pm)*": "debtor_type",
  "type debiteur": "debtor_type",
  "nom / raison sociale": "debtor_name",
  "nom / raison sociale*": "debtor_name",
  "nom/raison sociale": "debtor_name",
  "prenom (pp)": "debtor_first_name",
  "prenom": "debtor_first_name",
  "rc (pm)": "rc_number",
  "rc": "rc_number",
  "nif (pm)": "nif",
  "nif": "nif",
  "representant legal (pm)": "legal_rep_name",
  "representant legal": "legal_rep_name",
  "fonction representant (pm)": "legal_rep_title",
  "fonction representant": "legal_rep_title",
  "numero client": "id_number",
  "numero client*": "id_number",
  "n° client": "id_number",
  "num client": "id_number",
  "numero identification": "id_number",
  "type identifiant": "id_type",
  "type piece": "id_type",
  "emploi": "occupation",
  "profession": "occupation",
  "employeur": "employer",
  "secteur d'activite": "sector_activity",
  "secteur dactivite": "sector_activity",
  "telephone principal": "phone_1",
  "telephone principal*": "phone_1",
  "telephone secondaire": "phone_2",
  "contact": "phone_1",
  "email": "email",
  "adresse": "address",
  "adresse*": "address",
  "adresse geo": "address",
  "adresse geographique": "address",
  "ville": "city",
  "secteur": "sector",
  "date d'ouverture": "open_date",
  "date douverture": "open_date",
  "date d'affectation": "open_date",
  "date daffectation": "open_date",
  "date de defaut": "default_date",
  "date de defaut*": "default_date",
  "ref. contrat": "contract_ref",
  "ref. contrat*": "contract_ref",
  "ref contrat": "contract_ref",
  "reference contrat": "contract_ref",
  "montant principal": "amount_principal",
  "montant principal*": "amount_principal",
  "interets / penalites": "amount_interest",
  "interets/penalites": "amount_interest",
  "penalites de retard": "amount_penalties",
  "frais": "amount_fees",
  "total du (auto)": "total_due",
  "total du": "total_due",
  "total du*": "total_due",
  "solde restant (auto)": "remaining_balance",
  "solde restant": "remaining_balance",
  "devise": "currency",
  "devise*": "currency",
  "priorite": "priority",
  "type de traitement": "treatment_type",
  "agent assigne (email)": "agent_email",
  "agent assigne": "agent_email",
  "notes": "notes",
};

// Ancien format technique (snake_case) pour compatibilité
const LEGACY_COLUMNS: Record<string, string> = {
  "reference_banque": "bank_reference",
  "ref_banque": "bank_reference",
  "bank_reference": "bank_reference",
  "type_debiteur": "debtor_type",
  "debtor_type": "debtor_type",
  "nom": "debtor_name",
  "nom_debiteur": "debtor_name",
  "debtor_name": "debtor_name",
  "raison_sociale": "debtor_name",
  "prenom": "debtor_first_name",
  "first_name": "debtor_first_name",
  "telephone": "phone_1",
  "phone_1": "phone_1",
  "tel_1": "phone_1",
  "telephone_1": "phone_1",
  "telephone_2": "phone_2",
  "phone_2": "phone_2",
  "email": "email",
  "adresse": "address",
  "ville": "city",
  "region": "region",
  "reference_contrat": "contract_ref",
  "contract_ref": "contract_ref",
  "ref_contrat": "contract_ref",
  "date_defaut": "default_date",
  "default_date": "default_date",
  "montant_principal": "amount_principal",
  "amount_principal": "amount_principal",
  "principal": "amount_principal",
  "montant_interets": "amount_interest",
  "amount_interest": "amount_interest",
  "interets": "amount_interest",
  "montant_penalites": "amount_penalties",
  "amount_penalties": "amount_penalties",
  "penalites": "amount_penalties",
  "montant_frais": "amount_fees",
  "amount_fees": "amount_fees",
  "frais": "amount_fees",
  "montant_total": "total_due",
  "total_due": "total_due",
  "total": "total_due",
  "devise": "currency",
  "currency": "currency",
  "priorite": "priority",
  "priority": "priority",
  "notes": "notes",
  "rc_number": "rc_number",
  "registre_commerce": "rc_number",
  "nif": "nif",
  "representant_legal": "legal_rep_name",
  "legal_rep_name": "legal_rep_name",
  "emploi": "occupation",
  "occupation": "occupation",
  "employeur": "employer",
  "employer": "employer",
  "numero_client": "id_number",
  "id_number": "id_number",
  "id_type": "id_type",
  "type_identifiant": "id_type",
  "secteur_activite": "sector_activity",
  "sector_activity": "sector_activity",
};

// =============================================================================
// Interfaces
// =============================================================================

interface RawRow { [key: string]: unknown }
interface NormalizedRow { [key: string]: unknown }
interface ValidationIssue { field: string; message: string }
interface ProcessedRow {
  raw_json: RawRow;
  proposed_json: NormalizedRow;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  confidence: Record<string, number>;
}

// =============================================================================
// Utility functions
// =============================================================================

function normalizeHeader(col: string): string {
  return col
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function parseAmount(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return val;
  const str = String(val).replace(/\s/g, "").replace(/,/g, ".").replace(/[^\d.\-]/g, "");
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function parseDate(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "number") {
    const date = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
    return null;
  }
  const str = String(val).trim();
  const dmyMatch = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (str.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) return str;
  const date = new Date(str);
  if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
  return null;
}

function normalizePhone(phone: unknown): string | null {
  if (!phone) return null;
  let str = String(phone).replace(/[\s\-().]/g, "");
  if (str.startsWith("00222")) str = "+" + str.slice(2);
  if (str.match(/^\d{8}$/)) str = "+222" + str;
  if (str.startsWith("222") && str.length === 11) str = "+" + str;
  if (str.match(/^\+222\d{8}$/)) return str;
  return str || null;
}

function normalizeDebtorType(val: unknown): string | null {
  if (!val) return null;
  const str = String(val).toLowerCase().trim();
  if (["pp", "personne physique", "physique", "individu", "particulier"].includes(str)) return "pp";
  if (["pm", "personne morale", "morale", "entreprise", "societe", "société"].includes(str)) return "pm";
  return null;
}

function normalizePriority(val: unknown): string {
  if (!val) return "medium";
  const str = String(val).toLowerCase().trim();
  if (["low", "basse", "faible"].includes(str)) return "low";
  if (["medium", "moyenne", "moyen", "normal", ""].includes(str)) return "medium";
  if (["high", "haute", "élevée", "elevee"].includes(str)) return "high";
  if (["urgent", "urgente", "critique"].includes(str)) return "urgent";
  return "medium";
}

function normalizeTreatmentType(val: unknown): string {
  if (!val) return "amicable";
  const str = String(val).toLowerCase().trim();
  if (["amicable", "amiable", "à l'amiable", "a l'amiable"].includes(str)) return "amicable";
  if (["pre_legal", "pre-contentieux", "pré-contentieux", "precontentieux"].includes(str)) return "pre_legal";
  if (["legal", "judiciaire", "contentieux"].includes(str)) return "legal";
  return "amicable";
}

// =============================================================================
// Detect format
// =============================================================================

function detectFormat(headers: string[]): "french" | "legacy" | "unknown" {
  const normalized = headers.map(normalizeHeader);
  const frenchMatches = normalized.filter((h) => FRENCH_COLUMNS[h] !== undefined).length;
  const legacyNormalized = normalized.map((h) => h.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
  const legacyMatches = legacyNormalized.filter((h) => LEGACY_COLUMNS[h] !== undefined).length;

  if (frenchMatches >= 5) return "french";
  if (legacyMatches >= 5) return "legacy";
  return "unknown";
}

// =============================================================================
// Check if a "Banque" column is present (for tolerance)
// =============================================================================

function detectBankColumn(headers: string[]): boolean {
  return headers.some((h) => {
    const n = normalizeHeader(h);
    return n === "banque" || n === "banque*";
  });
}

// =============================================================================
// Map raw row to internal keys
// =============================================================================

function mapColumns(rawRow: RawRow, format: "french" | "legacy"): RawRow {
  const mapped: RawRow = {};
  const columnMap = format === "french" ? FRENCH_COLUMNS : LEGACY_COLUMNS;

  for (const [key, value] of Object.entries(rawRow)) {
    let normalizedKey: string;
    let internalKey: string | undefined;

    if (format === "french") {
      normalizedKey = normalizeHeader(key);
      // Ignorer la colonne Banque — on la traite séparément
      if (normalizedKey === "banque" || normalizedKey === "banque*") continue;
      internalKey = columnMap[normalizedKey];
    } else {
      normalizedKey = normalizeHeader(key).replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      internalKey = columnMap[normalizedKey];
    }

    if (internalKey) {
      mapped[internalKey] = value;
    }
  }
  return mapped;
}

// =============================================================================
// Extract raw bank_name value from a row (for validation only)
// =============================================================================

function extractBankValue(rawRow: RawRow): string | null {
  for (const [key, value] of Object.entries(rawRow)) {
    const n = normalizeHeader(key);
    if (n === "banque" || n === "banque*") {
      return value ? String(value).trim() : null;
    }
  }
  return null;
}

// =============================================================================
// Validation
// =============================================================================

function validateRow(
  row: RawRow,
  allRows: RawRow[],
  rowIndex: number,
): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // --- Required fields ---
  if (!row.debtor_type) {
    errors.push({ field: "debtor_type", message: "Type débiteur requis (PP ou PM)" });
  } else {
    const dt = normalizeDebtorType(row.debtor_type);
    if (!dt) {
      errors.push({ field: "debtor_type", message: `Type débiteur invalide: ${row.debtor_type} (attendu PP ou PM)` });
    }
  }

  if (!row.debtor_name) {
    errors.push({ field: "debtor_name", message: "Nom / Raison sociale requis" });
  }

  if (!row.phone_1) {
    errors.push({ field: "phone_1", message: "Téléphone principal requis" });
  }

  if (!row.contract_ref) {
    errors.push({ field: "contract_ref", message: "Réf. contrat requise" });
  }

  if (!row.default_date) {
    errors.push({ field: "default_date", message: "Date de défaut requise" });
  } else if (!parseDate(row.default_date)) {
    errors.push({ field: "default_date", message: "Date de défaut invalide" });
  }

  if (!row.amount_principal && row.amount_principal !== 0) {
    errors.push({ field: "amount_principal", message: "Montant principal requis" });
  } else {
    const amt = parseAmount(row.amount_principal);
    if (amt === null) errors.push({ field: "amount_principal", message: "Montant principal non numérique" });
    else if (amt < 0) errors.push({ field: "amount_principal", message: "Montant principal négatif" });
  }

  // --- Optional amounts ---
  for (const field of ["amount_interest", "amount_penalties", "amount_fees"]) {
    if (row[field] !== undefined && row[field] !== null && row[field] !== "") {
      const amt = parseAmount(row[field]);
      if (amt === null) warnings.push({ field, message: "Montant non numérique, sera mis à 0" });
      else if (amt < 0) warnings.push({ field, message: "Montant négatif" });
    }
  }

  // Currency
  if (row.currency && String(row.currency).toUpperCase().trim() !== "MRU") {
    warnings.push({ field: "currency", message: `Devise "${row.currency}" différente de MRU` });
  }

  // Email
  if (row.email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row.email))) {
      warnings.push({ field: "email", message: "Format email invalide" });
    }
  }

  // PM specific: NIF recommended
  const dt = normalizeDebtorType(row.debtor_type);
  if (dt === "pm" && !row.nif) {
    warnings.push({ field: "nif", message: "NIF recommandé pour une Personne Morale" });
  }

  // Duplicate detection: same contract_ref within the file
  if (row.contract_ref) {
    for (let i = 0; i < rowIndex; i++) {
      const other = allRows[i];
      if (
        other.contract_ref &&
        String(other.contract_ref).trim() === String(row.contract_ref).trim()
      ) {
        warnings.push({
          field: "contract_ref",
          message: `Doublon probable avec ligne ${i + 1} (même réf contrat)`,
        });
        break;
      }
    }
  }

  return { errors, warnings };
}

// =============================================================================
// Normalization
// =============================================================================

function normalizeRow(mapped: RawRow): NormalizedRow {
  const n: NormalizedRow = {};

  n.debtor_type = normalizeDebtorType(mapped.debtor_type) || "pp";
  n.debtor_name = mapped.debtor_name ? String(mapped.debtor_name).trim() : null;
  n.debtor_first_name = mapped.debtor_first_name ? String(mapped.debtor_first_name).trim() : null;
  n.rc_number = mapped.rc_number ? String(mapped.rc_number).trim() : null;
  n.nif = mapped.nif ? String(mapped.nif).trim() : null;
  n.legal_rep_name = mapped.legal_rep_name ? String(mapped.legal_rep_name).trim() : null;
  n.legal_rep_title = mapped.legal_rep_title ? String(mapped.legal_rep_title).trim() : null;
  n.phone_1 = normalizePhone(mapped.phone_1);
  n.phone_2 = normalizePhone(mapped.phone_2);
  n.email = mapped.email ? String(mapped.email).trim().toLowerCase() : null;
  n.address = mapped.address ? String(mapped.address).trim() : null;
  n.city = mapped.city ? String(mapped.city).trim() : null;
  n.sector = mapped.sector ? String(mapped.sector).trim() : null;
  n.open_date = parseDate(mapped.open_date);
  n.default_date = parseDate(mapped.default_date);
  n.contract_ref = mapped.contract_ref ? String(mapped.contract_ref).trim() : null;
  n.amount_principal = parseAmount(mapped.amount_principal) || 0;
  n.amount_interest = parseAmount(mapped.amount_interest) || 0;
  n.amount_penalties = parseAmount(mapped.amount_penalties) || 0;
  n.amount_fees = parseAmount(mapped.amount_fees) || 0;
  n.currency = mapped.currency ? String(mapped.currency).toUpperCase().trim() : "MRU";
  if (n.currency !== "MRU") n.currency = "MRU";
  n.priority = normalizePriority(mapped.priority);
  n.treatment_type = normalizeTreatmentType(mapped.treatment_type);
  n.agent_email = mapped.agent_email ? String(mapped.agent_email).trim().toLowerCase() : null;
  n.notes = mapped.notes ? String(mapped.notes).trim() : null;

  // Champs PP spécifiques
  n.employer = mapped.employer ? String(mapped.employer).trim() : null;
  n.occupation = mapped.occupation ? String(mapped.occupation).trim() : null;
  n.id_type = mapped.id_type ? String(mapped.id_type).trim() : null;
  n.id_number = mapped.id_number ? String(mapped.id_number).trim() : null;
  n.sector_activity = mapped.sector_activity ? String(mapped.sector_activity).trim() : null;

  // Legacy fields fallback
  n.bank_reference = mapped.bank_reference ? String(mapped.bank_reference).trim() : null;

  // Calculate totals
  const principal = n.amount_principal as number;
  const interest = n.amount_interest as number;
  const penalties = n.amount_penalties as number;
  const fees = n.amount_fees as number;
  const calculatedTotal = principal + interest + penalties + fees;

  const providedTotal = parseAmount(mapped.total_due);
  n.total_due = (providedTotal && providedTotal > 0) ? providedTotal : calculatedTotal;

  const providedBalance = parseAmount(mapped.remaining_balance);
  n.remaining_balance = (providedBalance !== null && providedBalance >= 0) ? providedBalance : n.total_due;

  return n;
}

// =============================================================================
// Main handler
// =============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { import_id } = await req.json();
    if (!import_id) {
      return new Response(JSON.stringify({ error: "import_id requis" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Get import record
    const { data: importData, error: fetchError } = await supabase
      .from("imports")
      .select("*")
      .eq("id", import_id)
      .single();

    if (fetchError || !importData) {
      return new Response(
        JSON.stringify({ error: "Import introuvable", detail: fetchError?.message }),
        { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Set status to processing
    await supabase.from("imports").update({ status: "processing" }).eq("id", import_id);

    const selectedBankId = importData.bank_id;

    // Get bank name for validation
    let selectedBankName = "";
    if (selectedBankId) {
      const { data: bankData } = await supabase
        .from("banks")
        .select("name")
        .eq("id", selectedBankId)
        .single();
      selectedBankName = bankData?.name || "";
    }

    // 2. Download file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("imports")
      .download(importData.file_path);

    if (downloadError || !fileData) {
      await supabase.from("imports").update({ status: "failed", error_message: "Impossible de télécharger le fichier" }).eq("id", import_id);
      return new Response(
        JSON.stringify({ error: "Fichier introuvable" }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 3. Parse Excel
    let rawRows: RawRow[];
    let headers: string[];
    try {
      const arrayBuffer = await fileData.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });

      // Must have sheet "Dossiers" (case-insensitive)
      const sheetName = workbook.SheetNames.find(
        (n: string) => n.toLowerCase().replace(/\s/g, "") === "dossiers"
      ) || workbook.SheetNames[0];

      const sheet = workbook.Sheets[sheetName];
      rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null });

      if (!rawRows || rawRows.length === 0) throw new Error("Feuille vide");

      headers = Object.keys(rawRows[0]);
    } catch (parseErr) {
      await supabase.from("imports").update({ status: "failed", error_message: `Erreur parsing: ${parseErr}` }).eq("id", import_id);
      return new Response(
        JSON.stringify({ error: "Erreur parsing Excel", detail: String(parseErr) }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 4. Detect format
    const format = detectFormat(headers);
    console.log(`Detected format: ${format}, headers: ${headers.join(", ")}`);

    if (format === "unknown") {
      await supabase.from("imports").update({
        status: "failed",
        error_message: "Format non reconnu. Utilisez le template officiel avec les colonnes en français (Type débiteur*, Nom*, etc.)",
      }).eq("id", import_id);
      return new Response(
        JSON.stringify({ error: "Format non reconnu" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 5. Check if "Banque" column is present (tolerance)
    const hasBankColumn = detectBankColumn(headers);
    let bankColumnWarning: string | null = null;

    if (hasBankColumn && selectedBankName) {
      // Verify all rows match the selected bank, otherwise add per-row error
      console.log(`Colonne "Banque" détectée dans le fichier. Vérification cohérence avec "${selectedBankName}".`);
      bankColumnWarning = `Colonne "Banque" ignorée — toutes les lignes sont rattachées à "${selectedBankName}"`;
    }

    // 6. Map and process each row
    const mappedRows: RawRow[] = rawRows.map((raw) => mapColumns(raw, format));
    const processedRows: ProcessedRow[] = [];

    for (let i = 0; i < mappedRows.length; i++) {
      const mapped = mappedRows[i];
      const { errors, warnings } = validateRow(mapped, mappedRows, i);
      const normalized = normalizeRow(mapped);

      // Check bank column consistency if present
      if (hasBankColumn && selectedBankName) {
        const rawBankValue = extractBankValue(rawRows[i]);
        if (rawBankValue && rawBankValue.toLowerCase() !== selectedBankName.toLowerCase()) {
          errors.push({
            field: "banque",
            message: `Banque "${rawBankValue}" ne correspond pas à la banque sélectionnée "${selectedBankName}"`,
          });
        }
      }

      processedRows.push({
        raw_json: { ...rawRows[i], _bank_id: selectedBankId },
        proposed_json: normalized,
        errors,
        warnings,
        confidence: {},
      });
    }

    // 7. Insert import_rows
    const rowInserts = processedRows.map((row, i) => ({
      import_id,
      row_number: i + 1,
      raw_json: row.raw_json,
      proposed_json: row.proposed_json,
      errors: row.errors,
      warnings: row.warnings,
      confidence: row.confidence,
      is_approved: false,
    }));

    const { error: insertError } = await supabase.from("import_rows").insert(rowInserts);

    if (insertError) {
      await supabase.from("imports").update({ status: "failed", error_message: `Erreur insertion: ${insertError.message}` }).eq("id", import_id);
      return new Response(
        JSON.stringify({ error: "Erreur insertion", detail: insertError.message }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 8. Update stats
    const errorCount = processedRows.filter((r) => r.errors.length > 0).length;
    const warningCount = processedRows.filter((r) => r.errors.length === 0 && r.warnings.length > 0).length;
    const validCount = processedRows.filter((r) => r.errors.length === 0).length;

    const errorMessage = bankColumnWarning || null;

    await supabase.from("imports").update({
      status: "ready_for_review",
      total_rows: processedRows.length,
      valid_rows: validCount,
      error_rows: errorCount,
      warning_rows: warningCount,
      error_message: errorMessage,
      processed_at: new Date().toISOString(),
    }).eq("id", import_id);

    return new Response(
      JSON.stringify({
        success: true,
        format_detected: format,
        total_rows: processedRows.length,
        valid_rows: validCount,
        error_rows: errorCount,
        warning_rows: warningCount,
        bank_column_warning: bankColumnWarning,
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
