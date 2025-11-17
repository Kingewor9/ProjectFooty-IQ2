import os
import random
import string
import logging
from datetime import datetime, timedelta
import re # Import regex module for search functionality
from functools import wraps
from dotenv import load_dotenv
from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
app = Flask(__name__)
# Enable CORS for frontend communication and allow custom headers
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/api/leagues/*": {"origins": "*"}}, supports_credentials=True, allow_headers=['Content-Type', 'Authorization', 'X-API-KEY', 'X-USER-ID'])

# Securely retrieve configurations
MONGO_URI = os.environ.get("MONGO_URI")
ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY") 

if not MONGO_URI:
    print("FATAL ERROR: MONGO_URI environment variable not set.")
    exit(1)
if not ADMIN_API_KEY:
    print("FATAL ERROR: ADMIN_API_KEY environment variable not set. This is needed for admin operations.")
    exit(1)

# Initialize MongoDB Client
try:
    client = MongoClient(MONGO_URI)
    db = client.quiz_database
    print("Successfully connected to MongoDB!")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    exit(1)

# --- Utility Functions ----

def generate_unique_code(collection):
    """Generates a unique 6-digit alphanumeric code for private leagues."""
    characters = string.ascii_uppercase + string.digits
    MAX_ATTEMPTS = 10
    for _ in range(MAX_ATTEMPTS):
        code = ''.join(random.choice(characters) for _ in range(6))
        # Check if the code already exists in the database
        if collection.find_one({"code": code}) is None:
            return code
    raise Exception("Could not generate a unique league code after several attempts.")

# --- Authentication Decorators ---

def admin_required(f):
    """
    Decorator to protect admin routes, requiring the correct ADMIN_API_KEY 
    to be present in the 'X-API-KEY' request header.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        api_key_header = request.headers.get('X-API-KEY')
        if not api_key_header or api_key_header != ADMIN_API_KEY:
            return make_response(
                jsonify({"message": "Authorization Failed: Missing or invalid API key."}),
                401
            )
        return f(*args, **kwargs)
    return decorated

def user_required(f):
    """
    Decorator to mock user authentication by requiring an 'X-User-ID' header.
    This simulates a successful login where the backend receives the user's ID
    for specific data operations (like managing leagues).
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # Allow user id to be passed via header, JSON body, or query param to match frontend usage
        user_id = None
        # 1) header
        user_id = request.headers.get('X-USER-ID')
        # 2) JSON body
        if not user_id:
            try:
                body = request.get_json(silent=True) or {}
            except Exception:
                body = {}
            user_id = body.get('user_id') or body.get('creator_id') or body.get('userId')
        # 3) query param
        if not user_id:
            user_id = request.args.get('user_id') or request.args.get('userId')

        if not user_id:
            return make_response(
                jsonify({"message": "Authentication Required: Missing user identifier (X-USER-ID header, user_id body, or user_id query)."}),
                401
            )

        # Pass the extracted user_id to the decorated function
        return f(user_id, *args, **kwargs)
    return decorated

# --- Public Routes ---

@app.route('/api/status', methods=['GET'])
def get_status():
    """Simple status check route."""
    try:
        client.admin.command('ping')
        db_status = "Connected"
        quiz_count = db.questions.count_documents({})
    except Exception:
        db_status = "Failed"
        quiz_count = 0

    return jsonify({
        "status": "Server Running",
        "database": db_status,
        "quiz_count": quiz_count
    })

@app.route('/api/questions', methods=['GET'])
def get_questions():
    """Fetches a list of quiz questions."""
    questions_collection = db.questions
    questions_cursor = questions_collection.find({})
    
    questions_list = []
    for q in questions_cursor:
        # Convert MongoDB's ObjectId to a string for JSON serialization
        q['_id'] = str(q.get('_id', ''))
        questions_list.append(q)

    return jsonify(questions_list)

@app.route('/api/leagues/search', methods=['GET'])
def search_leagues():
    """
    Searches for public leagues based on an optional query string (q).
    Returns league name, description, and member count.
    """
    leagues_collection = db.leagues
    
    # Get the search query from URL parameters
    query_string = request.args.get('q', '').strip()
    
    # Base query: must be a public league
    mongo_query = {"is_private": False}
    
    if query_string:
        # Create a regex pattern for case-insensitive search
        regex_pattern = re.compile(query_string, re.IGNORECASE)
        
        # Add OR condition to search name or description
        mongo_query['$or'] = [
            {"name": {"$regex": regex_pattern}},
            {"description": {"$regex": regex_pattern}}
        ]

    try:
        leagues_cursor = leagues_collection.find(mongo_query)
        
        leagues_list = []
        for league in leagues_cursor:
            
            # Count members safely
            member_count = len(league.get('members', []))
            
            # Prepare the public-facing league data
            leagues_list.append({
                "league_id": str(league.get('_id')),
                "name": league.get('name'),
                "description": league.get('description'),
                "member_count": member_count,
            })
            # Limiting to 3 results as requested for display demonstration
            if len(leagues_list) >= 3:
                 break

        return jsonify(leagues_list), 200

    except Exception as e:
        print(f"Error during league search: {e}")
        return jsonify({"message": f"An unexpected error occurred during league search: {e}"}), 500


# Backwards-compatible single-route used by frontend: /api/league/search?query=...
@app.route('/api/league/search', methods=['GET'])
def search_league_frontend():
    # Map 'query' (frontend) to our implementation that expects 'q'
    q = request.args.get('query')
    # Build args for internal function and call it by reusing logic
    # Simpler: call search_leagues but temporarily set request args
    # We'll just reuse the same logic here for parity
    leagues_collection = db.leagues
    query_string = q.strip() if q else ''
    mongo_query = {"is_private": False}
    if query_string:
        regex_pattern = re.compile(query_string, re.IGNORECASE)
        mongo_query['$or'] = [{"name": {"$regex": regex_pattern}}, {"description": {"$regex": regex_pattern}}]
    try:
        leagues_cursor = leagues_collection.find(mongo_query)
        leagues_list = []
        for league in leagues_cursor:
            member_count = len(league.get('members', []))
            leagues_list.append({
                "league_id": str(league.get('_id')),
                "name": league.get('name'),
                "description": league.get('description'),
                "member_count": member_count,
            })
            if len(leagues_list) >= 10:
                break
        return jsonify(leagues_list), 200
    except Exception as e:
        print(f"Error during league search (frontend route): {e}")
        return jsonify({"message": "Error searching leagues."}), 500


# --- Admin Route (Protected) ---

@app.route('/api/admin/quiz/upload', methods=['POST'])
@admin_required
def upload_quiz():
    """Accepts a list of quiz questions, clears the old collection, and inserts the new data."""
    questions_collection = db.questions
    
    try:
        data = request.get_json()
        
        if not data or not isinstance(data, list) or not data:
            return jsonify({"message": "Invalid data format. Expected a non-empty list of question objects."}), 400

        # 1. Clear the existing questions collection
        delete_result = questions_collection.delete_many({})
        
        # 2. Insert the new quiz questions
        insert_result = questions_collection.insert_many(data)
        
        return jsonify({
            "message": "Quiz questions successfully updated.",
            "inserted_count": len(insert_result.inserted_ids),
            "deleted_count": delete_result.deleted_count
        }), 201

    except Exception as e:
        print(f"Error during quiz upload: {e}")
        return jsonify({"message": f"An unexpected error occurred during database operation: {e}"}), 500

# --- League Management Routes (Protected by user_required) ---

@app.route('/api/leagues/create', methods=['POST'])
@user_required
def create_league(user_id):
    """
    Creates a new public or private league. 
    Public leagues are open, private leagues get a 6-digit code.
    """
    leagues_collection = db.leagues
    
    try:
        data = request.get_json()
        name = data.get('name')
        description = data.get('description', '')
        is_private = data.get('is_private', False)
        
        if not name or len(name.strip()) < 3:
            return jsonify({"message": "League name must be provided and be at least 3 characters long."}), 400

        league_data = {
            "name": name.strip(),
            "description": description.strip(),
            "creator_id": user_id,
            "is_private": is_private,
            "code": None,
            "members": [user_id] # Creator is automatically the first member
        }

        if is_private:
            # Generate and assign a unique 6-digit code
            unique_code = generate_unique_code(leagues_collection)
            league_data['code'] = unique_code
        
        insert_result = leagues_collection.insert_one(league_data)
        
        response = {
            "message": "League created successfully.",
            "league_id": str(insert_result.inserted_id),
            "is_private": is_private
        }
        if is_private:
            response['code'] = unique_code

        return jsonify(response), 201

    except Exception as e:
        print(f"Error during league creation: {e}")
        return jsonify({"message": f"An unexpected error occurred during league creation: {e}"}), 500


@app.route('/api/leagues/join/check', methods=['POST'])
@user_required
def check_join_league(user_id):
    """
    Looks up a private league using its 6-digit code to allow the user 
    to view details before confirming the join action.
    """
    leagues_collection = db.leagues
    
    try:
        data = request.get_json()
        code = data.get('code', '').strip().upper()
        
        if len(code) != 6:
            return jsonify({"message": "Code must be exactly 6 characters long."}), 400
        
        # Find the league by the unique code, ensuring it is a private league
        league = leagues_collection.find_one({"code": code, "is_private": True})
        
        if not league:
            return jsonify({"message": "No private league found with that code."}), 404

        # Check if the user is already a member
        is_member = user_id in league.get('members', [])
        
        # Return public-facing details for confirmation
        return jsonify({
            "message": "League found. Please confirm joining.",
            "league_id": str(league['_id']),
            "name": league['name'],
            "description": league['description'],
            "is_member": is_member
        }), 200

    except Exception as e:
        print(f"Error during league check: {e}")
        return jsonify({"message": f"An unexpected error occurred during league lookup: {e}"}), 500


@app.route('/api/leagues/join/confirm', methods=['POST'])
@user_required
def confirm_join_league(user_id):
    """Confirms the join action and adds the user to the league's member list."""
    leagues_collection = db.leagues
    
    try:
        data = request.get_json()
        code = data.get('code', '').strip().upper()
        
        if len(code) != 6:
            return jsonify({"message": "Code must be exactly 6 characters long."}), 400

        # Find the league and add the user_id to the members array if not already present
        result = leagues_collection.update_one(
            # Criteria: match code, is private, and user is NOT already in members
            {"code": code, "is_private": True, "members": {"$ne": user_id}}, 
            # Action: Add user_id to members set (safe for no duplicates)
            {"$addToSet": {"members": user_id}} 
        )
        
        # If no documents were modified, check why (already a member or not found)
        if result.modified_count == 0:
            league = leagues_collection.find_one({"code": code, "is_private": True})
            if league:
                if user_id in league.get('members', []):
                    return jsonify({"message": "You are already a member of this league."}), 200
                else:
                    return jsonify({"message": "League not found or not private."}), 404
            else:
                 return jsonify({"message": "League not found or not private."}), 404


        return jsonify({"message": "Successfully joined the league!", "members_added": result.modified_count}), 200

    except Exception as e:
        print(f"Error during league join confirmation: {e}")
        return jsonify({"message": f"An unexpected error occurred during joining: {e}"}), 500


# --- Telegram Authentication Endpoint ---
@app.route('/api/auth/telegram', methods=['POST'])
def auth_telegram():
    """Verify Telegram WebApp init data and create/update a user in MongoDB.

    Expected JSON body: { "init_data": "key1=value1&key2=value2..." }
    Or: { "user": { ... } } (initDataUnsafe payload) - verification skipped only if TELEGRAM_BOT_TOKEN missing
    """
    users = db.users
    data = request.get_json() or {}

    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')

    # If client provided full init_data string, parse it
    init_data_str = data.get('init_data')
    user_obj = data.get('user')

    parsed = {}
    if init_data_str:
        # Parse query-string like input
        try:
            pairs = [p for p in init_data_str.split('&') if p]
            for p in pairs:
                k, v = p.split('=', 1)
                parsed[k] = v
        except Exception:
            return jsonify({'message': 'Invalid init_data format.'}), 400

        provided_hash = parsed.pop('hash', None)
        if bot_token:
            # Verify per Telegram docs
            try:
                import hashlib, hmac
                data_check_arr = []
                for key in sorted(parsed.keys()):
                    data_check_arr.append(f"{key}={parsed[key]}")
                data_check_string = '\n'.join(data_check_arr)
                secret_key = hashlib.sha256(bot_token.encode()).digest()
                hmac_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
                if not provided_hash or hmac_hash != provided_hash:
                    return jsonify({'message': 'Telegram init data verification failed.'}), 401
            except Exception as ex:
                print('Telegram verification error:', ex)
                return jsonify({'message': 'Telegram verification error.'}), 500
        # Map parsed to a user object
        user_obj = parsed.get('user') if parsed.get('user') else {
            'id': parsed.get('id'),
            'first_name': parsed.get('first_name'),
            'last_name': parsed.get('last_name'),
            'username': parsed.get('username')
        }

    if not user_obj:
        return jsonify({'message': 'Missing user data for Telegram authentication.'}), 400

    # Normalize id
    tg_id = str(user_obj.get('id') or user_obj.get('user_id') or user_obj.get('userId'))
    if not tg_id:
        return jsonify({'message': 'Telegram user id missing.'}), 400

    # Upsert user document
    try:
        now = datetime.utcnow()
        user_doc = {
            'telegram_id': tg_id,
            'first_name': user_obj.get('first_name') or user_obj.get('firstName') or '',
            'last_name': user_obj.get('last_name') or user_obj.get('lastName') or '',
            'username': user_obj.get('username') or user_obj.get('user_name') or '',
            'updated_at': now,
        }

        # Initialize scores if new
        existing = users.find_one({'telegram_id': tg_id})
        if not existing:
            user_doc.update({'overall_score': 0, 'created_at': now})
            users.insert_one(user_doc)
        else:
            users.update_one({'telegram_id': tg_id}, {'$set': user_doc})

        # Return lightweight profile
        profile = users.find_one({'telegram_id': tg_id}, {'_id': 0})
        return jsonify({'message': 'Authentication successful', 'user': profile}), 200
    except Exception as ex:
        print('Error creating/updating user:', ex)
        return jsonify({'message': 'Internal server error while creating user.'}), 500


# --- Scoring & Leaderboard Endpoints ---
@app.route('/api/score/submit', methods=['POST'])
@user_required
def submit_score(user_id):
    """Submit quiz results and update user's overall score and leaderboard."""
    try:
        body = request.get_json() or {}
        points = int(body.get('points', 0))
        correct = int(body.get('correct', 0))
        answered = int(body.get('answered', 0))
        quiz_id = body.get('quiz_id')

        users = db.users
        results = db.results

        now = datetime.utcnow()
        # Record the result
        res_doc = {
            'telegram_id': str(user_id),
            'quiz_id': quiz_id,
            'points': points,
            'correct': correct,
            'answered': answered,
            'timestamp': now
        }
        results.insert_one(res_doc)

        # Update user's overall score
        users.update_one({'telegram_id': str(user_id)}, {'$inc': {'overall_score': points}, '$set': {'updated_at': now}}, upsert=True)

        user = users.find_one({'telegram_id': str(user_id)})
        overall = user.get('overall_score', 0)

        # Compute simple rank (1-based) - count users with higher score + 1
        higher_count = users.count_documents({'overall_score': {'$gt': overall}})
        rank = higher_count + 1

        return jsonify({'message': 'Score submitted', 'overall_score': overall, 'rank': rank}), 200
    except Exception as e:
        print('Error submitting score:', e)
        return jsonify({'message': 'Error submitting score.'}), 500


@app.route('/api/leaderboard/global', methods=['GET'])
def global_leaderboard():
    """Return top users by overall_score."""
    try:
        limit = int(request.args.get('limit', 50))
        users = db.users
        cursor = users.find({}, {'_id': 0, 'telegram_id': 1, 'username': 1, 'first_name': 1, 'overall_score': 1}).sort('overall_score', -1).limit(limit)

        leaderboard = []
        rank = 1
        for u in cursor:
            display_name = u.get('username') or u.get('first_name') or f"user_{u.get('telegram_id')}"
            leaderboard.append({
                'id': str(u.get('telegram_id')),
                'userName': display_name,
                'gamePoints': int(u.get('overall_score') or 0),
                'currentRank': rank,
                'previousRank': None,
                'avatarUrl': u.get('avatar_url') or ''
            })
            rank += 1

        return jsonify(leaderboard), 200
    except Exception as e:
        print('Error fetching leaderboard:', e)
        return jsonify({'message': 'Error fetching leaderboard.'}), 500


@app.route('/api/leagues/my', methods=['GET'])
def my_leagues():
    """Return leagues where the requesting user is a member. Accepts user_id via header/body/query."""
    # Use same resolution as user_required
    uid = request.headers.get('X-USER-ID') or request.args.get('user_id')
    if not uid:
        try:
            uid = (request.get_json(silent=True) or {}).get('user_id')
        except Exception:
            uid = None
    if not uid:
        return jsonify({'message': 'Missing user_id'}), 400

    try:
        leagues = db.leagues
        cursor = leagues.find({'members': uid})
        out = []
        for l in cursor:
            out.append({
                'id': str(l.get('_id')),
                'name': l.get('name'),
                'description': l.get('description'),
                'isOwner': l.get('creator_id') == uid,
                'members': len(l.get('members', [])),
                'points': l.get('points', 0)
            })
        return jsonify(out), 200
    except Exception as e:
        print('Error fetching my leagues:', e)
        return jsonify({'message': 'Error fetching my leagues.'}), 500

# --- Server Start ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)
 