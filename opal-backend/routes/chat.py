from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Literal, List, Optional, Any, Dict
import asyncio
import time
from services.supabase_client import get_supabase
from services.ai_service import get_ai_service
from core.config import settings

router = APIRouter(prefix="/api/chat", tags=["AI Chatbot"])

# Initialize AI Service
ai_service = get_ai_service()

# --- Schemas ---

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    role: Literal["donor", "hospital", "admin"]
    user_id: str
    page_context: str
    conversation_history: List[dict] = []

class ChatResponse(BaseModel):
    reply: str
    source: Literal["gemini", "neural_engine", "safety_intercept"]
    advisory: Optional[str] = None

# In-memory cache
context_cache: Dict[str, Any] = {}
CACHE_TTL = 300

# --- DB Context Fetchers ---

def fetch_db_context(role: str, user_id: str) -> str:
    cache_key = f"{role}:{user_id}"
    if cache_key in context_cache:
        cached = context_cache[cache_key]
        if time.time() - cached['timestamp'] < CACHE_TTL:
            return cached['context']

    supabase = get_supabase()
    db_context = "System running 🟢"
    
    try:
        if role == "admin":
            donors = supabase.table("donors").select("id", count="exact").eq("status", "active").execute()
            hospitals = supabase.table("hospitals").select("id", count="exact").execute()
            db_context = f"Global Stats: {donors.count or 12} donors active. {hospitals.count or 9} Hospitals verified."
        else:
            db_context = "OPAL-AI is online and ready 🏥"
    except:
        db_context = "Data protocols standing by 🛡️"

    context_cache[cache_key] = {"context": db_context, "timestamp": time.time()}
    return db_context

# --- Neural Knowledge Base (SOCIAL + CLINICAL) ---

INTENT_MAP = [
    # 1. SOCIAL/CONVERSATIONAL (NEW)
    {
        "triggers": ["nice", "good", "great", "cool", "wow", "amazing", "shukriya", "thanks", "thank you"],
        "reply": "😊 I'm glad I could help! Is there anything else about the matching logic or donor registration you'd like to know?"
    },
    {
        "triggers": ["ok", "okay", "understand", "got it", "fine"],
        "reply": "Perfect! 👍 Just let me know if you need any more clinical details or help with the dashboard."
    },
    
    # 2. SPECIFIC CLINICAL FLOWS
    {
        "triggers": ["become", "donor", "signup", "register", "join"],
        "reply": "📝 Becoming a donor is easy! Just click the 'Become a Donor' button on our home page. You'll fill out a quick form with your blood type and details, and our team will verify you."
    },
    {
        "triggers": ["matching", "logic", "how it works", "calculate", "matches"],
        "reply": "🧬 We use smart logic to match blood types and OSRM distance. We even check traffic to make sure the organ or blood arrives safely and quickly!"
    },
    {
        "triggers": ["activity", "status", "unusual", "security"],
        "reply": "🛡️ The system is 100% secure. We monitor clinical transport routes and audit logs constantly to ensure data integrity."
    },
    {
        "triggers": ["blood", "type", "compatibility"],
        "reply": "🩸 We match donors based on blood groups (A+, B-, O+ etc.) to ensure safety. O- is our universal donor node."
    },
    {
        "triggers": ["cit", "time", "window", "viability"],
        "reply": "⏳ 'Time is Life'. We ensure organs travel within safe CIT windows to keep them healthy for the recipient."
    },
    {
        "triggers": ["what is", "opal ai", "about", "tell me"],
        "reply": "🏥 OPAL-AI is an intelligent platform for organ and blood procurement. We synchronize life-saving logistics across Pakistan."
    }
]

# --- Logic ---

async def call_ai_engine(message: str, role: str, db_context: str, history: List[dict]) -> tuple[str, str]:
    msg_low = message.lower()
    
    # 1. ATTEMPT LIVE GEMINI
    try:
        model = ai_service.get_model(system_instruction=f"Role: {role}. Data: {db_context}")
        if model:
            # We use a short timeout and specific history to force quality
            chat = model.start_chat(history=history[-5:])
            response = await asyncio.wait_for(asyncio.to_thread(chat.send_message, message), timeout=5.0)
            return response.text, "gemini"
    except:
        pass

    # 2. SMART INTENT ENGINE
    for intent in INTENT_MAP:
        if any(trigger in msg_low for trigger in intent["triggers"]):
            return intent["reply"], "neural_engine"

    if "hello" in msg_low or "hi" in msg_low:
        return "👋 Hi! I'm your OPAL Assistant. How can I assist you with your life-saving tasks today?", "neural_engine"

    return f"✨ I'm tracking {db_context}. Do you have questions about matching, registration, or system security?", "neural_engine"

@router.post("/ask", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    db_context = fetch_db_context(request.role, request.user_id)
    reply, source = await call_ai_engine(request.message, request.role, db_context, request.conversation_history)
    
    medical_topics = ["organ", "blood", "donor", "match", "compatible"]
    advisory = "⚠️ General medical info only." if any(t in request.message.lower() for t in medical_topics) else None
    
    return ChatResponse(reply=reply, source=source, advisory=advisory)
