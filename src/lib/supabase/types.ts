// Types générés pour Supabase
// Ce fichier sera remplacé par les types générés automatiquement avec:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      banks: {
        Row: {
          id: string
          name: string
          code: string
          contacts: Json
          address: string | null
          settings: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          contacts?: Json
          address?: string | null
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          contacts?: Json
          address?: string | null
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'agent' | 'bank_user'
          bank_id: string | null
          phone: string | null
          sector: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'admin' | 'agent' | 'bank_user'
          bank_id?: string | null
          phone?: string | null
          sector?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'agent' | 'bank_user'
          bank_id?: string | null
          phone?: string | null
          sector?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      debtors: {
        Row: {
          id: string
          type: 'pp' | 'pm'
          first_name: string | null
          last_name: string | null
          cin_nni: string | null
          company_name: string | null
          rc_nif: string | null
          legal_representative: string | null
          phones: Json
          addresses: Json
          emails: Json
          notes: string | null
          contact_history: Json
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          type: 'pp' | 'pm'
          first_name?: string | null
          last_name?: string | null
          cin_nni?: string | null
          company_name?: string | null
          rc_nif?: string | null
          legal_representative?: string | null
          phones?: Json
          addresses?: Json
          emails?: Json
          notes?: string | null
          contact_history?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          type?: 'pp' | 'pm'
          first_name?: string | null
          last_name?: string | null
          cin_nni?: string | null
          company_name?: string | null
          rc_nif?: string | null
          legal_representative?: string | null
          phones?: Json
          addresses?: Json
          emails?: Json
          notes?: string | null
          contact_history?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      cases: {
        Row: {
          id: string
          reference_altis: string
          reference_bank: string | null
          bank_id: string
          debtor_id: string
          assigned_agent_id: string | null
          status: 'new' | 'assigned' | 'in_progress' | 'promise' | 'partial_payment' | 'paid' | 'closed'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          debt_principal: number
          debt_penalties: number
          debt_fees: number
          debt_total: number
          product_type: string | null
          contract_reference: string | null
          default_date: string | null
          closure_reason: string | null
          closure_notes: string | null
          closed_at: string | null
          closed_by: string | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          reference_altis?: string
          reference_bank?: string | null
          bank_id: string
          debtor_id: string
          assigned_agent_id?: string | null
          status?: 'new' | 'assigned' | 'in_progress' | 'promise' | 'partial_payment' | 'paid' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          debt_principal?: number
          debt_penalties?: number
          debt_fees?: number
          product_type?: string | null
          contract_reference?: string | null
          default_date?: string | null
          closure_reason?: string | null
          closure_notes?: string | null
          closed_at?: string | null
          closed_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          reference_altis?: string
          reference_bank?: string | null
          bank_id?: string
          debtor_id?: string
          assigned_agent_id?: string | null
          status?: 'new' | 'assigned' | 'in_progress' | 'promise' | 'partial_payment' | 'paid' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          debt_principal?: number
          debt_penalties?: number
          debt_fees?: number
          product_type?: string | null
          contract_reference?: string | null
          default_date?: string | null
          closure_reason?: string | null
          closure_notes?: string | null
          closed_at?: string | null
          closed_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      actions: {
        Row: {
          id: string
          case_id: string
          action_type: 'call' | 'visit' | 'message' | 'meeting' | 'letter' | 'email' | 'other'
          action_date: string
          result: 'reached' | 'unreachable' | 'refused' | 'promise' | 'dispute' | 'paid' | 'callback' | 'wrong_contact' | 'other'
          notes: string | null
          next_action: string | null
          next_action_date: string | null
          next_action_notes: string | null
          attachments: Json
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          case_id: string
          action_type: 'call' | 'visit' | 'message' | 'meeting' | 'letter' | 'email' | 'other'
          action_date?: string
          result: 'reached' | 'unreachable' | 'refused' | 'promise' | 'dispute' | 'paid' | 'callback' | 'wrong_contact' | 'other'
          notes?: string | null
          next_action?: string | null
          next_action_date?: string | null
          next_action_notes?: string | null
          attachments?: Json
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          case_id?: string
          action_type?: 'call' | 'visit' | 'message' | 'meeting' | 'letter' | 'email' | 'other'
          action_date?: string
          result?: 'reached' | 'unreachable' | 'refused' | 'promise' | 'dispute' | 'paid' | 'callback' | 'wrong_contact' | 'other'
          notes?: string | null
          next_action?: string | null
          next_action_date?: string | null
          next_action_notes?: string | null
          attachments?: Json
          created_at?: string
          created_by?: string
        }
      }
      promises: {
        Row: {
          id: string
          case_id: string
          amount: number
          due_date: string
          payment_method: string | null
          status: 'pending' | 'kept' | 'broken' | 'rescheduled'
          status_notes: string | null
          status_updated_at: string | null
          status_updated_by: string | null
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          case_id: string
          amount: number
          due_date: string
          payment_method?: string | null
          status?: 'pending' | 'kept' | 'broken' | 'rescheduled'
          status_notes?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          case_id?: string
          amount?: number
          due_date?: string
          payment_method?: string | null
          status?: 'pending' | 'kept' | 'broken' | 'rescheduled'
          status_notes?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          created_at?: string
          created_by?: string
        }
      }
      payments: {
        Row: {
          id: string
          case_id: string
          amount: number
          payment_date: string
          payment_method: string | null
          reference: string | null
          status: 'declared' | 'validated' | 'rejected'
          proof_path: string | null
          proof_name: string | null
          declared_by: string
          declared_at: string
          validated_by: string | null
          validated_at: string | null
          validation_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          amount: number
          payment_date: string
          payment_method?: string | null
          reference?: string | null
          status?: 'declared' | 'validated' | 'rejected'
          proof_path?: string | null
          proof_name?: string | null
          declared_by: string
          declared_at?: string
          validated_by?: string | null
          validated_at?: string | null
          validation_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          amount?: number
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
          status?: 'declared' | 'validated' | 'rejected'
          proof_path?: string | null
          proof_name?: string | null
          declared_by?: string
          declared_at?: string
          validated_by?: string | null
          validated_at?: string | null
          validation_notes?: string | null
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          case_id: string
          file_path: string
          file_name: string
          file_type: string | null
          file_size: number | null
          category: 'contract' | 'statement' | 'id_document' | 'proof_payment' | 'field_report' | 'correspondence' | 'other'
          visibility: 'bank_admin' | 'admin_only' | 'agent'
          description: string | null
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          file_path: string
          file_name: string
          file_type?: string | null
          file_size?: number | null
          category?: 'contract' | 'statement' | 'id_document' | 'proof_payment' | 'field_report' | 'correspondence' | 'other'
          visibility?: 'bank_admin' | 'admin_only' | 'agent'
          description?: string | null
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          file_path?: string
          file_name?: string
          file_type?: string | null
          file_size?: number | null
          category?: 'contract' | 'statement' | 'id_document' | 'proof_payment' | 'field_report' | 'correspondence' | 'other'
          visibility?: 'bank_admin' | 'admin_only' | 'agent'
          description?: string | null
          uploaded_by?: string
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: string
          old_data: Json | null
          new_data: Json | null
          changed_fields: string[] | null
          user_id: string | null
          user_email: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: string
          old_data?: Json | null
          new_data?: Json | null
          changed_fields?: string[] | null
          user_id?: string | null
          user_email?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          action?: string
          old_data?: Json | null
          new_data?: Json | null
          changed_fields?: string[] | null
          user_id?: string | null
          user_email?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      case_balances: {
        Row: {
          case_id: string
          debt_total: number
          total_paid: number
          remaining_balance: number
        }
      }
      agent_workloads: {
        Row: {
          agent_id: string
          full_name: string
          total_cases: number
          assigned_cases: number
          in_progress_cases: number
          promise_cases: number
        }
      }
    }
    Functions: {
      get_user_role: {
        Args: Record<string, never>
        Returns: string
      }
      get_user_bank_id: {
        Args: Record<string, never>
        Returns: string
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_agent: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_bank_user: {
        Args: Record<string, never>
        Returns: boolean
      }
      generate_altis_reference: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      user_role: 'admin' | 'agent' | 'bank_user'
      case_status: 'new' | 'assigned' | 'in_progress' | 'promise' | 'partial_payment' | 'paid' | 'closed'
      case_priority: 'low' | 'medium' | 'high' | 'urgent'
      debtor_type: 'pp' | 'pm'
      action_type: 'call' | 'visit' | 'message' | 'meeting' | 'letter' | 'email' | 'other'
      action_result: 'reached' | 'unreachable' | 'refused' | 'promise' | 'dispute' | 'paid' | 'callback' | 'wrong_contact' | 'other'
      payment_status: 'declared' | 'validated' | 'rejected'
      promise_status: 'pending' | 'kept' | 'broken' | 'rescheduled'
      document_visibility: 'bank_admin' | 'admin_only' | 'agent'
      document_category: 'contract' | 'statement' | 'id_document' | 'proof_payment' | 'field_report' | 'correspondence' | 'other'
      closure_reason: 'paid_full' | 'settled' | 'unreachable' | 'dispute' | 'bankruptcy' | 'deceased' | 'transferred' | 'other'
    }
  }
}
