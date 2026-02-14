// =============================================================================
// TYPES - Application Altis Services
// Architecture avec tables séparées par type d'entité
// =============================================================================

// Réexporter les enums
export * from './enums'

import type {
  CaseStatus,
  CasePhase,
  ActionType,
  ActionResult,
  PaymentStatus,
  PromiseStatus,
  DocumentCategory,
  DocumentVisibility,
  ClosureReason,
  ImportStatus,
} from './enums'

// =============================================================================
// UTILISATEURS
// =============================================================================

export interface Admin {
  id: string
  email: string
  username: string | null
  full_name: string
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  email: string
  username: string | null
  full_name: string
  phone: string | null
  sector: string | null
  zone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BankUser {
  id: string
  email: string
  username: string | null
  full_name: string
  phone: string | null
  bank_id: string
  job_title: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Relations
  bank?: Bank
}

// Type union pour l'utilisateur courant
export type CurrentUser = Admin | Agent | BankUser

export type UserType = 'admin' | 'agent' | 'bank_user'

// =============================================================================
// BANQUES
// =============================================================================

export interface Bank {
  id: string
  code: string
  name: string
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BankContact {
  id: string
  bank_id: string
  full_name: string
  job_title: string | null
  phone: string | null
  email: string | null
  is_primary: boolean
  created_at: string
}

// =============================================================================
// DÉBITEURS
// =============================================================================

export interface DebtorPP {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  id_type: string | null
  id_number: string | null
  phone_primary: string | null
  phone_secondary: string | null
  email: string | null
  address_street: string | null
  address_city: string | null
  address_region: string | null
  address_work_street: string | null
  address_work_city: string | null
  address_work_region: string | null
  employer: string | null
  occupation: string | null
  photo_url: string | null
  alt_contact_name: string | null
  alt_contact_relation: string | null
  alt_contact_phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface DebtorPM {
  id: string
  company_name: string
  trade_name: string | null
  rc_number: string | null
  nif: string | null
  legal_rep_name: string | null
  legal_rep_title: string | null
  legal_rep_phone: string | null
  phone_primary: string | null
  phone_secondary: string | null
  email: string | null
  website: string | null
  address_street: string | null
  address_city: string | null
  address_region: string | null
  sector_activity: string | null
  alt_contact_name: string | null
  alt_contact_relation: string | null
  alt_contact_phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

// Type union pour les débiteurs
export type Debtor = (DebtorPP & { type: 'pp' }) | (DebtorPM & { type: 'pm' })

// =============================================================================
// DOSSIERS
// =============================================================================

export interface Case {
  id: string
  reference: string
  bank_reference: string | null
  bank_id: string
  assigned_agent_id: string | null

  // Débiteur (un seul des deux)
  debtor_pp_id: string | null
  debtor_pm_id: string | null

  status: CaseStatus
  phase: CasePhase

  product_type: string | null
  contract_reference: string | null
  default_date: string | null

  amount_principal: number
  amount_interest: number
  amount_penalties: number
  amount_fees: number

  guarantee_type: string | null
  guarantee_description: string | null

  last_bank_payment_date: string | null
  last_bank_payment_amount: number | null

  risk_level: string | null
  internal_notes: string | null

  closure_reason: ClosureReason | null
  closure_notes: string | null
  closed_at: string | null
  closed_by: string | null

  notes: string | null

  created_at: string
  updated_at: string
  created_by: string | null

  // Relations (optionnelles, chargées via jointures)
  bank?: Bank
  assigned_agent?: Agent
  debtor_pp?: DebtorPP
  debtor_pm?: DebtorPM

  // Calculés
  total_amount?: number
  total_paid?: number
  remaining_balance?: number
}

// =============================================================================
// ACTIONS TERRAIN
// =============================================================================

export interface Action {
  id: string
  case_id: string
  action_type: ActionType
  action_date: string
  result: ActionResult
  notes: string | null
  next_action_type: ActionType | null
  next_action_date: string | null
  next_action_notes: string | null
  created_by: string
  created_at: string

  // Relations
  creator_agent?: Agent
  creator_admin?: Admin
}

export interface ActionAttachment {
  id: string
  action_id: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  uploaded_at: string
}

// =============================================================================
// PROMESSES DE PAIEMENT
// =============================================================================

export interface Promise {
  id: string
  case_id: string
  reference: string | null
  amount: number
  due_date: string
  payment_method: string | null
  status: PromiseStatus
  status_changed_at: string | null
  status_changed_by: string | null
  status_notes: string | null
  created_by: string
  created_at: string
}

// =============================================================================
// INFORMATIONS COMPLÉMENTAIRES
// =============================================================================

export interface CaseExtraInfo {
  id: string
  case_id: string
  label: string
  value: string
  created_by: string | null
  created_at: string
}

// =============================================================================
// PAIEMENTS
// =============================================================================

export interface Payment {
  id: string
  case_id: string
  amount: number
  payment_date: string
  payment_method: string | null
  transaction_reference: string | null
  status: PaymentStatus
  validated_by: string | null
  validated_at: string | null
  rejection_reason: string | null
  declared_by: string
  declared_at: string

  // Relations
  declarer?: Agent
  validator?: Admin
}

// =============================================================================
// DOCUMENTS
// =============================================================================

export interface Document {
  id: string
  case_id: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  category: DocumentCategory
  visibility: DocumentVisibility
  description: string | null
  uploaded_by: string
  uploaded_at: string

  // Relations
  uploader_agent?: Agent
  uploader_admin?: Admin
}

// =============================================================================
// AUDIT & HISTORIQUE
// =============================================================================

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  user_id: string | null
  user_type: UserType | 'system' | null
  created_at: string
  ip_address: string | null
  user_agent: string | null
}

export interface ContactHistory {
  id: string
  debtor_type: 'pp' | 'pm'
  debtor_id: string
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_by: string
  changed_at: string
}

// =============================================================================
// VUES & CALCULÉS
// =============================================================================

export interface CaseBalance {
  case_id: string
  bank_id: string
  reference: string
  status: CaseStatus
  total_amount: number
  total_paid: number
  remaining_balance: number
}

// =============================================================================
// FILTRES
// =============================================================================

export interface CaseFilters {
  bank_id?: string
  status?: CaseStatus | CaseStatus[]
  phase?: CasePhase | CasePhase[]
  assigned_agent_id?: string
  debtor_search?: string
  reference_search?: string
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export interface PaymentFilters {
  case_id?: string
  status?: PaymentStatus | PaymentStatus[]
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export interface ActionFilters {
  case_id?: string
  action_type?: ActionType | ActionType[]
  result?: ActionResult | ActionResult[]
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

// =============================================================================
// PAGINATION
// =============================================================================

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// =============================================================================
// STATISTIQUES DASHBOARD
// =============================================================================

export interface DashboardStats {
  total_cases: number
  active_cases: number
  closed_cases: number
  total_amount: number
  total_recovered: number
  recovery_rate: number
  cases_by_status: Record<CaseStatus, number>
  monthly_trend: {
    month: string
    new_cases: number
    closed_cases: number
    amount_recovered: number
  }[]
}

export interface AgentPerformance {
  agent_id: string
  agent_name: string
  total_cases: number
  active_cases: number
  closed_cases: number
  total_recovered: number
  avg_days_to_close: number
}

// =============================================================================
// IMPORTS EXCEL
// =============================================================================

export interface Import {
  id: string
  bank_id: string
  uploaded_by: string
  file_path: string
  file_name: string | null
  status: ImportStatus
  error_message: string | null
  total_rows: number
  valid_rows: number
  error_rows: number
  warning_rows: number
  created_at: string
  processed_at: string | null
  approved_at: string | null
  approved_by: string | null
  // Relations
  bank?: Bank
}

export interface ImportRow {
  id: string
  import_id: string
  row_number: number
  raw_json: Record<string, unknown>
  proposed_json: Record<string, unknown>
  errors: { field: string; message: string }[]
  warnings: { field: string; message: string }[]
  confidence: Record<string, number>
  is_approved: boolean
  created_at: string
}

// =============================================================================
// FORMULAIRES (DTOs)
// =============================================================================

export interface CreateCaseDTO {
  bank_id: string
  bank_reference?: string
  debtor_pp_id?: string
  debtor_pm_id?: string
  phase?: CasePhase
  product_type?: string
  contract_reference?: string
  default_date?: string
  amount_principal: number
  amount_interest: number
  amount_penalties: number
  amount_fees: number
  guarantee_type?: string
  guarantee_description?: string
  last_bank_payment_date?: string
  last_bank_payment_amount?: number
  risk_level?: string
  internal_notes?: string
  notes?: string
}

export interface CreateDebtorPPDTO {
  first_name: string
  last_name: string
  date_of_birth?: string
  id_type?: string
  id_number?: string
  phone_primary?: string
  phone_secondary?: string
  email?: string
  address_street?: string
  address_city?: string
  address_region?: string
  address_work_street?: string
  address_work_city?: string
  address_work_region?: string
  employer?: string
  occupation?: string
  alt_contact_name?: string
  alt_contact_relation?: string
  alt_contact_phone?: string
  notes?: string
}

export interface CreateDebtorPMDTO {
  company_name: string
  trade_name?: string
  rc_number?: string
  nif?: string
  legal_rep_name?: string
  legal_rep_title?: string
  legal_rep_phone?: string
  phone_primary?: string
  phone_secondary?: string
  email?: string
  website?: string
  address_street?: string
  address_city?: string
  address_region?: string
  sector_activity?: string
  alt_contact_name?: string
  alt_contact_relation?: string
  alt_contact_phone?: string
  notes?: string
}

export interface CreateActionDTO {
  case_id: string
  action_type: ActionType
  action_date?: string
  result: ActionResult
  notes?: string
  next_action_type?: ActionType
  next_action_date?: string
  next_action_notes?: string
}

export interface CreatePromiseDTO {
  case_id: string
  reference?: string
  amount: number
  due_date: string
  payment_method?: string
}

export interface DeclarePaymentDTO {
  case_id: string
  amount: number
  payment_date: string
  payment_method?: string
  transaction_reference?: string
}

export interface ValidatePaymentDTO {
  payment_id: string
  approved: boolean
  rejection_reason?: string
}
