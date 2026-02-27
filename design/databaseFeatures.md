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

    user_accounts {
        UUID user_id PK
        VARCHAR account_type
        VARCHAR display_name
        VARCHAR phone
        VARCHAR organization_name
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
        TIMESTAMPTZ deleted_at
    }

    chatbots {
        UUID id PK
        UUID owner_user_id FK
        VARCHAR name
        TEXT description
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    chatbot_flows {
        UUID id PK
        UUID chatbot_id FK
        UUID created_by FK
        VARCHAR name
        INT version
        BOOLEAN is_active
        JSONB definition
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    flow_action_logs {
        UUID id PK
        UUID session_id FK
        UUID chatbot_id FK
        UUID flow_id FK
        VARCHAR from_node_id
        VARCHAR to_node_id
        VARCHAR action_type
        VARCHAR consequence_type
        VARCHAR routed_service
        VARCHAR intent
        FLOAT sentiment_score
        FLOAT urgency_score
        TEXT input_text
        TEXT normalized_text
        TIMESTAMPTZ created_at
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

    query_analytics {
        UUID id PK
        UUID session_id FK
        VARCHAR channel
        TEXT query_text_raw
        TEXT query_text_normalized
        VARCHAR source_language
        VARCHAR translated_to
        VARCHAR intent
        FLOAT sentiment_score
        FLOAT urgency_score
        BOOLEAN requires_human
        FLOAT confidence
        VARCHAR detected_language
        VARCHAR routed_service
        VARCHAR routed_action
        VARCHAR service_mode
        VARCHAR service_status
        INT processing_latency_ms
        JSONB metadata
        TIMESTAMPTZ created_at
    }

    contacts ||--o{ sessions : "has"
    contacts ||--o{ tickets : "raises"
    contacts ||--o{ reservations : "makes"
    contacts ||--o{ crm_sync_log : "synced_via"
    contacts ||--o{ channel_events : "triggers"

    workflows ||--o{ sessions : "governs"
    user_accounts ||--o{ chatbots : "owns"
    chatbots ||--o{ chatbot_flows : "has_versions"
    chatbot_flows ||--o{ flow_action_logs : "executes"

    sessions ||--o{ messages : "contains"
    sessions ||--o| call_summaries : "summarized_by"
    sessions ||--o{ escalations : "may_trigger"
    sessions ||--o{ tone_training_log : "trains"
    sessions ||--o{ crm_sync_log : "logs"
    sessions ||--o{ channel_events : "associated_with"
    sessions ||--o{ tickets : "generates"
    sessions ||--o{ reservations : "books"
    sessions ||--o{ query_analytics : "logs_queries"
    sessions ||--o{ flow_action_logs : "stores_actions"

    messages ||--o{ tone_training_log : "feeds"

    tickets ||--o{ escalations : "linked_to"

    documents ||--o{ document_chunks : "split_into"

    escalations ||--o| tickets : "creates"
```

### SQL migration for query analytics

```sql
create table if not exists public.query_analytics (
  id uuid primary key default gen_random_uuid(),
  session_id uuid null references public.sessions(id) on delete set null,
  channel varchar(32) not null,
  query_text_raw text not null,
  query_text_normalized text not null,
  source_language varchar(16) null,
  translated_to varchar(16) not null default 'en',
  intent varchar(32) not null,
  sentiment_score double precision not null check (sentiment_score >= -1 and sentiment_score <= 1),
  urgency_score double precision not null check (urgency_score >= 0 and urgency_score <= 1),
  requires_human boolean not null default false,
  confidence double precision not null check (confidence >= 0 and confidence <= 1),
  detected_language varchar(16) not null,
  routed_service varchar(64) not null,
  routed_action varchar(64) not null,
  service_mode varchar(16) not null,
  service_status varchar(16) not null,
  processing_latency_ms integer not null check (processing_latency_ms >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_query_analytics_created_at on public.query_analytics(created_at desc);
create index if not exists idx_query_analytics_intent on public.query_analytics(intent);
create index if not exists idx_query_analytics_session_id on public.query_analytics(session_id);
create index if not exists idx_query_analytics_channel on public.query_analytics(channel);
```

### SQL migration for account, chatbot, flowchart and action logs

```sql
create table if not exists public.user_accounts (
  user_id uuid primary key,
  account_type varchar(20) not null check (account_type in ('organization', 'user')),
  display_name varchar(120) null,
  phone varchar(32) null,
  organization_name varchar(180) null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table if not exists public.chatbots (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.user_accounts(user_id) on delete cascade,
  name varchar(120) not null,
  description text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chatbot_flows (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  created_by uuid not null references public.user_accounts(user_id) on delete cascade,
  name varchar(120) not null,
  version integer not null,
  is_active boolean not null default true,
  definition jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_chatbot_flows_version on public.chatbot_flows(chatbot_id, version);

create table if not exists public.flow_action_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid null references public.sessions(id) on delete set null,
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  flow_id uuid not null references public.chatbot_flows(id) on delete cascade,
  from_node_id varchar(120) null,
  to_node_id varchar(120) null,
  action_type varchar(64) not null,
  consequence_type varchar(64) not null,
  routed_service varchar(64) not null,
  intent varchar(32) not null,
  sentiment_score double precision not null check (sentiment_score >= -1 and sentiment_score <= 1),
  urgency_score double precision not null check (urgency_score >= 0 and urgency_score <= 1),
  input_text text not null,
  normalized_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chatbots_owner on public.chatbots(owner_user_id);
create index if not exists idx_chatbot_flows_chatbot on public.chatbot_flows(chatbot_id, version desc);
create index if not exists idx_flow_action_logs_flow on public.flow_action_logs(flow_id, created_at desc);
create index if not exists idx_flow_action_logs_session on public.flow_action_logs(session_id, created_at desc);
```

## MongoDB migration (current implementation)

The backend is now written around Mongo-style collections and document IDs.  
Collections to create in database `vaniflow`:

1. `users`
2. `user_accounts`
3. `chatbots`
4. `chatbot_flows`
5. `query_analytics`
6. `flow_action_logs`

Recommended document shapes:

```json
{
  "users": {
    "_id": "uuid-string",
    "email": "user@example.com",
    "password_hash": "salt:hash",
    "role": "organization|user",
    "display_name": "Name",
    "organization_name": "Acme Inc",
    "created_at": "ISODate",
    "updated_at": "ISODate"
  },
  "chatbot_flows": {
    "_id": "uuid-string",
    "chatbot_id": "chatbot-id",
    "created_by": "user-id",
    "name": "Support Flow v1",
    "version": 1,
    "is_active": true,
    "definition": {
      "start_node_id": "node_start",
      "nodes": [
        {
          "id": "node_start",
          "action": {
            "type": "reply|create_ticket|escalate_human|call_microservice|end",
            "payload": {}
          },
          "consequences": [
            { "condition": "urgency_score > 0.8", "next_node_id": "node_escalate" }
          ]
        }
      ]
    }
  }
}
```

Recommended indexes:

```javascript
db.users.createIndex({ email: 1 }, { unique: true });
db.user_accounts.createIndex({ user_id: 1 }, { unique: true });
db.chatbots.createIndex({ owner_user_id: 1, created_at: -1 });
db.chatbot_flows.createIndex({ chatbot_id: 1, version: -1 });
db.query_analytics.createIndex({ created_at: -1 });
db.query_analytics.createIndex({ intent: 1, channel: 1 });
db.flow_action_logs.createIndex({ flow_id: 1, created_at: -1 });
db.flow_action_logs.createIndex({ session_id: 1, created_at: -1 });
```

If using MongoDB Atlas Data API, configure:

- `MONGODB_DATA_API_URL`
- `MONGODB_DATA_API_KEY`
- `MONGODB_DATA_SOURCE`
- `MONGODB_DB_NAME`
