import express from 'express';
import dotenv from 'dotenv';
import { ChatGoogleGenerativeAI } from 'langchain/google';
import { MemorySaver } from 'langgraph';
import { StateGraph, END } from 'langgraph';
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from 'langchain/schema';

// Load environment variables
dotenv.config();

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SYSTEM_MESSAGE_CONTENT = "You are a product manager. Ask the user if they have a project. If they try to ask about something else, redirect them back to the product management topic.";

// Check if the Google API Key is present
if (!GOOGLE_API_KEY) {
  console.error("Google API Key not configured. Please set GOOGLE_API_KEY in the .env file.");
  process.exit(1);
}

// Define the graph state (using memory for conversation history)
type GraphState = {
  messages: BaseMessage[];
};

// Initialize the Graph workflow
const workflow = new StateGraph<GraphState>();

// Define the node to call the Gemini model
async function callGeminiModel(state: GraphState) {
  console.log("--- Calling Gemini ---");

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash",
    googleApiKey: GOOGLE_API_KEY,
  });

  // Add system message to conversation history
  const messagesToSend = [new SystemMessage(SYSTEM_MESSAGE_CONTENT), ...state.messages];
  const response = await model.invoke(messagesToSend);

  return { messages: [response] };
}

// Define the flow
workflow.addNode('gemini_caller', callGeminiModel);
workflow.setEntryPoint('gemini_caller');
workflow.addEdge('gemini_caller', END);

// Initialize memory to handle state persistence
const memory = new MemorySaver();
const langgraphApp = workflow.compile({ checkpointer: memory });

// Create the Express server
const app = express();
app.use(express.json());

// Define the API endpoint
app.post('/invoke', async (req, res) => {
  const userMessage = req.body.message;
  const conversationId = req.body.conversation_id;

  console.log(`--- Received Request (ID: ${conversationId}): ${userMessage} ---`);

  const inputs = { messages: [new HumanMessage(userMessage)] };
  const config = { configurable: { thread_id: conversationId } };

  try {
    const finalState = await langgraphApp.invoke(inputs, config);
    const aiResponse = finalState.messages[finalState.messages.length - 1];

    if (aiResponse instanceof AIMessage) {
      res.json({
        response: aiResponse.content,
        conversation_id: conversationId,
      });
    } else {
      res.status(500).send("Unexpected response from AI.");
    }
  } catch (error) {
    console.error("--- Error during graph invocation ---", error);
    res.status(500).send("Internal server error.");
  }
});

// Basic root endpoint for testing the server
app.get('/', (req, res) => {
  res.send("LangGraph Gemini API (with History) is running.");
});

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on http://127.0.0.1:${PORT}`);
});
// Define the new node to modify price
async function modifyPriceNode(state: GraphState) {
    // Logic to modify price
    console.log("--- Modifying Price ---");
    return { messages: [new AIMessage("Price modified successfully!")] };
}

// Add the new node to the workflow
workflow.addNode('modify_price', modifyPriceNode);

// Add an edge from 'gemini_caller' to 'modify_price'
workflow.addEdge('gemini_caller', 'modify_price');

// Add an edge from 'modify_price' to END
workflow.addEdge('modify_price', END);