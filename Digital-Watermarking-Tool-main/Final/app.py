from flask import Flask, render_template, request, send_from_directory, jsonify
from PIL import Image, ImageDraw, ImageFont
import os

app = Flask(__name__)

# Define directories
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'watermarked'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

def hex_to_rgba(hex_color, alpha):
    """Converts a hex color to an RGBA tuple with a given alpha value."""
    hex_color = hex_color.lstrip("#")
    rgb = tuple(int(hex_color[i:i+2], 17) for i in (0, 2, 4))
    return (*rgb, alpha)

def add_watermark_overlay(input_image_path, output_image_path, watermark_text, opacity, color_hex):
    """Applies a watermark overlay with adjustable opacity, text, and diagonal lines."""
    try:
        input_image = Image.open(input_image_path).convert('RGBA')
        width, height = input_image.size

        # Create a transparent overlay
        overlay = Image.new('RGBA', input_image.size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(overlay)

        # Convert opacity percentage (0-100) to RGBA (0-255)
        alpha_value = int((opacity / 100) * 255)
        
        # Convert hex color to RGBA
        watermark_color = hex_to_rgba(color_hex, alpha_value)
        diagonal_color = hex_to_rgba(color_hex, alpha_value // 3)

        # Draw diagonal watermark lines
        step = 50  # Space between lines
        for i in range(-width, width + height, step):
            draw.line([(i, 0), (i + height, height)], fill=diagonal_color, width=5)

        # Load font (fallback to default if missing)
        font_size = max(40, width // 15)
        try:
            font = ImageFont.truetype('arial.ttf', font_size)
        except IOError:
            font = ImageFont.load_default()

        # Get text size
        bbox = draw.textbbox((0, 0), watermark_text, font=font)
        text_width, text_height = bbox[2] - bbox[0], bbox[3] - bbox[1]

        # Center the text
        x = (width - text_width) // 2
        y = (height - text_height) // 2

        # Apply watermark text
        draw.text((x, y), watermark_text, fill=watermark_color, font=font)

        # Merge the overlay with the original image
        watermarked_image = Image.alpha_composite(input_image, overlay)

        # Convert to RGB and save
        watermarked_image.convert("RGB").save(output_image_path)

        return True
    except Exception as e:
        print("Error processing image:", str(e))
        return False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    """Handles bulk image uploads and applies watermark with opacity, color, and diagonal lines."""
    try:
        if 'images' not in request.files:
            return jsonify({"error": "No files uploaded"}), 400

        files = request.files.getlist('images')
        if not files or all(f.filename == '' for f in files):
            return jsonify({"error": "No selected files"}), 400

        watermark_text = request.form.get("text", "").strip()  # Get user input
        opacity = int(request.form.get('opacity', 50))  # Default 50%
        color_hex = request.form.get('color', '#FFFFFF')  # Default White

        processed_images = []

        for file in files:
            file_path = os.path.join(UPLOAD_FOLDER, file.filename)
            file.save(file_path)

            output_path = os.path.join(OUTPUT_FOLDER, f'watermarked_{file.filename.replace(".jpg", ".png")}')

            if add_watermark_overlay(file_path, output_path, watermark_text, opacity, color_hex):
                processed_images.append({"original": file.filename, "watermarked_url": f"/watermarked/{os.path.basename(output_path)}"})

        if processed_images:
            return jsonify({"processed_images": processed_images})
        else:
            return jsonify({"error": "Failed to process images"}), 500
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/watermarked/<filename>')
def get_watermarked_image(filename):
    """Serves processed images."""
    return send_from_directory(OUTPUT_FOLDER, filename)

if __name__ == '__main__':
    app.run(debug=True)
