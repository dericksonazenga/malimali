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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_entries: {
        Row: {
          actual_weight: number
          amount: number
          commodity: string
          container_weight: number
          created_at: string
          created_by: string | null
          customer_name: string
          date: string
          gross_weight: number
          id: string
          item_image: string | null
          rate: number
          weight_image: string | null
        }
        Insert: {
          actual_weight?: number
          amount?: number
          commodity: string
          container_weight?: number
          created_at?: string
          created_by?: string | null
          customer_name: string
          date?: string
          gross_weight?: number
          id?: string
          item_image?: string | null
          rate?: number
          weight_image?: string | null
        }
        Update: {
          actual_weight?: number
          amount?: number
          commodity?: string
          container_weight?: number
          created_at?: string
          created_by?: string | null
          customer_name?: string
          date?: string
          gross_weight?: number
          id?: string
          item_image?: string | null
          rate?: number
          weight_image?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          sign_in_at: string | null
          sign_out_at: string | null
          status: string
          worker_id: string | null
          worker_name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          sign_in_at?: string | null
          sign_out_at?: string | null
          status?: string
          worker_id?: string | null
          worker_name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          sign_in_at?: string | null
          sign_out_at?: string | null
          status?: string
          worker_id?: string | null
          worker_name?: string
        }
        Relationships: []
      }
      attendance_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          changed_by: string | null
          changed_by_name: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          changed_by_name?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          changed_by_name?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      biometric_credentials: {
        Row: {
          created_at: string
          credential_id: string
          id: string
          public_key: string
          worker_name: string
        }
        Insert: {
          created_at?: string
          credential_id: string
          id?: string
          public_key: string
          worker_name: string
        }
        Update: {
          created_at?: string
          credential_id?: string
          id?: string
          public_key?: string
          worker_name?: string
        }
        Relationships: []
      }
      commodities: {
        Row: {
          agent_rate: number
          created_at: string
          id: string
          name: string
          sales_rate: number
          updated_at: string
          vip_rate: number
        }
        Insert: {
          agent_rate?: number
          created_at?: string
          id?: string
          name: string
          sales_rate?: number
          updated_at?: string
          vip_rate?: number
        }
        Update: {
          agent_rate?: number
          created_at?: string
          id?: string
          name?: string
          sales_rate?: number
          updated_at?: string
          vip_rate?: number
        }
        Relationships: []
      }
      daily_summaries: {
        Row: {
          agent_entries: Json
          created_at: string
          created_by: string | null
          date: string
          expenses: Json
          id: string
          net_profit: number
          sales_entries: Json
          stock_changes: Json
          total_agent_amount: number
          total_expenses: number
          total_sales_amount: number
          total_vip_amount: number
          vip_entries: Json
        }
        Insert: {
          agent_entries?: Json
          created_at?: string
          created_by?: string | null
          date?: string
          expenses?: Json
          id?: string
          net_profit?: number
          sales_entries?: Json
          stock_changes?: Json
          total_agent_amount?: number
          total_expenses?: number
          total_sales_amount?: number
          total_vip_amount?: number
          vip_entries?: Json
        }
        Update: {
          agent_entries?: Json
          created_at?: string
          created_by?: string | null
          date?: string
          expenses?: Json
          id?: string
          net_profit?: number
          sales_entries?: Json
          stock_changes?: Json
          total_agent_amount?: number
          total_expenses?: number
          total_sales_amount?: number
          total_vip_amount?: number
          vip_entries?: Json
        }
        Relationships: []
      }
      debt_payments: {
        Row: {
          amount: number
          created_at: string
          debt_id: string
          id: string
          notes: string | null
          paid_by: string | null
          paid_by_name: string
          paid_to_name: string
          payment_method: string
        }
        Insert: {
          amount?: number
          created_at?: string
          debt_id: string
          id?: string
          notes?: string | null
          paid_by?: string | null
          paid_by_name?: string
          paid_to_name?: string
          payment_method?: string
        }
        Update: {
          amount?: number
          created_at?: string
          debt_id?: string
          id?: string
          notes?: string | null
          paid_by?: string | null
          paid_by_name?: string
          paid_to_name?: string
          payment_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          balance: number
          created_at: string
          created_by: string | null
          customer_name: string
          description: string
          id: string
          paid_amount: number
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          created_by?: string | null
          customer_name: string
          description?: string
          id?: string
          paid_amount?: number
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          created_by?: string | null
          customer_name?: string
          description?: string
          id?: string
          paid_amount?: number
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      end_of_day_log: {
        Row: {
          date: string
          id: string
          notes: string | null
          triggered_at: string
          triggered_by: string | null
        }
        Insert: {
          date?: string
          id?: string
          notes?: string | null
          triggered_at?: string
          triggered_by?: string | null
        }
        Update: {
          date?: string
          id?: string
          notes?: string | null
          triggered_at?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          date: string
          id: string
          notes: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      message_recipients: {
        Row: {
          created_at: string
          id: string
          message_id: string
          read_at: string | null
          recipient_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          read_at?: string | null
          recipient_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          read_at?: string | null
          recipient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_recipients_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          image_url: string | null
          is_draft: boolean
          sender_id: string
          sent_at: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_draft?: boolean
          sender_id: string
          sent_at?: string | null
          subject?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_draft?: boolean
          sender_id?: string
          sent_at?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      persistent_stock: {
        Row: {
          commodity: string
          id: string
          updated_at: string
          weight: number
        }
        Insert: {
          commodity: string
          id?: string
          updated_at?: string
          weight?: number
        }
        Update: {
          commodity?: string
          id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          currency_preference: string | null
          display_name: string
          id: string
          phone: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          currency_preference?: string | null
          display_name?: string
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          currency_preference?: string | null
          display_name?: string
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_change_history: {
        Row: {
          changed_by: string | null
          changed_by_name: string
          commodity_id: string
          commodity_name: string
          created_at: string
          id: string
          new_agent_rate: number
          new_sales_rate: number
          new_vip_rate: number
          old_agent_rate: number
          old_sales_rate: number
          old_vip_rate: number
        }
        Insert: {
          changed_by?: string | null
          changed_by_name?: string
          commodity_id: string
          commodity_name: string
          created_at?: string
          id?: string
          new_agent_rate?: number
          new_sales_rate?: number
          new_vip_rate?: number
          old_agent_rate?: number
          old_sales_rate?: number
          old_vip_rate?: number
        }
        Update: {
          changed_by?: string | null
          changed_by_name?: string
          commodity_id?: string
          commodity_name?: string
          created_at?: string
          id?: string
          new_agent_rate?: number
          new_sales_rate?: number
          new_vip_rate?: number
          old_agent_rate?: number
          old_sales_rate?: number
          old_vip_rate?: number
        }
        Relationships: []
      }
      recruited_workers: {
        Row: {
          claimed: boolean
          created_at: string
          email: string | null
          id: string
          identification_number: string | null
          name: string
          phone: string | null
          recruited_by: string | null
          role: string
        }
        Insert: {
          claimed?: boolean
          created_at?: string
          email?: string | null
          id?: string
          identification_number?: string | null
          name: string
          phone?: string | null
          recruited_by?: string | null
          role?: string
        }
        Update: {
          claimed?: boolean
          created_at?: string
          email?: string | null
          id?: string
          identification_number?: string | null
          name?: string
          phone?: string | null
          recruited_by?: string | null
          role?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          role: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          role?: string
        }
        Relationships: []
      }
      sales_entries: {
        Row: {
          amount: number | null
          commodity: string | null
          container_weight: number
          created_at: string
          created_by: string | null
          customer_name: string | null
          date: string
          exchange_commodity: string | null
          exchange_fee: number | null
          exchange_weight: number | null
          gross_weight: number
          id: string
          is_exchange: boolean
          item_image: string | null
          rate: number | null
          weight: number
          weight_image: string | null
        }
        Insert: {
          amount?: number | null
          commodity?: string | null
          container_weight?: number
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          date?: string
          exchange_commodity?: string | null
          exchange_fee?: number | null
          exchange_weight?: number | null
          gross_weight?: number
          id?: string
          is_exchange?: boolean
          item_image?: string | null
          rate?: number | null
          weight?: number
          weight_image?: string | null
        }
        Update: {
          amount?: number | null
          commodity?: string | null
          container_weight?: number
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          date?: string
          exchange_commodity?: string | null
          exchange_fee?: number | null
          exchange_weight?: number | null
          gross_weight?: number
          id?: string
          is_exchange?: boolean
          item_image?: string | null
          rate?: number | null
          weight?: number
          weight_image?: string | null
        }
        Relationships: []
      }
      savings_accounts: {
        Row: {
          balance: number
          created_at: string
          created_by: string | null
          customer_name: string
          id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          created_by?: string | null
          customer_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          created_by?: string | null
          customer_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      savings_transactions: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_method: string
          served_by_name: string
          type: string
        }
        Insert: {
          account_id: string
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string
          served_by_name?: string
          type?: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string
          served_by_name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "savings_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjusted_by: string | null
          commodity: string
          created_at: string
          id: string
          new_weight: number
          previous_weight: number
          reason: string
        }
        Insert: {
          adjusted_by?: string | null
          commodity: string
          created_at?: string
          id?: string
          new_weight?: number
          previous_weight?: number
          reason?: string
        }
        Update: {
          adjusted_by?: string | null
          commodity?: string
          created_at?: string
          id?: string
          new_weight?: number
          previous_weight?: number
          reason?: string
        }
        Relationships: []
      }
      vip_entries: {
        Row: {
          actual_weight: number
          amount: number
          commodity: string
          container_weight: number
          created_at: string
          created_by: string | null
          customer_name: string
          date: string
          gross_weight: number
          id: string
          item_image: string | null
          rate: number
          weight_image: string | null
        }
        Insert: {
          actual_weight?: number
          amount?: number
          commodity: string
          container_weight?: number
          created_at?: string
          created_by?: string | null
          customer_name: string
          date?: string
          gross_weight?: number
          id?: string
          item_image?: string | null
          rate?: number
          weight_image?: string | null
        }
        Update: {
          actual_weight?: number
          amount?: number
          commodity?: string
          container_weight?: number
          created_at?: string
          created_by?: string | null
          customer_name?: string
          date?: string
          gross_weight?: number
          id?: string
          item_image?: string | null
          rate?: number
          weight_image?: string | null
        }
        Relationships: []
      }
      workers: {
        Row: {
          balance: number
          created_at: string
          created_by: string | null
          id: string
          name: string
          paid: number
          role: string
          salary: number
        }
        Insert: {
          balance?: number
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          paid?: number
          role?: string
          salary?: number
        }
        Update: {
          balance?: number
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          paid?: number
          role?: string
          salary?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_pre_registration: { Args: { check_email: string }; Returns: Json }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
