from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pymongo import MongoClient, ASCENDING, DESCENDING
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
from dotenv import load_dotenv
import uuid

load_dotenv()

app = FastAPI(title="RROLL API - Gambling Strategy Platform", version="3.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/rroll")
client = MongoClient(MONGO_URL)
db = client.get_database()

# Collections
users_collection = db.users
casinos_collection = db.casinos
user_casino_notes_collection = db.user_casino_notes
strategies_collection = db.strategies
clicks_collection = db.clicks
platform_referrals_collection = db.platform_referrals
tools_collection = db.tools

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))

# ==================== Models ====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    referred_by: Optional[str] = None  # Referral code

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class CasinoCreate(BaseModel):
    name: str
    category: str
    logoDomain: str
    referral_url: str  # ADMIN's referral link
    desc: Optional[str] = None
    bonus: Optional[str] = None
    chips: List[str] = []
    admin_rating: Optional[float] = 0.0
    rtp_info: Optional[str] = None
    withdrawal_speed: Optional[str] = None
    trust_score: Optional[float] = 0.0
    min_deposit: Optional[str] = None
    max_payout: Optional[str] = None

class CasinoUpdate(BaseModel):
    referral_url: Optional[str] = None
    desc: Optional[str] = None
    bonus: Optional[str] = None
    chips: Optional[List[str]] = None
    admin_rating: Optional[float] = None
    rtp_info: Optional[str] = None
    withdrawal_speed: Optional[str] = None
    trust_score: Optional[float] = None

class UserCasinoNote(BaseModel):
    casino_name: str
    personal_rating: Optional[float] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = []
    is_favorite: Optional[bool] = False

class StrategyCreate(BaseModel):
    title: str
    content: str
    category: str  # RTP, VIP, Bonus, Bankroll, etc.
    game_type: Optional[str] = None
    difficulty: Optional[str] = "beginner"
    premium_only: Optional[bool] = False
    estimated_profit: Optional[str] = None

class ClickTrack(BaseModel):
    casino_name: str
    converted: Optional[bool] = False
    revenue: Optional[float] = 0.0

# ==================== Utilities ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def generate_referral_code(user_id: str) -> str:
    return f"RROLL-{user_id[:8].upper()}"

