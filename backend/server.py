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

app = FastAPI(title="RROLL API", version="2.0.0")

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
user_links_collection = db.user_links
clicks_collection = db.clicks
analytics_collection = db.analytics

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

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class CasinoCreate(BaseModel):
    name: str
    category: str
    logoDomain: str
    desc: Optional[str] = None
    bonus: Optional[str] = None
    chips: List[str] = []

class UserLinkCreate(BaseModel):
    casino_name: str
    url: str
    note: Optional[str] = None

class UserLinkUpdate(BaseModel):
    url: Optional[str] = None
    note: Optional[str] = None
    custom_tags: Optional[List[str]] = None
    rating: Optional[int] = None

class ClickTrack(BaseModel):
    link_id: str

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
    """Seed initial casino data if collection is empty"""
    if casinos_collection.count_documents({}) == 0:
        casinos = [
            {"name": "wowvegas", "category": "sweepstakes", "logoDomain": "wowvegas.com", "desc": "Top sweepstakes pick with massive daily bonuses and fast SC redemptions.", "bonus": "1.5M WOW Coins + 30 SC Free on Signup", "chips": ["Instant Cashout","Daily Bonus","Sweepstakes"]},
            {"name": "luckyrush", "category": "sweepstakes", "logoDomain": "luckyrush.io", "desc": "Fast-growing sweepstakes platform with daily login bonuses.", "bonus": "", "chips": ["Daily Bonus","Sweepstakes"]},
            {"name": "stake.com", "category": "crypto", "logoDomain": "stake.com", "desc": "The world's biggest crypto casino. Provably fair games, massive sports book, and VIP rakeback.", "bonus": "", "chips": ["Sports","Live Dealer","Provably Fair","Crypto"]},
            {"name": "stake.us", "category": "sweepstakes", "logoDomain": "stake.us", "desc": "US-legal Stake with sweepstakes coins, sports betting, and live dealer.", "bonus": "", "chips": ["Sports","Live Dealer","Sweepstakes"]},
            {"name": "hello millions", "category": "sweepstakes", "logoDomain": "hellomillions.com", "desc": "High-quality sweepstakes casino with strong SC payout rates and a clean interface.", "bonus": "5 SC Free on Signup", "chips": ["Instant Cashout","Sweepstakes"]},
            {"name": "playfame", "category": "sweepstakes", "logoDomain": "playfame.com", "desc": "Fame-themed sweepstakes casino with generous referral rewards.", "bonus": "", "chips": ["Daily Bonus","Sweepstakes"]},
            {"name": "spin blitz", "category": "sweepstakes", "logoDomain": "spinblitz.com", "desc": "Slot-focused sweepstakes with fast spins and daily bonus drops.", "bonus": "", "chips": ["Daily Bonus","Sweepstakes"]},
            {"name": "mcluck", "category": "sweepstakes", "logoDomain": "mcluck.com", "desc": "App-based sweepstakes casino with strong RTP slots and referral code rewards.", "bonus": "Use code 1944571458", "chips": ["Mobile App","Sweepstakes"]},
            {"name": "real prize", "category": "sweepstakes", "logoDomain": "realprize.com", "desc": "Sweepstakes platform with real prize redemptions and referral bonuses.", "bonus": "", "chips": ["Instant Cashout","Sweepstakes"]},
            {"name": "spree", "category": "sweepstakes", "logoDomain": "spree.com", "desc": "Clean sweepstakes experience with a straightforward referral program.", "bonus": "", "chips": ["Sweepstakes"]},
            {"name": "legends", "category": "sweepstakes", "logoDomain": "legendz.com", "desc": "Sweepstakes casino with integrated sports betting and daily loyalty rewards.", "bonus": "", "chips": ["Sports","Daily Bonus","Sweepstakes"]},
            {"name": "superslots", "category": "other", "logoDomain": "superslots.ag", "desc": "Offshore slots and table games with a big welcome bonus package.", "bonus": "200% up to $6,000 Welcome Bonus", "chips": ["Offshore"]},
            {"name": "shuffle", "category": "crypto", "logoDomain": "shuffle.com", "desc": "Crypto casino with provably fair games, sports betting, and rakeback rewards.", "bonus": "", "chips": ["Sports","Provably Fair","Crypto"]},
            {"name": "ace", "category": "other", "logoDomain": "ace.com", "desc": "", "bonus": "", "chips": []},
            {"name": "luckyhands", "category": "other", "logoDomain": "luckyhands.com", "desc": "Sweepstakes poker platform with free chip bonuses on signup.", "bonus": "Free Chips on Signup", "chips": ["Poker"]},
            {"name": "taosweeps", "category": "sweepstakes", "logoDomain": "taosweeps.com", "desc": "Southwest-themed sweepstakes casino with fast SC payouts.", "bonus": "", "chips": ["Instant Cashout","Sweepstakes"]},
            {"name": "havanafortuna", "category": "sweepstakes", "logoDomain": "havanafortuna.com", "desc": "Cuban-themed sweepstakes casino with promo codes and daily bonuses.", "bonus": "", "chips": ["Daily Bonus","Sweepstakes"]},
            {"name": "crown coins casino", "category": "sweepstakes", "logoDomain": "crowncoinscasino.com", "desc": "", "bonus": "", "chips": ["Sweepstakes"]},
            {"name": "roobet", "category": "crypto", "logoDomain": "roobet.com", "desc": "Popular crypto casino with slots, originals, and sports.", "bonus": "", "chips": ["Sports","Crypto"]},
            {"name": "rainbet", "category": "crypto", "logoDomain": "rainbet.com", "desc": "", "bonus": "", "chips": ["Crypto"]},
            {"name": "chumba", "category": "sweepstakes", "logoDomain": "chumbacasino.com", "desc": "One of the original sweepstakes casinos. Huge game library.", "bonus": "", "chips": ["Sweepstakes"]},
            {"name": "bovada", "category": "other", "logoDomain": "bovada.lv", "desc": "Major offshore sportsbook and casino.", "bonus": "", "chips": ["Sports","Offshore"]},
        ]
        casinos_collection.insert_many(casinos)
        print("✅ Seeded casino data")

