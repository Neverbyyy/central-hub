
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "export_runs": {
                  Row: {
                    "actor": string,"changes": NonNullable<Json>,"created_at": string,"id": number,"outcome": string,"pr_number": number | null,"pr_url": string | null,"revision": string,"set_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor": string,"changes"?: NonNullable<Json>,"created_at"?: string,"id"?: never,"outcome": string,"pr_number"?: number | null,"pr_url"?: string | null,"revision": string,"set_name": string
                  }
                  Update: {
                    "actor"?: string,"changes"?: NonNullable<Json>,"created_at"?: string,"id"?: never,"outcome"?: string,"pr_number"?: number | null,"pr_url"?: string | null,"revision"?: string,"set_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "export_runs_set_name_fkey"
      columns: ["set_name"]
isOneToOne: false
      referencedRelation: "export_sets"
      referencedColumns: ["name"]
    }
                  ]
                },"export_sets": {
                  Row: {
                    "created_at": string,"exclude_prefixes": (string)[],"final_newline": boolean,"format": string,"include_prefixes": (string)[],"languages": (string)[],"legacy_prefix": string | null,"name": string,"path_template": string,"project": string,"project_kind": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"exclude_prefixes"?: (string)[],"final_newline"?: boolean,"format": string,"include_prefixes"?: (string)[],"languages": (string)[],"legacy_prefix"?: string | null,"name": string,"path_template": string,"project": string,"project_kind"?: string
                  }
                  Update: {
                    "created_at"?: string,"exclude_prefixes"?: (string)[],"final_newline"?: boolean,"format"?: string,"include_prefixes"?: (string)[],"languages"?: (string)[],"legacy_prefix"?: string | null,"name"?: string,"path_template"?: string,"project"?: string,"project_kind"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "export_sets_project_kind_project_fkey"
      columns: ["project_kind","project"]
isOneToOne: false
      referencedRelation: "registry"
      referencedColumns: ["kind","code"]
    }
                  ]
                },"export_templates": {
                  Row: {
                    "content": string,"imported_at": string,"lang": string,"set_name": string,"source_ref": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"imported_at"?: string,"lang": string,"set_name": string,"source_ref"?: string | null
                  }
                  Update: {
                    "content"?: string,"imported_at"?: string,"lang"?: string,"set_name"?: string,"source_ref"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "export_templates_lang_fkey"
      columns: ["lang"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "export_templates_set_name_fkey"
      columns: ["set_name"]
isOneToOne: false
      referencedRelation: "export_sets"
      referencedColumns: ["name"]
    }
                  ]
                },"history": {
                  Row: {
                    "actor": string,"created_at": string,"field": string,"id": number,"lang": string | null,"new_value": string | null,"old_value": string | null,"source": string,"technical_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor": string,"created_at"?: string,"field": string,"id"?: never,"lang"?: string | null,"new_value"?: string | null,"old_value"?: string | null,"source": string,"technical_key": string
                  }
                  Update: {
                    "actor"?: string,"created_at"?: string,"field"?: string,"id"?: never,"lang"?: string | null,"new_value"?: string | null,"old_value"?: string | null,"source"?: string,"technical_key"?: string
                  }
                  Relationships: [
                    
                  ]
                },"languages": {
                  Row: {
                    "code": string,"dir": string,"in_editor": boolean,"is_source": boolean,"name": string,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"dir"?: string,"in_editor"?: boolean,"is_source"?: boolean,"name": string,"position"?: number
                  }
                  Update: {
                    "code"?: string,"dir"?: string,"in_editor"?: boolean,"is_source"?: boolean,"name"?: string,"position"?: number
                  }
                  Relationships: [
                    
                  ]
                },"localizations": {
                  Row: {
                    "approved": NonNullable<Json>,"based_on": NonNullable<Json>,"created_at": string,"created_by": string | null,"deprecated_at": string | null,"description": string | null,"figma_url": string | null,"legacy_path": Json | null,"legacy_position": number | null,"max_length": number | null,"search_text": string | null,"source_rev": number,"source_texts": NonNullable<Json>,"stale_langs": (string)[] | null,"status": NonNullable<Json>,"status_values": (string)[] | null,"tags": (string)[],"technical_key": string,"translations": NonNullable<Json>,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "approved"?: NonNullable<Json>,"based_on"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"deprecated_at"?: string | null,"description"?: string | null,"figma_url"?: string | null,"legacy_path"?: Json | null,"legacy_position"?: number | null,"max_length"?: number | null,"search_text"?: never,"source_rev"?: number,"source_texts"?: NonNullable<Json>,"stale_langs"?: never,"status"?: NonNullable<Json>,"status_values"?: never,"tags"?: (string)[],"technical_key": string,"translations"?: NonNullable<Json>,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "approved"?: NonNullable<Json>,"based_on"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"deprecated_at"?: string | null,"description"?: string | null,"figma_url"?: string | null,"legacy_path"?: Json | null,"legacy_position"?: number | null,"max_length"?: number | null,"search_text"?: never,"source_rev"?: number,"source_texts"?: NonNullable<Json>,"stale_langs"?: never,"status"?: NonNullable<Json>,"status_values"?: never,"tags"?: (string)[],"technical_key"?: string,"translations"?: NonNullable<Json>,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"registry": {
                  Row: {
                    "code": string,"created_at": string,"kind": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"kind": string,"title": string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"kind"?: string,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tags": {
                  Row: {
                    "created_at": string,"created_by": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "approve_keys":
{ Args: { "p_actor": string,"p_keys": (string)[] }; Returns: number
                           },
"approve_translations":
{ Args: { "p_actor": string,"p_key": string,"p_langs": (string)[] }; Returns: number
                           },
"create_key":
{ Args: { "p_actor": string,"p_description": string,"p_key": string,"p_max_length": number,"p_source": string,"p_status": string,"p_tags": (string)[],"p_translations": Json }; Returns: string
                           },
"create_tag":
{ Args: { "p_actor": string,"p_name": string }; Returns: string
                           },
"delete_tag":
{ Args: { "p_actor": string,"p_name": string }; Returns: number
                           },
"deprecate_keys":
{ Args: { "p_actor": string,"p_keys": (string)[],"p_source": string }; Returns: number
                           },
"find_similar":
{ Args: { "p_key": string,"p_limit"?: number,"p_text": string }; Returns: {
              "en": string,"matched": string,"score": number,"technical_key": string
            }[]
                           },
"get_tags":
{ Args: Record<PropertyKey, never>; Returns: {
              "keys": number,"name": string
            }[]
                           },
"get_unique_tags":
{ Args: Record<PropertyKey, never>; Returns: {
              "tag": string
            }[]
                           },
"hub_actor":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"hub_source":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"import_legacy":
{ Args: { "p_actor": string,"p_rows": Json,"p_set": string,"p_source": string,"p_source_ref": string,"p_templates": Json }; Returns: Json
                           },
"l10n_key_error":
{ Args: { "p_key": string }; Returns: string
                           },
"l10n_search_text":
{ Args: { "p_key": string,"p_translations": Json }; Returns: string
                           },
"l10n_stale_langs":
{ Args: { "p_based_on": Json,"p_source_rev": number,"p_source_texts": Json,"p_translations": Json }; Returns: (string)[]
                           },
"l10n_status_values":
{ Args: { "p_status": Json }; Returns: (string)[]
                           },
"rename_tag":
{ Args: { "p_actor": string,"p_from": string,"p_to": string }; Returns: number
                           },
"restore_keys":
{ Args: { "p_actor": string,"p_keys": (string)[],"p_source": string }; Returns: number
                           },
"security_audit":
{ Args: Record<PropertyKey, never>; Returns: {
              "grantee": string,"object_name": string,"object_type": string,"privilege": string
            }[]
                           },
"set_ai_translation":
{ Args: { "p_actor": string,"p_key": string,"p_lang": string,"p_value": string }; Returns: string
                           },
"set_keys_tag":
{ Args: { "p_actor": string,"p_keys": (string)[],"p_on": boolean,"p_tag": string }; Returns: number
                           },
"set_translation":
{ Args: { "p_actor": string,"p_expected"?: string,"p_key": string,"p_lang": string,"p_source": string,"p_value": string }; Returns: string
                           },
"update_key_meta":
{ Args: { "p_actor": string,"p_description": string,"p_figma_url": string,"p_key": string,"p_max_length": number,"p_tags": (string)[] }; Returns: string
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
