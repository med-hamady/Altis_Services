// =============================================================================
// Edge Function: process-import
// Parse un fichier Excel (format officiel FR), valide et normalise chaque ligne
// La banque est déterminée par l'import record (selectedBankId), PAS par le fichier
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import JSZip from "https://esm.sh/jszip@3.10.1";

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
  "nom": "debtor_name",
  "nom*": "debtor_name",
  "raison sociale": "debtor_name",
  "prenom (pp)": "debtor_first_name",
  "prenom": "debtor_first_name",
  "prenom*": "debtor_first_name",
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
  "employer": "employer",
  "secteur d'activite": "sector_activity",
  "secteur dactivite": "sector_activity",
  "telephone principal": "phone_1",
  "telephone principal*": "phone_1",
  "telephone": "phone_1",
  "telephone*": "phone_1",
  "tel": "phone_1",
  "tel principal": "phone_1",
  "telephone secondaire": "phone_2",
  "tel secondaire": "phone_2",
  "contact": "phone_1",
  "contact*": "phone_1",
  "email": "email",
  "email*": "email",
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
  "montant principale": "amount_principal",
  "montant": "amount_principal",
  "engagement": "amount_principal",
  "engagements": "amount_principal",
  "interets / penalites": "amount_interest",
  "interets/penalites": "amount_interest",
  "interets/penalite": "amount_interest",
  "interets": "amount_interest",
  "penalites de retard": "amount_penalties",
  "penalites": "amount_penalties",
  "frais": "amount_fees",
  "frais*": "amount_fees",
  "total du (auto)": "total_due",
  "total du": "total_due",
  "total du*": "total_due",
  "totale du": "total_due",
  "solde restant (auto)": "remaining_balance",
  "solde restant": "remaining_balance",
  "devise": "currency",
  "devise*": "currency",
  "priorite": "priority",
  "type de traitement": "treatment_type",
  "agent assigne (email)": "agent_email",
  "agent assigne": "agent_email",
  "agent en charge": "agent_email",
  "entreprise": "employer",
  "pays": "city",
  "numero de telephone": "phone_1",
  "date d'entree en situation d'impaye": "default_date",
  "date dentree en situation dimpaye": "default_date",
  "nature du pret": "loan_nature",
  "nature du pret*": "loan_nature",
  "nature de la garantie detenue": "guarantee_nature",
  "nature de la garantie": "guarantee_nature",
  "demarche de recouvrement deja entreprises": "recovery_steps",
  "demarche de recouvrement": "recovery_steps",
  "demarches de recouvrement": "recovery_steps",
  "photo ou specimen du debiteur": "debtor_photo",
  "photo": "debtor_photo",
  "specimen": "debtor_photo",
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
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
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
// Dynamic header patterns (for columns with variable parts like dates)
// =============================================================================

const DYNAMIC_PATTERNS: Array<{ pattern: RegExp; field: string }> = [
  { pattern: /^engagements?\s+au\s+/, field: "amount_principal" },
];

function matchDynamicHeader(normalizedHeader: string): string | undefined {
  for (const { pattern, field } of DYNAMIC_PATTERNS) {
    if (pattern.test(normalizedHeader)) return field;
  }
  return undefined;
}

// =============================================================================
// XLSX Image Extraction (from ZIP structure)
// =============================================================================

interface ImageAnchor {
  row: number;       // absolute 0-indexed row in sheet
  col: number;       // absolute 0-indexed col in sheet
  rId: string;       // relationship ID for the image
  imagePath: string; // resolved path in ZIP (e.g., xl/media/image1.png)
}

interface ExtractedImage {
  dataRowIndex: number;
  imageData: Uint8Array;
  extension: string;
  mimeType: string;
}

/**
 * Find the drawing XML path that belongs to a specific sheet.
 * Traces: workbook.xml → sheet rId → sheet file → sheet rels → drawing path
 */
