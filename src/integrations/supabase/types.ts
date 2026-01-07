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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json | null
        }
        Relationships: []
      }
      appointment_notes: {
        Row: {
          appointment_id: string
          business_id: string
          created_at: string | null
          created_by: string | null
          id: string
          note_text: string
          updated_at: string | null
        }
        Insert: {
          appointment_id: string
          business_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          note_text: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string
          business_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          note_text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "appointment_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_notifications: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          id: string
          meta: Json | null
          send_at: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          id?: string
          meta?: Json | null
          send_at: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          id?: string
          meta?: Json | null
          send_at?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_requests: {
        Row: {
          appointment_id: string
          business_id: string
          client_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          meta: Json | null
          original_start_time: string | null
          requested_start_time: string | null
          responded_at: string | null
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          appointment_id: string
          business_id: string
          client_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          meta?: Json | null
          original_start_time?: string | null
          requested_start_time?: string | null
          responded_at?: string | null
          status?: string
          type?: string
          user_id?: string | null
        }
        Update: {
          appointment_id?: string
          business_id?: string
          client_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          meta?: Json | null
          original_start_time?: string | null
          requested_start_time?: string | null
          responded_at?: string | null
          status?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "appointment_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_services: {
        Row: {
          appointment_id: string
          created_at: string | null
          discount_type: string | null
          discount_value: number
          duration_minutes: number | null
          price: number | null
          quantity: number | null
          service_id: string
          staff_id: string | null
          start_time: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string | null
          discount_type?: string | null
          discount_value?: number
          duration_minutes?: number | null
          price?: number | null
          quantity?: number | null
          service_id: string
          staff_id?: string | null
          start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string | null
          discount_type?: string | null
          discount_value?: number
          duration_minutes?: number | null
          price?: number | null
          quantity?: number | null
          service_id?: string
          staff_id?: string | null
          start_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_services_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_settings: {
        Row: {
          allow_same_day_booking: boolean | null
          booking_advance_days: number | null
          buffer_minutes: number | null
          buffer_time_minutes: number | null
          business_id: string | null
          cancellation_hours: number | null
          cancellation_policy: string | null
          created_at: string | null
          deposit_percentage: number | null
          id: string
          max_advance_booking_days: number | null
          min_advance_booking_hours: number | null
          reminder_hours: number | null
          require_deposit: boolean | null
          slot_duration_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          allow_same_day_booking?: boolean | null
          booking_advance_days?: number | null
          buffer_minutes?: number | null
          buffer_time_minutes?: number | null
          business_id?: string | null
          cancellation_hours?: number | null
          cancellation_policy?: string | null
          created_at?: string | null
          deposit_percentage?: number | null
          id?: string
          max_advance_booking_days?: number | null
          min_advance_booking_hours?: number | null
          reminder_hours?: number | null
          require_deposit?: boolean | null
          slot_duration_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          allow_same_day_booking?: boolean | null
          booking_advance_days?: number | null
          buffer_minutes?: number | null
          buffer_time_minutes?: number | null
          business_id?: string | null
          cancellation_hours?: number | null
          cancellation_policy?: string | null
          created_at?: string | null
          deposit_percentage?: number | null
          id?: string
          max_advance_booking_days?: number | null
          min_advance_booking_hours?: number | null
          reminder_hours?: number | null
          require_deposit?: boolean | null
          slot_duration_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "appointment_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string | null
          booking_type: string | null
          business_id: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string | null
          date: string | null
          duration_minutes: number | null
          early_confirmed: boolean | null
          early_invited: boolean | null
          early_invited_at: string | null
          end_time: string | null
          end_ts: string | null
          ends_at: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          inventory_used: Json | null
          notes: string | null
          payment_amount: number | null
          payment_method: string | null
          price: number | null
          resource_id: string | null
          service_id: string | null
          source: string | null
          staff_id: string | null
          start_time: string | null
          start_ts: string | null
          starts_at: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          appointment_date?: string | null
          booking_type?: string | null
          business_id?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string | null
          date?: string | null
          duration_minutes?: number | null
          early_confirmed?: boolean | null
          early_invited?: boolean | null
          early_invited_at?: string | null
          end_time?: string | null
          end_ts?: string | null
          ends_at?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          inventory_used?: Json | null
          notes?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          price?: number | null
          resource_id?: string | null
          service_id?: string | null
          source?: string | null
          staff_id?: string | null
          start_time?: string | null
          start_ts?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          appointment_date?: string | null
          booking_type?: string | null
          business_id?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string | null
          date?: string | null
          duration_minutes?: number | null
          early_confirmed?: boolean | null
          early_invited?: boolean | null
          early_invited_at?: string | null
          end_time?: string | null
          end_ts?: string | null
          ends_at?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          inventory_used?: Json | null
          notes?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          price?: number | null
          resource_id?: string | null
          service_id?: string | null
          source?: string | null
          staff_id?: string | null
          start_time?: string | null
          start_ts?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_time: {
        Row: {
          blocked_time_type_id: string | null
          created_at: string | null
          date: string
          description: string | null
          end_time: string
          frequency: string | null
          frequency_end_date: string | null
          id: string
          start_time: string
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          blocked_time_type_id?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          end_time: string
          frequency?: string | null
          frequency_end_date?: string | null
          id?: string
          start_time: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          blocked_time_type_id?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          end_time?: string
          frequency?: string | null
          frequency_end_date?: string | null
          id?: string
          start_time?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      business_approval_requests: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          notes: string | null
          owner_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_approval_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_approval_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "business_approval_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      business_category_changes: {
        Row: {
          business_id: string
          changed_at: string | null
          created_at: string | null
          id: string
          new_primary_category: string | null
          new_secondary_categories: string[] | null
          old_primary_category: string | null
          old_secondary_categories: string[] | null
        }
        Insert: {
          business_id: string
          changed_at?: string | null
          created_at?: string | null
          id?: string
          new_primary_category?: string | null
          new_secondary_categories?: string[] | null
          old_primary_category?: string | null
          old_secondary_categories?: string[] | null
        }
        Update: {
          business_id?: string
          changed_at?: string | null
          created_at?: string | null
          id?: string
          new_primary_category?: string | null
          new_secondary_categories?: string[] | null
          old_primary_category?: string | null
          old_secondary_categories?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "business_category_changes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_category_changes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "business_category_changes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          break_end: string | null
          break_start: string | null
          business_id: string | null
          close_time: string | null
          created_at: string | null
          day_of_week: number
          id: string
          is_closed: boolean | null
          open_time: string | null
          updated_at: string | null
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          business_id?: string | null
          close_time?: string | null
          created_at?: string | null
          day_of_week: number
          id?: string
          is_closed?: boolean | null
          open_time?: string | null
          updated_at?: string | null
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          business_id?: string | null
          close_time?: string | null
          created_at?: string | null
          day_of_week?: number
          id?: string
          is_closed?: boolean | null
          open_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      business_name_changes: {
        Row: {
          business_id: string
          changed_at: string | null
          created_at: string | null
          id: string
          new_name: string
          old_name: string
        }
        Insert: {
          business_id: string
          changed_at?: string | null
          created_at?: string | null
          id?: string
          new_name: string
          old_name: string
        }
        Update: {
          business_id?: string
          changed_at?: string | null
          created_at?: string | null
          id?: string
          new_name?: string
          old_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_name_changes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_name_changes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "business_name_changes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      business_owners: {
        Row: {
          avatar_url: string | null
          business_id: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          password_hash: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_id?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          password_hash: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          password_hash?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_owners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_owners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "business_owners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      business_services: {
        Row: {
          business_id: string
          category: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number | null
          price_mxn: number | null
          price_usd: number | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price?: number | null
          price_mxn?: number | null
          price_usd?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number | null
          price_mxn?: number | null
          price_usd?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "business_services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      business_working_hours: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_open: boolean | null
          location_id: string | null
          lunch_end: string | null
          lunch_start: string | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_open?: boolean | null
          location_id?: string | null
          lunch_end?: string | null
          lunch_start?: string | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_open?: boolean | null
          location_id?: string | null
          lunch_end?: string | null
          lunch_start?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      businesses: {
        Row: {
          accessibility_settings: Json | null
          account_type: string | null
          address: string | null
          approval_status: string | null
          average_rating: number | null
          business_name: string | null
          category: string | null
          closed_until: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          email: string | null
          google_maps_url: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          latitude: number | null
          locale_settings: Json | null
          location_details: Json | null
          logo_url: string | null
          longitude: number | null
          onboarding_completed: boolean | null
          owner_id: string
          phone: string | null
          primary_category: string | null
          secondary_categories: string[] | null
          service_type: string | null
          slug: string | null
          team_size: string | null
          temporarily_closed: boolean | null
          theme_settings: Json | null
          total_reviews: number | null
          updated_at: string | null
          website: string | null
          website_url: string | null
        }
        Insert: {
          accessibility_settings?: Json | null
          account_type?: string | null
          address?: string | null
          approval_status?: string | null
          average_rating?: number | null
          business_name?: string | null
          category?: string | null
          closed_until?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          google_maps_url?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          latitude?: number | null
          locale_settings?: Json | null
          location_details?: Json | null
          logo_url?: string | null
          longitude?: number | null
          onboarding_completed?: boolean | null
          owner_id: string
          phone?: string | null
          primary_category?: string | null
          secondary_categories?: string[] | null
          service_type?: string | null
          slug?: string | null
          team_size?: string | null
          temporarily_closed?: boolean | null
          theme_settings?: Json | null
          total_reviews?: number | null
          updated_at?: string | null
          website?: string | null
          website_url?: string | null
        }
        Update: {
          accessibility_settings?: Json | null
          account_type?: string | null
          address?: string | null
          approval_status?: string | null
          average_rating?: number | null
          business_name?: string | null
          category?: string | null
          closed_until?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          google_maps_url?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          latitude?: number | null
          locale_settings?: Json | null
          location_details?: Json | null
          logo_url?: string | null
          longitude?: number | null
          onboarding_completed?: boolean | null
          owner_id?: string
          phone?: string | null
          primary_category?: string | null
          secondary_categories?: string[] | null
          service_type?: string | null
          slug?: string | null
          team_size?: string | null
          temporarily_closed?: boolean | null
          theme_settings?: Json | null
          total_reviews?: number | null
          updated_at?: string | null
          website?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      client_credits: {
        Row: {
          amount: number
          appointment_id: string
          business_id: string
          client_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          notes: string | null
          paid_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          appointment_id: string
          business_id: string
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string
          business_id?: string
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_credits_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "client_credits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notifications: {
        Row: {
          appointment_id: string | null
          business_id: string | null
          client_id: string | null
          created_at: string | null
          id: string
          message: string
          meta: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          business_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          meta?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          business_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          meta?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "client_notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          accepts_marketing: boolean | null
          avatar_url: string | null
          biometric_enabled: boolean | null
          country_code: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          push_token: string | null
          updated_at: string | null
        }
        Insert: {
          accepts_marketing?: boolean | null
          avatar_url?: string | null
          biometric_enabled?: boolean | null
          country_code?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          push_token?: string | null
          updated_at?: string | null
        }
        Update: {
          accepts_marketing?: boolean | null
          avatar_url?: string | null
          biometric_enabled?: boolean | null
          country_code?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          push_token?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          allergy_notes: string | null
          avatar_url: string | null
          blocked_at: string | null
          blocked_reason: string | null
          business_id: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          is_blocked: boolean
          last_name: string | null
          notes: string | null
          password_hash: string | null
          phone: string | null
          total_bookings: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          allergy_notes?: string | null
          avatar_url?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          business_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_blocked?: boolean
          last_name?: string | null
          notes?: string | null
          password_hash?: string | null
          phone?: string | null
          total_bookings?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          allergy_notes?: string | null
          avatar_url?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          business_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_blocked?: boolean
          last_name?: string | null
          notes?: string | null
          password_hash?: string | null
          phone?: string | null
          total_bookings?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "clients_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_configs: {
        Row: {
          business_id: string | null
          commission_type: string
          commission_value: number
          created_at: string | null
          id: string
          service_id: string | null
          staff_id: string | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          commission_type: string
          commission_value: number
          created_at?: string | null
          id?: string
          service_id?: string | null
          staff_id?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          commission_type?: string
          commission_value?: number
          created_at?: string | null
          id?: string
          service_id?: string | null
          staff_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_configs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_configs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "commission_configs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_configs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_configs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payments: {
        Row: {
          amount: number
          appointment_id: string | null
          business_id: string | null
          created_at: string | null
          id: string
          payment_date: string
          sale_id: string | null
          staff_id: string | null
          status: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          business_id?: string | null
          created_at?: string | null
          id?: string
          payment_date: string
          sale_id?: string | null
          staff_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          business_id?: string | null
          created_at?: string | null
          id?: string
          payment_date?: string
          sale_id?: string | null
          staff_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "commission_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_sales_summaries: {
        Row: {
          business_id: string
          card_total: number
          cash_total: number
          created_at: string | null
          id: string
          late_cancellation_fees_qty: number
          late_cancellation_fees_refund_qty: number
          late_cancellation_fees_total: number
          notes: string | null
          online_total: number
          products_qty: number
          products_refund_qty: number
          products_total: number
          refunds_total: number
          service_addons_qty: number
          service_addons_refund_qty: number
          service_addons_total: number
          services_qty: number
          services_refund_qty: number
          services_total: number
          summary_date: string
          tips_qty: number
          tips_refund_qty: number
          tips_total: number
          total_sales: number
          total_transactions: number
          updated_at: string | null
        }
        Insert: {
          business_id: string
          card_total?: number
          cash_total?: number
          created_at?: string | null
          id?: string
          late_cancellation_fees_qty?: number
          late_cancellation_fees_refund_qty?: number
          late_cancellation_fees_total?: number
          notes?: string | null
          online_total?: number
          products_qty?: number
          products_refund_qty?: number
          products_total?: number
          refunds_total?: number
          service_addons_qty?: number
          service_addons_refund_qty?: number
          service_addons_total?: number
          services_qty?: number
          services_refund_qty?: number
          services_total?: number
          summary_date: string
          tips_qty?: number
          tips_refund_qty?: number
          tips_total?: number
          total_sales?: number
          total_transactions?: number
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          card_total?: number
          cash_total?: number
          created_at?: string | null
          id?: string
          late_cancellation_fees_qty?: number
          late_cancellation_fees_refund_qty?: number
          late_cancellation_fees_total?: number
          notes?: string | null
          online_total?: number
          products_qty?: number
          products_refund_qty?: number
          products_total?: number
          refunds_total?: number
          service_addons_qty?: number
          service_addons_refund_qty?: number
          service_addons_total?: number
          services_qty?: number
          services_refund_qty?: number
          services_total?: number
          summary_date?: string
          tips_qty?: number
          tips_refund_qty?: number
          tips_total?: number
          total_sales?: number
          total_transactions?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_sales_summaries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_sales_summaries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "daily_sales_summaries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          business_id: string | null
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "favorites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          business_id: string
          category: string | null
          cost_price: number | null
          created_at: string | null
          current_stock: number
          description: string | null
          id: string
          is_active: boolean | null
          min_stock_level: number
          name: string
          sku: string | null
          supplier: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          business_id: string
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_stock_level?: number
          name: string
          sku?: string | null
          supplier?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_stock_level?: number
          name?: string
          sku?: string | null
          supplier?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "inventory_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          inventory_id: string
          movement_type: string
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          staff_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          inventory_id: string
          movement_type: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          staff_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          inventory_id?: string
          movement_type?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "inventory_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      next_client_notification_queue: {
        Row: {
          appointment_id: string
          business_id: string
          created_at: string
          current_appointment_date: string
          current_appointment_end_time: string
          error_message: string | null
          id: string
          processed_at: string | null
          retry_count: number
          staff_id: string
          status: string
        }
        Insert: {
          appointment_id: string
          business_id: string
          created_at?: string
          current_appointment_date: string
          current_appointment_end_time: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          retry_count?: number
          staff_id: string
          status?: string
        }
        Update: {
          appointment_id?: string
          business_id?: string
          created_at?: string
          current_appointment_date?: string
          current_appointment_end_time?: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          retry_count?: number
          staff_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "next_client_notification_queue_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          business_id: string | null
          created_at: string | null
          email_notifications: boolean | null
          id: string
          push_notifications: boolean | null
          sms_notifications: boolean | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "notification_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string | null
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          business_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "payment_methods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          authorization_code: string | null
          card_last_four: string | null
          cash_received_by: string | null
          change_amount: number | null
          created_at: string | null
          currency: string | null
          id: string
          payment_method: string
          processed_at: string | null
          sale_id: string
          status: string
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          authorization_code?: string | null
          card_last_four?: string | null
          cash_received_by?: string | null
          change_amount?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          payment_method: string
          processed_at?: string | null
          sale_id: string
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          authorization_code?: string | null
          card_last_four?: string | null
          cash_received_by?: string | null
          change_amount?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          payment_method?: string
          processed_at?: string | null
          sale_id?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepts_marketing: boolean | null
          avatar_url: string | null
          biometric_enabled: boolean | null
          business_id: string | null
          country_code: string | null
          created_at: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          onboarding_step: number | null
          phone: string | null
          push_token: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          accepts_marketing?: boolean | null
          avatar_url?: string | null
          biometric_enabled?: boolean | null
          business_id?: string | null
          country_code?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          onboarding_step?: number | null
          phone?: string | null
          push_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          accepts_marketing?: boolean | null
          avatar_url?: string | null
          biometric_enabled?: boolean | null
          business_id?: string | null
          country_code?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          onboarding_step?: number | null
          phone?: string | null
          push_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payment_id: string | null
          processed_at: string | null
          processed_by: string
          reason: string | null
          refund_method: string | null
          sale_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payment_id?: string | null
          processed_at?: string | null
          processed_by: string
          reason?: string | null
          refund_method?: string | null
          sale_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payment_id?: string | null
          processed_at?: string | null
          processed_by?: string
          reason?: string | null
          refund_method?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          admin_response: string | null
          appointment_id: string | null
          business_id: string | null
          client_id: string | null
          comment: string | null
          created_at: string | null
          expiration_date: string | null
          id: string
          is_addressed: boolean | null
          notification_sent: boolean | null
          rating: number | null
          response_created_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_response?: string | null
          appointment_id?: string | null
          business_id?: string | null
          client_id?: string | null
          comment?: string | null
          created_at?: string | null
          expiration_date?: string | null
          id?: string
          is_addressed?: boolean | null
          notification_sent?: boolean | null
          rating?: number | null
          response_created_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_response?: string | null
          appointment_id?: string | null
          business_id?: string | null
          client_id?: string | null
          comment?: string | null
          created_at?: string | null
          expiration_date?: string | null
          id?: string
          is_addressed?: boolean | null
          notification_sent?: boolean | null
          rating?: number | null
          response_created_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          business_id: string | null
          client_id: string | null
          client_name: string | null
          client_type: string | null
          created_at: string | null
          id: string
          inventory_used: Json | null
          notes: string | null
          payment_method: string | null
          price_mxn: number | null
          price_usd: number | null
          sale_date: string | null
          sale_time: string | null
          service_id: string | null
          service_name: string | null
          staff_id: string | null
          tip_amount: number | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          client_id?: string | null
          client_name?: string | null
          client_type?: string | null
          created_at?: string | null
          id?: string
          inventory_used?: Json | null
          notes?: string | null
          payment_method?: string | null
          price_mxn?: number | null
          price_usd?: number | null
          sale_date?: string | null
          sale_time?: string | null
          service_id?: string | null
          service_name?: string | null
          staff_id?: string | null
          tip_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          client_id?: string | null
          client_name?: string | null
          client_type?: string | null
          created_at?: string | null
          id?: string
          inventory_used?: Json | null
          notes?: string | null
          payment_method?: string | null
          price_mxn?: number | null
          price_usd?: number | null
          sale_date?: string | null
          sale_time?: string | null
          service_id?: string | null
          service_name?: string | null
          staff_id?: string | null
          tip_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          allows_group_booking: boolean | null
          business_id: string | null
          category: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          duration_minutes: number
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          price: number
          price_currency: string | null
          price_mxn: number | null
          price_usd: number | null
          updated_at: string | null
        }
        Insert: {
          allows_group_booking?: boolean | null
          business_id?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_minutes: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          price: number
          price_currency?: string | null
          price_mxn?: number | null
          price_usd?: number | null
          updated_at?: string | null
        }
        Update: {
          allows_group_booking?: boolean | null
          business_id?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          price?: number
          price_currency?: string | null
          price_mxn?: number | null
          price_usd?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          appointment_id: string | null
          business_id: string | null
          created_at: string | null
          id: string
          message: string
          phone_number: string
          status: string | null
        }
        Insert: {
          appointment_id?: string | null
          business_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          phone_number: string
          status?: string | null
        }
        Update: {
          appointment_id?: string | null
          business_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          phone_number?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "sms_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_templates: {
        Row: {
          business_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          message: string
          template_type: string
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          template_type: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          template_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "sms_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          avatar_url: string | null
          bio: string | null
          business_id: string | null
          commission_rate: number | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          specialties: string[] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          business_id?: string | null
          commission_rate?: number | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          business_id?: string | null
          commission_rate?: number | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "staff_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_early_departures: {
        Row: {
          business_id: string | null
          created_at: string | null
          date: string
          departure_time: string
          id: string
          reason: string | null
          staff_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          date: string
          departure_time: string
          id?: string
          reason?: string | null
          staff_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          date?: string
          departure_time?: string
          id?: string
          reason?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_early_departures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_early_departures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "staff_early_departures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_early_departures_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_schedules: {
        Row: {
          business_id: string | null
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean | null
          staff_id: string | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean | null
          staff_id?: string | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean | null
          staff_id?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "staff_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_schedules_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_services: {
        Row: {
          service_id: string
          staff_id: string
        }
        Insert: {
          service_id: string
          staff_id: string
        }
        Update: {
          service_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_services_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_time_off: {
        Row: {
          business_id: string | null
          created_at: string | null
          end_date: string
          id: string
          reason: string | null
          staff_id: string | null
          start_date: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          reason?: string | null
          staff_id?: string | null
          start_date: string
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          reason?: string | null
          staff_id?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_time_off_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_time_off_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "staff_time_off_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_time_off_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      establishments: {
        Row: {
          address: string | null
          all_categories: string[] | null
          average_rating: number | null
          category: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          establishment_id: string | null
          id: string | null
          is_public: boolean | null
          location_details: Json | null
          main_image: string | null
          name: string | null
          owner_id: string | null
          phone: string | null
          secondary_categories: string[] | null
          service_type: string | null
          slug: string | null
          total_reviews: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          all_categories?: never
          average_rating?: number | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          establishment_id?: string | null
          id?: string | null
          is_public?: boolean | null
          location_details?: Json | null
          main_image?: string | null
          name?: string | null
          owner_id?: string | null
          phone?: string | null
          secondary_categories?: string[] | null
          service_type?: string | null
          slug?: string | null
          total_reviews?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          all_categories?: never
          average_rating?: number | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          establishment_id?: string | null
          id?: string | null
          is_public?: boolean | null
          location_details?: Json | null
          main_image?: string | null
          name?: string | null
          owner_id?: string | null
          phone?: string | null
          secondary_categories?: string[] | null
          service_type?: string | null
          slug?: string | null
          total_reviews?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_early_arrival_request: {
        Args: {
          p_appointment_id: string
          p_business_id: string
          p_staff_id?: string
        }
        Returns: {
          error: string
          request_id: string
          success: boolean
        }[]
      }
      ensure_notification_settings: {
        Args: { business_uuid: string }
        Returns: string
      }
      expire_old_reviews: { Args: never; Returns: undefined }
      get_businesses_with_category: {
        Args: { category_id: string }
        Returns: {
          all_categories: string[]
          business_name: string
          id: string
          primary_category: string
          secondary_categories: string[]
        }[]
      }
      get_user_business_id: { Args: never; Returns: string }
      get_user_establishment_id: {
        Args: { _user_id?: string }
        Returns: string
      }
      get_user_notifications: {
        Args: { p_limit?: number }
        Returns: {
          appointment_id: string
          business_id: string
          created_at: string
          id: string
          message: string
          meta: Json
          read: boolean
          title: string
          type: string
          user_id: string
        }[]
      }
      get_user_role: { Args: { _user_id?: string }; Returns: string }
      hash_password: { Args: { password: string }; Returns: string }
      invite_client_early: {
        Args: {
          p_appointment_id: string
          p_business_id: string
          p_staff_id: string
        }
        Returns: Json
      }
      is_admin_or_staff: { Args: { _user_id?: string }; Returns: boolean }
      is_partner_viewing_client_profile: {
        Args: { client_profile_id: string }
        Returns: boolean
      }
      is_partner_viewing_client_profile_from_appointments: {
        Args: { client_profile_id: string }
        Returns: boolean
      }
      respond_to_early_arrival_request: {
        Args: { p_request_id: string; p_response: string }
        Returns: {
          error: string
          success: boolean
        }[]
      }
      search_businesses_by_category: {
        Args: { category_search: string }
        Returns: {
          address: string
          all_categories: string[]
          average_rating: number
          category: string
          cover_image_url: string
          created_at: string
          description: string
          establishment_id: string
          id: string
          is_public: boolean
          location_details: Json
          main_image: string
          name: string
          owner_id: string
          phone: string
          secondary_categories: string[]
          service_type: string
          slug: string
          total_reviews: number
          updated_at: string
          website: string
        }[]
      }
      verify_password: {
        Args: { hash: string; password: string }
        Returns: boolean
      }
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
