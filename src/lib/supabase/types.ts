// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1'
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      bank_balances: {
        Row: {
          amount: number
          bank_id: string
          company_id: string
          created_at: string | null
          id: string
          reference_date: string
        }
        Insert: {
          amount?: number
          bank_id: string
          company_id: string
          created_at?: string | null
          id?: string
          reference_date: string
        }
        Update: {
          amount?: number
          bank_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
          reference_date?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bank_balances_bank_id_fkey'
            columns: ['bank_id']
            isOneToOne: false
            referencedRelation: 'banks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bank_balances_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      bank_balances_v2: {
        Row: {
          amount: number
          bank_id: string
          company_id: string
          created_at: string
          id: string
          reference_date: string
        }
        Insert: {
          amount?: number
          bank_id: string
          company_id: string
          created_at?: string
          id?: string
          reference_date: string
        }
        Update: {
          amount?: number
          bank_id?: string
          company_id?: string
          created_at?: string
          id?: string
          reference_date?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bank_balances_v2_bank_id_fkey'
            columns: ['bank_id']
            isOneToOne: false
            referencedRelation: 'banks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bank_balances_v2_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      banks: {
        Row: {
          account_digit: string | null
          account_number: string | null
          active: boolean | null
          agency: string | null
          code: string | null
          company_id: string
          created_at: string | null
          id: string
          institution: string | null
          name: string | null
          type: string | null
        }
        Insert: {
          account_digit?: string | null
          account_number?: string | null
          active?: boolean | null
          agency?: string | null
          code?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          institution?: string | null
          name?: string | null
          type?: string | null
        }
        Update: {
          account_digit?: string | null
          account_number?: string | null
          active?: boolean | null
          agency?: string | null
          code?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          institution?: string | null
          name?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'banks_company_fk'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'banks_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          name_norm: string
          origin: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_norm: string
          origin?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_norm?: string
          origin?: string | null
        }
        Relationships: []
      }
      financial_adjustments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          date: string
          id: string
          reason: string | null
          status: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          date: string
          id?: string
          reason?: string | null
          status?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          date?: string
          id?: string
          reason?: string | null
          status?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'financial_adjustments_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'financial_adjustments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      import_logs: {
        Row: {
          company_id: string
          created_at: string
          deleted_count: number | null
          error_count: number | null
          error_details: Json | null
          filename: string
          id: string
          status: string
          success_count: number | null
          total_records: number | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          deleted_count?: number | null
          error_count?: number | null
          error_details?: Json | null
          filename: string
          id?: string
          status: string
          success_count?: number | null
          total_records?: number | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          deleted_count?: number | null
          error_count?: number | null
          error_details?: Json | null
          filename?: string
          id?: string
          status?: string
          success_count?: number | null
          total_records?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'import_logs_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'import_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      import_logs_receivables: {
        Row: {
          company_id: string
          created_at: string
          error_message: string | null
          file_name: string | null
          finished_at: string | null
          id: string
          imported_rows: number
          notes: string | null
          rejected_rows: number
          status: string | null
          total_amount_imported: number | null
          total_rows: number
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          error_message?: string | null
          file_name?: string | null
          finished_at?: string | null
          id?: string
          imported_rows?: number
          notes?: string | null
          rejected_rows?: number
          status?: string | null
          total_amount_imported?: number | null
          total_rows?: number
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          error_message?: string | null
          file_name?: string | null
          finished_at?: string | null
          id?: string
          imported_rows?: number
          notes?: string | null
          rejected_rows?: number
          status?: string | null
          total_amount_imported?: number | null
          total_rows?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'import_logs_receivables_company_id_fkey1'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      import_receivables_log: {
        Row: {
          company_id: string
          error_message: string | null
          file_name: string | null
          finished_at: string | null
          id: string
          imported_rows: number | null
          rejected_rows: number | null
          rejected_value: number | null
          started_at: string | null
          status: string | null
          total_amount_imported: number | null
          total_rows: number | null
          total_value: number | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          error_message?: string | null
          file_name?: string | null
          finished_at?: string | null
          id?: string
          imported_rows?: number | null
          rejected_rows?: number | null
          rejected_value?: number | null
          started_at?: string | null
          status?: string | null
          total_amount_imported?: number | null
          total_rows?: number | null
          total_value?: number | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          error_message?: string | null
          file_name?: string | null
          finished_at?: string | null
          id?: string
          imported_rows?: number | null
          rejected_rows?: number | null
          rejected_value?: number | null
          started_at?: string | null
          status?: string | null
          total_amount_imported?: number | null
          total_rows?: number | null
          total_value?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'import_logs_receivables_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      import_receivables_rejects: {
        Row: {
          batch_id: string | null
          company_id: string | null
          created_at: string | null
          id: string
          raw_data: Json | null
          reason: string | null
          row_number: number | null
        }
        Insert: {
          batch_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          raw_data?: Json | null
          reason?: string | null
          row_number?: number | null
        }
        Update: {
          batch_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          raw_data?: Json | null
          reason?: string | null
          row_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'import_receivables_rejects_batch_id_fkey'
            columns: ['batch_id']
            isOneToOne: false
            referencedRelation: 'import_receivables_log'
            referencedColumns: ['id']
          },
        ]
      }
      notification_settings: {
        Row: {
          app_enabled: boolean
          company_id: string
          created_at: string | null
          days_before_due: number
          email_enabled: boolean
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_enabled?: boolean
          company_id: string
          created_at?: string | null
          days_before_due?: number
          email_enabled?: boolean
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_enabled?: boolean
          company_id?: string
          created_at?: string | null
          days_before_due?: number
          email_enabled?: boolean
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notification_settings_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_read: boolean
          message: string
          title: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      payables: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          due_date: string | null
          fine: number | null
          id: string
          interest: number | null
          issue_date: string | null
          nf: string | null
          payment_prediction: string | null
          principal_value: number | null
          supplier_cnpj: string | null
          supplier_name: string | null
          title_status: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          fine?: number | null
          id?: string
          interest?: number | null
          issue_date?: string | null
          nf?: string | null
          payment_prediction?: string | null
          principal_value?: number | null
          supplier_cnpj?: string | null
          supplier_name?: string | null
          title_status?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          fine?: number | null
          id?: string
          interest?: number | null
          issue_date?: string | null
          nf?: string | null
          payment_prediction?: string | null
          principal_value?: number | null
          supplier_cnpj?: string | null
          supplier_name?: string | null
          title_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'payables_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      payables_approvals: {
        Row: {
          approval_level: string
          approved_at: string
          approved_by: string
          company_id: string
          id: string
          note: string | null
          payable_id: string
        }
        Insert: {
          approval_level: string
          approved_at?: string
          approved_by: string
          company_id: string
          id?: string
          note?: string | null
          payable_id: string
        }
        Update: {
          approval_level?: string
          approved_at?: string
          approved_by?: string
          company_id?: string
          id?: string
          note?: string | null
          payable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payables_approvals_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payables_approvals_payable_id_fkey'
            columns: ['payable_id']
            isOneToOne: false
            referencedRelation: 'payables'
            referencedColumns: ['id']
          },
        ]
      }
      performance_logs: {
        Row: {
          action: string | null
          created_at: string | null
          duration_ms: number | null
          id: string
          meta: Json | null
          route: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          meta?: Json | null
          route?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          meta?: Json | null
          route?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      product_imports: {
        Row: {
          actual_arrival_date: string | null
          balance: number | null
          clearance_forecast_date: string | null
          clearance_status: string | null
          company_id: string
          created_at: string
          description: string
          due_date: string | null
          estimate_without_tax: number | null
          exchange_rate: number
          expected_arrival_date: string | null
          final_clearance_estimate: number | null
          foreign_currency_code: string
          foreign_currency_value: number
          icms_tax: number | null
          id: string
          international_supplier: string
          line: string | null
          logistics_costs: number | null
          nationalization_costs: number | null
          nf_number: string | null
          process_number: string | null
          situation: string | null
          start_date: string
          status: string
          taxes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_arrival_date?: string | null
          balance?: number | null
          clearance_forecast_date?: string | null
          clearance_status?: string | null
          company_id: string
          created_at?: string
          description: string
          due_date?: string | null
          estimate_without_tax?: number | null
          exchange_rate: number
          expected_arrival_date?: string | null
          final_clearance_estimate?: number | null
          foreign_currency_code: string
          foreign_currency_value: number
          icms_tax?: number | null
          id?: string
          international_supplier: string
          line?: string | null
          logistics_costs?: number | null
          nationalization_costs?: number | null
          nf_number?: string | null
          process_number?: string | null
          situation?: string | null
          start_date: string
          status: string
          taxes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_arrival_date?: string | null
          balance?: number | null
          clearance_forecast_date?: string | null
          clearance_status?: string | null
          company_id?: string
          created_at?: string
          description?: string
          due_date?: string | null
          estimate_without_tax?: number | null
          exchange_rate?: number
          expected_arrival_date?: string | null
          final_clearance_estimate?: number | null
          foreign_currency_code?: string
          foreign_currency_value?: number
          icms_tax?: number | null
          id?: string
          international_supplier?: string
          line?: string | null
          logistics_costs?: number | null
          nationalization_costs?: number | null
          nf_number?: string | null
          process_number?: string | null
          situation?: string | null
          start_date?: string
          status?: string
          taxes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_imports_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_imports_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      receivable_status_map: {
        Row: {
          canonical: string
          raw: string
        }
        Insert: {
          canonical: string
          raw: string
        }
        Update: {
          canonical?: string
          raw?: string
        }
        Relationships: []
      }
      receivables: {
        Row: {
          company_id: string
          created_at: string | null
          customer: string | null
          customer_code: string | null
          customer_doc: string | null
          customer_name: string | null
          days_overdue: number | null
          description: string | null
          due_date: string | null
          fine: number | null
          id: string
          import_batch_id: string | null
          installment: string | null
          interest: number | null
          invoice_number: string | null
          issue_date: string | null
          negativado: string | null
          new_status: string | null
          order_number: string | null
          payment_prediction: string | null
          principal_value: number | null
          raw_status: string | null
          regional: string | null
          seller: string | null
          source_file_name: string | null
          source_row_num: number | null
          title_status: string | null
          uf: string | null
          updated_value: number | null
          utilization: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          customer?: string | null
          customer_code?: string | null
          customer_doc?: string | null
          customer_name?: string | null
          days_overdue?: number | null
          description?: string | null
          due_date?: string | null
          fine?: number | null
          id?: string
          import_batch_id?: string | null
          installment?: string | null
          interest?: number | null
          invoice_number?: string | null
          issue_date?: string | null
          negativado?: string | null
          new_status?: string | null
          order_number?: string | null
          payment_prediction?: string | null
          principal_value?: number | null
          raw_status?: string | null
          regional?: string | null
          seller?: string | null
          source_file_name?: string | null
          source_row_num?: number | null
          title_status?: string | null
          uf?: string | null
          updated_value?: number | null
          utilization?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          customer?: string | null
          customer_code?: string | null
          customer_doc?: string | null
          customer_name?: string | null
          days_overdue?: number | null
          description?: string | null
          due_date?: string | null
          fine?: number | null
          id?: string
          import_batch_id?: string | null
          installment?: string | null
          interest?: number | null
          invoice_number?: string | null
          issue_date?: string | null
          negativado?: string | null
          new_status?: string | null
          order_number?: string | null
          payment_prediction?: string | null
          principal_value?: number | null
          raw_status?: string | null
          regional?: string | null
          seller?: string | null
          source_file_name?: string | null
          source_row_num?: number | null
          title_status?: string | null
          uf?: string | null
          updated_value?: number | null
          utilization?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'receivables_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      transactions: {
        Row: {
          amount: number | null
          category: string | null
          company_id: string
          created_at: string | null
          description: string | null
          document_number: string | null
          due_date: string | null
          entity_name: string | null
          fine: number | null
          id: string
          interest: number | null
          issue_date: string | null
          principal_value: number | null
          status: string | null
          type: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          document_number?: string | null
          due_date?: string | null
          entity_name?: string | null
          fine?: number | null
          id?: string
          interest?: number | null
          issue_date?: string | null
          principal_value?: number | null
          status?: string | null
          type?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          document_number?: string | null
          due_date?: string | null
          entity_name?: string | null
          fine?: number | null
          id?: string
          interest?: number | null
          issue_date?: string | null
          principal_value?: number | null
          status?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      user_companies: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_companies_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      user_profiles: {
        Row: {
          company_id: string | null
          created_at: string | null
          email: string
          id: string
          is_2fa_enabled: boolean
          last_access: string | null
          name: string
          profile: Database['public']['Enums']['user_role']
          status: Database['public']['Enums']['user_status']
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          email: string
          id: string
          is_2fa_enabled?: boolean
          last_access?: string | null
          name: string
          profile?: Database['public']['Enums']['user_role']
          status?: Database['public']['Enums']['user_status']
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_2fa_enabled?: boolean
          last_access?: string | null
          name?: string
          profile?: Database['public']['Enums']['user_role']
          status?: Database['public']['Enums']['user_status']
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'user_profiles_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      receivables_view: {
        Row: {
          company_id: string | null
          created_at: string | null
          customer: string | null
          customer_code: string | null
          customer_doc: string | null
          days_overdue: number | null
          description: string | null
          due_date: string | null
          fine: number | null
          id: string | null
          installment: string | null
          interest: number | null
          invoice_number: string | null
          issue_date: string | null
          negativado: string | null
          order_number: string | null
          payment_prediction: string | null
          principal_value: number | null
          regional: string | null
          seller: string | null
          status_operacional: string | null
          title_status: string | null
          uf: string | null
          updated_value: number | null
          utilization: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          customer?: string | null
          customer_code?: string | null
          customer_doc?: string | null
          days_overdue?: number | null
          description?: string | null
          due_date?: string | null
          fine?: number | null
          id?: string | null
          installment?: string | null
          interest?: number | null
          invoice_number?: string | null
          issue_date?: string | null
          negativado?: string | null
          order_number?: string | null
          payment_prediction?: string | null
          principal_value?: number | null
          regional?: string | null
          seller?: string | null
          status_operacional?: never
          title_status?: string | null
          uf?: string | null
          updated_value?: number | null
          utilization?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          customer?: string | null
          customer_code?: string | null
          customer_doc?: string | null
          days_overdue?: number | null
          description?: string | null
          due_date?: string | null
          fine?: number | null
          id?: string | null
          installment?: string | null
          interest?: number | null
          invoice_number?: string | null
          issue_date?: string | null
          negativado?: string | null
          order_number?: string | null
          payment_prediction?: string | null
          principal_value?: number | null
          regional?: string | null
          seller?: string | null
          status_operacional?: never
          title_status?: string | null
          uf?: string | null
          updated_value?: number | null
          utilization?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'receivables_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      vw_transactions_normalized: {
        Row: {
          amount_numeric: number | null
          due_date: string | null
          id: string | null
        }
        Insert: {
          amount_numeric?: number | null
          due_date?: string | null
          id?: string | null
        }
        Update: {
          amount_numeric?: number | null
          due_date?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      append_payables_skipping_duplicates: {
        Args: { p_company_id: string; p_rows: Json }
        Returns: Json
      }
      audit_product_imports_nulls: {
        Args: { p_company_id: string }
        Returns: Json
      }
      can_access_company: { Args: { p_company_id: string }; Returns: boolean }
      ensure_company_and_link_user: {
        Args: { p_company_name: string; p_user_id: string }
        Returns: string
      }
      ensure_company_for_user: {
        Args: { p_company_name: string; p_user_id: string }
        Returns: string
      }
      export_receivables_rejects_csv: {
        Args: { p_batch_id: string }
        Returns: string
      }
      get_cash_flow_aggregates: {
        Args: { p_company_id: string; p_end_date: string; p_start_date: string }
        Returns: {
          customs_cost: number
          day: string
          import_payments: number
          total_payables: number
          total_receivables: number
        }[]
      }
      get_company_integrity_stats: {
        Args: { p_company_id: string; p_table_name: string }
        Returns: Json
      }
      get_dashboard_kpis: {
        Args: { p_company_id: string; p_days?: number }
        Returns: Json
      }
      get_dashboard_kpis_legacy: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_data_isolation_audit: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_latest_balances: {
        Args: { p_company_id: string }
        Returns: {
          account_number: string
          balance: number
          bank_id: string
          bank_name: string
          bank_type: string
          reference_date: string
        }[]
      }
      get_payable_charts_data: {
        Args: {
          p_company_id: string
          p_date_range_end?: string
          p_date_range_start?: string
          p_max_value?: number
          p_min_value?: number
          p_search?: string
          p_status?: string
          p_supplier?: string
        }
        Returns: Json
      }
      get_payable_stats: {
        Args: {
          p_company_id: string
          p_date_range_end?: string
          p_date_range_start?: string
          p_max_value?: number
          p_min_value?: number
          p_search?: string
          p_status?: string
          p_supplier?: string
        }
        Returns: Json
      }
      get_product_import_financial_totals: {
        Args: {
          p_company_ids: string[]
          p_end_date?: string
          p_search_term?: string
          p_start_date?: string
        }
        Returns: {
          total_balance: number
          total_estimate_without_tax: number
          total_final_estimate: number
          total_icms_tax: number
        }[]
      }
      get_product_import_stats: {
        Args: {
          p_company_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          count: number
          status: string
          total_balance: number
          total_estimate: number
        }[]
      }
      get_receivables_dashboard_stats: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_receivables_rejects: {
        Args: { p_batch_id: string; p_page?: number; p_page_size?: number }
        Returns: {
          id: string
          raw_data: Json
          reason: string
          row_number: number
          total_count: number
        }[]
      }
      import_receivables_replace: {
        Args: {
          p_company_id: string
          p_file_name: string
          p_rows: Json
          p_user_id: string
        }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      normalize_installment: { Args: { p_inst: string }; Returns: string }
      parse_date_br: { Args: { p_date_text: string }; Returns: string }
      parse_flexible_date: { Args: { p_text: string }; Returns: string }
      parse_ptbr_numeric: { Args: { p_text: string }; Returns: number }
      replace_receivables_for_company: {
        Args: { p_company_id: string; p_rows: Json }
        Returns: Json
      }
      strict_replace_payables: {
        Args: { p_company_id: string; p_rows: Json }
        Returns: Json
      }
      strict_replace_receivables: {
        Args: { p_company_id: string; p_rows: Json }
        Returns: Json
      }
    }
    Enums: {
      user_role: 'Administrator' | 'User'
      user_status: 'Pending' | 'Active' | 'Inactive' | 'Blocked'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ['Administrator', 'User'],
      user_status: ['Pending', 'Active', 'Inactive', 'Blocked'],
    },
  },
} as const