def serialize_doc(doc: dict) -> dict:
    """Remove MongoDB _id and convert to JSON-safe format"""
    if doc and '_id' in doc:
        doc.pop('_id')
    return doc

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = users_collection.find_one({"user_id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_admin_user(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== Seed Data ====================

def seed_casinos():
    """Seed casino data with admin referral links"""
    if casinos_collection.count_documents({}) == 0:
        casinos = [
            {
                "name": "wowvegas", "category": "sweepstakes", "logoDomain": "wowvegas.com",
                "referral_url": "https://www.wowvegas.com/?raf=YOURREF",
                "desc": "Top sweepstakes pick with massive daily bonuses and fast SC redemptions.",
                "bonus": "1.5M WOW Coins + 30 SC Free on Signup",
                "chips": ["Instant Cashout","Daily Bonus","Sweepstakes"],
                "admin_rating": 9.5, "rtp_info": "96%+", "withdrawal_speed": "24-48h", "trust_score": 9.8
            },
            {
                "name": "stake.us", "category": "sweepstakes", "logoDomain": "stake.us",
                "referral_url": "https://luckystake.com/?c=YOURREF",
                "desc": "US-legal Stake with sweepstakes coins, sports betting, and live dealer.",
                "bonus": "", "chips": ["Sports","Live Dealer","Sweepstakes"],
                "admin_rating": 9.2, "rtp_info": "98%+", "withdrawal_speed": "Instant", "trust_score": 9.9
            },
            {
                "name": "shuffle", "category": "crypto", "logoDomain": "shuffle.com",
                "referral_url": "https://shuffle.us?r=YOURREF",
                "desc": "Crypto casino with provably fair games, sports betting, and rakeback rewards.",
                "bonus": "", "chips": ["Sports","Provably Fair","Crypto"],
                "admin_rating": 9.0, "rtp_info": "99%+", "withdrawal_speed": "Instant", "trust_score": 9.7
            },
            {
                "name": "stake.com", "category": "crypto", "logoDomain": "stake.com",
                "referral_url": "https://stake.com/?c=YOURREF",
                "desc": "The world's biggest crypto casino. Provably fair games, massive sports book, and VIP rakeback.",
                "bonus": "", "chips": ["Sports","Live Dealer","Provably Fair","Crypto"],
                "admin_rating": 9.8, "rtp_info": "99%+", "withdrawal_speed": "Instant", "trust_score": 10.0
            },
        ]
        casinos_collection.insert_many(casinos)
        print("✅ Seeded casino data with admin referral links")

def seed_strategies():
    """Seed strategy guides"""
    if strategies_collection.count_documents({}) == 0:
        strategies = [
            {
                "strategy_id": str(uuid.uuid4()),
                "title": "VIP Leveling with 99% RTP Dice",
                "content": "Learn how to level up VIP tiers efficiently using high RTP dice games on auto-play. This strategy minimizes losses while maximizing wagering requirements.",
                "category": "VIP",
                "game_type": "Dice",
                "difficulty": "beginner",
                "premium_only": False,
                "estimated_profit": "$50-200/month",
                "created_at": datetime.utcnow()
            },
            {
                "strategy_id": str(uuid.uuid4()),
                "title": "Best RTP Games by Category",
                "content": "Complete guide to finding and playing games with the highest Return to Player percentages across all casino categories.",
                "category": "RTP",
                "game_type": "All",
                "difficulty": "beginner",
                "premium_only": False,
                "estimated_profit": "Varies",
                "created_at": datetime.utcnow()
            },
            {
                "strategy_id": str(uuid.uuid4()),
                "title": "Bonus Hunting 101",
                "content": "Step-by-step guide to maximizing casino bonuses and meeting wagering requirements profitably.",
                "category": "Bonus",
                "game_type": "All",
                "difficulty": "intermediate",
                "premium_only": False,
                "estimated_profit": "$100-500/month",
                "created_at": datetime.utcnow()
            },
        ]
        strategies_collection.insert_many(strategies)
        print("✅ Seeded strategy guides")

@app.on_event("startup")
async def startup_event():
    # Create indexes
    users_collection.create_index([("email", ASCENDING)], unique=True)
    users_collection.create_index([("user_id", ASCENDING)], unique=True)
    users_collection.create_index([("referral_code", ASCENDING)], unique=True)
    casinos_collection.create_index([("name", ASCENDING)], unique=True)
    user_casino_notes_collection.create_index([("user_id", ASCENDING), ("casino_name", ASCENDING)])
    clicks_collection.create_index([("casino_name", ASCENDING)])
    clicks_collection.create_index([("clicked_at", DESCENDING)])
    
    # Seed data
    seed_casinos()
    seed_strategies()
    
    # Create admin user
    admin_exists = users_collection.find_one({"email": "admin@rroll.com"})
    if not admin_exists:
        admin_user = {
            "user_id": str(uuid.uuid4()),
            "email": "admin@rroll.com",
            "name": "Admin",
            "password_hash": hash_password("admin123"),
            "role": "admin",
            "subscription_tier": "premium",
            "referral_code": "RROLL-ADMIN",
            "created_at": datetime.utcnow(),
            "theme": "dark",
            "email_notifications": True,
            "referred_by": None,
            "referral_earnings": 0.0
        }
        users_collection.insert_one(admin_user)
        print("✅ Created admin user: admin@rroll.com / admin123")

# ==================== Auth Routes ====================

@app.post("/api/auth/register")
async def register(user_data: UserRegister):
    if users_collection.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name or user_data.email.split("@")[0],
        "password_hash": hash_password(user_data.password),
        "role": "user",
        "subscription_tier": "free",
        "referral_code": generate_referral_code(user_id),
        "created_at": datetime.utcnow(),
        "theme": "dark",
        "email_notifications": True,
        "referred_by": user_data.referred_by,
        "referral_earnings": 0.0
    }
    
    users_collection.insert_one(user)
    
    # Track platform referral
    if user_data.referred_by:
        referrer = users_collection.find_one({"referral_code": user_data.referred_by})
        if referrer:
            platform_referrals_collection.insert_one({
                "referral_id": str(uuid.uuid4()),
                "referrer_id": referrer["user_id"],
                "referred_user_id": user_id,
                "created_at": datetime.utcnow(),
                "earnings": 0.0
            })
    
    access_token = create_access_token(data={"sub": user["user_id"]})
    user.pop('_id', None)
    user.pop('password_hash', None)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@app.post("/api/auth/login")
async def login(user_data: UserLogin):
    user = users_collection.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user["user_id"]})
    user.pop('_id', None)
    user.pop('password_hash', None)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    current_user.pop('_id', None)
    current_user.pop('password_hash', None)
    return current_user

