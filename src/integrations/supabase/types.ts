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
      call_signals: {
        Row: {
          call_type: string
          caller_id: string
          created_at: string
          id: string
          receiver_id: string
          signal_data: Json | null
          signal_type: string
        }
        Insert: {
          call_type?: string
          caller_id: string
          created_at?: string
          id?: string
          receiver_id: string
          signal_data?: Json | null
          signal_type: string
        }
        Update: {
          call_type?: string
          caller_id?: string
          created_at?: string
          id?: string
          receiver_id?: string
          signal_data?: Json | null
          signal_type?: string
        }
        Relationships: []
      }
      connection_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          intent_message: string | null
          owner_user_id: string
          relationship_type: string
          status: string
          token: string
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          intent_message?: string | null
          owner_user_id: string
          relationship_type: string
          status?: string
          token: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          intent_message?: string | null
          owner_user_id?: string
          relationship_type?: string
          status?: string
          token?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: []
      }
      connections: {
        Row: {
          category: string
          connected_at: string
          connected_user_id: string
          id: string
          is_active: boolean
          removed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          category: string
          connected_at?: string
          connected_user_id: string
          id?: string
          is_active?: boolean
          removed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          category?: string
          connected_at?: string
          connected_user_id?: string
          id?: string
          is_active?: boolean
          removed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      profile_bio_history: {
        Row: {
          changed_at: string
          field_name: string
          id: string
          new_value: string
          old_value: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          field_name: string
          id?: string
          new_value: string
          old_value: string
          user_id: string
        }
        Update: {
          changed_at?: string
          field_name?: string
          id?: string
          new_value?: string
          old_value?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_timed_photos: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string
          duration_type: string
          expires_at: string
          id: string
          location: string | null
          mood: string[] | null
          photo_url: string
          privacy: string | null
          storage_path: string
          tags: string[] | null
          title: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string
          duration_type: string
          expires_at: string
          id?: string
          location?: string | null
          mood?: string[] | null
          photo_url: string
          privacy?: string | null
          storage_path: string
          tags?: string[] | null
          title?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string
          duration_type?: string
          expires_at?: string
          id?: string
          location?: string | null
          mood?: string[] | null
          photo_url?: string
          privacy?: string | null
          storage_path?: string
          tags?: string[] | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio_what_i_am_doing: string | null
          bio_who_i_am: string | null
          bio_who_was_i: string | null
          bio_who_will_i_be: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string
          gender: string | null
          id: string
          phone: string | null
          pincode: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio_what_i_am_doing?: string | null
          bio_who_i_am?: string | null
          bio_who_was_i?: string | null
          bio_who_will_i_be?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio_what_i_am_doing?: string | null
          bio_who_i_am?: string | null
          bio_who_was_i?: string | null
          bio_who_will_i_be?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
