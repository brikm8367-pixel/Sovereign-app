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
      blocked_content_log: {
        Row: {
          content_preview: string | null
          created_at: string
          id: string
          reason: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content_preview?: string | null
          created_at?: string
          id?: string
          reason: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          content_preview?: string | null
          created_at?: string
          id?: string
          reason?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      call_history: {
        Row: {
          call_type: string
          caller_id: string
          created_at: string
          duration: number | null
          id: string
          receiver_id: string
          status: string
        }
        Insert: {
          call_type?: string
          caller_id: string
          created_at?: string
          duration?: number | null
          id?: string
          receiver_id: string
          status?: string
        }
        Update: {
          call_type?: string
          caller_id?: string
          created_at?: string
          duration?: number | null
          id?: string
          receiver_id?: string
          status?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      deal_cards: {
        Row: {
          budget_range: string | null
          celebrity_id: string
          created_at: string
          deal_type: string
          details: string | null
          golden_hour: boolean
          golden_hour_expires_at: string | null
          id: string
          message_id: string | null
          sender_id: string
          status: Database["public"]["Enums"]["deal_status"]
          timeline: string | null
          updated_at: string
        }
        Insert: {
          budget_range?: string | null
          celebrity_id: string
          created_at?: string
          deal_type: string
          details?: string | null
          golden_hour?: boolean
          golden_hour_expires_at?: string | null
          id?: string
          message_id?: string | null
          sender_id: string
          status?: Database["public"]["Enums"]["deal_status"]
          timeline?: string | null
          updated_at?: string
        }
        Update: {
          budget_range?: string | null
          celebrity_id?: string
          created_at?: string
          deal_type?: string
          details?: string | null
          golden_hour?: boolean
          golden_hour_expires_at?: string | null
          id?: string
          message_id?: string | null
          sender_id?: string
          status?: Database["public"]["Enums"]["deal_status"]
          timeline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_cards_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_messages: {
        Row: {
          created_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deleted_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      device_keys: {
        Row: {
          created_at: string
          device_id: string
          id: string
          last_seen: string
          public_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          last_seen?: string
          public_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          last_seen?: string
          public_key?: string
          user_id?: string
        }
        Relationships: []
      }
      direct_access: {
        Row: {
          allowed_user_id: string
          created_at: string
          id: string
          owner_id: string
        }
        Insert: {
          allowed_user_id: string
          created_at?: string
          id?: string
          owner_id: string
        }
        Update: {
          allowed_user_id?: string
          created_at?: string
          id?: string
          owner_id?: string
        }
        Relationships: []
      }
      fan_group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fan_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "fan_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_group_messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fan_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "fan_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_groups: {
        Row: {
          allow_member_posts: boolean
          celebrity_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          messages_per_hour: number
          name: string
          slug: string
          topic_of_day: string | null
          updated_at: string
        }
        Insert: {
          allow_member_posts?: boolean
          celebrity_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          messages_per_hour?: number
          name: string
          slug: string
          topic_of_day?: string | null
          updated_at?: string
        }
        Update: {
          allow_member_posts?: boolean
          celebrity_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          messages_per_hour?: number
          name?: string
          slug?: string
          topic_of_day?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      feature_entitlements: {
        Row: {
          created_at: string
          expires_at: string | null
          feature: string
          granted: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          feature: string
          granted?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          feature?: string
          granted?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      manager_activity_log: {
        Row: {
          action: string
          celebrity_id: string
          created_at: string
          detail: string | null
          id: string
          manager_id: string
        }
        Insert: {
          action: string
          celebrity_id: string
          created_at?: string
          detail?: string | null
          id?: string
          manager_id: string
        }
        Update: {
          action?: string
          celebrity_id?: string
          created_at?: string
          detail?: string | null
          id?: string
          manager_id?: string
        }
        Relationships: []
      }
      manager_invitations: {
        Row: {
          celebrity_id: string
          code: string
          created_at: string
          expires_at: string
          failed_attempts: number
          id: string
          status: string
          token: string
          updated_at: string
          used_by: string | null
        }
        Insert: {
          celebrity_id: string
          code: string
          created_at?: string
          expires_at?: string
          failed_attempts?: number
          id?: string
          status?: string
          token: string
          updated_at?: string
          used_by?: string | null
        }
        Update: {
          celebrity_id?: string
          code?: string
          created_at?: string
          expires_at?: string
          failed_attempts?: number
          id?: string
          status?: string
          token?: string
          updated_at?: string
          used_by?: string | null
        }
        Relationships: []
      }
      manager_links: {
        Row: {
          celebrity_id: string
          created_at: string
          id: string
          manager_id: string
          status: string
          updated_at: string
        }
        Insert: {
          celebrity_id: string
          created_at?: string
          id?: string
          manager_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          celebrity_id?: string
          created_at?: string
          id?: string
          manager_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_limits: {
        Row: {
          category: Database["public"]["Enums"]["message_category"]
          id: string
          inbox_mode: string
          max_messages: number | null
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["message_category"]
          id?: string
          inbox_mode?: string
          max_messages?: number | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["message_category"]
          id?: string
          inbox_mode?: string
          max_messages?: number | null
          user_id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          category: Database["public"]["Enums"]["message_category"]
          content: string
          created_at: string
          edited_at: string | null
          expires_at: string | null
          id: string
          is_edited: boolean | null
          is_important: boolean | null
          is_read: boolean | null
          is_sealed: boolean | null
          media_type: string | null
          media_url: string | null
          parent_id: string | null
          receiver_id: string
          sender_id: string
          subject: string | null
          updated_at: string
          voice_url: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["message_category"]
          content: string
          created_at?: string
          edited_at?: string | null
          expires_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_important?: boolean | null
          is_read?: boolean | null
          is_sealed?: boolean | null
          media_type?: string | null
          media_url?: string | null
          parent_id?: string | null
          receiver_id: string
          sender_id: string
          subject?: string | null
          updated_at?: string
          voice_url?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["message_category"]
          content?: string
          created_at?: string
          edited_at?: string | null
          expires_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_important?: boolean | null
          is_read?: boolean | null
          is_sealed?: boolean | null
          media_type?: string | null
          media_url?: string | null
          parent_id?: string | null
          receiver_id?: string
          sender_id?: string
          subject?: string | null
          updated_at?: string
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string
          is_public: boolean | null
          public_key: string | null
          referral_code: string | null
          referred_by: string | null
          slug: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          is_public?: boolean | null
          public_key?: string | null
          referral_code?: string | null
          referred_by?: string | null
          slug?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_public?: boolean | null
          public_key?: string | null
          referral_code?: string | null
          referred_by?: string | null
          slug?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recipient_filters: {
        Row: {
          created_at: string
          filter_type: string
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          filter_type: string
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          filter_type?: string
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          invite_code: string
          invitee_id: string | null
          inviter_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          invite_code: string
          invitee_id?: string | null
          inviter_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          invite_code?: string
          invitee_id?: string | null
          inviter_id?: string
          status?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          message_id: string | null
          reason: string
          reported_id: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          message_id?: string | null
          reason: string
          reported_id: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          message_id?: string | null
          reason?: string
          reported_id?: string
          reporter_id?: string
          status?: string
        }
        Relationships: []
      }
      reserved_slugs: {
        Row: {
          slug: string
        }
        Insert: {
          slug: string
        }
        Update: {
          slug?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      active_manager_of: {
        Args: { _celebrity: string; _manager: string }
        Returns: boolean
      }
      can_receive_message: {
        Args: {
          _category: Database["public"]["Enums"]["message_category"]
          _user_id: string
        }
        Returns: boolean
      }
      can_send_to_direct: {
        Args: { _receiver_id: string; _sender_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: { _action: string; _max_per_minute?: number; _user_id: string }
        Returns: boolean
      }
      cleanup_expired_messages: { Args: never; Returns: undefined }
      complete_referral: {
        Args: { _invite_code: string; _invitee_id: string }
        Returns: boolean
      }
      create_fan_group: {
        Args: {
          _allow_member_posts?: boolean
          _description?: string
          _messages_per_hour?: number
          _name: string
        }
        Returns: {
          allow_member_posts: boolean
          celebrity_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          messages_per_hour: number
          name: string
          slug: string
          topic_of_day: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "fan_groups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_user_data: { Args: { _user_id: string }; Returns: undefined }
      gen_unique_group_slug: { Args: never; Returns: string }
      gen_unique_slug: { Args: never; Returns: string }
      get_message_count: {
        Args: {
          _category: Database["public"]["Enums"]["message_category"]
          _user_id: string
        }
        Returns: number
      }
      group_owner: { Args: { _group: string }; Returns: string }
      has_entitlement: {
        Args: { _feature: string; _uid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_celebrity: { Args: { _uid: string }; Returns: boolean }
      is_group_member: {
        Args: { _group: string; _uid: string }
        Returns: boolean
      }
      kill_switch_revoke_all: { Args: { _celebrity: string }; Returns: number }
      my_managed_celebrity: { Args: { _uid: string }; Returns: string }
      set_profile_slug: { Args: { _slug: string }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      validate_invitation: { Args: { _code: string }; Returns: string }
    }
    Enums: {
      account_type: "celebrity" | "sender"
      app_role: "admin" | "moderator" | "user"
      deal_status: "pending" | "accepted" | "declined" | "countered"
      message_category: "work" | "audience" | "direct"
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
    Enums: {
      account_type: ["celebrity", "sender"],
      app_role: ["admin", "moderator", "user"],
      deal_status: ["pending", "accepted", "declined", "countered"],
      message_category: ["work", "audience", "direct"],
    },
  },
} as const
