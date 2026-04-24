import tensorflow as tf
import os

# Update this path to where your teammates saved the model
MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'deepfake_resnet50_final_robust.h5')

def load_deepfake_model():
    try:
        print(f"Loading model from {MODEL_PATH}...")
        model = tf.keras.models.load_model(MODEL_PATH)
        print("Model loaded successfully!")
        return model
    except Exception as e:
        print(f"Error loading model: {e}")
        return None