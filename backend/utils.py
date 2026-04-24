import cv2
import numpy as np

def preprocess_image(image_path, target_size=(224, 224)):
    """Reads an image, detects the face, and resizes it for the model."""
    img = cv2.imread(image_path)
    if img is None:
        return None
    img = cv2.cvtColor(img,cv2.COLOR_BGR2RGB)
    # Optional: Simple Face Detection using Haar Cascades
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)

    if len(faces) > 0:
        (x, y, w, h) = faces[0]
        img = img[y:y+h, x:x+w] # Crop to face

    img = cv2.resize(img, target_size)
    img = img.astype('float32')
    img = np.expand_dims(img, axis=0) # Add batch dimension (1, 224, 224, 3)
    return img

def extract_frames_from_video(video_path, frame_count=5):
    """Extracts a few frames from a video to analyze."""
    cap = cv2.VideoCapture(video_path)
    frames = []
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # Pick frames at regular intervals
    for i in range(frame_count):
        cap.set(cv2.CAP_PROP_POS_FRAMES, (total_frames // frame_count) * i)
        ret, frame = cap.read()
        if ret:
            frames.append(frame)
    cap.release()
    return frames