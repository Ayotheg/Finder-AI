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
  console.log("🔍 handleFileUpload called");
  console.log("Event:", event);
  console.log("Event.target:", event.target);
  console.log("Event.target.files:", event.target.files);
  
  const file = event.target.files[0];
  console.log("📁 File object:", file);
  
  if (!file) {
    console.error("❌ No file in event.target.files[0]");
    return alert("No file selected.");
  }

  console.log("✅ File captured:", {
    name: file.name,
    size: file.size,
    type: file.type
  });

  const prompt = document.getElementById("search-prompt").value.trim();
  console.log("📝 Prompt:", prompt);
  
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
    // ✅ FIX: Create FormData properly
    const formData = new FormData();
    
    // CRITICAL: Append the actual file object, not empty FormData
    formData.append("image", file, file.name);
    formData.append("prompt", prompt || "all objects");

    console.log("📤 Sending to backend:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      prompt: prompt || "all objects"
    });

    // ✅ Verify FormData has content
    console.log("FormData entries:");
    for (let [key, value] of formData.entries()) {
      console.log(key, value);
    }

    const response = await fetch(API_URL, {
      method: "POST",
      body: formData
      // ✅ Don't set Content-Type header - browser sets it automatically with boundary
    });

    const raw = await response.text();
    console.log("📥 Raw response:", raw);

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`Invalid JSON: ${raw}`);
    }

    if (!response.ok) {
      console.error("❌ API returned error:", data);
      throw new Error(data.error || data.details || JSON.stringify(data));
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
// ✅ Display Results with Better Logic
// ===============================
function displayResults(data) {
  const resultContainer = document.getElementById("result-container");
  const resultImage = document.getElementById("result-image");
  const detectionInfo = document.getElementById("detection-info");

  let html = "";

  // Show annotated image if available
  if (data.annotated_image) {
    resultImage.src = `data:image/png;base64,${data.annotated_image}`;
    resultImage.style.display = "block";
  } else {
    resultImage.style.display = "none";
  }

  // Check if we have detections
  const hasDetections = data.detections && data.detections.length > 0;
  const hasAnnotation = data.annotated_image && data.annotated_image.length > 0;

  // Success message based on actual results
  if (hasDetections || hasAnnotation) {
    html += `
      <div style="padding:15px; margin-bottom:15px; border-left:4px solid #00FF7F; background:#e8f5e9; border-radius:8px; box-shadow: 0 2px 4px rgba(0,255,127,0.1);">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:24px;">✅</span>
          <p style="margin:0; font-weight:600; color:#00AA55;">Detection Complete!</p>
        </div>
        <p style="margin:8px 0 0 32px; font-size:14px; color:#666;">
          ${hasDetections ? `Found ${data.total_detections} object${data.total_detections !== 1 ? 's' : ''}` : 'Image processed successfully'}
        </p>
      </div>
    `;
  }

  // Display individual detections
  if (hasDetections) {
    html += `<div style="margin-top:20px;">`;
    html += `<h4 style="margin-bottom:12px; color:#333; font-size:16px;">Detected Objects:</h4>`;
    
    data.detections.forEach((d, index) => {
      const confidencePercent = (d.confidence * 100).toFixed(1);
      const confidenceColor = d.confidence > 0.7 ? '#00FF7F' : d.confidence > 0.5 ? '#FFA500' : '#FF6B6B';
      
      html += `
        <div style="padding:14px; margin:10px 0; background:#ffffff; border-radius:10px; border-left:4px solid ${confidenceColor}; box-shadow: 0 2px 6px rgba(0,0,0,0.08); transition: transform 0.2s;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="background:${confidenceColor}; color:white; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold;">${index + 1}</span>
              <strong style="color:#333; font-size:15px;">${d.class || 'Unknown'}</strong>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="width:40px; height:6px; background:#e0e0e0; border-radius:3px; overflow:hidden;">
                <div style="width:${confidencePercent}%; height:100%; background:${confidenceColor}; border-radius:3px;"></div>
              </div>
              <span style="color:#666; font-weight:600; font-size:14px;">${confidencePercent}%</span>
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    html += `
      <div style="margin-top:16px; padding:12px; background:#f8f9fa; border-radius:8px; text-align:center;">
        <p style="margin:0; color:#666; font-size:14px;">
          <strong style="color:#00FF7F; font-size:18px;">${data.total_detections}</strong> 
          object${data.total_detections !== 1 ? 's' : ''} detected in total
        </p>
      </div>
    `;
  } else if (hasAnnotation) {
    // Has annotation but no detection data
    html += `
      <div style="padding:20px; background:#fff3cd; border-left:4px solid #ffc107; border-radius:8px; text-align:center; margin-top:15px;">
        <p style="margin:0; color:#856404;">
          <strong>⚠️ Processing complete</strong><br/>
          <span style="font-size:14px;">Visualization generated but no detection details available</span>
        </p>
      </div>
    `;
  } else {
    // No detections and no annotation
    html += `
      <div style="padding:25px; background:#fff5f5; border-left:4px solid #ff6b6b; border-radius:10px; text-align:center; margin-top:15px;">
        <div style="font-size:48px; margin-bottom:10px;">🔍</div>
        <p style="margin:0; color:#c92a2a; font-weight:600; font-size:16px;">No Objects Found</p>
        <p style="margin:8px 0 0 0; color:#666; font-size:14px;">
          Try adjusting your search terms or upload a different image
        </p>
        <div style="margin-top:15px; padding:12px; background:#ffffff; border-radius:6px;">
          <p style="margin:0; font-size:13px; color:#999;">
            💡 <strong>Tips:</strong> Use specific object names like "phone", "keys", "cup" or "book"
          </p>
        </div>
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
    console.log("✅ Backend health:", json);
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