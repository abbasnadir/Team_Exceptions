---

# PRODUCT REQUIREMENTS DOCUMENT

# Product Name: **VaniFlow**

---

# 1. Product Overview

## 1.1 Vision

VaniFlow is a customizable AI voice and workflow automation platform that allows businesses to design conversational logic using flowcharts while the AI dynamically evaluates intent, tone, urgency, and context to trigger microservices and business actions in real time.

## 1.2 Core Value Proposition

Traditional IVR and chatbot systems are rigid and menu-driven. VaniFlow introduces:

* Flowchart-driven AI execution
* Tone-aware conversation handling
* Dynamic escalation
* Multilingual support
* Business-controlled automation logic

---

# 2. Target Users

1. Small and mid-sized businesses
2. Enterprises with support teams
3. Airports, hospitals, banks
4. CRM-based organizations
5. Businesses operating in multilingual markets

---

# 3. Functional Requirements

---

## 3.1 Voice Processing Module

### Objective

Enable natural voice-based interaction.

### Requirements

* Convert speech to text
* Detect language
* Convert AI response back to speech

### Implementation

**Speech-to-Text (STT):**

* Whisper (OpenAI) OR Sarvam AI STT
* Model: Transformer-based encoder-decoder
* Handles multilingual speech

**Text-to-Speech (TTS):**

* ElevenLabs / Azure TTS / Sarvam AI TTS
* Neural TTS model

---

## 3.2 Language Auto-Detection

### Objective

Respond in user's language automatically.

### Algorithm

Option 1:

* Use Whisper’s built-in language detection

Option 2:

* FastText language identification model
* Lightweight, fast, production-ready

---

## 3.3 Intent Detection

### Objective

Identify what the user wants.

### AI Approach

Use a transformer-based classification model.

Options:

* Fine-tuned BERT model
* LLM zero-shot classification
* OpenAI function calling for structured intent output

Example output:

```json
{
  "intent": "complaint",
  "confidence": 0.92
}
```

For hackathon:
Use LLM prompt-based classification.

For scalable version:
Fine-tune BERT or DistilBERT.

---

## 3.4 Tone / Sentiment Detection

### Objective

Detect emotional state and urgency.

### Algorithm

Use sentiment analysis model:

Options:

* RoBERTa sentiment classifier
* HuggingFace sentiment pipeline
* LLM with structured output

Output:

```json
{
  "sentiment": "negative",
  "tone_score": -0.78,
  "urgency_score": 0.85
}
```

Urgency detection:
Train binary classifier:

* Urgent vs non-urgent
* Or use keyword + semantic scoring

---

## 3.5 Conversation-Based Escalation

### Objective

Escalate automatically when needed.

### Rule Logic

Escalate if:

* sentiment < -0.6
* urgency > 0.8
* repeated unresolved intents

Implementation:

* Maintain conversation state in DB
* Track sentiment trend over time
* If negative slope → escalate

Optional advanced:
Use Reinforcement Learning to improve escalation threshold over time.

---

## 3.6 Ticketing System

### Objective

Automatically create and manage support tickets.

### Database Schema

tickets:

* id
* user_id
* intent
* priority
* tone_score
* status
* escalation_level
* created_at

Trigger Conditions:

* intent == complaint
* urgency > threshold
* escalation required

Priority Classification:
Multi-class classifier:

* low
* medium
* high
* critical

---

## 3.7 Document Learning (RAG)

### Objective

Enable knowledge-aware responses.

### Architecture

1. Upload document
2. Extract text
3. Chunk text
4. Generate embeddings
5. Store in Supabase (pgvector)
6. Retrieve top-K relevant chunks
7. Inject into LLM prompt

Embedding Models:

* OpenAI text-embedding-3-small
* Instructor embedding model

Retrieval:

* Cosine similarity search
* Top 5 chunks

---

## 3.8 Flowchart-Based AI Engine (Core USP)

### Objective

Let users define conversational logic.

### Flow Structure

Stored as JSON:

```json
{
  "nodes": [
    {
      "id": "check_complaint",
      "condition": "intent == complaint",
      "next": "check_tone"
    }
  ]
}
```

### Flow Engine Algorithm

1. Extract structured AI output:

   * intent
   * tone_score
   * urgency_score

2. Parse flow JSON

3. Evaluate conditions:

   * Use safe condition parser
   * Example: expression evaluator

4. Trigger next node

5. Execute:

   * create_ticket
   * escalate
   * reservation
   * custom webhook

For scalability:
Use rule engine library (e.g., json-rules-engine)

---

## 3.9 Reservation System

### Objective

Trigger business microservices dynamically.

Implementation:

* Supabase table: reservations
* AI detects booking intent
* Flow triggers reservation microservice
* Validate availability
* Confirm booking

Advanced:
Add dynamic pricing engine using simple algorithm:
price = base_price × demand_multiplier

---

## 3.10 AI Summarization

### Objective

Store conversation summaries.

Algorithm:

* LLM summarization prompt
* Extract:

  * key issue
  * user sentiment
  * resolution
  * action taken

Store in conversation_summary table.

Optional:
Use extractive summarization model for offline mode.

---

# 4. Non-Functional Requirements

## 4.1 Scalability

* Microservices architecture
* Stateless backend
* Supabase horizontal scaling

## 4.2 Latency

Target:

* STT < 1.5 seconds
* LLM < 2 seconds
* Total response < 4 seconds

## 4.3 Security

* JWT authentication
* Row-level security in Supabase
* Role-based access control

---

# 5. System Architecture

User
→ Voice/Text Input
→ STT
→ Language Detection
→ Intent + Tone + Urgency Classification
→ AI Decision Engine
→ Flow Engine
→ Microservice Trigger
→ Response Generator
→ TTS

---

# 6. AI Algorithms Summary

| Feature             | Algorithm Type                        |
| ------------------- | ------------------------------------- |
| Speech Recognition  | Transformer encoder-decoder (Whisper) |
| Language Detection  | FastText / Whisper                    |
| Intent Detection    | BERT / LLM classification             |
| Sentiment Analysis  | RoBERTa / DistilBERT                  |
| Urgency Detection   | Binary classifier                     |
| Escalation Learning | Rule-based → Reinforcement Learning   |
| Document Learning   | RAG + Embeddings                      |
| Summarization       | LLM abstractive summarization         |

---

# 7. Hackathon Scope (Realistic)

Implement:

* STT (API-based)
* Intent detection via LLM
* Sentiment analysis via LLM
* Flow engine (core feature)
* Ticket auto-creation
* Reservation demo
* Summarization
* Multilingual support

Skip:

* Training custom models
* Reinforcement learning
* Telecom-level production integration

---

# 8. Future Expansion

* Train proprietary intent model
* Fine-tune tone classifier
* Build SaaS dashboard
* Add fraud detection model
* Add real-time analytics dashboard
* Add AI performance monitoring

---

# 9. Competitive Advantage

* User-defined flow engine
* Emotion-aware automation
* Voice-first architecture
* Business-controlled AI logic
* Multilingual regional adaptability

---