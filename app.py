"""
Professional Image Processor - Flask Backend
=============================================
A full-featured image processing web application built with Flask and Pillow.
Supports resize, rotate, crop, flip, blur, sharpen, brightness, and grayscale operations.
"""

import os
import uuid
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file
from PIL import Image, ImageFilter, ImageEnhance
from werkzeug.utils import secure_filename

# ---------------------------------------------------------------------------
# Application Configuration
# ---------------------------------------------------------------------------

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB upload limit

# Directories for uploaded and processed images
UPLOAD_FOLDER = os.path.join(app.static_folder, "uploads")
PROCESSED_FOLDER = os.path.join(app.static_folder, "processed")
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}

# Ensure directories exist on startup
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)


def allowed_file(filename: str) -> bool:
    """Check whether the uploaded file has an allowed extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename to prevent collisions in the upload folder."""
    ext = original_filename.rsplit(".", 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}"
    return unique_name


def get_image_details(filepath: str) -> dict:
    """Return a dictionary of human-readable image metadata."""
    try:
        file_size_bytes = os.path.getsize(filepath)
        # Format file size for display
        if file_size_bytes < 1024:
            size_str = f"{file_size_bytes} B"
        elif file_size_bytes < 1024 * 1024:
            size_str = f"{file_size_bytes / 1024:.1f} KB"
        else:
            size_str = f"{file_size_bytes / (1024 * 1024):.2f} MB"

        with Image.open(filepath) as img:
            width, height = img.size
            img_format = img.format or filepath.rsplit(".", 1)[1].upper()

        return {
            "filename": os.path.basename(filepath),
            "size": size_str,
            "resolution": f"{width} × {height}",
            "width": width,
            "height": height,
            "format": img_format,
        }
    except Exception as exc:
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    """Render the main application page."""
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload_image():
    """
    Handle image upload.
    Validates the file, saves it to the uploads directory,
    and returns image metadata as JSON.
    """
    if "image" not in request.files:
        return jsonify({"error": "No image file provided."}), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Allowed: JPG, JPEG, PNG."}), 400

    # Save uploaded file with a unique name
    original_name = secure_filename(file.filename)
    unique_name = generate_unique_filename(original_name)
    filepath = os.path.join(UPLOAD_FOLDER, unique_name)
    file.save(filepath)

    # Gather image details
    details = get_image_details(filepath)
    if "error" in details:
        os.remove(filepath)
        return jsonify({"error": f"Failed to read image: {details['error']}"}), 400

    return jsonify({
        "success": True,
        "filename": unique_name,
        "original_name": original_name,
        "url": f"/static/uploads/{unique_name}",
        "details": details,
    })


@app.route("/process", methods=["POST"])
def process_image():
    """
    Apply the requested processing operation to the uploaded image.
    Supported operations: resize, rotate, grayscale, flip_h, flip_v,
    blur, sharpen, brightness, crop.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request data."}), 400

    filename = data.get("filename")
    operation = data.get("operation")

    if not filename or not operation:
        return jsonify({"error": "Filename and operation are required."}), 400

    source_path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(source_path):
        return jsonify({"error": "Source image not found."}), 404

    try:
        img = Image.open(source_path)

        # ---- Resize ----
        if operation == "resize":
            width = int(data.get("width", img.width))
            height = int(data.get("height", img.height))
            if width <= 0 or height <= 0:
                return jsonify({"error": "Width and height must be positive integers."}), 400
            if width > 10000 or height > 10000:
                return jsonify({"error": "Maximum dimension is 10 000 px."}), 400
            img = img.resize((width, height), Image.LANCZOS)

        # ---- Rotate ----
        elif operation == "rotate":
            angle = float(data.get("angle", 0))
            img = img.rotate(-angle, expand=True, fillcolor=(0, 0, 0, 0) if img.mode == "RGBA" else None)

        # ---- Grayscale ----
        elif operation == "grayscale":
            img = img.convert("L")

        # ---- Flip Horizontal ----
        elif operation == "flip_h":
            img = img.transpose(Image.FLIP_LEFT_RIGHT)

        # ---- Flip Vertical ----
        elif operation == "flip_v":
            img = img.transpose(Image.FLIP_TOP_BOTTOM)

        # ---- Blur ----
        elif operation == "blur":
            radius = float(data.get("radius", 2))
            if radius < 0 or radius > 50:
                return jsonify({"error": "Blur radius must be between 0 and 50."}), 400
            img = img.filter(ImageFilter.GaussianBlur(radius=radius))

        # ---- Sharpen ----
        elif operation == "sharpen":
            factor = float(data.get("factor", 2.0))
            if factor < 0 or factor > 10:
                return jsonify({"error": "Sharpen factor must be between 0 and 10."}), 400
            enhancer = ImageEnhance.Sharpness(img)
            img = enhancer.enhance(factor)

        # ---- Brightness ----
        elif operation == "brightness":
            factor = float(data.get("factor", 1.0))
            if factor < 0 or factor > 5:
                return jsonify({"error": "Brightness factor must be between 0 and 5."}), 400
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(factor)

        # ---- Crop ----
        elif operation == "crop":
            left = int(data.get("left", 0))
            top = int(data.get("top", 0))
            right = int(data.get("right", img.width))
            bottom = int(data.get("bottom", img.height))
            if left < 0 or top < 0 or right > img.width or bottom > img.height:
                return jsonify({"error": "Crop coordinates out of bounds."}), 400
            if left >= right or top >= bottom:
                return jsonify({"error": "Invalid crop area."}), 400
            img = img.crop((left, top, right, bottom))

        else:
            return jsonify({"error": f"Unknown operation: {operation}"}), 400

        # Save processed image
        processed_name = f"processed_{uuid.uuid4().hex[:8]}_{filename}"
        # Ensure we save in a compatible mode
        if img.mode == "RGBA" and processed_name.lower().endswith((".jpg", ".jpeg")):
            img = img.convert("RGB")
        if img.mode == "L" and processed_name.lower().endswith((".jpg", ".jpeg")):
            img = img.convert("RGB")

        processed_path = os.path.join(PROCESSED_FOLDER, processed_name)
        img.save(processed_path, quality=95)

        # Get processed image details
        details = get_image_details(processed_path)

        return jsonify({
            "success": True,
            "processed_filename": processed_name,
            "url": f"/static/processed/{processed_name}",
            "details": details,
        })

    except ValueError as ve:
        return jsonify({"error": f"Invalid parameter value: {ve}"}), 400
    except Exception as exc:
        return jsonify({"error": f"Processing failed: {exc}"}), 500


@app.route("/download/<filename>")
def download_image(filename):
    """Serve the processed image as a downloadable file."""
    filepath = os.path.join(PROCESSED_FOLDER, filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found."}), 404
    return send_file(filepath, as_attachment=True)


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("\n  ✦  Professional Image Processor")
    print("  ✦  Running at http://10.71.243.211:5000\n")
    app.run(debug=True, host="0.0.0.0", port=5000)
