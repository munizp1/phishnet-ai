from flask import Blueprint, request, jsonify
import joblib
import numpy as np
import os

main = Blueprint("main", __name__)

# Load model on startup
model_path = os.path.join(os.path.dirname(__file__), "model", "phishing_model.pkl")
print(f"Looking for model at: {model_path}")

if os.path.exists(model_path):
    model = joblib.load(model_path)
else:
    model = None
    print("⚠️ Warning: Model not found. Be sure to train or provide 'phishing_model.pkl'.")

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
        # Send the raw email text as a list to the model
        prediction = model.predict([email_text])[0]
        result = "Phishing Email Detected!" if prediction == 1 else "Legitimate Email"
    else:
        result = "Model not loaded"

    return jsonify({"result": result})
