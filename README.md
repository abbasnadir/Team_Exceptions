# VaniFlow

**VaniFlow** is a customizable AI voice and workflow automation platform that allows businesses to design their own conversational logic using visual flowcharts.

The system analyzes user input in real time and dynamically triggers actions based on tone, intent, urgency, and predefined workflow rules.

Built to overcome the limitations of traditional IVR systems, VaniFlow enables human-like, multilingual, context-aware customer interaction while giving organizations full control over AI behavior.

---

## Problem Context

Despite the rapid growth of AI chatbots, many businesses still rely on rigid IVR systems that are:

- Menu-driven (Press 1, Press 2…)
- Unable to understand natural speech properly
- Not context-aware
- Limited in regional language support
- Emotionally insensitive

These systems often lead to:

- Customer frustration  
- High call drop rates  
- Increased operational costs  
- Poor customer satisfaction  
- Loss of potential sales  

In voice-first markets, especially in regional and semi-urban environments, intelligent multilingual voice systems are essential.

VaniFlow is built to address this gap.

---

## Core Features

### 1. Voice-Based Tone Detection
- Detects emotion, urgency, and sentiment
- Generates context-aware responses
- Adjusts tone dynamically

### 2. Conversation-Based Escalation System
- Detects frustration or high priority
- Automatically escalates conversations
- Supports tier-based escalation logic

### 3. Priority and Urgency Detection
- Classifies user requests by importance
- Triggers high-priority workflows automatically

### 4. Smart Ticketing System
- Auto-generates support tickets
- Tracks status and escalation levels
- Integrates with workflow engine

### 5. Native Media Integration
- WhatsApp
- Instagram
- Website chat
- CRM and ERP systems (API-ready)

### 6. Reservation System
- Intent-based booking flows
- Real-time availability checks
- Dynamic confirmation handling

### 7. Document Learning (RAG-Based)
- Upload documents
- Store embeddings
- Context-aware AI responses

### 8. Language Auto-Detection
- Automatically detects user language
- Responds in the same language

### 9. AI Summarization
- Conversation summaries
- Context retention
- Analytics-ready data

### 10. Offline Data Summarization (Optional)
- Lightweight summarization support
- Designed for low-connectivity environments

---

## Core Innovation: User-Defined AI Flow Engine

The defining feature of VaniFlow is its customizable flow-based AI execution system.

Instead of relying on hardcoded conversation scripts, users can visually design their own workflow logic.

### How It Works

1. The user creates a workflow using a visual flowchart builder.
2. The flow is stored as structured JSON.
3. During interaction, the AI extracts:
   - Intent
   - Tone
   - Urgency
4. The decision engine evaluates flow conditions.
5. The appropriate node is triggered.
6. Microservices or actions are executed automatically.

Example Flow Structure:

```json
{
  "nodes": [
    {
      "id": "start",
      "condition": "intent == complaint",
      "next": "check_tone"
    },
    {
      "id": "check_tone",
      "condition": "tone < -0.5",
      "action": "create_ticket",
      "next": "escalate"
    }
  ]
}
```

${{\color{Goldenrod}\Huge{\textsf{  Refer to `./design` folder to learn more about the app and specifications. \}}}}\$