@app.put("/api/auth/theme")
async def update_theme(theme: str, current_user: dict = Depends(get_current_user)):
    users_collection.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"theme": theme}}
    )
    return {"message": "Theme updated", "theme": theme}

# ==================== Casino Routes ====================

@app.get("/api/casinos")
async def get_casinos(category: Optional[str] = None, sort_by: Optional[str] = "admin_rating"):
    query = {}
    if category and category != "all":
        query["category"] = category
    
    sort_field = sort_by if sort_by in ["admin_rating", "trust_score", "name"] else "admin_rating"
    casinos = list(casinos_collection.find(query, {"_id": 0}).sort(sort_field, DESCENDING))
    
    return {"casinos": casinos}

@app.get("/api/casinos/{casino_name}")
async def get_casino(casino_name: str):
    casino = casinos_collection.find_one({"name": casino_name}, {"_id": 0})
    if not casino:
        raise HTTPException(status_code=404, detail="Casino not found")
    return casino

@app.post("/api/casinos")
async def create_casino(casino: CasinoCreate, admin: dict = Depends(get_admin_user)):
    casino_dict = casino.dict()
    casino_dict["created_at"] = datetime.utcnow()
    casino_dict["total_clicks"] = 0
    casino_dict["total_conversions"] = 0
    casino_dict["total_revenue"] = 0.0
    
    try:
        casinos_collection.insert_one(casino_dict)
        casino_dict.pop('_id', None)
        return {"message": "Casino created successfully", "casino": casino_dict}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Casino already exists or error: {str(e)}")

