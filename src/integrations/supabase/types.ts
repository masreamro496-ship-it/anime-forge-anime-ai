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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          user_id?: string
        }
        Relationships: []
      }
      audio_clips: {
        Row: {
          audio_url: string
          created_at: string
          description: string
          download_cost: number
          duration_seconds: number | null
          id: string
          title: string
          uploader_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          description?: string
          download_cost?: number
          duration_seconds?: number | null
          id?: string
          title?: string
          uploader_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          description?: string
          download_cost?: number
          duration_seconds?: number | null
          id?: string
          title?: string
          uploader_id?: string
        }
        Relationships: []
      }
      audio_downloads: {
        Row: {
          clip_id: string
          cost: number
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          clip_id: string
          cost: number
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          clip_id?: string
          cost?: number
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_downloads_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "audio_clips"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      credits: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_gifts: {
        Row: {
          amount: number
          claimed_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          claimed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          claimed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      generation_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          credits_charged: number
          duration_seconds: number | null
          end_image_url: string | null
          id: string
          prompt: string
          provider: string | null
          provider_task_id: string | null
          result_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_image_url: string | null
          status: Database["public"]["Enums"]["gen_status"]
          type: Database["public"]["Enums"]["gen_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          credits_charged?: number
          duration_seconds?: number | null
          end_image_url?: string | null
          id?: string
          prompt: string
          provider?: string | null
          provider_task_id?: string | null
          result_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_image_url?: string | null
          status?: Database["public"]["Enums"]["gen_status"]
          type: Database["public"]["Enums"]["gen_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          credits_charged?: number
          duration_seconds?: number | null
          end_image_url?: string | null
          id?: string
          prompt?: string
          provider?: string | null
          provider_task_id?: string | null
          result_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_image_url?: string | null
          status?: Database["public"]["Enums"]["gen_status"]
          type?: Database["public"]["Enums"]["gen_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_payments: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          op_number: string
          receipt_url: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          op_number: string
          receipt_url: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          op_number?: string
          receipt_url?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pro_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          user_id: string
          uses_remaining: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
          uses_remaining?: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
          uses_remaining?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          earnings_usd: number
          id: string
          is_pro: boolean
          pro_expires_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          earnings_usd?: number
          id: string
          is_pro?: boolean
          pro_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          earnings_usd?: number
          id?: string
          is_pro?: boolean
          pro_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_purchases: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          buyer_id: string
          created_at: string
          id: string
          price_usd: number
          project_id: string
          seller_id: string
          status: Database["public"]["Enums"]["purchase_status"]
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          buyer_id: string
          created_at?: string
          id?: string
          price_usd: number
          project_id: string
          seller_id: string
          status?: Database["public"]["Enums"]["purchase_status"]
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          buyer_id?: string
          created_at?: string
          id?: string
          price_usd?: number
          project_id?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["purchase_status"]
        }
        Relationships: [
          {
            foreignKeyName: "project_purchases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "shorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_purchases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "shorts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      shorts: {
        Row: {
          comments_count: number
          created_at: string
          description: string
          duration_seconds: number | null
          id: string
          kind: string
          likes_count: number
          price_usd: number
          published_at: string | null
          scheduled_publish_at: string
          status: Database["public"]["Enums"]["short_status"]
          thumbnail_path: string | null
          title: string
          updated_at: string
          user_id: string
          video_path: string
          views_count: number
          vodafone_phone: string
        }
        Insert: {
          comments_count?: number
          created_at?: string
          description?: string
          duration_seconds?: number | null
          id?: string
          kind?: string
          likes_count?: number
          price_usd?: number
          published_at?: string | null
          scheduled_publish_at?: string
          status?: Database["public"]["Enums"]["short_status"]
          thumbnail_path?: string | null
          title?: string
          updated_at?: string
          user_id: string
          video_path: string
          views_count?: number
          vodafone_phone?: string
        }
        Update: {
          comments_count?: number
          created_at?: string
          description?: string
          duration_seconds?: number | null
          id?: string
          kind?: string
          likes_count?: number
          price_usd?: number
          published_at?: string | null
          scheduled_publish_at?: string
          status?: Database["public"]["Enums"]["short_status"]
          thumbnail_path?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_path?: string
          views_count?: number
          vodafone_phone?: string
        }
        Relationships: []
      }
      shorts_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          short_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          short_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          short_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shorts_comments_short_id_fkey"
            columns: ["short_id"]
            isOneToOne: false
            referencedRelation: "shorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shorts_comments_short_id_fkey"
            columns: ["short_id"]
            isOneToOne: false
            referencedRelation: "shorts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      shorts_likes: {
        Row: {
          created_at: string
          short_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          short_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          short_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shorts_likes_short_id_fkey"
            columns: ["short_id"]
            isOneToOne: false
            referencedRelation: "shorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shorts_likes_short_id_fkey"
            columns: ["short_id"]
            isOneToOne: false
            referencedRelation: "shorts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      shorts_views: {
        Row: {
          created_at: string
          short_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          short_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          short_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shorts_views_short_id_fkey"
            columns: ["short_id"]
            isOneToOne: false
            referencedRelation: "shorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shorts_views_short_id_fkey"
            columns: ["short_id"]
            isOneToOne: false
            referencedRelation: "shorts_public"
            referencedColumns: ["id"]
          },
        ]
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
      watermark_jobs: {
        Row: {
          cost: number
          created_at: string
          duration_seconds: number | null
          id: string
          processed_url: string
          source_url: string
          user_id: string
        }
        Insert: {
          cost?: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          processed_url: string
          source_url: string
          user_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          processed_url?: string
          source_url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      shorts_public: {
        Row: {
          comments_count: number | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          id: string | null
          likes_count: number | null
          price_usd: number | null
          published_at: string | null
          status: Database["public"]["Enums"]["short_status"] | null
          thumbnail_path: string | null
          title: string | null
          user_id: string | null
          views_count: number | null
        }
        Insert: {
          comments_count?: number | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string | null
          likes_count?: number | null
          price_usd?: number | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["short_status"] | null
          thumbnail_path?: string | null
          title?: string | null
          user_id?: string | null
          views_count?: number | null
        }
        Update: {
          comments_count?: number | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string | null
          likes_count?: number | null
          price_usd?: number | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["short_status"] | null
          thumbnail_path?: string | null
          title?: string | null
          user_id?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_grant_credits: {
        Args: { _amount: number; _note?: string; _target_user: string }
        Returns: undefined
      }
      approve_purchase: { Args: { _purchase_id: string }; Returns: undefined }
      can_view_project_video: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      claim_daily_gift: { Args: never; Returns: number }
      create_free_short: {
        Args: {
          _description: string
          _duration_seconds: number
          _thumbnail_path: string
          _title: string
          _video_path: string
        }
        Returns: string
      }
      create_project: {
        Args: {
          _description: string
          _duration_seconds: number
          _price_usd: number
          _thumbnail_path: string
          _title: string
          _video_path: string
          _vodafone_phone: string
        }
        Returns: string
      }
      generate_pro_code: { Args: never; Returns: string }
      get_project_video_path: { Args: { _project_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      promote_scheduled_shorts: { Args: never; Returns: undefined }
      purchase_audio_download: { Args: { _clip_id: string }; Returns: string }
      request_purchase: { Args: { _project_id: string }; Returns: string }
      spend_chat_credits: { Args: never; Returns: undefined }
      spend_watermark_credits: {
        Args: {
          _duration_seconds: number
          _processed_url: string
          _source_url: string
        }
        Returns: string
      }
      submit_novita_video: {
        Args: {
          _admin_notes: string
          _duration: number
          _end_image: string
          _prompt: string
          _provider_task_id: string
          _start_image: string
          _status: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "pro" | "user"
      gen_status:
        | "pending"
        | "in_review"
        | "completed"
        | "rejected"
        | "processing"
        | "failed"
      gen_type: "video" | "goku_voice"
      payment_status: "pending" | "approved" | "rejected"
      purchase_status: "pending" | "approved" | "rejected"
      short_status: "processing" | "test_queue" | "published" | "expired"
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
      app_role: ["admin", "moderator", "pro", "user"],
      gen_status: [
        "pending",
        "in_review",
        "completed",
        "rejected",
        "processing",
        "failed",
      ],
      gen_type: ["video", "goku_voice"],
      payment_status: ["pending", "approved", "rejected"],
      purchase_status: ["pending", "approved", "rejected"],
      short_status: ["processing", "test_queue", "published", "expired"],
    },
  },
} as const
