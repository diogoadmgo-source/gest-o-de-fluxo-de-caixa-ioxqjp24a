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
      product_imports: {
        Row: {
          actual_arrival_date: string | null
          company_id: string
          created_at: string
          description: string
          exchange_rate: number
          expected_arrival_date: string | null
          foreign_currency_code: string
          foreign_currency_value: number
          id: string
          international_supplier: string
          logistics_costs: number | null
          nationalization_costs: number | null
          process_number: string | null
          start_date: string
          status: string
          taxes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_arrival_date?: string | null
          company_id: string
          created_at?: string
          description: string
          exchange_rate: number
          expected_arrival_date?: string | null
          foreign_currency_code: string
          foreign_currency_value: number
          id?: string
          international_supplier: string
          logistics_costs?: number | null
          nationalization_costs?: number | null
          process_number?: string | null
          start_date: string
          status: string
          taxes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_arrival_date?: string | null
          company_id?: string
          created_at?: string
          description?: string
          exchange_rate?: number
          expected_arrival_date?: string | null
          foreign_currency_code?: string
          foreign_currency_value?: number
          id?: string
          international_supplier?: string
          logistics_costs?: number | null
          nationalization_costs?: number | null
          process_number?: string | null
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
    }
    Functions: {
      append_payables_skipping_duplicates: {
        Args: { p_company_id: string; p_rows: Json }
        Returns: Json
      }
      ensure_company_and_link_user: {
        Args: { p_company_name: string; p_user_id: string }
        Returns: string
      }
      ensure_company_for_user: {
        Args: { p_company_name: string; p_user_id: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
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
