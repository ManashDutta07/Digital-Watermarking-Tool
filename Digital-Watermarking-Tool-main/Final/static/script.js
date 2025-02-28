document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("imageInput");
    const uploadForm = document.getElementById("uploadForm");
    const imageContainer = document.getElementById("imageContainer");
    const uploadBtn = document.getElementById("uploadBtn");
    const opacityRange = document.getElementById("opacityRange");
    const opacityValue = document.getElementById("opacityValue");
    const colorPicker = document.getElementById("colorPicker");
    const watermarkText = document.getElementById("watermarkText");
    const clearBtn = document.getElementById("clearBtn");
    const validFormats = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic"];
    const maxFileSize = 5 * 1024 * 1024; // 5MB max file size
    let selectedFiles = [];

    // Handle file selection
    fileInput.addEventListener("change", (event) => {
        const files = Array.from(event.target.files);
        
        // Reset image preview and selected files
        imageContainer.innerHTML = "";
        selectedFiles = [];

        files.forEach((file, index) => {
            if (isValidFormat(file) && isValidSize(file)) {
                selectedFiles.push(file);
                previewImage(file, index);
            } else {
                alert("Invalid file format or size too large (Max: 5MB). Only PNG, JPEG, JPG, WEBP, and HEIC are allowed.");
            }
        });

        updateFileInput();
    });

    // Validate file format
    function isValidFormat(file) {
        return validFormats.includes(file.type);
    }

    // Validate file size
    function isValidSize(file) {
        return file.size <= maxFileSize;
    }

    // Preview images with remove button
    function previewImage(file, index) {
        const reader = new FileReader();
        reader.onload = () => {
            const imgBox = document.createElement("div");
            imgBox.classList.add("image-box");
            imgBox.dataset.index = index;

            imgBox.innerHTML = `
                <h3>Image Preview:</h3>
                <img src="${reader.result}" class="preview-img" alt="Original Image">
                <button class="remove-btn" data-index="${index}">Remove</button>
            `;

            imageContainer.appendChild(imgBox);

            // Attach event listener to the remove button
            imgBox.querySelector(".remove-btn").addEventListener("click", () => removeImage(index));
        };
        reader.readAsDataURL(file);
    }

    // Remove an image from the preview and selected files
    function removeImage(index) {
        selectedFiles = selectedFiles.filter((_, i) => i !== index);
        imageContainer.innerHTML = "";
        selectedFiles.forEach((file, i) => previewImage(file, i));
        updateFileInput();
    }

    // Update file input to reflect selected files
    function updateFileInput() {
        const dataTransfer = new DataTransfer();
        selectedFiles.forEach(file => dataTransfer.items.add(file));
        fileInput.files = dataTransfer.files;
    }

    // Handle form submission
    uploadForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (selectedFiles.length === 0) {
            alert("Please select at least one image first.");
            return;
        }

        if (!watermarkText.value.trim()) {
            alert("Please enter watermark text.");
            return;
        }

        // Disable button while processing
        uploadBtn.disabled = true;
        uploadBtn.textContent = "Processing...";

        const formData = new FormData();
        selectedFiles.forEach((file) => {
            formData.append("images", file);
        });
        formData.append("text", watermarkText.value.trim());
        formData.append("opacity", opacityRange.value);
        formData.append("color", colorPicker.value);

        try {
            let response = await fetch("/upload", { method: "POST", body: formData });
            let result = await response.json();

            if (response.ok && result.processed_images) {
                imageContainer.innerHTML = "";
                result.processed_images.forEach((imgData) => {
                    const imgBox = document.createElement("div");
                    imgBox.classList.add("image-box");
                    imgBox.innerHTML = `
                        <h3>Processed Image:</h3>
                        <img src="${imgData.watermarked_url}" class="preview-img" alt="Watermarked Image">
                        <a href="${imgData.watermarked_url}" download="watermarked_${imgData.original}" class="download-btn">Download</a>
                    `;
                    imageContainer.appendChild(imgBox);
                });
            } else {
                alert("Error: " + result.error);
            }
        } catch (error) {
            alert("Failed to connect to the server. Please try again later.");
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = "Apply Watermark";
        }
    });

    // Clear all selections
    clearBtn.addEventListener("click", () => {
        selectedFiles = [];
        imageContainer.innerHTML = "";
        fileInput.value = "";
    });

    // Update opacity value
    opacityRange.addEventListener("input", () => {
        opacityValue.textContent = `${opacityRange.value}%`;
    });
});