async function findDrawingForSheet(
  zip: JSZip,
  sheetName: string,
): Promise<string | null> {
  try {
    // 1. Parse workbook.xml to find the sheet's relationship ID
    const workbookFile = zip.file("xl/workbook.xml");
    const workbookRelsFile = zip.file("xl/_rels/workbook.xml.rels");
    if (!workbookFile || !workbookRelsFile) {
      console.log("[IMG] Missing workbook.xml or its rels file");
      return null;
    }

    const workbookXml = await workbookFile.async("string");
    const workbookRelsXml = await workbookRelsFile.async("string");

    // Extract all <sheet> elements with their name and r:id
    // Handle any attribute order: name="..." r:id="..." or r:id="..." name="..."
    const sheetElements = workbookXml.match(/<sheet\b[^>]*?\/>/gi) || [];
    let sheetRId: string | null = null;

    for (const el of sheetElements) {
      const nameMatch = el.match(/name="([^"]+)"/i);
      const ridMatch = el.match(/(?:r:id|r:Id)="([^"]+)"/i);
      if (nameMatch && ridMatch) {
        if (nameMatch[1].toLowerCase().trim() === sheetName.toLowerCase().trim()) {
          sheetRId = ridMatch[1];
          break;
        }
      }
    }

    if (!sheetRId) {
      console.log(`[IMG] Could not find rId for sheet "${sheetName}" in workbook.xml`);
      console.log(`[IMG] Available sheets: ${sheetElements.map(el => {
        const m = el.match(/name="([^"]+)"/i);
        return m ? m[1] : "?";
      }).join(", ")}`);
      return null;
    }

    console.log(`[IMG] Sheet "${sheetName}" → rId: ${sheetRId}`);

    // 2. Find the sheet file path from workbook.xml.rels
    const relElements = workbookRelsXml.match(/<Relationship\b[^>]*?\/>/gi) || [];
    let sheetFilePath: string | null = null;

    for (const el of relElements) {
      const idMatch = el.match(/Id="([^"]+)"/i);
      const targetMatch = el.match(/Target="([^"]+)"/i);
      if (idMatch && targetMatch && idMatch[1] === sheetRId) {
        sheetFilePath = targetMatch[1];
        break;
      }
    }

    if (!sheetFilePath) {
      console.log(`[IMG] Could not resolve sheet file for rId ${sheetRId}`);
      return null;
    }

    // Normalize path: worksheets/sheet1.xml → xl/worksheets/sheet1.xml
    const fullSheetPath = sheetFilePath.startsWith("xl/") ? sheetFilePath : `xl/${sheetFilePath}`;
    console.log(`[IMG] Sheet file: ${fullSheetPath}`);

    // 3. Find the drawing reference in the sheet's .rels file
    // xl/worksheets/sheet1.xml → xl/worksheets/_rels/sheet1.xml.rels
    const pathParts = fullSheetPath.match(/^(.*)\/([^/]+)$/);
    if (!pathParts) return null;

    const sheetRelsPath = `${pathParts[1]}/_rels/${pathParts[2]}.rels`;
    const sheetRelsFile = zip.file(sheetRelsPath);

    if (!sheetRelsFile) {
      console.log(`[IMG] No rels file for sheet: ${sheetRelsPath}`);
      return null;
    }

    const sheetRelsXml = await sheetRelsFile.async("string");
    const sheetRelElements = sheetRelsXml.match(/<Relationship\b[^>]*?\/>/gi) || [];
    let drawingTarget: string | null = null;

    for (const el of sheetRelElements) {
      const typeMatch = el.match(/Type="([^"]+)"/i);
      const targetMatch = el.match(/Target="([^"]+)"/i);
      if (typeMatch && targetMatch && /drawing/i.test(typeMatch[1])) {
        drawingTarget = targetMatch[1];
        break;
      }
    }

    if (!drawingTarget) {
      console.log("[IMG] No drawing relationship found in sheet rels");
      return null;
    }

    // Resolve relative path: ../drawings/drawing1.xml → xl/drawings/drawing1.xml
    let drawingPath: string;
    if (drawingTarget.startsWith("../")) {
      drawingPath = "xl/" + drawingTarget.slice(3);
    } else if (drawingTarget.startsWith("/")) {
      drawingPath = drawingTarget.slice(1);
    } else {
      drawingPath = `${pathParts[1]}/${drawingTarget}`;
    }

    console.log(`[IMG] Drawing path for sheet: ${drawingPath}`);
    return drawingPath;

  } catch (err) {
    console.error("[IMG] Error finding drawing for sheet:", err);
    return null;
  }
}

