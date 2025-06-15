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
      holidays: {
        Row: {
          country_code: string | null
          created_at: string
          date: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          date: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          country_code?: string | null
          created_at?: string
          date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      kpi_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          metric_name: string
          threshold_value: number
          user_id: string | null
        }
        Insert: {
          alert_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          metric_name: string
          threshold_value: number
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          metric_name?: string
          threshold_value?: number
          user_id?: string | null
        }
        Relationships: []
      }
      performance_targets: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          metric_name: string
          period_type: string
          target_value: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metric_name: string
          period_type?: string
          target_value: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metric_name?: string
          period_type?: string
          target_value?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      performance_trends: {
        Row: {
          avg_efficiency: number | null
          avg_processing_hours: number | null
          completed_trucks: number | null
          created_at: string | null
          date: string
          id: string
          total_pallets: number | null
          total_trucks: number | null
        }
        Insert: {
          avg_efficiency?: number | null
          avg_processing_hours?: number | null
          completed_trucks?: number | null
          created_at?: string | null
          date: string
          id?: string
          total_pallets?: number | null
          total_trucks?: number | null
        }
        Update: {
          avg_efficiency?: number | null
          avg_processing_hours?: number | null
          completed_trucks?: number | null
          created_at?: string | null
          date?: string
          id?: string
          total_pallets?: number | null
          total_trucks?: number | null
        }
        Relationships: []
      }
      photo_annotations: {
        Row: {
          annotation_text: string
          annotation_type: string | null
          created_at: string
          created_by_user_id: string
          id: string
          photo_id: string
          updated_at: string
          x_coordinate: number | null
          y_coordinate: number | null
        }
        Insert: {
          annotation_text: string
          annotation_type?: string | null
          created_at?: string
          created_by_user_id: string
          id?: string
          photo_id: string
          updated_at?: string
          x_coordinate?: number | null
          y_coordinate?: number | null
        }
        Update: {
          annotation_text?: string
          annotation_type?: string | null
          created_at?: string
          created_by_user_id?: string
          id?: string
          photo_id?: string
          updated_at?: string
          x_coordinate?: number | null
          y_coordinate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_annotations_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "truck_completion_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_categories: {
        Row: {
          color_code: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      photo_quality_metrics: {
        Row: {
          blur_score: number | null
          brightness_score: number | null
          created_at: string
          file_size_kb: number | null
          has_geolocation: boolean | null
          has_timestamp: boolean | null
          id: string
          photo_id: string
          processing_status: string | null
          quality_score: number | null
          resolution_height: number | null
          resolution_width: number | null
          updated_at: string
        }
        Insert: {
          blur_score?: number | null
          brightness_score?: number | null
          created_at?: string
          file_size_kb?: number | null
          has_geolocation?: boolean | null
          has_timestamp?: boolean | null
          id?: string
          photo_id: string
          processing_status?: string | null
          quality_score?: number | null
          resolution_height?: number | null
          resolution_width?: number | null
          updated_at?: string
        }
        Update: {
          blur_score?: number | null
          brightness_score?: number | null
          created_at?: string
          file_size_kb?: number | null
          has_geolocation?: boolean | null
          has_timestamp?: boolean | null
          id?: string
          photo_id?: string
          processing_status?: string | null
          quality_score?: number | null
          resolution_height?: number | null
          resolution_width?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_quality_metrics_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "truck_completion_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_completion_photos: {
        Row: {
          created_at: string
          id: string
          photo_url: string
          task_id: string
          uploaded_by_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_url: string
          task_id: string
          uploaded_by_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_url?: string
          task_id?: string
          uploaded_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_task_completion_photos_task"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completion_photos_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to_name: string | null
          assigned_to_user_id: string | null
          completed_at: string | null
          completed_by_user_id: string | null
          completion_comment: string | null
          created_at: string
          created_by_user_id: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          truck_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to_name?: string | null
          assigned_to_user_id?: string | null
          completed_at?: string | null
          completed_by_user_id?: string | null
          completion_comment?: string | null
          created_at?: string
          created_by_user_id: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          truck_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to_name?: string | null
          assigned_to_user_id?: string | null
          completed_at?: string | null
          completed_by_user_id?: string | null
          completion_comment?: string | null
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          truck_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tasks_truck"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      time_entries: {
        Row: {
          approval_status: string | null
          approved_by_user_id: string | null
          check_in_time: string
          check_out_time: string | null
          created_at: string
          id: string
          is_holiday: boolean | null
          is_weekend: boolean | null
          overtime_hours: number | null
          overtime_reason: string[] | null
          regular_hours: number | null
          total_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string | null
          approved_by_user_id?: string | null
          check_in_time?: string
          check_out_time?: string | null
          created_at?: string
          id?: string
          is_holiday?: boolean | null
          is_weekend?: boolean | null
          overtime_hours?: number | null
          overtime_reason?: string[] | null
          regular_hours?: number | null
          total_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string | null
          approved_by_user_id?: string | null
          check_in_time?: string
          check_out_time?: string | null
          created_at?: string
          id?: string
          is_holiday?: boolean | null
          is_weekend?: boolean | null
          overtime_hours?: number | null
          overtime_reason?: string[] | null
          regular_hours?: number | null
          total_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      truck_completion_photos: {
        Row: {
          capture_timestamp: string | null
          category_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by_user_id: string | null
          device_info: Json | null
          file_name: string | null
          file_size_kb: number | null
          geo_latitude: number | null
          geo_longitude: number | null
          id: string
          is_deleted: boolean | null
          is_primary: boolean | null
          mime_type: string | null
          photo_url: string
          processing_status: string | null
          tags: string[] | null
          truck_id: string
          uploaded_by_user_id: string
        }
        Insert: {
          capture_timestamp?: string | null
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          device_info?: Json | null
          file_name?: string | null
          file_size_kb?: number | null
          geo_latitude?: number | null
          geo_longitude?: number | null
          id?: string
          is_deleted?: boolean | null
          is_primary?: boolean | null
          mime_type?: string | null
          photo_url: string
          processing_status?: string | null
          tags?: string[] | null
          truck_id: string
          uploaded_by_user_id: string
        }
        Update: {
          capture_timestamp?: string | null
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          device_info?: Json | null
          file_name?: string | null
          file_size_kb?: number | null
          geo_latitude?: number | null
          geo_longitude?: number | null
          id?: string
          is_deleted?: boolean | null
          is_primary?: boolean | null
          mime_type?: string | null
          photo_url?: string
          processing_status?: string | null
          tags?: string[] | null
          truck_id?: string
          uploaded_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_truck_completion_photos_truck"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_completion_photos_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "photo_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_exceptions: {
        Row: {
          actual_resolution_time: string | null
          created_at: string
          estimated_resolution_time: string | null
          exception_type: string
          id: string
          notes: string | null
          priority: string
          reason: string
          reported_by_user_id: string
          resolved_by_user_id: string | null
          status: string
          truck_id: string
          updated_at: string
        }
        Insert: {
          actual_resolution_time?: string | null
          created_at?: string
          estimated_resolution_time?: string | null
          exception_type: string
          id?: string
          notes?: string | null
          priority?: string
          reason: string
          reported_by_user_id: string
          resolved_by_user_id?: string | null
          status?: string
          truck_id: string
          updated_at?: string
        }
        Update: {
          actual_resolution_time?: string | null
          created_at?: string
          estimated_resolution_time?: string | null
          exception_type?: string
          id?: string
          notes?: string | null
          priority?: string
          reason?: string
          reported_by_user_id?: string
          resolved_by_user_id?: string | null
          status?: string
          truck_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_exceptions_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_handlers: {
        Row: {
          created_at: string
          handler_name: string
          handler_user_id: string
          id: string
          truck_id: string
        }
        Insert: {
          created_at?: string
          handler_name: string
          handler_user_id: string
          id?: string
          truck_id: string
        }
        Update: {
          created_at?: string
          handler_name?: string
          handler_user_id?: string
          id?: string
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_truck_handlers_truck"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_handlers_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_notifications: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          severity: string | null
          target_user_id: string | null
          title: string
          truck_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          severity?: string | null
          target_user_id?: string | null
          title: string
          truck_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          severity?: string | null
          target_user_id?: string | null
          title?: string
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_notifications_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_photo_compliance: {
        Row: {
          completed_categories: string[] | null
          compliance_score: number | null
          created_at: string
          id: string
          is_compliant: boolean | null
          notes: string | null
          required_categories: string[] | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          truck_id: string
          updated_at: string
        }
        Insert: {
          completed_categories?: string[] | null
          compliance_score?: number | null
          created_at?: string
          id?: string
          is_compliant?: boolean | null
          notes?: string | null
          required_categories?: string[] | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          truck_id: string
          updated_at?: string
        }
        Update: {
          completed_categories?: string[] | null
          compliance_score?: number | null
          created_at?: string
          id?: string
          is_compliant?: boolean | null
          notes?: string | null
          required_categories?: string[] | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          truck_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_photo_compliance_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: true
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_status_history: {
        Row: {
          change_reason: string | null
          changed_by_system: boolean | null
          changed_by_user_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          new_status: string
          old_status: string | null
          truck_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_by_system?: boolean | null
          changed_by_user_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status: string
          old_status?: string | null
          truck_id: string
        }
        Update: {
          change_reason?: string | null
          changed_by_system?: boolean | null
          changed_by_user_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string
          old_status?: string | null
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_status_history_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      trucks: {
        Row: {
          actual_arrival_date: string | null
          arrival_date: string
          arrival_time: string
          assigned_staff_id: string | null
          assigned_staff_name: string | null
          cargo_description: string
          completed_at: string | null
          created_at: string
          created_by_user_id: string
          handled_by_name: string | null
          handled_by_user_id: string | null
          id: string
          is_overdue: boolean | null
          late_arrival_reason: string | null
          license_plate: string
          original_arrival_date: string | null
          overdue_marked_at: string | null
          pallet_count: number
          priority: string
          ramp_number: number | null
          reschedule_count: number | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_arrival_date?: string | null
          arrival_date: string
          arrival_time: string
          assigned_staff_id?: string | null
          assigned_staff_name?: string | null
          cargo_description: string
          completed_at?: string | null
          created_at?: string
          created_by_user_id: string
          handled_by_name?: string | null
          handled_by_user_id?: string | null
          id?: string
          is_overdue?: boolean | null
          late_arrival_reason?: string | null
          license_plate: string
          original_arrival_date?: string | null
          overdue_marked_at?: string | null
          pallet_count: number
          priority?: string
          ramp_number?: number | null
          reschedule_count?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_arrival_date?: string | null
          arrival_date?: string
          arrival_time?: string
          assigned_staff_id?: string | null
          assigned_staff_name?: string | null
          cargo_description?: string
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string
          handled_by_name?: string | null
          handled_by_user_id?: string | null
          id?: string
          is_overdue?: boolean | null
          late_arrival_reason?: string | null
          license_plate?: string
          original_arrival_date?: string | null
          overdue_marked_at?: string | null
          pallet_count?: number
          priority?: string
          ramp_number?: number | null
          reschedule_count?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trucks_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_kpi_metrics: {
        Row: {
          avg_pallets_per_truck: number | null
          avg_processing_hours: number | null
          avg_unloading_speed_pallets_per_hour: number | null
          completed_trucks: number | null
          created_at: string
          exceptions_reported: number | null
          exceptions_resolved: number | null
          id: string
          metric_date: string
          tasks_completed: number | null
          total_pallets_handled: number | null
          total_trucks_handled: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_pallets_per_truck?: number | null
          avg_processing_hours?: number | null
          avg_unloading_speed_pallets_per_hour?: number | null
          completed_trucks?: number | null
          created_at?: string
          exceptions_reported?: number | null
          exceptions_resolved?: number | null
          id?: string
          metric_date?: string
          tasks_completed?: number | null
          total_pallets_handled?: number | null
          total_trucks_handled?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_pallets_per_truck?: number | null
          avg_processing_hours?: number | null
          avg_unloading_speed_pallets_per_hour?: number | null
          completed_trucks?: number | null
          created_at?: string
          exceptions_reported?: number | null
          exceptions_resolved?: number | null
          id?: string
          metric_date?: string
          tasks_completed?: number | null
          total_pallets_handled?: number | null
          total_trucks_handled?: number | null
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
        Relationships: [
          {
            foreignKeyName: "user_roles_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      work_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string | null
          id: string
          is_working_day: boolean | null
          start_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time?: string | null
          id?: string
          is_working_day?: boolean | null
          start_time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string | null
          id?: string
          is_working_day?: boolean | null
          start_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      kpi_dashboard_summary: {
        Row: {
          arrived_trucks: number | null
          avg_processing_hours: number | null
          completed_trucks: number | null
          high_priority_trucks: number | null
          in_progress_trucks: number | null
          last_updated: string | null
          metric_date: string | null
          pending_exceptions: number | null
          resolved_exceptions: number | null
          scheduled_trucks: number | null
          total_trucks: number | null
          urgent_trucks: number | null
        }
        Relationships: []
      }
      kpi_metrics: {
        Row: {
          arrived_trucks: number | null
          avg_processing_hours: number | null
          completed_trucks: number | null
          high_priority_trucks: number | null
          in_progress_trucks: number | null
          low_priority_trucks: number | null
          metric_date: string | null
          normal_priority_trucks: number | null
          pending_exceptions: number | null
          resolved_exceptions: number | null
          scheduled_trucks: number | null
          total_trucks: number | null
          urgent_trucks: number | null
        }
        Relationships: []
      }
      user_kpi_with_profiles: {
        Row: {
          avg_processing_hours: number | null
          completed_trucks: number | null
          created_at: string | null
          display_name: string | null
          email: string | null
          exceptions_reported: number | null
          exceptions_resolved: number | null
          id: string | null
          metric_date: string | null
          tasks_completed: number | null
          total_trucks_handled: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      user_performance_summary: {
        Row: {
          active_days: number | null
          avg_processing_hours: number | null
          display_name: string | null
          email: string | null
          last_activity_date: string | null
          total_overtime_hours: number | null
          total_tasks_completed: number | null
          total_trucks_completed: number | null
          total_working_hours: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_work_hours: {
        Args: {
          p_user_id: string
          p_check_in_time: string
          p_check_out_time: string
        }
        Returns: Json
      }
      check_truck_photo_compliance: {
        Args: { truck_id_param: string }
        Returns: Json
      }
      generate_truck_photo_summary: {
        Args: { truck_id_param: string }
        Returns: Json
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_truck_analytics: {
        Args: { p_start_date?: string; p_end_date?: string }
        Returns: Json
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      handle_truck_arrival: {
        Args: {
          p_truck_id: string
          p_actual_arrival_date?: string
          p_late_reason?: string
          p_user_id?: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      mark_overdue_trucks: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      refresh_all_kpi_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_kpi_dashboard: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_user_kpi_metrics: {
        Args: { target_date?: string }
        Returns: undefined
      }
      reschedule_overdue_truck: {
        Args: {
          p_truck_id: string
          p_new_date: string
          p_new_time: string
          p_reason?: string
          p_user_id?: string
        }
        Returns: boolean
      }
      sanitize_text: {
        Args: { input_text: string }
        Returns: string
      }
      validate_truck_data: {
        Args: {
          p_license_plate: string
          p_arrival_date: string
          p_arrival_time: string
          p_cargo_description: string
          p_pallet_count: number
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "WAREHOUSE_STAFF" | "OFFICE_ADMIN" | "SUPER_ADMIN"
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
      app_role: ["WAREHOUSE_STAFF", "OFFICE_ADMIN", "SUPER_ADMIN"],
    },
  },
} as const
