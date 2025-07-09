from flask import Blueprint, request, jsonify
import joblib
import numpy as np
import os
import hashlib
import csv
from datetime import datetime

main = Blueprint("main", __name__)

# Load model on startup
model_path = os.path.join(os.path.dirname(__file__), "model", "phishing_model.pkl")
print(f"Looking for model at: {model_path}")

if os.path.exists(model_path):
    model = joblib.load(model_path)
else:
    model = None
    print("⚠️ Warning: Model not found. Be sure to train or provide 'phishing_model.pkl'.")

# ============================
# ROUTES
# ============================

@main.route("/", methods=["GET"])
def index():
    return jsonify({
        "message": "PhishNet backend is live!",
        "usage": "Send a POST request to /detect_phishing with JSON: { 'email': 'your email content' }"
    })

@main.route("/detect_phishing", methods=["POST"])
def detect_phishing():
    data = request.get_json()
    email_text = data.get("email", "")

    if model:
        prediction = model.predict([email_text])[0]
        result = "Phishing Email Detected!" if prediction == 1 else "Legitimate Email"
    else:
        result = "Model not loaded"

    return jsonify({"result": result})

# ============================
# Detection Log (CSV + Hash)
# ============================

LOG_FILE = os.path.join(os.path.dirname(__file__), "detection_log.csv")

@main.route("/log_detection", methods=["POST"])
def log_detection():
    data = request.get_json()
    email = data.get("email", "")
    result = data.get("result", "N/A")
    timestamp = datetime.utcnow().isoformat()

    # Hash the email for privacy
    email_hash = hashlib.sha256(email.encode()).hexdigest()

    # Log to CSV
    with open(LOG_FILE, "a", newline="") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow([timestamp, email_hash, result])

    return jsonify({"status": "logged", "hash": email_hash})

# ============================
# Feedback Endpoint
# ============================

FEEDBACK_FILE = os.path.join(os.path.dirname(__file__), "feedback_log.csv")

@main.route("/feedback", methods=["POST"])
def feedback():
    data = request.get_json()
    email_hash = data.get("email_hash", "")
    feedback_value = data.get("feedback", "").lower()

    if not email_hash or feedback_value not in ["up", "down"]:
        return jsonify({"error": "Missing or invalid feedback"}), 400

    timestamp = datetime.utcnow().isoformat() + "Z"
    log_entry = [timestamp, email_hash, feedback_value]

    try:
        with open(FEEDBACK_FILE, "a", newline="") as file:
            writer = csv.writer(file)
            writer.writerow(log_entry)
        return jsonify({"status": "feedback received"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
