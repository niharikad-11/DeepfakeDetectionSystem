from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import os
from datetime import datetime
from model_loader import load_deepfake_model
from utils import preprocess_image

app = Flask(__name__)
CORS(app)

# --- Configurations ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['JWT_SECRET_KEY'] = 'your_secret_key_here' # Change this for safety
app.config['UPLOAD_FOLDER'] = 'uploads'

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
model = load_deepfake_model()

# --- Database Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    history = db.relationship('History', backref='user', lazy=True)

class History(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(100))
    result = db.Column(db.String(20))
    confidence = db.Column(db.Float)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

# Create the database file
with app.app_context():
    db.create_all()

# --- Auth Routes ---
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    new_user = User(username=data['username'], password=hashed_password)
    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "User created successfully"}), 201
    except:
        return jsonify({"error": "Username already exists"}), 400

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username']).first()
    if user and bcrypt.check_password_hash(user.password, data['password']):
        access_token = create_access_token(identity=user.id)
        return jsonify(access_token=access_token), 200
    return jsonify({"error": "Invalid credentials"}), 401

# --- Prediction & History Routes ---
@app.route('/predict', methods=['POST'])
@jwt_required(optional=True) # Optional: allows guests to use it too
def predict():
    user_id = get_jwt_identity()
    file = request.files['file']
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(file_path)

    processed_data = preprocess_image(file_path)
 
    prediction = model.predict(processed_data)
    
    score = float(prediction[0][0])
    
   
    if score > 0.5:
        label = "Real"
        confidence = round(score * 100, 2)
    else:
        label = "Fake"
        confidence = round((1 - score) * 100, 2)
        
    # Save to history if user is logged in
    if user_id:
        new_history = History(filename=file.filename, result=label, confidence=confidence, user_id=user_id)
        db.session.add(new_history)
        db.session.commit()

    return jsonify({"label": label, "confidence": confidence})

@app.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    user_id = get_jwt_identity()
    user_history = History.query.filter_by(user_id=user_id).order_by(History.timestamp.desc()).all()
    history_list = [{"filename": h.filename, "result": h.result, "confidence": h.confidence, "date": h.timestamp.strftime("%Y-%m-%d %H:%M")} for h in user_history]
    return jsonify(history_list)

if __name__ == '__main__':
    app.run(debug=True, port=5000)