# Seed on startup
@app.on_event("startup")
async def startup_event():
    # Create indexes
    users_collection.create_index([("email", ASCENDING)], unique=True)
    users_collection.create_index([("user_id", ASCENDING)], unique=True)
    user_links_collection.create_index([("user_id", ASCENDING)])
    clicks_collection.create_index([("link_id", ASCENDING)])
    clicks_collection.create_index([("clicked_at", DESCENDING)])
    
    # Seed data
    seed_casinos()
    
    # Create admin user if doesn't exist
    admin_exists = users_collection.find_one({"email": "admin@rroll.com"})
    if not admin_exists:
        admin_user = {
            "user_id": str(uuid.uuid4()),
            "email": "admin@rroll.com",
            "name": "Admin",
            "password_hash": hash_password("admin123"),
            "role": "admin",
            "subscription_tier": "premium",
            "created_at": datetime.utcnow(),
            "total_clicks": 0,
            "total_conversions": 0,
            "estimated_earnings": 0
        }
        users_collection.insert_one(admin_user)
        print("✅ Created admin user: admin@rroll.com / admin123")

# ==================== Auth Routes ====================

@app.post("/api/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    if users_collection.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = {
        "user_id": str(uuid.uuid4()),
        "email": user_data.email,
        "name": user_data.name or user_data.email.split("@")[0],
        "password_hash": hash_password(user_data.password),
        "role": "user",
        "subscription_tier": "free",
        "created_at": datetime.utcnow(),
        "total_clicks": 0,
        "total_conversions": 0,
        "estimated_earnings": 0
    }
    
    users_collection.insert_one(user)
    
    access_token = create_access_token(data={"sub": user["user_id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "subscription_tier": user["subscription_tier"]
        }
    }

@app.post("/api/auth/login")
async def login(user_data: UserLogin):
    user = users_collection.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user["user_id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "subscription_tier": user["subscription_tier"]
        }
    }

@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "user_id": current_user["user_id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "role": current_user["role"],
        "subscription_tier": current_user["subscription_tier"],
        "total_clicks": current_user.get("total_clicks", 0),
        "total_conversions": current_user.get("total_conversions", 0),
        "estimated_earnings": current_user.get("estimated_earnings", 0)
    }

# ==================== Casino Routes ====================

@app.get("/api/casinos")
async def get_casinos():
    casinos = list(casinos_collection.find({}, {"_id": 0}))
    return {"casinos": casinos}

@app.post("/api/casinos")
async def create_casino(casino: CasinoCreate, admin: dict = Depends(get_admin_user)):
    casino_dict = casino.dict()
    casinos_collection.insert_one(casino_dict)
    return {"message": "Casino created successfully", "casino": casino_dict}

