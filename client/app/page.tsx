"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch, getToken, setToken } from "@/lib/api";

type Role = "organization" | "user";

interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

interface Chatbot {
  id: string;
  name: string;
  description?: string | null;
  owner_user_id?: string;
}

interface Consequence {
  condition: string;
  next_node_id: string;
}

interface BuilderNode {
  id: string;
  label: string;
  condition: string;
  actionType: "reply" | "create_ticket" | "escalate_human" | "call_microservice" | "end";
  message: string;
  consequences: Consequence[];
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const ACTIONS: BuilderNode["actionType"][] = [
  "reply",
  "create_ticket",
  "escalate_human",
  "call_microservice",
  "end",
];

function randomNodeId() {
  return `node_${Math.random().toString(36).slice(2, 8)}`;
}

export default function Home() {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authError, setAuthError] = useState<string>("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accountType, setAccountType] = useState<Role>("user");
  const [organizationName, setOrganizationName] = useState("");

  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [selectedChatbotId, setSelectedChatbotId] = useState<string>("");
  const [newChatbotName, setNewChatbotName] = useState("");
  const [newChatbotDescription, setNewChatbotDescription] = useState("");

  const [flowName, setFlowName] = useState("Default Flow");
  const [nodes, setNodes] = useState<BuilderNode[]>([]);
  const [startNodeId, setStartNodeId] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState("");

  const [publicOrgs, setPublicOrgs] = useState<Chatbot[]>([]);
  const [selectedOrgChatbotId, setSelectedOrgChatbotId] = useState<string>("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const stored = getToken();
    if (stored) {
      setTokenState(stored);
      void loadMe(stored);
    }
  }, []);

  useEffect(() => {
    void loadPublicOrganizations();
  }, []);

  useEffect(() => {
    if (user?.role === "organization" && token) {
      void loadChatbots(token);
    }
  }, [user, token]);

  async function loadMe(authToken: string) {
    try {
      const data = await apiFetch<{ id: string; email: string; role: string }>("/me", { method: "GET" }, authToken);
      setUser({
        id: data.id,
        email: data.email,
        role: data.role === "organization" ? "organization" : "user",
      });
    } catch {
      setToken(null);
      setTokenState(null);
      setUser(null);
    }
  }

  async function loadPublicOrganizations() {
    const data = await apiFetch<{ items: Chatbot[] }>("/chat/organizations", { method: "GET" });
    setPublicOrgs(data.items ?? []);
    if (!selectedOrgChatbotId && data.items?.length) {
      setSelectedOrgChatbotId(data.items[0].id);
    }
  }

