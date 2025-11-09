from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import aiofiles
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create upload directory
UPLOAD_DIR = ROOT_DIR / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InterviewCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Question(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category_id: str
    text: str
    is_custom: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuestionCreate(BaseModel):
    category_id: str
    text: str

class Interview(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    category_id: str
    category_name: str
    status: str  # 'in_progress', 'completed'
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    overall_stress_score: Optional[float] = None
    overall_confidence_score: Optional[float] = None

class InterviewResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    interview_id: str
    question_id: str
    question_text: str
    video_path: Optional[str] = None
    audio_path: Optional[str] = None
    stress_score: Optional[float] = None
    confidence_score: Optional[float] = None
    analysis_data: Optional[dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AnalysisResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    interview_id: str
    overall_stress: float
    overall_confidence: float
    detailed_metrics: dict
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper Functions
async def get_current_user(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> User:
    # First check cookie
    session_token = request.cookies.get('session_token')
    
    # Fallback to Authorization header
    if not session_token and credentials:
        session_token = credentials.credentials
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session = await db.user_sessions.find_one({
        "session_token": session_token,
        "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    })
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    # Find user
    user_doc = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**user_doc)

# Auth Routes
@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    data = await request.json()
    session_id = data.get('session_id')
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent auth service
    import aiohttp
    async with aiohttp.ClientSession() as session:
        async with session.get(
            'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
            headers={'X-Session-ID': session_id}
        ) as resp:
            if resp.status != 200:
                raise HTTPException(status_code=401, detail="Invalid session ID")
            
            user_data = await resp.json()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data['email']}, {"_id": 0})
    
    if not existing_user:
        # Create new user
        new_user = User(
            email=user_data['email'],
            name=user_data['name'],
            picture=user_data.get('picture')
        )
        user_dict = new_user.model_dump()
        user_dict['created_at'] = user_dict['created_at'].isoformat()
        await db.users.insert_one(user_dict)
        user = new_user
    else:
        user = User(**existing_user)
    
    # Create session
    session_token = user_data['session_token']
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    new_session = UserSession(
        user_id=user.id,
        session_token=session_token,
        expires_at=expires_at
    )
    
    session_dict = new_session.model_dump()
    session_dict['expires_at'] = session_dict['expires_at'].isoformat()
    session_dict['created_at'] = session_dict['created_at'].isoformat()
    await db.user_sessions.insert_one(session_dict)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*60*60,
        path="/"
    )
    
    return {"user": user.model_dump(), "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get('session_token')
    
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# Interview Categories Routes
@api_router.get("/categories", response_model=List[InterviewCategory])
async def get_categories():
    categories = await db.interview_categories.find({}, {"_id": 0}).to_list(1000)
    return categories

# Questions Routes
@api_router.get("/questions/{category_id}", response_model=List[Question])
async def get_questions(category_id: str):
    questions = await db.questions.find({"category_id": category_id}, {"_id": 0}).to_list(1000)
    return questions

@api_router.post("/questions", response_model=Question)
async def create_question(question: QuestionCreate, user: User = Depends(get_current_user)):
    new_question = Question(
        category_id=question.category_id,
        text=question.text,
        is_custom=True
    )
    
    question_dict = new_question.model_dump()
    question_dict['created_at'] = question_dict['created_at'].isoformat()
    await db.questions.insert_one(question_dict)
    
    return new_question

# Interview Routes
@api_router.post("/interviews")
async def create_interview(data: dict, user: User = Depends(get_current_user)):
    category_id = data.get('category_id')
    
    # Get category
    category = await db.interview_categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    new_interview = Interview(
        user_id=user.id,
        category_id=category_id,
        category_name=category['name'],
        status='in_progress'
    )
    
    interview_dict = new_interview.model_dump()
    interview_dict['started_at'] = interview_dict['started_at'].isoformat()
    await db.interviews.insert_one(interview_dict)
    
    return new_interview.model_dump()

@api_router.get("/interviews", response_model=List[Interview])
async def get_interviews(user: User = Depends(get_current_user)):
    interviews = await db.interviews.find({"user_id": user.id}, {"_id": 0}).sort("started_at", -1).to_list(1000)
    return interviews

@api_router.get("/interviews/{interview_id}")
async def get_interview(interview_id: str, user: User = Depends(get_current_user)):
    interview = await db.interviews.find_one({"id": interview_id, "user_id": user.id}, {"_id": 0})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview

@api_router.post("/interviews/{interview_id}/responses")
async def save_response(
    interview_id: str,
    question_id: str = Form(...),
    question_text: str = Form(...),
    video: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    user: User = Depends(get_current_user)
):
    # Verify interview belongs to user
    interview = await db.interviews.find_one({"id": interview_id, "user_id": user.id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Save files
    video_path = None
    audio_path = None
    
    if video:
        video_filename = f"{interview_id}_{question_id}_{uuid.uuid4()}.webm"
        video_path = str(UPLOAD_DIR / video_filename)
        async with aiofiles.open(video_path, 'wb') as f:
            content = await video.read()
            await f.write(content)
    
    if audio:
        audio_filename = f"{interview_id}_{question_id}_{uuid.uuid4()}.webm"
        audio_path = str(UPLOAD_DIR / audio_filename)
        async with aiofiles.open(audio_path, 'wb') as f:
            content = await audio.read()
            await f.write(content)
    
    # Create response record
    response = InterviewResponse(
        interview_id=interview_id,
        question_id=question_id,
        question_text=question_text,
        video_path=video_path,
        audio_path=audio_path
    )
    
    response_dict = response.model_dump()
    response_dict['created_at'] = response_dict['created_at'].isoformat()
    await db.interview_responses.insert_one(response_dict)
    
    return {"message": "Response saved", "response_id": response.id}

@api_router.get("/interviews/{interview_id}/responses")
async def get_responses(interview_id: str, user: User = Depends(get_current_user)):
    # Verify interview belongs to user
    interview = await db.interviews.find_one({"id": interview_id, "user_id": user.id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    responses = await db.interview_responses.find({"interview_id": interview_id}, {"_id": 0}).to_list(1000)
    return responses

@api_router.post("/interviews/{interview_id}/analyze")
async def analyze_interview(interview_id: str, data: dict, user: User = Depends(get_current_user)):
    # Verify interview belongs to user
    interview = await db.interviews.find_one({"id": interview_id, "user_id": user.id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Here you would integrate with your custom analysis code
    # For now, we'll use the provided data from frontend
    overall_stress = data.get('overall_stress', 0)
    overall_confidence = data.get('overall_confidence', 0)
    detailed_metrics = data.get('detailed_metrics', {})
    
    # Update interview
    await db.interviews.update_one(
        {"id": interview_id},
        {
            "$set": {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "overall_stress_score": overall_stress,
                "overall_confidence_score": overall_confidence
            }
        }
    )
    
    # Save analysis result
    result = AnalysisResult(
        interview_id=interview_id,
        overall_stress=overall_stress,
        overall_confidence=overall_confidence,
        detailed_metrics=detailed_metrics
    )
    
    result_dict = result.model_dump()
    result_dict['created_at'] = result_dict['created_at'].isoformat()
    await db.analysis_results.insert_one(result_dict)
    
    return {"message": "Analysis saved", "result": result.model_dump()}

@api_router.get("/interviews/{interview_id}/analysis")
async def get_analysis(interview_id: str, user: User = Depends(get_current_user)):
    # Verify interview belongs to user
    interview = await db.interviews.find_one({"id": interview_id, "user_id": user.id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    analysis = await db.analysis_results.find_one({"interview_id": interview_id}, {"_id": 0})
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return analysis

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db():
    # Seed interview categories
    existing_categories = await db.interview_categories.count_documents({})
    if existing_categories == 0:
        categories = [
            {
                "id": "technical",
                "name": "Technical Interview",
                "description": "Assess technical knowledge and problem-solving skills",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "hr",
                "name": "HR Interview",
                "description": "Evaluate communication and cultural fit",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "behavioral",
                "name": "Behavioral Interview",
                "description": "Understand past experiences and behavioral patterns",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        await db.interview_categories.insert_many(categories)
        
        # Seed questions
        questions = [
            # Technical
            {"id": str(uuid.uuid4()), "category_id": "technical", "text": "Explain the difference between process and thread.", "is_custom": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "category_id": "technical", "text": "What is the time complexity of binary search?", "is_custom": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "category_id": "technical", "text": "Describe RESTful API design principles.", "is_custom": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "category_id": "technical", "text": "What are the SOLID principles in software design?", "is_custom": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "category_id": "technical", "text": "Explain database normalization and its importance.", "is_custom": False, "created_at": datetime.now(timezone.utc).isoformat()},
            # HR
            {"id": str(uuid.uuid4()), "category_id": "hr", "text": "Tell me about yourself.", "is_custom": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "category_id": "hr", "text": "Why do you want to work for our company?", "is_custom": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "category_id": "hr", "text": "What are your greatest strengths and weaknesses?", "is_custom": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "category_id": "hr", "text": "Where do you see yourself in 5 years?", "is_custom": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "category_id": "hr", "text": "Why should we hire you?", "is_custom": False, "created_at": datetime.now(timezone.utc).isoformat()},
            # Behavioral
            {"id": str(uuid.uuid4()), "category_id": "behavioral", "text": "Describe a time when you faced a challenging situation at work.", "is_custom": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "category_id": "behavioral", "text": "Tell me about a time you worked on a team project.", "is_custom": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "category_id": "behavioral", "text": "Give an example of a goal you set and how you achieved it.", "is_custom": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "category_id": "behavioral", "text": "Describe a situation where you had to deal with a difficult colleague.", "is_custom": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "category_id": "behavioral", "text": "Tell me about a time when you had to adapt to a significant change.", "is_custom": False, "created_at": datetime.now(timezone.utc).isoformat()}
        ]
        await db.questions.insert_many(questions)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
