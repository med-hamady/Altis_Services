// Rôles utilisateur
export enum UserRole {
  Admin = 'admin',
  Agent = 'agent',
  BankUser = 'bank_user',
}

// Statuts des dossiers
export enum CaseStatus {
  New = 'new',
  Assigned = 'assigned',
  InProgress = 'in_progress',
  Promise = 'promise',
  PartialPayment = 'partial_payment',
  Paid = 'paid',
  Closed = 'closed',
}

// Labels français pour les statuts
export const CaseStatusLabels: Record<CaseStatus, string> = {
  [CaseStatus.New]: 'Nouveau',
  [CaseStatus.Assigned]: 'Affecté',
  [CaseStatus.InProgress]: 'En cours',
  [CaseStatus.Promise]: 'Promesse',
  [CaseStatus.PartialPayment]: 'Paiement partiel',
  [CaseStatus.Paid]: 'Payé',
  [CaseStatus.Closed]: 'Clôturé',
}

// Priorités des dossiers
export enum CasePriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Urgent = 'urgent',
}

export const CasePriorityLabels: Record<CasePriority, string> = {
  [CasePriority.Low]: 'Basse',
  [CasePriority.Medium]: 'Moyenne',
  [CasePriority.High]: 'Haute',
  [CasePriority.Urgent]: 'Urgente',
}

// Phase de recouvrement
export enum CasePhase {
  Amicable = 'amicable',
  PreLegal = 'pre_legal',
  Legal = 'legal',
}

export const CasePhaseLabels: Record<CasePhase, string> = {
  [CasePhase.Amicable]: 'Amiable',
  [CasePhase.PreLegal]: 'Pré-contentieux',
  [CasePhase.Legal]: 'Judiciaire',
}

// Types de débiteur
export enum DebtorType {
  PP = 'pp', // Personne Physique
  PM = 'pm', // Personne Morale
}

export const DebtorTypeLabels: Record<DebtorType, string> = {
  [DebtorType.PP]: 'Personne Physique',
  [DebtorType.PM]: 'Personne Morale',
}

// Types d'action terrain
export enum ActionType {
  Call = 'call',
  Visit = 'visit',
  Sms = 'sms',
  Email = 'email',
  Letter = 'letter',
  Meeting = 'meeting',
  Other = 'other',
}

export const ActionTypeLabels: Record<ActionType, string> = {
  [ActionType.Call]: 'Appel',
  [ActionType.Visit]: 'Visite',
  [ActionType.Sms]: 'SMS/Message',
  [ActionType.Email]: 'Email',
  [ActionType.Letter]: 'Courrier',
  [ActionType.Meeting]: 'Rendez-vous',
  [ActionType.Other]: 'Autre',
}

// Résultats d'action
export enum ActionResult {
  Reached = 'reached',
  Unreachable = 'unreachable',
  Refused = 'refused',
  Promise = 'promise',
  PartialPayment = 'partial_payment',
  FullPayment = 'full_payment',
  Dispute = 'dispute',
  Callback = 'callback',
  WrongNumber = 'wrong_number',
  Other = 'other',
}

export const ActionResultLabels: Record<ActionResult, string> = {
  [ActionResult.Reached]: 'Joignable',
  [ActionResult.Unreachable]: 'Injoignable',
  [ActionResult.Refused]: 'Refus',
  [ActionResult.Promise]: 'Promesse obtenue',
  [ActionResult.PartialPayment]: 'Paiement partiel',
  [ActionResult.FullPayment]: 'Payé intégralement',
  [ActionResult.Dispute]: 'Litige',
  [ActionResult.Callback]: 'À rappeler',
  [ActionResult.WrongNumber]: 'Mauvais numéro',
  [ActionResult.Other]: 'Autre',
}

// Statuts de paiement
export enum PaymentStatus {
  Pending = 'pending',
  Validated = 'validated',
  Rejected = 'rejected',
}

export const PaymentStatusLabels: Record<PaymentStatus, string> = {
  [PaymentStatus.Pending]: 'En attente',
  [PaymentStatus.Validated]: 'Validé',
  [PaymentStatus.Rejected]: 'Rejeté',
}

// Statuts de promesse
export enum PromiseStatus {
  Pending = 'pending',
  Kept = 'kept',
  Broken = 'broken',
  Rescheduled = 'rescheduled',
}

export const PromiseStatusLabels: Record<PromiseStatus, string> = {
  [PromiseStatus.Pending]: 'En attente',
  [PromiseStatus.Kept]: 'Tenue',
  [PromiseStatus.Broken]: 'Non tenue',
  [PromiseStatus.Rescheduled]: 'Replanifiée',
}

// Visibilité des documents
export enum DocumentVisibility {
  Internal = 'internal',
  Bank = 'bank',
  Agent = 'agent',
}

export const DocumentVisibilityLabels: Record<DocumentVisibility, string> = {
  [DocumentVisibility.Internal]: 'Admin seulement',
  [DocumentVisibility.Bank]: 'Banque + Admin',
  [DocumentVisibility.Agent]: 'Agent',
}

// Catégories de documents
export enum DocumentCategory {
  Contract = 'contract',
  Statement = 'statement',
  IdCard = 'id_card',
  PaymentProof = 'payment_proof',
  FieldReport = 'field_report',
  Correspondence = 'correspondence',
  Legal = 'legal',
  Other = 'other',
}

export const DocumentCategoryLabels: Record<DocumentCategory, string> = {
  [DocumentCategory.Contract]: 'Contrat',
  [DocumentCategory.Statement]: 'Relevé',
  [DocumentCategory.IdCard]: "Pièce d'identité",
  [DocumentCategory.PaymentProof]: 'Preuve de paiement',
  [DocumentCategory.FieldReport]: 'Rapport terrain',
  [DocumentCategory.Correspondence]: 'Correspondance',
  [DocumentCategory.Legal]: 'Document juridique',
  [DocumentCategory.Other]: 'Autre',
}

// Motifs de clôture
export enum ClosureReason {
  FullyPaid = 'fully_paid',
  Negotiated = 'negotiated',
  Unreachable = 'unreachable',
  Disputed = 'disputed',
  Bankrupt = 'bankrupt',
  Deceased = 'deceased',
  Transferred = 'transferred',
  Cancelled = 'cancelled',
}

export const ClosureReasonLabels: Record<ClosureReason, string> = {
  [ClosureReason.FullyPaid]: 'Payé intégralement',
  [ClosureReason.Negotiated]: 'Règlement négocié',
  [ClosureReason.Unreachable]: 'Injoignable définitif',
  [ClosureReason.Disputed]: 'Litige',
  [ClosureReason.Bankrupt]: 'Faillite',
  [ClosureReason.Deceased]: 'Décès',
  [ClosureReason.Transferred]: 'Transféré',
  [ClosureReason.Cancelled]: 'Annulé',
}

// Statuts d'import
export enum ImportStatus {
  Uploaded = 'uploaded',
  Processing = 'processing',
  ReadyForReview = 'ready_for_review',
  Approved = 'approved',
  Rejected = 'rejected',
  Failed = 'failed',
}

export const ImportStatusLabels: Record<ImportStatus, string> = {
  [ImportStatus.Uploaded]: 'Uploadé',
  [ImportStatus.Processing]: 'En cours d\'analyse',
  [ImportStatus.ReadyForReview]: 'Prêt pour validation',
  [ImportStatus.Approved]: 'Validé',
  [ImportStatus.Rejected]: 'Rejeté',
  [ImportStatus.Failed]: 'Échec',
}
