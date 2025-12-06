// ===============================
// ✅ API URL
// ===============================
const API_URL = "https://finder-backend-v1i2.onrender.com/api/analyze";

let cameraStream = null;

// ===============================
// ✅ Trigger file upload
// ===============================
function triggerFileUpload() {
  const input = document.getElementById("file-input");
  if (input) input.click();
}

// ===============================
// ✅ Handle file selection upload
// ===============================
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return alert("No file selected.");

  const prompt = document.getElementById("search-prompt").value.trim();
  await sendImageToAPI(file, prompt);
}

// ===============================
// ✅ Open Camera
// ===============================
async function openCamera() {
  const modal = document.getElementById("camera-modal");
  const video = document.getElementById("camera-stream");

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });

    video.srcObject = cameraStream;
    modal.style.display = "flex";
  } catch (err) {
    console.error("Camera Error:", err);
    alert("Camera access failed. Check permissions.");
  }
}

// ===============================
// ✅ Close Camera
// ===============================
function closeCamera() {
  const modal = document.getElementById("camera-modal");
  const video = document.getElementById("camera-stream");

  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }

  video.srcObject = null;
  modal.style.display = "none";
}

// ===============================
// ✅ Capture Photo from Camera
// ===============================
async function capturePhoto() {
  const video = document.getElementById("camera-stream");

  if (!video.videoWidth || !video.videoHeight) {
    return alert("Camera not ready.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob(async blob => {
    const file = new File([blob], "camera.jpg", { type: "image/jpeg" });
    const prompt = document.getElementById("search-prompt").value.trim();

    closeCamera();
    await sendImageToAPI(file, prompt);
  }, "image/jpeg");
}

// ===============================
// ✅ Send Image + Prompt to Backend
// ===============================
async function sendImageToAPI(file, prompt) {
  const loading = document.getElementById("loading");
  const resultContainer = document.getElementById("result-container");

  resultContainer.style.display = "none";
  if (loading) loading.style.display = "flex";

  try {
    const formData = new FormData();

    // 📌 These names MUST match your backend!
    formData.append("image", file);
    formData.append("prompt", prompt || "all objects");

    console.log("📤 Sending to backend:", {
      fileName: file.name,
      prompt
    });

    const response = await fetch(API_URL, {
      method: "POST",
      body: formData
    });

    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`Invalid JSON: ${raw}`);
    }

    if (!response.ok) {
      console.error("❌ API returned error:", data);
      throw new Error(data.error || JSON.stringify(data));
    }

    console.log("✅ Success:", data);
    displayResults(data);

  } catch (error) {
    console.error("❌ FRONTEND ERROR:", error);
    alert(`Error: ${error.message}`);
  } finally {
    if (loading) loading.style.display = "none";
  }
}

// ===============================
// ✅ Display Results
// ===============================
function displayResults(data) {
  const resultContainer = document.getElementById("result-container");
  const resultImage = document.getElementById("result-image");
  const detectionInfo = document.getElementById("detection-info");

  let html = "";

  if (data.annotated_image) {
    resultImage.src = `data:image/png;base64,${data.annotated_image}`;
    resultImage.style.display = "block";
  } else {
    resultImage.style.display = "none";
  }

  if (data.message) {
    html += `
      <div style="padding:12px; margin-bottom:15px; border-left:4px solid #00FF7F; background:#e8f5e9; border-radius:8px;">
        <p style="margin:0;">✅ ${data.message}</p>
      </div>
    `;
  }

  if (data.detections?.length > 0) {
    data.detections.forEach(d => {
      html += `
        <div style="padding:12px; margin:8px 0; background:#f5f5f5; border-radius:8px; border-left:3px solid #00FF7F;">
          <div style="display:flex; justify-content:space-between;">
            <strong style="color:#00FF7F">${d.class}</strong>
            <span style="color:#666">${(d.confidence * 100).toFixed(1)}%</span>
          </div>
        </div>
      `;
    });

    html += `<p style="text-align:center; color:#777;">Total: ${data.total_detections}</p>`;
  } else {
    html += `
      <div style="padding:20px; background:#f9f9f9; border-radius:8px; text-align:center;">
        <p style="color:#999;">❌ No objects detected</p>
      </div>
    `;
  }

  detectionInfo.innerHTML = html;
  resultContainer.style.display = "block";
}

// ===============================
// ✅ Test backend connection
// ===============================
async function testConnection() {
  try {
    const healthUrl = API_URL.replace("/analyze", "/health");
    const res = await fetch(healthUrl);
    const json = await res.json();
    console.log("Backend health:", json);
  } catch (err) {
    console.warn("⚠️ Cannot reach backend", err);
  }
}

// ===============================
// ✅ Initialize
// ===============================
window.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Finder AI frontend loaded");
  testConnection();
});
