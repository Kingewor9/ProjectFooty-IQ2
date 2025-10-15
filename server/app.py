import os
import random
import string
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

# --- Utility Functions ---

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
        user_id = request.headers.get('X-USER-ID')
        if not user_id:
            # For testing, you must include a header like: X-USER-ID: some-unique-user-id
            return make_response(
                jsonify({"message": "Authentication Required: Missing X-USER-ID header."}),
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

# --- Server Start ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)