  async function loadChatbots(authToken: string) {
    const data = await apiFetch<{ items: Chatbot[] }>("/org/chatbots", { method: "GET" }, authToken);
    setChatbots(data.items ?? []);
    if (!selectedChatbotId && data.items?.length) {
      setSelectedChatbotId(data.items[0].id);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setAuthError("");
    try {
      const data = await apiFetch<{ token: string; user: AuthUser }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          display_name: displayName || null,
          account_type: accountType,
          organization_name: accountType === "organization" ? organizationName : null,
        }),
      });

      setToken(data.token);
      setTokenState(data.token);
      setUser(data.user);
      setEmail("");
      setPassword("");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Registration failed.");
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setAuthError("");
    try {
      const data = await apiFetch<{ token: string; user: AuthUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      setTokenState(data.token);
      setUser({
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
      });
      setEmail("");
      setPassword("");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Login failed.");
    }
  }

  async function createChatbot() {
    if (!token || !newChatbotName.trim()) return;
    await apiFetch(
      "/org/chatbots",
      {
        method: "POST",
        body: JSON.stringify({
          name: newChatbotName.trim(),
          description: newChatbotDescription.trim() || null,
        }),
      },
      token
    );
    setNewChatbotName("");
    setNewChatbotDescription("");
    await loadChatbots(token);
    await loadPublicOrganizations();
  }

  function onPaletteDragStart(event: React.DragEvent<HTMLDivElement>, actionType: BuilderNode["actionType"]) {
    event.dataTransfer.setData("actionType", actionType);
  }

  function onCanvasDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const actionType = event.dataTransfer.getData("actionType") as BuilderNode["actionType"];
    if (!ACTIONS.includes(actionType)) return;
    const nodeId = randomNodeId();
    const newNode: BuilderNode = {
      id: nodeId,
      label: `Node ${nodes.length + 1}`,
      condition: "",
      actionType,
      message: "",
      consequences: [],
    };
    const next = [...nodes, newNode];
    setNodes(next);
    if (!startNodeId) setStartNodeId(nodeId);
  }

  function updateNode(nodeId: string, patch: Partial<BuilderNode>) {
    setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)));
  }

  function addConsequence(nodeId: string) {
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              consequences: [...node.consequences, { condition: "true", next_node_id: "" }],
            }
          : node
      )
    );
  }

  function updateConsequence(nodeId: string, index: number, patch: Partial<Consequence>) {
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              consequences: node.consequences.map((c, i) => (i === index ? { ...c, ...patch } : c)),
            }
          : node
      )
    );
  }

  async function saveFlow() {
    if (!token || !selectedChatbotId || !startNodeId || nodes.length === 0) return;
    setSaveStatus("Saving flow...");
    const definition = {
      start_node_id: startNodeId,
      nodes: nodes.map((node) => ({
        id: node.id,
        label: node.label,
        condition: node.condition || undefined,
        action: {
          type: node.actionType,
          payload: node.message ? { message: node.message } : {},
        },
        consequences: node.consequences,
      })),
    };

    try {
      await apiFetch(
        `/org/chatbots/${selectedChatbotId}/flows`,
        {
          method: "POST",
          body: JSON.stringify({
            name: flowName,
            definition,
            is_active: true,
          }),
        },
        token
      );
      setSaveStatus("Flow saved successfully.");
    } catch (err) {
      setSaveStatus(err instanceof Error ? err.message : "Failed to save flow.");
    }
  }

  async function sendChatMessage() {
    if (!chatInput.trim() || !selectedOrgChatbotId) return;
    const userText = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", text: userText }]);
    setChatInput("");
    try {
      const data = await apiFetch<{
        response_text: string;
      }>(`/chat/organizations/${selectedOrgChatbotId}/message`, {
        method: "POST",
        body: JSON.stringify({ message: userText }),
      });
      setChatMessages((prev) => [...prev, { role: "assistant", text: data.response_text }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: err instanceof Error ? err.message : "Chat failed." },
      ]);
    }
  }

  const canSaveFlow = useMemo(() => Boolean(selectedChatbotId && startNodeId && nodes.length > 0), [selectedChatbotId, startNodeId, nodes.length]);

  if (!token || !user) {
    return (
      <main className="page">
        <section className="panel">
          <h1>VaniFlow</h1>
          <p>Sign in to build or use decision-driven organization chatbots.</p>
          <form className="stack" onSubmit={handleLogin}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
            <button type="submit">Login</button>
          </form>
          <hr />
          <form className="stack" onSubmit={handleRegister}>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display Name" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 8)" type="password" />
            <select value={accountType} onChange={(e) => setAccountType(e.target.value as Role)}>
              <option value="user">Ordinary User</option>
              <option value="organization">Organization</option>
            </select>
            {accountType === "organization" ? (
              <input
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Organization Name"
              />
            ) : null}
            <button type="submit">Register</button>
          </form>
          {authError ? <p className="error">{authError}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="page wide">
      <header className="topbar">
        <div>
          <h1>VaniFlow Workspace</h1>
          <p>
            Logged in as {user.email} ({user.role})
          </p>
        </div>
        <button
          onClick={() => {
            setToken(null);
            setTokenState(null);
            setUser(null);
          }}
        >
          Logout
        </button>
      </header>

      {user.role === "organization" ? (
        <section className="grid">
          <div className="panel">
            <h2>Chatbots</h2>
            <div className="stack">
              <input
                value={newChatbotName}
                onChange={(e) => setNewChatbotName(e.target.value)}
                placeholder="Chatbot name"
              />
              <input
                value={newChatbotDescription}
                onChange={(e) => setNewChatbotDescription(e.target.value)}
                placeholder="Description"
              />
              <button onClick={createChatbot}>Create Chatbot</button>
              <select value={selectedChatbotId} onChange={(e) => setSelectedChatbotId(e.target.value)}>
                <option value="">Select chatbot</option>
                {chatbots.map((bot) => (
                  <option key={bot.id} value={bot.id}>
                    {bot.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="panel">
            <h2>Flow Builder (Drag & Drop)</h2>
            <div className="palette">
              {ACTIONS.map((action) => (
                <div key={action} className="chip" draggable onDragStart={(e) => onPaletteDragStart(e, action)}>
                  {action}
                </div>
              ))}
            </div>

            <div
              className="canvas"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onCanvasDrop}
            >
              {nodes.length === 0 ? <p>Drop an action node here to start building the flow.</p> : null}
              {nodes.map((node) => (
                <div key={node.id} className="nodeCard">
                  <strong>{node.id}</strong>
                  <input
                    value={node.label}
                    onChange={(e) => updateNode(node.id, { label: e.target.value })}
                    placeholder="Node label"
                  />
                  <input
                    value={node.condition}
                    onChange={(e) => updateNode(node.id, { condition: e.target.value })}
                    placeholder='Condition (ex: intent === "complaint")'
                  />
                  <select
                    value={node.actionType}
                    onChange={(e) => updateNode(node.id, { actionType: e.target.value as BuilderNode["actionType"] })}
                  >
                    {ACTIONS.map((action) => (
                      <option key={action} value={action}>
                        {action}
                      </option>
                    ))}
                  </select>
                  <input
                    value={node.message}
                    onChange={(e) => updateNode(node.id, { message: e.target.value })}
                    placeholder="Reply message (for reply nodes)"
                  />
                  <button type="button" onClick={() => addConsequence(node.id)}>
                    Add consequence
                  </button>
                  {node.consequences.map((consequence, i) => (
                    <div key={`${node.id}-c-${i}`} className="row">
                      <input
                        value={consequence.condition}
                        onChange={(e) =>
                          updateConsequence(node.id, i, { condition: e.target.value })
                        }
                        placeholder="if condition"
                      />
                      <input
                        value={consequence.next_node_id}
                        onChange={(e) =>
                          updateConsequence(node.id, i, { next_node_id: e.target.value })
                        }
                        placeholder="next_node_id"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="row">
              <input value={flowName} onChange={(e) => setFlowName(e.target.value)} placeholder="Flow name" />
              <select value={startNodeId} onChange={(e) => setStartNodeId(e.target.value)}>
                <option value="">Start node</option>
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.id}
                  </option>
                ))}
              </select>
              <button disabled={!canSaveFlow} onClick={saveFlow}>
                Save Flow
              </button>
            </div>
            {saveStatus ? <p>{saveStatus}</p> : null}
          </div>
        </section>
      ) : (
        <section className="grid single">
          <div className="panel">
            <h2>Chat with Organization</h2>
            <select value={selectedOrgChatbotId} onChange={(e) => setSelectedOrgChatbotId(e.target.value)}>
              {publicOrgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <div className="chatBox">
              {chatMessages.map((message, i) => (
                <div key={`m-${i}`} className={message.role === "user" ? "bubble user" : "bubble bot"}>
                  {message.text}
                </div>
              ))}
            </div>
            <div className="row">
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type message..." />
              <button onClick={sendChatMessage}>Send</button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
