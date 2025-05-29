export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      characters: {
        Row: {
          background: string
          created_at: string | null
          description: string
          id: string
          name: string
          outfit: string
          story_id: string
        }
        Insert: {
          background: string
          created_at?: string | null
          description: string
          id?: string
          name: string
          outfit: string
          story_id: string
        }
        Update: {
          background?: string
          created_at?: string | null
          description?: string
          id?: string
          name?: string
          outfit?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      clues: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_for_murderer: boolean | null
          round_number: number
          story_id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_for_murderer?: boolean | null
          round_number: number
          story_id: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_for_murderer?: boolean | null
          round_number?: number
          story_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "clues_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      game_players: {
        Row: {
          character_id: string
          id: string
          is_alive: boolean | null
          joined_at: string | null
          role: Database["public"]["Enums"]["player_role"]
          session_id: string
          user_id: string
        }
        Insert: {
          character_id: string
          id?: string
          is_alive?: boolean | null
          joined_at?: string | null
          role: Database["public"]["Enums"]["player_role"]
          session_id: string
          user_id: string
        }
        Update: {
          character_id?: string
          id?: string
          is_alive?: boolean | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["player_role"]
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_players_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          created_at: string | null
          current_round: number
          host_id: string
          id: string
          max_rounds: number
          password: string | null
          session_code: string
          status: Database["public"]["Enums"]["game_status"]
          story_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_round?: number
          host_id: string
          id?: string
          max_rounds?: number
          password?: string | null
          session_code: string
          status?: Database["public"]["Enums"]["game_status"]
          story_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_round?: number
          host_id?: string
          id?: string
          max_rounds?: number
          password?: string | null
          session_code?: string
          status?: Database["public"]["Enums"]["game_status"]
          story_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id: string
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          created_at: string | null
          description: string
          id: string
          max_players: number
          min_players: number
          setting: string
          title: string
          total_rounds: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          max_players?: number
          min_players?: number
          setting: string
          title: string
          total_rounds?: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          max_players?: number
          min_players?: number
          setting?: string
          title?: string
          total_rounds?: number
        }
        Relationships: []
      }
      votes: {
        Row: {
          accused_id: string
          created_at: string | null
          id: string
          session_id: string
          voter_id: string
        }
        Insert: {
          accused_id: string
          created_at?: string | null
          id?: string
          session_id: string
          voter_id: string
        }
        Update: {
          accused_id?: string
          created_at?: string | null
          id?: string
          session_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_session_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      game_status: "waiting" | "in_progress" | "voting" | "completed"
      player_role: "detective" | "murderer"
      round_type: "clue" | "voting" | "reveal"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      game_status: ["waiting", "in_progress", "voting", "completed"],
      player_role: ["detective", "murderer"],
      round_type: ["clue", "voting", "reveal"],
    },
  },
} as const