/**
 * Parse a drawing XML + its rels to extract all image anchors with positions.
 */
async function parseDrawingAnchors(
  zip: JSZip,
  drawingPath: string,
): Promise<ImageAnchor[]> {
  const anchors: ImageAnchor[] = [];

  // Parse the drawing relationships file to map rId → image file path
  const pathParts = drawingPath.match(/^(.*)\/([^/]+)$/);
  if (!pathParts) return anchors;

  const relsPath = `${pathParts[1]}/_rels/${pathParts[2]}.rels`;
  const relsFile = zip.file(relsPath);
  if (!relsFile) {
    console.log(`[IMG] No rels file: ${relsPath}`);
    return anchors;
  }

  const relsXml = await relsFile.async("string");

  // Build rId → image path map from all Relationship elements
  const rIdToFile = new Map<string, string>();
  const relElements = relsXml.match(/<Relationship\b[^>]*?\/>/gi) || [];

  for (const el of relElements) {
    const idMatch = el.match(/Id="([^"]+)"/i);
    const targetMatch = el.match(/Target="([^"]+)"/i);
    const typeMatch = el.match(/Type="([^"]+)"/i);
    if (!idMatch || !targetMatch) continue;

    // Only include image relationships
    const isImage = typeMatch && /image/i.test(typeMatch[1]);
    const isMediaTarget = /media\//i.test(targetMatch[1]);
    if (!isImage && !isMediaTarget) continue;

    const target = targetMatch[1];
    const resolvedPath = target.startsWith("../")
      ? "xl/" + target.slice(3)
      : target.startsWith("/") ? target.slice(1) : target;
    rIdToFile.set(idMatch[1], resolvedPath);
  }

  console.log(`[IMG] Drawing ${drawingPath}: ${rIdToFile.size} image relationships`);
  for (const [rId, path] of rIdToFile) {
    console.log(`[IMG]   ${rId} → ${path}`);
  }

  // Parse the drawing XML
  const drawingFile = zip.file(drawingPath);
  if (!drawingFile) {
    console.log(`[IMG] Drawing file not found: ${drawingPath}`);
    return anchors;
  }

  const drawingXml = await drawingFile.async("string");

  // Extract all anchors (oneCellAnchor and twoCellAnchor)
  const anchorRegex = /<(?:xdr:)?(?:oneCellAnchor|twoCellAnchor)\b[^>]*>([\s\S]*?)<\/(?:xdr:)?(?:oneCellAnchor|twoCellAnchor)>/gi;
  let anchorMatch: RegExpExecArray | null;

  while ((anchorMatch = anchorRegex.exec(drawingXml)) !== null) {
    const anchorContent = anchorMatch[1];

    // Extract <xdr:from> row and col
    const fromMatch = anchorContent.match(
      /<(?:xdr:)?from>\s*<(?:xdr:)?col>(\d+)<\/(?:xdr:)?col>[\s\S]*?<(?:xdr:)?row>(\d+)<\/(?:xdr:)?row>[\s\S]*?<\/(?:xdr:)?from>/i,
    );
    if (!fromMatch) continue;

    const col = parseInt(fromMatch[1], 10);
    const row = parseInt(fromMatch[2], 10);

    // Extract r:embed from blip
    const blipMatch = anchorContent.match(
      /<(?:a:)?blip[^>]*?(?:r:embed|embed)="([^"]+)"/i,
    );
    if (!blipMatch) continue;

    const rId = blipMatch[1];
    const imagePath = rIdToFile.get(rId);
    if (!imagePath) {
      console.log(`[IMG] Could not resolve rId ${rId} at row=${row} col=${col}`);
      continue;
    }

    anchors.push({ row, col, rId, imagePath });
  }

  console.log(`[IMG] Found ${anchors.length} image anchors in drawing`);
  for (const a of anchors) {
    console.log(`[IMG]   row=${a.row} col=${a.col} rId=${a.rId} → ${a.imagePath}`);
  }

  return anchors;
}