@app.put("/api/casinos/{casino_name}")
async def update_casino(casino_name: str, casino_data: CasinoUpdate, admin: dict = Depends(get_admin_user)):
    update_data = {k: v for k, v in casino_data.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = casinos_collection.update_one(
        {"name": casino_name},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Casino not found")
    
    return {"message": "Casino updated successfully"}

@app.delete("/api/casinos/{casino_name}")
async def delete_casino(casino_name: str, admin: dict = Depends(get_admin_user)):
    result = casinos_collection.delete_one({"name": casino_name})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Casino not found")
    return {"message": "Casino deleted successfully"}

# ==================== User Casino Notes ====================

@app.get("/api/my-notes")
async def get_my_notes(current_user: dict = Depends(get_current_user)):
    notes = list(user_casino_notes_collection.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ))
    return {"notes": notes}

@app.post("/api/my-notes")
async def create_note(note_data: UserCasinoNote, current_user: dict = Depends(get_current_user)):
    # Check if note already exists
    existing = user_casino_notes_collection.find_one({
        "user_id": current_user["user_id"],
        "casino_name": note_data.casino_name
    })
    
    if existing:
        # Update existing note
        user_casino_notes_collection.update_one(
            {"user_id": current_user["user_id"], "casino_name": note_data.casino_name},
            {"$set": {
                "personal_rating": note_data.personal_rating,
                "notes": note_data.notes,
                "tags": note_data.tags,
                "is_favorite": note_data.is_favorite,
                "updated_at": datetime.utcnow()
            }}
        )
        return {"message": "Note updated successfully"}
    else:
        note = {
            "note_id": str(uuid.uuid4()),
            "user_id": current_user["user_id"],
            "casino_name": note_data.casino_name,
            "personal_rating": note_data.personal_rating,
            "notes": note_data.notes,
            "tags": note_data.tags or [],
            "is_favorite": note_data.is_favorite or False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        user_casino_notes_collection.insert_one(note)
        note.pop('_id', None)
        return {"message": "Note created successfully", "note": note}

@app.delete("/api/my-notes/{casino_name}")
async def delete_note(casino_name: str, current_user: dict = Depends(get_current_user)):
    result = user_casino_notes_collection.delete_one({
        "user_id": current_user["user_id"],
        "casino_name": casino_name
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Note deleted successfully"}

# ==================== Strategy Routes ====================

@app.get("/api/strategies")
async def get_strategies(category: Optional[str] = None, difficulty: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    if difficulty:
        query["difficulty"] = difficulty
    
    strategies = list(strategies_collection.find(query, {"_id": 0}).sort("created_at", DESCENDING))
    return {"strategies": strategies}

@app.get("/api/strategies/{strategy_id}")
async def get_strategy(strategy_id: str):
    strategy = strategies_collection.find_one({"strategy_id": strategy_id}, {"_id": 0})
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return strategy

@app.post("/api/strategies")
async def create_strategy(strategy: StrategyCreate, admin: dict = Depends(get_admin_user)):
    strategy_dict = strategy.dict()
    strategy_dict["strategy_id"] = str(uuid.uuid4())
    strategy_dict["created_at"] = datetime.utcnow()
    strategy_dict["views"] = 0
    
    strategies_collection.insert_one(strategy_dict)
    strategy_dict.pop('_id', None)
    return {"message": "Strategy created successfully", "strategy": strategy_dict}

@app.delete("/api/strategies/{strategy_id}")
async def delete_strategy(strategy_id: str, admin: dict = Depends(get_admin_user)):
    result = strategies_collection.delete_one({"strategy_id": strategy_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return {"message": "Strategy deleted successfully"}

# ==================== Click Tracking ====================

@app.post("/api/track-click")
async def track_click(click_data: ClickTrack, current_user: Optional[dict] = None):
    click = {
        "click_id": str(uuid.uuid4()),
        "casino_name": click_data.casino_name,
        "user_id": current_user["user_id"] if current_user else None,
        "clicked_at": datetime.utcnow(),
        "converted": click_data.converted,
        "revenue": click_data.revenue
    }
    
    clicks_collection.insert_one(click)
    
    # Update casino stats
    casinos_collection.update_one(
        {"name": click_data.casino_name},
        {
            "$inc": {
                "total_clicks": 1,
                "total_conversions": 1 if click_data.converted else 0,
                "total_revenue": click_data.revenue
            }
        }
    )
    
    return {"message": "Click tracked successfully"}

# ==================== Analytics ====================

@app.get("/api/analytics/admin")
async def get_admin_analytics(admin: dict = Depends(get_admin_user)):
    total_clicks = clicks_collection.count_documents({})
    total_conversions = clicks_collection.count_documents({"converted": True})
    
    # Calculate total revenue
    pipeline = [
        {"$group": {"_id": None, "total_revenue": {"$sum": "$revenue"}}}
    ]
    revenue_result = list(clicks_collection.aggregate(pipeline))
    total_revenue = revenue_result[0]["total_revenue"] if revenue_result else 0.0
    
    # Top casinos by clicks
    top_casinos = list(casinos_collection.find(
        {},
        {"_id": 0, "name": 1, "total_clicks": 1, "total_conversions": 1, "total_revenue": 1}
    ).sort("total_clicks", DESCENDING).limit(10))
    
    # Recent clicks
    recent_clicks = list(clicks_collection.find(
        {},
        {"_id": 0}
    ).sort("clicked_at", DESCENDING).limit(20))
    
    return {
        "total_clicks": total_clicks,
        "total_conversions": total_conversions,
        "total_revenue": total_revenue,
        "conversion_rate": (total_conversions / total_clicks * 100) if total_clicks > 0 else 0,
        "top_casinos": top_casinos,
        "recent_clicks": recent_clicks
    }

@app.get("/api/analytics/user")
async def get_user_analytics(current_user: dict = Depends(get_current_user)):
    # User's referrals to platform
    referrals = list(platform_referrals_collection.find(
        {"referrer_id": current_user["user_id"]},
        {"_id": 0}
    ))
    
    total_referrals = len(referrals)
    
    # Calculate referral earnings
    pipeline = [
        {"$match": {"referrer_id": current_user["user_id"]}},
        {"$group": {"_id": None, "total_earnings": {"$sum": "$earnings"}}}
    ]
    earnings_result = list(platform_referrals_collection.aggregate(pipeline))
    referral_earnings = earnings_result[0]["total_earnings"] if earnings_result else 0.0
    
    # User's favorite casinos
    favorites = list(user_casino_notes_collection.find(
        {"user_id": current_user["user_id"], "is_favorite": True},
        {"_id": 0, "casino_name": 1}
    ))
    
    return {
        "total_referrals": total_referrals,
        "referral_earnings": referral_earnings,
        "referral_code": current_user.get("referral_code", ""),
        "favorite_casinos": [f["casino_name"] for f in favorites]
    }

# ==================== Admin Routes ====================

@app.get("/api/admin/stats")
async def get_admin_stats(admin: dict = Depends(get_admin_user)):
    total_users = users_collection.count_documents({"role": "user"})
    total_casinos = casinos_collection.count_documents({})
    total_strategies = strategies_collection.count_documents({})
    total_clicks = clicks_collection.count_documents({})
    
    return {
        "total_users": total_users,
        "total_casinos": total_casinos,
        "total_strategies": total_strategies,
        "total_clicks": total_clicks
    }

@app.get("/api/admin/users")
async def get_all_users(admin: dict = Depends(get_admin_user)):
    users = list(users_collection.find(
        {"role": "user"},
        {"_id": 0, "password_hash": 0}
    ).sort("created_at", DESCENDING))
    return {"users": users}

# ==================== Referral Program ====================

@app.get("/api/referral-stats")
async def get_referral_stats(current_user: dict = Depends(get_current_user)):
    referrals_count = platform_referrals_collection.count_documents({
        "referrer_id": current_user["user_id"]
    })
    
    # Get referral details
    referrals = list(platform_referrals_collection.aggregate([
        {"$match": {"referrer_id": current_user["user_id"]}},
        {"$lookup": {
            "from": "users",
            "localField": "referred_user_id",
            "foreignField": "user_id",
            "as": "user_info"
        }},
        {"$project": {
            "_id": 0,
            "referred_user_id": 1,
            "created_at": 1,
            "earnings": 1,
            "user_name": {"$arrayElemAt": ["$user_info.name", 0]}
        }}
    ]))
    
    return {
        "referral_code": current_user.get("referral_code", ""),
        "total_referrals": referrals_count,
        "referrals": referrals
    }

# ==================== Health Check ====================

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "RROLL API - Gambling Strategy Platform", "version": "3.0.0"}

@app.get("/")
async def root():
    return {"message": "RROLL API v3.0 - Gambling Education & Strategy Platform"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
