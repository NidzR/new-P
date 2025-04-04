"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var dotenv_1 = require("dotenv");
var google_1 = require("langchain/google");
var langgraph_1 = require("langgraph");
var langgraph_2 = require("langgraph");
var schema_1 = require("langchain/schema");
// Load environment variables
dotenv_1.default.config();
// Configuration
var GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
var SYSTEM_MESSAGE_CONTENT = "You are a product manager. Ask the user if they have a project. If they try to ask about something else, redirect them back to the product management topic.";
// Check if the Google API Key is present
if (!GOOGLE_API_KEY) {
    console.error("Google API Key not configured. Please set GOOGLE_API_KEY in the .env file.");
    process.exit(1);
}
// Initialize the Graph workflow
var workflow = new langgraph_2.StateGraph();
// Define the node to call the Gemini model
function callGeminiModel(state) {
    return __awaiter(this, void 0, void 0, function () {
        var model, messagesToSend, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("--- Calling Gemini ---");
                    model = new google_1.ChatGoogleGenerativeAI({
                        model: "gemini-1.5-flash",
                        googleApiKey: GOOGLE_API_KEY,
                    });
                    messagesToSend = __spreadArray([new schema_1.SystemMessage(SYSTEM_MESSAGE_CONTENT)], state.messages, true);
                    return [4 /*yield*/, model.invoke(messagesToSend)];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, { messages: [response] }];
            }
        });
    });
}
// Define the flow
workflow.addNode('gemini_caller', callGeminiModel);
workflow.setEntryPoint('gemini_caller');
workflow.addEdge('gemini_caller', langgraph_2.END);
// Initialize memory to handle state persistence
var memory = new langgraph_1.MemorySaver();
var langgraphApp = workflow.compile({ checkpointer: memory });
// Create the Express server
var app = (0, express_1.default)();
app.use(express_1.default.json());
// Define the API endpoint
app.post('/invoke', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userMessage, conversationId, inputs, config, finalState, aiResponse, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                userMessage = req.body.message;
                conversationId = req.body.conversation_id;
                console.log("--- Received Request (ID: ".concat(conversationId, "): ").concat(userMessage, " ---"));
                inputs = { messages: [new schema_1.HumanMessage(userMessage)] };
                config = { configurable: { thread_id: conversationId } };
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, langgraphApp.invoke(inputs, config)];
            case 2:
                finalState = _a.sent();
                aiResponse = finalState.messages[finalState.messages.length - 1];
                if (aiResponse instanceof schema_1.AIMessage) {
                    res.json({
                        response: aiResponse.content,
                        conversation_id: conversationId,
                    });
                }
                else {
                    res.status(500).send("Unexpected response from AI.");
                }
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.error("--- Error during graph invocation ---", error_1);
                res.status(500).send("Internal server error.");
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Basic root endpoint for testing the server
app.get('/', function (req, res) {
    res.send("LangGraph Gemini API (with History) is running.");
});
// Start the server
var PORT = process.env.PORT || 8000;
app.listen(PORT, function () {
    console.log("Server is running on http://127.0.0.1:".concat(PORT));
});
// Define the new node to modify price
function modifyPriceNode(state) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // Logic to modify price
            console.log("--- Modifying Price ---");
            return [2 /*return*/, { messages: [new schema_1.AIMessage("Price modified successfully!")] }];
        });
    });
}
// Add the new node to the workflow
workflow.addNode('modify_price', modifyPriceNode);
// Add an edge from 'gemini_caller' to 'modify_price'
workflow.addEdge('gemini_caller', 'modify_price');
// Add an edge from 'modify_price' to END
workflow.addEdge('modify_price', langgraph_2.END);