# ==================== User Links Routes ====================

@app.get("/api/user-links")
async def get_user_links(current_user: dict = Depends(get_current_user)):
    links = list(user_links_collection.find({"user_id": current_user["user_id"]}, {"_id": 0}))
    return {"links": links}

@app.post("/api/user-links")
async def create_user_link(link_data: UserLinkCreate, current_user: dict = Depends(get_current_user)):
    link = {
        "link_id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "casino_name": link_data.casino_name,
        "url": link_data.url,
        "note": link_data.note or "",
        "custom_tags": [],
        "rating": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "total_clicks": 0
    }
    
    user_links_collection.insert_one(link)
    # Remove _id for JSON serialization
    link.pop('_id', None)
    return {"message": "Link created successfully", "link": link}

@app.put("/api/user-links/{link_id}")
async def update_user_link(link_id: str, link_data: UserLinkUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in link_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = user_links_collection.update_one(
        {"link_id": link_id, "user_id": current_user["user_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Link not found")
    
    return {"message": "Link updated successfully"}

@app.delete("/api/user-links/{link_id}")
async def delete_user_link(link_id: str, current_user: dict = Depends(get_current_user)):
    result = user_links_collection.delete_one({"link_id": link_id, "user_id": current_user["user_id"]})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Link not found")
    
    return {"message": "Link deleted successfully"}

# ==================== Click Tracking ====================

@app.post("/api/track-click")
async def track_click(click_data: ClickTrack):
    click = {
        "click_id": str(uuid.uuid4()),
        "link_id": click_data.link_id,
        "clicked_at": datetime.utcnow()
    }
    
    clicks_collection.insert_one(click)
    
    # Update link click count
    user_links_collection.update_one(
        {"link_id": click_data.link_id},
        {"$inc": {"total_clicks": 1}}
    )
    
    # Update user total clicks
    link = user_links_collection.find_one({"link_id": click_data.link_id})
    if link:
        users_collection.update_one(
            {"user_id": link["user_id"]},
            {"$inc": {"total_clicks": 1}}
        )
    
    return {"message": "Click tracked successfully"}

# ==================== Analytics ====================

@app.get("/api/analytics/me")
async def get_my_analytics(current_user: dict = Depends(get_current_user)):
    # Get user's links with click data
    links = list(user_links_collection.find({"user_id": current_user["user_id"]}, {"_id": 0}))
    
    # Get total stats
    total_links = len(links)
    total_clicks = sum(link.get("total_clicks", 0) for link in links)
    
    # Get top performing links
    top_links = sorted(links, key=lambda x: x.get("total_clicks", 0), reverse=True)[:5]
    
    # Calculate estimated earnings (example: $0.50 per click)
    estimated_earnings = total_clicks * 0.50
    
    return {
        "total_links": total_links,
        "total_clicks": total_clicks,
        "estimated_earnings": estimated_earnings,
        "top_links": top_links,
        "links_by_category": {},
        "recent_activity": []
    }

@app.get("/api/analytics/leaderboard")
async def get_leaderboard():
    # Get top users by clicks
    users = list(users_collection.find(
        {"role": "user"},
        {"_id": 0, "user_id": 1, "name": 1, "total_clicks": 1, "estimated_earnings": 1}
    ).sort("total_clicks", DESCENDING).limit(10))
    
    return {"leaderboard": users}

# ==================== Admin Routes ====================

@app.get("/api/admin/stats")
async def get_admin_stats(admin: dict = Depends(get_admin_user)):
    total_users = users_collection.count_documents({"role": "user"})
    total_casinos = casinos_collection.count_documents({})
    total_links = user_links_collection.count_documents({})
    total_clicks = clicks_collection.count_documents({})
    
    return {
        "total_users": total_users,
        "total_casinos": total_casinos,
        "total_links": total_links,
        "total_clicks": total_clicks
    }

@app.get("/api/admin/users")
async def get_all_users(admin: dict = Depends(get_admin_user)):
    users = list(users_collection.find(
        {"role": "user"},
        {"_id": 0, "password_hash": 0}
    ))
    return {"users": users}

# ==================== Health Check ====================

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "RROLL API", "version": "2.0.0"}

@app.get("/")
async def root():
    return {"message": "RROLL API v2.0 - Referral Hub Backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