const MIME_MAP: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
  emf: "image/x-emf",
  wmf: "image/x-wmf",
  tif: "image/tiff",
  tiff: "image/tiff",
};

/**
 * Extract embedded images from XLSX for a specific sheet and photo column.
 *
 * Strategy:
 * 1. Find the correct drawing for the target sheet (not all drawings)
 * 2. Parse all image anchors from that drawing
 * 3. Filter images that are in/near the photo column (±2 cols tolerance)
 * 4. Calculate dataRowIndex for each image
 * 5. If no images match the photo column, fall back to ALL images sorted by row
 */
async function extractImagesFromXLSX(
  xlsxBuffer: ArrayBuffer,
  photoColumnIndex: number,
  headerRowIndex: number,
  sheetName: string,
): Promise<ExtractedImage[]> {
  try {
    const zip = await JSZip.loadAsync(xlsxBuffer);

    // Step 1: Find the drawing for our specific sheet
    let drawingPath = await findDrawingForSheet(zip, sheetName);

    // Fallback: if sheet-specific lookup fails, try all drawings
    if (!drawingPath) {
      console.log("[IMG] Falling back to scanning all drawing files...");
      const allDrawings: string[] = [];
      zip.forEach((path: string) => {
        if (/^xl\/drawings\/drawing\d+\.xml$/i.test(path)) {
          allDrawings.push(path);
        }
      });
      if (allDrawings.length === 1) {
        drawingPath = allDrawings[0];
        console.log(`[IMG] Using single drawing found: ${drawingPath}`);
      } else if (allDrawings.length > 1) {
        drawingPath = allDrawings[0];
        console.log(`[IMG] WARNING: Multiple drawings found (${allDrawings.length}), using first: ${drawingPath}`);
      } else {
        console.log("[IMG] No drawing files found — no embedded images");
        return [];
      }
    }

    // Step 2: Parse all image anchors from the drawing
    const allAnchors = await parseDrawingAnchors(zip, drawingPath);
    if (allAnchors.length === 0) {
      console.log("[IMG] No image anchors found in drawing");
      return [];
    }

    // Step 3: Filter by photo column (with ±2 tolerance)
    const COL_TOLERANCE = 2;
    let photoAnchors = allAnchors.filter(
      (a) => Math.abs(a.col - photoColumnIndex) <= COL_TOLERANCE
    );

    console.log(`[IMG] Photo column index: ${photoColumnIndex}, anchors within ±${COL_TOLERANCE}: ${photoAnchors.length}`);

    // If no images near the photo column, use ALL images as fallback
    if (photoAnchors.length === 0) {
      console.log("[IMG] FALLBACK: No images near photo column, using ALL images");
      photoAnchors = allAnchors;
    }

    // Step 4: Sort by row position (ascending) and extract image data
    photoAnchors.sort((a, b) => a.row - b.row);

    const images: ExtractedImage[] = [];
    for (const anchor of photoAnchors) {
      const dataRowIndex = anchor.row - headerRowIndex - 1;
      if (dataRowIndex < 0) {
        console.log(`[IMG] Skipping image at row ${anchor.row} (above data rows, header at ${headerRowIndex})`);
        continue;
      }

      const imageFile = zip.file(anchor.imagePath);
      if (!imageFile) {
        console.log(`[IMG] Image file not found in ZIP: ${anchor.imagePath}`);
        continue;
      }

      const imageData = await imageFile.async("uint8array");
      const ext = anchor.imagePath.split(".").pop()?.toLowerCase() || "png";

      images.push({
        dataRowIndex,
        imageData,
        extension: ext === "jpg" ? "jpeg" : ext,
        mimeType: MIME_MAP[ext] || "image/png",
      });

      console.log(`[IMG] Image: row=${anchor.row} col=${anchor.col} → dataRowIndex=${dataRowIndex} file=${anchor.imagePath} (${imageData.length} bytes)`);
    }

    console.log(`[IMG] Total extracted images: ${images.length}`);
    return images;
  } catch (err) {
    console.error("[IMG] Error extracting images from XLSX:", err);
    return [];
  }
}

