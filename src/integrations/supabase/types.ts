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
          company_id: string
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
          company_id: string
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
          company_id?: string
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
        Relationships: [
          {
            foreignKeyName: "agent_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          company_id: string
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          company_id: string
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          company_id?: string
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          company_id: string
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
          company_id: string
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
          company_id?: string
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
        Relationships: [
          {
            foreignKeyName: "attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_settings: {
        Row: {
          company_id: string
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          company_id: string
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          company_id?: string
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changed_by: string | null
          changed_by_name: string
          company_id: string
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
          company_id: string
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
          company_id?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      biometric_credentials: {
        Row: {
          company_id: string
          created_at: string
          credential_id: string
          id: string
          public_key: string
          worker_name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          credential_id: string
          id?: string
          public_key: string
          worker_name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          credential_id?: string
          id?: string
          public_key?: string
          worker_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "biometric_credentials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      commodities: {
        Row: {
          agent_rate: number
          company_id: string
          created_at: string
          id: string
          name: string
          sales_rate: number
          updated_at: string
          vip_rate: number
        }
        Insert: {
          agent_rate?: number
          company_id: string
          created_at?: string
          id?: string
          name: string
          sales_rate?: number
          updated_at?: string
          vip_rate?: number
        }
        Update: {
          agent_rate?: number
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          sales_rate?: number
          updated_at?: string
          vip_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "commodities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      creditor_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          creditor_id: string
          id: string
          notes: string | null
          paid_by: string | null
          paid_by_name: string
          payment_method: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          creditor_id: string
          id?: string
          notes?: string | null
          paid_by?: string | null
          paid_by_name?: string
          payment_method?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          creditor_id?: string
          id?: string
          notes?: string | null
          paid_by?: string | null
          paid_by_name?: string
          payment_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "creditor_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creditor_payments_creditor_id_fkey"
            columns: ["creditor_id"]
            isOneToOne: false
            referencedRelation: "creditors"
            referencedColumns: ["id"]
          },
        ]
      }
      creditors: {
        Row: {
          balance: number
          commodity: string
          company_id: string
          created_at: string
          customer_name: string
          id: string
          kg: number
          paid_amount: number
          rate: number
          recorded_by: string | null
          recorded_by_name: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          balance?: number
          commodity: string
          company_id: string
          created_at?: string
          customer_name: string
          id?: string
          kg?: number
          paid_amount?: number
          rate?: number
          recorded_by?: string | null
          recorded_by_name?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          commodity?: string
          company_id?: string
          created_at?: string
          customer_name?: string
          id?: string
          kg?: number
          paid_amount?: number
          rate?: number
          recorded_by?: string | null
          recorded_by_name?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creditors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          company_id: string
          created_at: string
          display_name: string
          id: string
          role_key: string
        }
        Insert: {
          company_id: string
          created_at?: string
          display_name: string
          id?: string
          role_key: string
        }
        Update: {
          company_id?: string
          created_at?: string
          display_name?: string
          id?: string
          role_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_payments: {
        Row: {
          amount: number
          company_id: string
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
          company_id: string
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
          company_id?: string
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
            foreignKeyName: "debt_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          company_id: string
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
          company_id: string
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
          company_id?: string
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
        Relationships: [
          {
            foreignKeyName: "debts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      end_of_day_log: {
        Row: {
          company_id: string
          date: string
          id: string
          notes: string | null
          triggered_at: string
          triggered_by: string | null
        }
        Insert: {
          company_id: string
          date?: string
          id?: string
          notes?: string | null
          triggered_at?: string
          triggered_by?: string | null
        }
        Update: {
          company_id?: string
          date?: string
          id?: string
          notes?: string | null
          triggered_at?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "end_of_day_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          company_id: string
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
          company_id: string
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
          company_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      message_recipients: {
        Row: {
          company_id: string
          created_at: string
          id: string
          message_id: string
          read_at: string | null
          recipient_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          message_id: string
          read_at?: string | null
          recipient_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          message_id?: string
          read_at?: string | null
          recipient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_recipients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          company_id: string
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
          company_id: string
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
          company_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_draft?: boolean
          sender_id?: string
          sent_at?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      password_change_otps: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          otp_code: string
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      persistent_stock: {
        Row: {
          commodity: string
          company_id: string
          id: string
          updated_at: string
          weight: number
        }
        Insert: {
          commodity: string
          company_id: string
          id?: string
          updated_at?: string
          weight?: number
        }
        Update: {
          commodity?: string
          company_id?: string
          id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "persistent_stock_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string
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
          company_id: string
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
          company_id?: string
          created_at?: string
          currency_preference?: string | null
          display_name?: string
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_change_history: {
        Row: {
          changed_by: string | null
          changed_by_name: string
          commodity_id: string
          commodity_name: string
          company_id: string
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
          company_id: string
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
          company_id?: string
          created_at?: string
          id?: string
          new_agent_rate?: number
          new_sales_rate?: number
          new_vip_rate?: number
          old_agent_rate?: number
          old_sales_rate?: number
          old_vip_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "rate_change_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recruited_workers: {
        Row: {
          claimed: boolean
          company_id: string
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
          company_id: string
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
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          identification_number?: string | null
          name?: string
          phone?: string | null
          recruited_by?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruited_workers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          company_id: string
          created_at: string
          id: string
          permission: string
          role: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          permission: string
          role: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          permission?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          id: string
          notes: string | null
          paid_by_name: string
          payment_method: string
          payment_month: string
          type: string
          worker_id: string
          worker_name: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_by_name?: string
          payment_method?: string
          payment_month?: string
          type?: string
          worker_id: string
          worker_name: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_by_name?: string
          payment_method?: string
          payment_month?: string
          type?: string
          worker_id?: string
          worker_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_entries: {
        Row: {
          amount: number | null
          commodity: string | null
          company_id: string
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
          company_id: string
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
          company_id?: string
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
        Relationships: [
          {
            foreignKeyName: "sales_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_accounts: {
        Row: {
          balance: number
          company_id: string
          created_at: string
          created_by: string | null
          customer_name: string
          id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_transactions: {
        Row: {
          account_id: string
          amount: number
          company_id: string
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
          company_id: string
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
          company_id?: string
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
          {
            foreignKeyName: "savings_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjusted_by: string | null
          commodity: string
          company_id: string
          created_at: string
          id: string
          new_weight: number
          previous_weight: number
          reason: string
        }
        Insert: {
          adjusted_by?: string | null
          commodity: string
          company_id: string
          created_at?: string
          id?: string
          new_weight?: number
          previous_weight?: number
          reason?: string
        }
        Update: {
          adjusted_by?: string | null
          commodity?: string
          company_id?: string
          created_at?: string
          id?: string
          new_weight?: number
          previous_weight?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      vip_entries: {
        Row: {
          actual_weight: number
          amount: number
          commodity: string
          company_id: string
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
          company_id: string
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
          company_id?: string
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
        Relationships: [
          {
            foreignKeyName: "vip_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          balance: number
          company_id: string
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
          company_id: string
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
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          paid?: number
          role?: string
          salary?: number
        }
        Relationships: [
          {
            foreignKeyName: "workers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_pre_registration: { Args: { check_email: string }; Returns: Json }
      cleanup_expired_otps: { Args: never; Returns: undefined }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_system_admin: { Args: { _user_id: string }; Returns: boolean }
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
