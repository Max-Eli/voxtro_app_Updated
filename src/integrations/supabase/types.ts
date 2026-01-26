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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      action_execution_logs: {
        Row: {
          chatbot_action_id: string
          conversation_id: string | null
          error_message: string | null
          executed_at: string
          id: string
          input_data: Json | null
          output_data: Json | null
          status: string
        }
        Insert: {
          chatbot_action_id: string
          conversation_id?: string | null
          error_message?: string | null
          executed_at?: string
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          status?: string
        }
        Update: {
          chatbot_action_id?: string
          conversation_id?: string | null
          error_message?: string | null
          executed_at?: string
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_execution_logs_chatbot_action_id_fkey"
            columns: ["chatbot_action_id"]
            isOneToOne: false
            referencedRelation: "chatbot_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_execution_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_settings: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      changelog_entries: {
        Row: {
          change_type: string
          created_at: string
          description: string | null
          entity_id: string
          entity_type: string
          id: string
          new_values: Json | null
          previous_values: Json | null
          source: string
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          change_type: string
          created_at?: string
          description?: string | null
          entity_id: string
          entity_type: string
          id?: string
          new_values?: Json | null
          previous_values?: Json | null
          source?: string
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          change_type?: string
          created_at?: string
          description?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          new_values?: Json | null
          previous_values?: Json | null
          source?: string
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      changelog_notes: {
        Row: {
          changelog_entry_id: string
          created_at: string
          id: string
          note: string
          user_id: string
        }
        Insert: {
          changelog_entry_id: string
          created_at?: string
          id?: string
          note: string
          user_id: string
        }
        Update: {
          changelog_entry_id?: string
          created_at?: string
          id?: string
          note?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "changelog_notes_changelog_entry_id_fkey"
            columns: ["changelog_entry_id"]
            isOneToOne: false
            referencedRelation: "changelog_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_actions: {
        Row: {
          action_type: string
          chatbot_id: string
          configuration: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          action_type: string
          chatbot_id: string
          configuration?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          chatbot_id?: string
          configuration?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_actions_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_custom_parameters: {
        Row: {
          chatbot_id: string
          created_at: string
          extraction_rules: Json
          id: string
          is_required: boolean
          parameter_name: string
          parameter_type: string
          updated_at: string
          validation_rules: Json | null
        }
        Insert: {
          chatbot_id: string
          created_at?: string
          extraction_rules?: Json
          id?: string
          is_required?: boolean
          parameter_name: string
          parameter_type?: string
          updated_at?: string
          validation_rules?: Json | null
        }
        Update: {
          chatbot_id?: string
          created_at?: string
          extraction_rules?: Json
          id?: string
          is_required?: boolean
          parameter_name?: string
          parameter_type?: string
          updated_at?: string
          validation_rules?: Json | null
        }
        Relationships: []
      }
      chatbot_faqs: {
        Row: {
          answer: string | null
          chatbot_id: string
          created_at: string
          id: string
          is_active: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer?: string | null
          chatbot_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string | null
          chatbot_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_faqs_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_forms: {
        Row: {
          chatbot_id: string
          created_at: string
          email_subject: string | null
          fields: Json
          form_description: string | null
          form_name: string
          form_title: string
          id: string
          is_active: boolean
          notification_email: string | null
          notify_email: boolean
          require_terms_acceptance: boolean
          success_message: string | null
          terms_and_conditions: string | null
          trigger_keywords: string[] | null
          updated_at: string
          webhook_enabled: boolean
          webhook_url: string | null
        }
        Insert: {
          chatbot_id: string
          created_at?: string
          email_subject?: string | null
          fields?: Json
          form_description?: string | null
          form_name: string
          form_title: string
          id?: string
          is_active?: boolean
          notification_email?: string | null
          notify_email?: boolean
          require_terms_acceptance?: boolean
          success_message?: string | null
          terms_and_conditions?: string | null
          trigger_keywords?: string[] | null
          updated_at?: string
          webhook_enabled?: boolean
          webhook_url?: string | null
        }
        Update: {
          chatbot_id?: string
          created_at?: string
          email_subject?: string | null
          fields?: Json
          form_description?: string | null
          form_name?: string
          form_title?: string
          id?: string
          is_active?: boolean
          notification_email?: string | null
          notify_email?: boolean
          require_terms_acceptance?: boolean
          success_message?: string | null
          terms_and_conditions?: string | null
          trigger_keywords?: string[] | null
          updated_at?: string
          webhook_enabled?: boolean
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_forms_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbots: {
        Row: {
          cache_duration_hours: number | null
          cache_enabled: boolean | null
          crawl_status: string | null
          created_at: string
          daily_token_limit: number | null
          description: string | null
          email_condition_parameters: Json | null
          email_conditions: Json | null
          email_template: string | null
          embed_code: string | null
          end_chat_notification_email: string | null
          end_chat_notification_enabled: boolean | null
          hide_branding: boolean
          id: string
          inline_embed_code: string | null
          is_active: boolean
          last_crawled_at: string | null
          max_tokens: number | null
          model: string
          monthly_token_limit: number | null
          name: string
          session_timeout_minutes: number
          system_prompt: string
          temperature: number
          theme_color: string | null
          theme_color_type: string | null
          theme_gradient_angle: number | null
          theme_gradient_end: string | null
          theme_gradient_start: string | null
          updated_at: string
          user_id: string
          website_content: string | null
          website_url: string | null
          welcome_message: string | null
          widget_border_radius: string | null
          widget_button_color: string | null
          widget_button_text: string | null
          widget_custom_css: string | null
          widget_form_buttons: Json | null
          widget_form_buttons_layout: string | null
          widget_fullscreen: string | null
          widget_overlay_color: string | null
          widget_overlay_opacity: string | null
          widget_position: string | null
          widget_size: string | null
          widget_text_color: string | null
          team_org_id: string | null
        }
        Insert: {
          cache_duration_hours?: number | null
          cache_enabled?: boolean | null
          crawl_status?: string | null
          created_at?: string
          daily_token_limit?: number | null
          description?: string | null
          email_condition_parameters?: Json | null
          email_conditions?: Json | null
          email_template?: string | null
          embed_code?: string | null
          end_chat_notification_email?: string | null
          end_chat_notification_enabled?: boolean | null
          hide_branding?: boolean
          id?: string
          inline_embed_code?: string | null
          is_active?: boolean
          last_crawled_at?: string | null
          max_tokens?: number | null
          model?: string
          monthly_token_limit?: number | null
          name: string
          session_timeout_minutes?: number
          system_prompt?: string
          temperature?: number
          theme_color?: string | null
          theme_color_type?: string | null
          theme_gradient_angle?: number | null
          theme_gradient_end?: string | null
          theme_gradient_start?: string | null
          updated_at?: string
          user_id: string
          website_content?: string | null
          website_url?: string | null
          welcome_message?: string | null
          widget_border_radius?: string | null
          widget_button_color?: string | null
          widget_button_text?: string | null
          widget_custom_css?: string | null
          widget_form_buttons?: Json | null
          widget_form_buttons_layout?: string | null
          widget_fullscreen?: string | null
          widget_overlay_color?: string | null
          widget_overlay_opacity?: string | null
          widget_position?: string | null
          widget_size?: string | null
          widget_text_color?: string | null
          team_org_id?: string | null
        }
        Update: {
          cache_duration_hours?: number | null
          cache_enabled?: boolean | null
          crawl_status?: string | null
          created_at?: string
          daily_token_limit?: number | null
          description?: string | null
          email_condition_parameters?: Json | null
          email_conditions?: Json | null
          email_template?: string | null
          embed_code?: string | null
          end_chat_notification_email?: string | null
          end_chat_notification_enabled?: boolean | null
          hide_branding?: boolean
          id?: string
          inline_embed_code?: string | null
          is_active?: boolean
          last_crawled_at?: string | null
          max_tokens?: number | null
          model?: string
          monthly_token_limit?: number | null
          name?: string
          session_timeout_minutes?: number
          system_prompt?: string
          temperature?: number
          theme_color?: string | null
          theme_color_type?: string | null
          theme_gradient_angle?: number | null
          theme_gradient_end?: string | null
          theme_gradient_start?: string | null
          updated_at?: string
          user_id?: string
          website_content?: string | null
          website_url?: string | null
          welcome_message?: string | null
          widget_border_radius?: string | null
          widget_button_color?: string | null
          widget_button_text?: string | null
          widget_custom_css?: string | null
          widget_form_buttons?: Json | null
          widget_form_buttons_layout?: string | null
          widget_fullscreen?: string | null
          widget_overlay_color?: string | null
          widget_overlay_opacity?: string | null
          widget_position?: string | null
          widget_size?: string | null
          widget_text_color?: string | null
          team_org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbots_team_org_id_fkey"
            columns: ["team_org_id"]
            isOneToOne: false
            referencedRelation: "team_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_parameters: {
        Row: {
          conversation_id: string
          extracted_at: string
          id: string
          parameter_name: string
          parameter_value: string | null
        }
        Insert: {
          conversation_id: string
          extracted_at?: string
          id?: string
          parameter_name: string
          parameter_value?: string | null
        }
        Update: {
          conversation_id?: string
          extracted_at?: string
          id?: string
          parameter_name?: string
          parameter_value?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          chatbot_id: string
          created_at: string
          ended_at: string | null
          id: string
          lead_analyzed_at: string | null
          status: string
          visitor_id: string | null
        }
        Insert: {
          chatbot_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          lead_analyzed_at?: string | null
          status?: string
          visitor_id?: string | null
        }
        Update: {
          chatbot_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          lead_analyzed_at?: string | null
          status?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_assistant_assignments: {
        Row: {
          assigned_by: string
          assistant_id: string
          created_at: string
          customer_id: string
          id: string
        }
        Insert: {
          assigned_by: string
          assistant_id: string
          created_at?: string
          customer_id: string
          id?: string
        }
        Update: {
          assigned_by?: string
          assistant_id?: string
          created_at?: string
          customer_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_assistant_assignments_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "voice_assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_assistant_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_chatbot_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          chatbot_id: string
          customer_id: string
          id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          chatbot_id: string
          customer_id: string
          id?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          chatbot_id?: string
          customer_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_chatbot_assignments_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_chatbot_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_whatsapp_agent_assignments: {
        Row: {
          agent_id: string
          assigned_by: string
          created_at: string
          customer_id: string
          id: string
        }
        Insert: {
          agent_id: string
          assigned_by: string
          created_at?: string
          customer_id: string
          id?: string
        }
        Update: {
          agent_id?: string
          assigned_by?: string
          created_at?: string
          customer_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_whatsapp_agent_assignments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_whatsapp_agent_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          company_name: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          last_login: string | null
          updated_at: string
          weekly_summary_enabled: boolean
          team_org_id: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          last_login?: string | null
          updated_at?: string
          weekly_summary_enabled?: boolean
          team_org_id?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_login?: string | null
          updated_at?: string
          weekly_summary_enabled?: boolean
          team_org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_team_org_id_fkey"
            columns: ["team_org_id"]
            isOneToOne: false
            referencedRelation: "team_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      elevenlabs_connections: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          org_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          org_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          org_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          conversation_id: string | null
          form_id: string
          id: string
          status: string
          submitted_at: string
          submitted_data: Json
          visitor_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          form_id: string
          id?: string
          status?: string
          submitted_at?: string
          submitted_data?: Json
          visitor_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          form_id?: string
          id?: string
          status?: string
          submitted_at?: string
          submitted_data?: Json
          visitor_id?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          additional_data: Json | null
          conversation_id: string
          created_at: string
          email: string | null
          extracted_at: string
          id: string
          name: string | null
          phone_number: string | null
          source_id: string
          source_name: string | null
          source_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          additional_data?: Json | null
          conversation_id: string
          created_at?: string
          email?: string | null
          extracted_at?: string
          id?: string
          name?: string | null
          phone_number?: string | null
          source_id: string
          source_name?: string | null
          source_type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          additional_data?: Json | null
          conversation_id?: string
          created_at?: string
          email?: string | null
          extracted_at?: string
          id?: string
          name?: string | null
          phone_number?: string | null
          source_id?: string
          source_name?: string | null
          source_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          chat_ended: boolean
          chat_error: boolean
          chat_started: boolean
          created_at: string
          id: string
          notification_email: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_ended?: boolean
          chat_error?: boolean
          chat_started?: boolean
          created_at?: string
          id?: string
          notification_email?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_ended?: boolean
          chat_error?: boolean
          chat_started?: boolean
          created_at?: string
          id?: string
          notification_email?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          provider: string
          refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          provider: string
          refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      response_cache: {
        Row: {
          chatbot_id: string
          created_at: string
          expires_at: string
          hit_count: number | null
          id: string
          input_tokens: number | null
          model_used: string
          output_tokens: number | null
          question_hash: string
          question_text: string
          response_text: string
          updated_at: string
        }
        Insert: {
          chatbot_id: string
          created_at?: string
          expires_at?: string
          hit_count?: number | null
          id?: string
          input_tokens?: number | null
          model_used: string
          output_tokens?: number | null
          question_hash: string
          question_text: string
          response_text: string
          updated_at?: string
        }
        Update: {
          chatbot_id?: string
          created_at?: string
          expires_at?: string
          hit_count?: number | null
          id?: string
          input_tokens?: number | null
          model_used?: string
          output_tokens?: number | null
          question_hash?: string
          question_text?: string
          response_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "response_cache_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_name: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_name: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_name?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          chatbot_id: string | null
          created_at: string
          customer_email: string
          customer_id: string | null
          customer_name: string
          description: string
          id: string
          priority: string
          source: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
          team_org_id: string | null
        }
        Insert: {
          chatbot_id?: string | null
          created_at?: string
          customer_email: string
          customer_id?: string | null
          customer_name: string
          description: string
          id?: string
          priority?: string
          source?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
          team_org_id?: string | null
        }
        Update: {
          chatbot_id?: string | null
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          description?: string
          id?: string
          priority?: string
          source?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
          team_org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      token_usage: {
        Row: {
          cache_hit: boolean | null
          chatbot_id: string
          conversation_id: string | null
          created_at: string
          id: string
          input_tokens: number
          model_used: string
          output_tokens: number
          total_cost: number | null
        }
        Insert: {
          cache_hit?: boolean | null
          chatbot_id: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          input_tokens?: number
          model_used: string
          output_tokens?: number
          total_cost?: number | null
        }
        Update: {
          cache_hit?: boolean | null
          chatbot_id?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          input_tokens?: number
          model_used?: string
          output_tokens?: number
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "token_usage_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_usage_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_assistant_calls: {
        Row: {
          assistant_id: string
          call_type: string | null
          created_at: string
          customer_id: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          lead_analyzed_at: string | null
          phone_number: string | null
          started_at: string
          status: string
        }
        Insert: {
          assistant_id: string
          call_type?: string | null
          created_at?: string
          customer_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          lead_analyzed_at?: string | null
          phone_number?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          assistant_id?: string
          call_type?: string | null
          created_at?: string
          customer_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          lead_analyzed_at?: string | null
          phone_number?: string | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_assistant_calls_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_assistant_recordings: {
        Row: {
          call_id: string
          created_at: string
          duration_seconds: number | null
          file_size_bytes: number | null
          id: string
          recording_url: string
        }
        Insert: {
          call_id: string
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          recording_url: string
        }
        Update: {
          call_id?: string
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          recording_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_assistant_recordings_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "voice_assistant_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_assistant_tasks: {
        Row: {
          assistant_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          org_id: string | null
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
          team_org_id: string | null
          is_team_shared: boolean
        }
        Insert: {
          assistant_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          org_id?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          team_org_id?: string | null
          is_team_shared?: boolean
        }
        Update: {
          assistant_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          org_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          team_org_id?: string | null
          is_team_shared?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "voice_assistant_tasks_team_org_id_fkey"
            columns: ["team_org_id"]
            isOneToOne: false
            referencedRelation: "team_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_assistant_transcripts: {
        Row: {
          call_id: string
          content: string
          created_at: string
          id: string
          role: string
          timestamp: string
        }
        Insert: {
          call_id: string
          content: string
          created_at?: string
          id?: string
          role: string
          timestamp?: string
        }
        Update: {
          call_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_assistant_transcripts_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "voice_assistant_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_assistants: {
        Row: {
          created_at: string
          first_message: string | null
          id: string
          model: string | null
          model_provider: string | null
          name: string | null
          org_id: string | null
          phone_number: string | null
          transcriber_provider: string | null
          updated_at: string
          user_id: string
          voice_id: string | null
          voice_provider: string | null
          team_org_id: string | null
        }
        Insert: {
          created_at?: string
          first_message?: string | null
          id: string
          model?: string | null
          model_provider?: string | null
          name?: string | null
          org_id?: string | null
          phone_number?: string | null
          transcriber_provider?: string | null
          updated_at?: string
          user_id: string
          voice_id?: string | null
          voice_provider?: string | null
          team_org_id?: string | null
        }
        Update: {
          created_at?: string
          first_message?: string | null
          id?: string
          model?: string | null
          model_provider?: string | null
          name?: string | null
          org_id?: string | null
          phone_number?: string | null
          transcriber_provider?: string | null
          updated_at?: string
          user_id?: string
          voice_id?: string | null
          voice_provider?: string | null
          team_org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_assistants_team_org_id_fkey"
            columns: ["team_org_id"]
            isOneToOne: false
            referencedRelation: "team_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_connections: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          org_id: string | null
          org_name: string | null
          public_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          org_id?: string | null
          org_name?: string | null
          public_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          org_id?: string | null
          org_name?: string | null
          public_key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_agents: {
        Row: {
          created_at: string
          id: string
          name: string | null
          phone_number: string | null
          status: string | null
          updated_at: string
          user_id: string
          team_org_id: string | null
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
          phone_number?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          team_org_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          phone_number?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          team_org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_agents_team_org_id_fkey"
            columns: ["team_org_id"]
            isOneToOne: false
            referencedRelation: "team_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          agent_id: string
          created_at: string
          customer_id: string | null
          ended_at: string | null
          id: string
          lead_analyzed_at: string | null
          phone_number: string | null
          sentiment: string | null
          started_at: string
          status: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          customer_id?: string | null
          ended_at?: string | null
          id: string
          lead_analyzed_at?: string | null
          phone_number?: string | null
          sentiment?: string | null
          started_at?: string
          status?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          customer_id?: string | null
          ended_at?: string | null
          id?: string
          lead_analyzed_at?: string | null
          phone_number?: string | null
          sentiment?: string | null
          started_at?: string
          status?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string
          conversation_id: string
          id: string
          metadata: Json | null
          role: string
          timestamp: string
        }
        Insert: {
          content: string
          conversation_id: string
          id: string
          metadata?: Json | null
          role: string
          timestamp?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          id?: string
          metadata?: Json | null
          role?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_organizations: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          team_org_id: string
          user_id: string
          role: "owner" | "teammate"
          invited_by: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          team_org_id: string
          user_id: string
          role?: "owner" | "teammate"
          invited_by?: string | null
          joined_at?: string
        }
        Update: {
          id?: string
          team_org_id?: string
          user_id?: string
          role?: "owner" | "teammate"
          invited_by?: string | null
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_org_id_fkey"
            columns: ["team_org_id"]
            isOneToOne: false
            referencedRelation: "team_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          id: string
          team_org_id: string
          email: string
          invited_by: string
          token: string
          status: "pending" | "accepted" | "expired" | "cancelled"
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          team_org_id: string
          email: string
          invited_by: string
          token?: string
          status?: "pending" | "accepted" | "expired" | "cancelled"
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          team_org_id?: string
          email?: string
          invited_by?: string
          token?: string
          status?: "pending" | "accepted" | "expired" | "cancelled"
          expires_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_org_id_fkey"
            columns: ["team_org_id"]
            isOneToOne: false
            referencedRelation: "team_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_customer_has_chatbot: {
        Args: { chatbot_id: string }
        Returns: boolean
      }
      customer_has_user_chatbot: {
        Args: { customer_id: string }
        Returns: boolean
      }
      get_current_customer_id: { Args: never; Returns: string }
      get_current_customer_id_secure: { Args: never; Returns: string }
      user_owns_chatbot: { Args: { chatbot_id: string }; Returns: boolean }
      is_team_member: { Args: { org_id: string }; Returns: boolean }
      is_team_owner: { Args: { org_id: string }; Returns: boolean }
      get_user_team_org_ids: { Args: Record<PropertyKey, never>; Returns: string[] }
      accept_team_invitation: { Args: { invitation_token: string }; Returns: Json }
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