/**
 * Upload extracted images to Supabase Storage and return:
 * - positionMap: dataRowIndex → publicUrl (for position-based matching)
 * - orderedUrls: array of publicUrls sorted by image row position (for order-based fallback)
 */
async function uploadImagesToStorage(
  supabase: ReturnType<typeof createClient>,
  importId: string,
  images: ExtractedImage[],
): Promise<{ positionMap: Map<number, string>; orderedUrls: string[] }> {
  const positionMap = new Map<number, string>();
  const orderedResults: { dataRowIndex: number; url: string }[] = [];

  // Upload sequentially to maintain order and avoid race conditions
  for (const img of images) {
    const filePath = `${importId}/row_${img.dataRowIndex + 1}.${img.extension}`;
    try {
      const { error } = await supabase.storage
        .from("debtor-photos")
        .upload(filePath, img.imageData, {
          contentType: img.mimeType,
          upsert: true,
        });

      if (error) {
        console.error(`[IMG] Upload failed for dataRowIndex ${img.dataRowIndex}: ${error.message}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("debtor-photos")
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        positionMap.set(img.dataRowIndex, urlData.publicUrl);
        orderedResults.push({ dataRowIndex: img.dataRowIndex, url: urlData.publicUrl });
        console.log(`[IMG] Uploaded dataRowIndex=${img.dataRowIndex}: ${urlData.publicUrl}`);
      }
    } catch (err) {
      console.error(`[IMG] Upload error for dataRowIndex ${img.dataRowIndex}:`, err);
    }
  }

  // orderedUrls is sorted by dataRowIndex (images are already sorted by row from extraction)
  orderedResults.sort((a, b) => a.dataRowIndex - b.dataRowIndex);
  const orderedUrls = orderedResults.map((r) => r.url);

  console.log(`[IMG] Upload complete: ${positionMap.size} images uploaded, orderedUrls: ${orderedUrls.length}`);
  return { positionMap, orderedUrls };
}

/**
 * Find the column index of the photo column in the header row.
 */
function findPhotoColumnIndex(headerRow: unknown[]): number {
  for (let i = 0; i < headerRow.length; i++) {
    const cell = headerRow[i];
    if (cell === null || cell === undefined) continue;
    const normalized = normalizeHeader(String(cell));
    if (FRENCH_COLUMNS[normalized] === "debtor_photo") return i;
  }
  return -1;
}

// =============================================================================
// Detect format
// =============================================================================

function detectFormat(headers: string[]): "french" | "legacy" | "unknown" {
  const normalized = headers.map(normalizeHeader);
  const frenchMatches = normalized.filter(
    (h) => FRENCH_COLUMNS[h] !== undefined || matchDynamicHeader(h) !== undefined
  ).length;
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
      internalKey = columnMap[normalizedKey] || matchDynamicHeader(normalizedKey);
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
  // debtor_type: optionnel, défaut "pp" si absent (pas de warning)
  if (row.debtor_type) {
    const dt = normalizeDebtorType(row.debtor_type);
    if (!dt) {
      errors.push({ field: "debtor_type", message: `Type débiteur invalide: ${row.debtor_type} (attendu PP ou PM)` });
    }
  }

  // Nom requis (erreur bloquante)
  if (!row.debtor_name) {
    errors.push({ field: "debtor_name", message: "Nom / Raison sociale requis" });
  }

  // Téléphone : warning si absent (pas bloquant)
  if (!row.phone_1) {
    warnings.push({ field: "phone_1", message: "Téléphone principal manquant" });
  }

  // Réf contrat : warning seulement pour PM (PP n'a pas de contrat)
  const detectedType = normalizeDebtorType(row.debtor_type) || "pp";
  if (!row.contract_ref && detectedType === "pm") {
    warnings.push({ field: "contract_ref", message: "Réf. contrat manquante" });
  }

  // Date de défaut : warning si absente (pas bloquant)
  if (!row.default_date) {
    warnings.push({ field: "default_date", message: "Date de défaut manquante" });
  } else if (!parseDate(row.default_date)) {
    errors.push({ field: "default_date", message: "Date de défaut invalide" });
  }

  // Montant principal : warning si absent (pas bloquant, sera 0)
  if (!row.amount_principal && row.amount_principal !== 0) {
    warnings.push({ field: "amount_principal", message: "Montant principal manquant, sera 0" });
  } else if (row.amount_principal) {
    const amt = parseAmount(row.amount_principal);
    if (amt === null) errors.push({ field: "amount_principal", message: "Montant principal non numérique" });
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
// Summary/total row detection — skip rows like "TOTAL ENCOURS EX STAFFS"
// =============================================================================

const SUMMARY_KEYWORDS = [
  "total", "sous-total", "sous total", "sub-total", "subtotal",
  "somme", "grand total", "recap", "recapitulatif",
];

function isSummaryRow(mapped: RawRow): boolean {
  const name = mapped.debtor_name ? String(mapped.debtor_name).trim().toLowerCase() : "";
  if (!name) return false;
  // Check if the name starts with or contains a summary keyword
  return SUMMARY_KEYWORDS.some((kw) => name.startsWith(kw) || name.includes(kw));
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

  // Colonnes extra PP → concaténées dans notes
  const extraNotes: string[] = [];
  if (mapped.loan_nature) extraNotes.push(`Nature du Prêt: ${String(mapped.loan_nature).trim()}`);
  if (mapped.guarantee_nature) extraNotes.push(`Garantie: ${String(mapped.guarantee_nature).trim()}`);
  if (mapped.recovery_steps) extraNotes.push(`Démarches: ${String(mapped.recovery_steps).trim()}`);
  // debtor_photo → champ dédié photo_url (pas dans les notes)
  const baseNotes = mapped.notes ? String(mapped.notes).trim() : "";
  n.notes = [baseNotes, ...extraNotes].filter(Boolean).join(" | ") || null;

  // Champs PP spécifiques
  n.employer = mapped.employer ? String(mapped.employer).trim() : null;
  n.occupation = mapped.occupation ? String(mapped.occupation).trim() : null;
  n.id_type = mapped.id_type ? String(mapped.id_type).trim() : null;
  n.id_number = mapped.id_number ? String(mapped.id_number).trim() : null;
  n.sector_activity = mapped.sector_activity ? String(mapped.sector_activity).trim() : null;
  // Only use cell text as photo_url if it looks like a real URL
  // (embedded images are extracted separately and injected after normalization)
  const rawPhoto = mapped.debtor_photo ? String(mapped.debtor_photo).trim() : "";
  n.photo_url = rawPhoto.startsWith("http://") || rawPhoto.startsWith("https://") ? rawPhoto : null;

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

    // 3. Parse Excel (with auto-detection of header row)
    let rawRows: RawRow[];
    let rawRowExcelOffsets: number[] = []; // Excel row offset from header for each rawRow
    let headers: string[];
    let arrayBuffer: ArrayBuffer;
    let bestHeaderRow = 0;
    let absoluteHeaderRow = 0; // Absolute 0-indexed row in the sheet (for drawing XML matching)
    let headerRowData: unknown[] = [];
    let sheetName = ""; // Will be set during parsing, needed for image extraction
    try {
      arrayBuffer = await fileData.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });

      // Must have sheet "Dossiers" (case-insensitive)
      sheetName = workbook.SheetNames.find(
        (n: string) => n.toLowerCase().replace(/\s/g, "") === "dossiers"
      ) || workbook.SheetNames[0];

      const sheet = workbook.Sheets[sheetName];

      // Determine the starting row of the sheet's data range (!ref)
      // allRows[0] corresponds to this row, NOT necessarily row 0 of the sheet
      const sheetRef = sheet["!ref"] || "A1";
      const refRowMatch = sheetRef.match(/^[A-Z]+(\d+)/i);
      const sheetStartRow = refRowMatch ? parseInt(refRowMatch[1], 10) - 1 : 0; // Convert to 0-indexed
      console.log(`[PARSE] Sheet "${sheetName}" !ref="${sheetRef}", startRow=${sheetStartRow} (0-indexed)`);

      // Read as array of arrays to find the real header row
      const allRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
      if (!allRows || allRows.length === 0) throw new Error("Feuille vide");

      // Scan the first 15 rows to find the one with the most column matches
      let bestMatchCount = 0;

      const scanLimit = Math.min(15, allRows.length);
      for (let r = 0; r < scanLimit; r++) {
        const row = allRows[r];
        if (!row || !Array.isArray(row)) continue;
        let matchCount = 0;
        for (const cell of row) {
          if (cell === null || cell === undefined || String(cell).trim() === "") continue;
          const normalized = normalizeHeader(String(cell));
          if (FRENCH_COLUMNS[normalized] !== undefined || matchDynamicHeader(normalized) !== undefined) {
            matchCount++;
          }
        }
        if (matchCount > bestMatchCount) {
          bestMatchCount = matchCount;
          bestHeaderRow = r;
        }
      }

      // Calculate absolute header row for image extraction
      absoluteHeaderRow = bestHeaderRow + sheetStartRow;
      console.log(`[PARSE] Header row: allRows index=${bestHeaderRow}, absolute sheet row=${absoluteHeaderRow} (0-indexed), matches=${bestMatchCount}`);

      // Build rows manually from array data using detected header row
      headerRowData = allRows[bestHeaderRow] as unknown[];
      const headerNames: string[] = headerRowData.map((cell, i) =>
        cell !== null && cell !== undefined && String(cell).trim() !== ""
          ? String(cell).trim()
          : `__col_${i}`
      );

      rawRows = [];
      rawRowExcelOffsets = [];
      for (let r = bestHeaderRow + 1; r < allRows.length; r++) {
        const row = allRows[r] as unknown[];
        if (!row) continue;
        const obj: RawRow = {};
        let hasData = false;
        for (let c = 0; c < headerNames.length; c++) {
          const val = c < row.length ? row[c] : null;
          obj[headerNames[c]] = val;
          if (val !== null && val !== undefined && String(val).trim() !== "") hasData = true;
        }
        if (hasData) {
          rawRows.push(obj);
          rawRowExcelOffsets.push(r - bestHeaderRow - 1); // dataRowIndex matching image anchors
        }
      }

      if (rawRows.length === 0) throw new Error("Aucune donnée trouvée après la ligne d'en-têtes");

      headers = headerNames.filter((h) => !h.startsWith("__col_"));
      console.log(`Parsed ${rawRows.length} data rows with headers: ${headers.join(", ")}`);
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

    // 5b. Extract embedded images from XLSX and upload to storage
    let photoUrlMap = new Map<number, string>();
    let photoOrderedUrls: string[] = [];
    const photoColumnIndex = findPhotoColumnIndex(headerRowData);
    if (photoColumnIndex >= 0) {
      console.log(`[IMG] Photo column found at index ${photoColumnIndex}, extracting embedded images (absoluteHeaderRow=${absoluteHeaderRow})...`);
      const extractedImages = await extractImagesFromXLSX(arrayBuffer, photoColumnIndex, absoluteHeaderRow, sheetName);
      if (extractedImages.length > 0) {
        console.log(`[IMG] Found ${extractedImages.length} embedded images, uploading to storage...`);
        const uploadResult = await uploadImagesToStorage(supabase, import_id, extractedImages);
        photoUrlMap = uploadResult.positionMap;
        photoOrderedUrls = uploadResult.orderedUrls;
        console.log(`[IMG] Upload done: ${photoUrlMap.size} position-mapped, ${photoOrderedUrls.length} ordered`);
      } else {
        console.log("[IMG] No embedded images found");
      }
    } else {
      console.log("[IMG] No photo column detected in headers");
    }

    // 6. Map and process each row (filter out summary/total rows)
    const allMappedRows: RawRow[] = rawRows.map((raw) => mapColumns(raw, format));

    // Filter out summary rows (e.g. "TOTAL ENCOURS EX STAFFS")
    const filteredIndices: number[] = [];
    const mappedRows: RawRow[] = [];
    for (let i = 0; i < allMappedRows.length; i++) {
      if (isSummaryRow(allMappedRows[i])) {
        console.log(`Skipping summary row ${i + 1}: "${allMappedRows[i].debtor_name}"`);
        continue;
      }
      filteredIndices.push(i);
      mappedRows.push(allMappedRows[i]);
    }

    const processedRows: ProcessedRow[] = [];

    // Determine photo matching strategy:
    // 1. Try position-based matching (using rawRowExcelOffsets → photoUrlMap)
    // 2. If position-based yields 0 matches, fall back to order-based (sequential assignment)
    let positionMatchCount = 0;
    if (photoUrlMap.size > 0) {
      // Debug: log all photoUrlMap keys and first few rawRowExcelOffsets
      const mapKeys = [...photoUrlMap.keys()].sort((a, b) => a - b);
      console.log(`[IMG] photoUrlMap keys (dataRowIndices): [${mapKeys.join(", ")}]`);
      console.log(`[IMG] rawRowExcelOffsets (first 10): [${rawRowExcelOffsets.slice(0, 10).join(", ")}]`);

      for (let i = 0; i < mappedRows.length; i++) {
        const originalIndex = filteredIndices[i];
        const excelRowOffset = rawRowExcelOffsets[originalIndex];
        if (excelRowOffset !== undefined && photoUrlMap.has(excelRowOffset)) {
          positionMatchCount++;
        }
      }
      console.log(`[IMG] Position-based matching: ${positionMatchCount}/${mappedRows.length} rows have a photo`);
    }

    const useOrderFallback = photoUrlMap.size > 0 && positionMatchCount === 0 && photoOrderedUrls.length > 0;
    if (useOrderFallback) {
      console.log(`[IMG] FALLBACK: Position matching yielded 0 results. Using ORDER-BASED matching (${photoOrderedUrls.length} images → ${mappedRows.length} rows)`);
    }

    let orderPhotoIndex = 0; // Counter for order-based fallback

    for (let i = 0; i < mappedRows.length; i++) {
      const mapped = mappedRows[i];
      const originalIndex = filteredIndices[i];
      const { errors, warnings } = validateRow(mapped, mappedRows, i);
      const normalized = normalizeRow(mapped);

      // Inject photo URL from extracted images
      if (photoUrlMap.size > 0) {
        const debtorLabel = `${normalized.debtor_name || "?"} ${normalized.debtor_first_name || ""}`.trim();
        if (useOrderFallback) {
          // Order-based: assign photos sequentially to data rows
          if (orderPhotoIndex < photoOrderedUrls.length) {
            normalized.photo_url = photoOrderedUrls[orderPhotoIndex];
            console.log(`[IMG] Order-based: row ${i} "${debtorLabel}" → photo ${orderPhotoIndex}`);
            orderPhotoIndex++;
          }
        } else {
          // Position-based: match by Excel row offset
          const excelRowOffset = rawRowExcelOffsets[originalIndex];
          if (excelRowOffset !== undefined && photoUrlMap.has(excelRowOffset)) {
            normalized.photo_url = photoUrlMap.get(excelRowOffset)!;
            console.log(`[IMG] Position-based: row ${i} "${debtorLabel}" (origIdx=${originalIndex}, excelOffset=${excelRowOffset}) → photo found`);
          } else {
            console.log(`[IMG] Position-based: row ${i} "${debtorLabel}" (origIdx=${originalIndex}, excelOffset=${excelRowOffset}) → NO photo`);
          }
        }
      }

      // Check bank column consistency if present
      if (hasBankColumn && selectedBankName) {
        const rawBankValue = extractBankValue(rawRows[originalIndex]);
        if (rawBankValue && rawBankValue.toLowerCase() !== selectedBankName.toLowerCase()) {
          errors.push({
            field: "banque",
            message: `Banque "${rawBankValue}" ne correspond pas à la banque sélectionnée "${selectedBankName}"`,
          });
        }
      }

      processedRows.push({
        raw_json: { ...rawRows[originalIndex], _bank_id: selectedBankId },
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
