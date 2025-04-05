import express from 'express';
import dotenv from 'dotenv';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MemorySaver } from "@langgraphjs/langgraph/checkpoint/memory";
import { StateGraph, END } from "@langgraphjs/langgraph/graph";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

// Initialize environment
dotenv.config();

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
  console.error("Missing GOOGLE_API_KEY in .env");
  process.exit(1);
}

// App setup
const app = express();
app.use(express.json());

// Define state type
interface GraphState {
  messages: (HumanMessage | AIMessage | SystemMessage)[];
  conversationStage?: string;
}

// Create workflow
const workflow = new StateGraph<GraphState>({ channels: {} });

// Nodes
async function greetingNode(state: GraphState) {
  return {
    messages: [new AIMessage("Welcome! Let's discuss your project.")],
    conversationStage: "greeting"
  };
}

async function requirementsNode(state: GraphState) {
  return {
    messages: [new AIMessage("What are your key requirements?")],
    conversationStage: "requirements"
  };
}

async function budgetNode(state: GraphState) {
  return {
    messages: [new AIMessage("What's your budget estimate?")],
    conversationStage: "budget"
  };
}

async function timelineNode(state: GraphState) {
  return {
    messages: [new AIMessage("What's your timeline?")],
    conversationStage: "timeline"
  };
}

async function geminiNode(state: GraphState) {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash",
    apiKey: GOOGLE_API_KEY
  });

  const response = await model.invoke([
    new SystemMessage("You're a product management assistant."),
    ...state.messages
  ]);

  return {
    messages: [response],
    conversationStage: "analysis"
  };
}

// Add nodes
workflow.addNode("greeting", greetingNode);
workflow.addNode("requirements", requirementsNode);
workflow.addNode("budget", budgetNode);
workflow.addNode("timeline", timelineNode);
workflow.addNode("gemini", geminiNode);

// Define flow
workflow.setEntryPoint("greeting");
workflow.addEdge("greeting", "requirements");
workflow.addEdge("requirements", "budget");
workflow.addEdge("budget", "timeline");
workflow.addEdge("timeline", "gemini");
workflow.addEdge("gemini", END);

// Compile with memory
const memory = new MemorySaver();
const appGraph = workflow.compile({ checkpointer: memory });

// API endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message, conversation_id } = req.body;
    if (!message || !conversation_id) {
      return res.status(400).json({ error: "Missing message or conversation_id" });
    }

    const result = await appGraph.invoke(
      { messages: [new HumanMessage(message)] },
      { configurable: { thread_id: conversation_id } }
    );

    const lastMessage = result.messages[result.messages.length - 1];
    res.json({
      response: lastMessage.content,
      conversation_id,
      stage: result.conversationStage
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});