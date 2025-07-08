# train_model.py

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib
import os

# ✅ 1. Load your dataset
dataset_path = "phishing_dataset.csv"  # Update if your file has a different name
df = pd.read_csv(dataset_path)

print("My columns are:", df.columns)

# ✅ 2. Combine Subject + Body into one text field
df["text"] = df["subject"].fillna('') + " " + df["body"].fillna('')

# ✅ 3. Keep only text + label
df = df[["text", "label"]]
df = df.dropna()

# ✅ 4. Define X and y
X = df["text"]
y = df["label"]

# ✅ 5. Split the data into train/test sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# ✅ 6. Build the model pipeline
model = make_pipeline(TfidfVectorizer(), LogisticRegression())

# ✅ 7. Train the model
print("Training model...")
model.fit(X_train, y_train)

# ✅ 8. Evaluate the model
y_pred = model.predict(X_test)

print("\n📊 Evaluation Metrics:")
print("Accuracy:", accuracy_score(y_test, y_pred))
print("\nClassification Report:\n", classification_report(y_test, y_pred))
print("\nConfusion Matrix:\n", confusion_matrix(y_test, y_pred))

# ✅ 9. Save the model
output_dir = os.path.join("app", "model")
os.makedirs(output_dir, exist_ok=True)
model_path = os.path.join(output_dir, "phishing_model.pkl")
joblib.dump(model, model_path)

print(f"\n✅ Model trained and saved to {model_path}")
