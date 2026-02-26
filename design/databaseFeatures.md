```mermaid
erDiagram

    contacts {
        UUID id PK
        VARCHAR phone UK
        VARCHAR name
        VARCHAR email
        VARCHAR preferred_language
        VARCHAR channel_origin
        VARCHAR crm_tier
        VARCHAR crm_external_id
        INT total_calls
        TIMESTAMP last_interaction_at
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    workflows {
        VARCHAR id PK
        VARCHAR name
        TEXT description
        JSONB config
        TEXT[] active_channels
        TEXT[] priority_languages
        JSONB escalation_rules
        TEXT[] active_modules
        BOOLEAN is_active
        VARCHAR published_by
        TIMESTAMP published_at
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    sessions {
        UUID id PK
        UUID contact_id FK
        VARCHAR workflow_id FK
        VARCHAR channel
        VARCHAR language_detected
        VARCHAR language_responded
        VARCHAR tone_initial
        VARCHAR tone_final
        VARCHAR priority
        FLOAT urgency_score
        BOOLEAN escalated
        TIMESTAMP escalated_at
        VARCHAR escalated_to
        INT total_turns
        INT duration_seconds
        VARCHAR resolution_status
        TIMESTAMP started_at
        TIMESTAMP ended_at
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    messages {
        UUID id PK
        UUID session_id FK
        VARCHAR role
        TEXT content
        VARCHAR language
        VARCHAR tone_detected
        FLOAT tone_confidence
        VARCHAR intent_detected
        INT turn_number
        TEXT audio_url
        BOOLEAN is_escalation_trigger
        TIMESTAMP timestamp
    }

    tickets {
        UUID id PK
        VARCHAR ticket_number UK
        UUID session_id FK
        UUID contact_id FK
        VARCHAR title
        TEXT summary
        VARCHAR category
        VARCHAR priority
        VARCHAR status
        VARCHAR assigned_to
        TEXT resolution_notes
        TIMESTAMP resolved_at
        VARCHAR sentiment_at_creation
        VARCHAR external_ticket_id
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    reservations {
        UUID id PK
        VARCHAR confirmation_code UK
        UUID contact_id FK
        UUID session_id FK
        VARCHAR reservation_type
        VARCHAR location_name
        TEXT location_address
        DATE slot_date
        TIME slot_time
        INT party_size
        TEXT special_requests
        VARCHAR status
        BOOLEAN reminder_sent
        TIMESTAMP cancelled_at
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    documents {
        UUID id PK
        VARCHAR name
        VARCHAR original_filename
        VARCHAR file_type
        INT file_size_bytes
        TEXT content_raw
        INT chunk_count
        TEXT embedding_index_path
        BOOLEAN is_active
        VARCHAR language
        VARCHAR category
        VARCHAR uploaded_by
        TIMESTAMP last_queried_at
        INT query_count
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    document_chunks {
        UUID id PK
        UUID document_id FK
        INT chunk_index
        TEXT content
        INT token_count
        JSONB metadata
        TIMESTAMP created_at
    }

    call_summaries {
        UUID id PK
        UUID session_id FK
        VARCHAR summary_type
        TEXT summary_text
        TEXT[] key_points
        TEXT[] action_items
        VARCHAR sentiment_overall
        BOOLEAN resolution_detected
        VARCHAR language
        INT word_count
        TEXT[] delivered_via
        TIMESTAMP delivered_at
        TIMESTAMP generated_at
    }

    escalations {
        UUID id PK
        UUID session_id FK
        UUID ticket_id FK
        VARCHAR trigger_reason
        INT trigger_turn_number
        FLOAT frustration_score_at_trigger
        VARCHAR priority_at_trigger
        TEXT transcript_at_trigger
        TEXT summary_for_agent
        VARCHAR agent_name
        TIMESTAMP agent_notified_at
        BOOLEAN resolved_by_agent
        TEXT agent_notes
        TIMESTAMP escalated_at
        TIMESTAMP resolved_at
    }

    tone_training_log {
        UUID id PK
        UUID session_id FK
        UUID message_id FK
        TEXT transcript_chunk
        JSONB audio_features
        VARCHAR predicted_tone
        FLOAT prediction_confidence
        VARCHAR confirmed_tone
        BOOLEAN is_reviewed
        VARCHAR reviewed_by
        TIMESTAMP reviewed_at
        TIMESTAMP created_at
    }

    crm_sync_log {
        UUID id PK
        UUID contact_id FK
        UUID session_id FK
        VARCHAR sync_direction
        VARCHAR crm_system
        VARCHAR external_record_id
        TEXT[] fields_synced
        VARCHAR sync_status
        TEXT error_message
        TIMESTAMP synced_at
    }

    channel_events {
        UUID id PK
        VARCHAR channel
        VARCHAR event_type
        JSONB raw_payload
        UUID contact_id FK
        UUID session_id FK
        BOOLEAN processed
        TEXT processing_error
        TIMESTAMP received_at
        TIMESTAMP processed_at
    }

    analytics_daily {
        UUID id PK
        DATE date
        VARCHAR channel
        INT total_sessions
        INT total_messages
        FLOAT avg_session_duration_seconds
        INT escalation_count
        FLOAT escalation_rate
        FLOAT resolution_rate
        FLOAT avg_urgency_score
        INT tickets_created
        INT reservations_made
        INT documents_queried
        VARCHAR top_language
        VARCHAR top_intent
        FLOAT frustration_rate
        TIMESTAMP created_at
    }

    contacts ||--o{ sessions : "has"
    contacts ||--o{ tickets : "raises"
    contacts ||--o{ reservations : "makes"
    contacts ||--o{ crm_sync_log : "synced_via"
    contacts ||--o{ channel_events : "triggers"

    workflows ||--o{ sessions : "governs"

    sessions ||--o{ messages : "contains"
    sessions ||--o| call_summaries : "summarized_by"
    sessions ||--o{ escalations : "may_trigger"
    sessions ||--o{ tone_training_log : "trains"
    sessions ||--o{ crm_sync_log : "logs"
    sessions ||--o{ channel_events : "associated_with"
    sessions ||--o{ tickets : "generates"
    sessions ||--o{ reservations : "books"

    messages ||--o{ tone_training_log : "feeds"

    tickets ||--o{ escalations : "linked_to"

    documents ||--o{ document_chunks : "split_into"

    escalations ||--o| tickets : "creates"
    ```