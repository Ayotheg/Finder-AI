// --- API Configuration ---
const API_URL = 'https://finder-backend-v1i2.onrender.com/api/analyze';

let cameraStream = null;

// Trigger file upload
function triggerFileUpload() {
  document.getElementById('file-input').click();
}

// Handle file upload
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const prompt = document.getElementById('search-prompt').value.trim();
  await sendImageToAPI(file, prompt);
}

// Open camera
async function openCamera() {
  const modal = document.getElementById('camera-modal');
  const video = document.getElementById('camera-stream');

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = cameraStream;
    modal.style.display = 'flex';
  } catch (error) {
    alert('Unable to access camera. Check permissions.');
    console.error('Camera error:', error);
  }
}

// Close camera
function closeCamera() {
  const modal = document.getElementById('camera-modal');
  const video = document.getElementById('camera-stream');

  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  video.srcObject = null;
  modal.style.display = 'none';
}

// Capture photo from camera
async function capturePhoto() {
  const video = document.getElementById('camera-stream');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0);

  canvas.toBlob(async (blob) => {
    const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
    const prompt = document.getElementById('search-prompt').value.trim();

    closeCamera();
    await sendImageToAPI(file, prompt);
  }, 'image/jpeg', 0.95);
}

// Send image + prompt to backend
async function sendImageToAPI(imageFile, prompt) {
  const loading = document.getElementById('loading');
  const resultContainer = document.getElementById('result-container');

  resultContainer.style.display = 'none';
  if (loading) loading.style.display = 'flex';

  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('prompt', prompt || ''); // backend defaults to "all objects"

    console.log('📤 Sending request...', { prompt, file: imageFile.name });

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      let errData;
      try {
        errData = await response.json();
      } catch {
        errData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errData.error || 'Unknown API error');
    }

    const result = await response.json();
    console.log('✅ Backend response:', result);

    if (loading) loading.style.display = 'none';
    displayResults(result);

  } catch (error) {
    if (loading) loading.style.display = 'none';
    alert(`Error: ${error.message}`);
    console.error('❌ Full error:', error);
  }
}

// Display backend results
function displayResults(data) {
  const resultContainer = document.getElementById('result-container');
  const resultImage = document.getElementById('result-image');
  const detectionInfo = document.getElementById('detection-info');

  let infoHTML = '';

  // Annotated image
  if (data.annotated_image) {
    resultImage.src = `data:image/png;base64,${data.annotated_image}`;
    resultImage.style.display = 'block';
  } else {
    resultImage.style.display = 'none';
  }

  // Message
  if (data.message) {
    infoHTML += `<div style="padding:12px; margin-bottom:15px; border-left:4px solid #00FF7F; background:#e8f5e9; border-radius:8px;">
                   <p style="margin:0;">✅ ${data.message}</p>
                 </div>`;
  }

  // Detections
  if (data.detections && data.detections.length > 0) {
    data.detections.forEach(d => {
      infoHTML += `<div style="padding:12px; margin:8px 0; background:#f5f5f5; border-radius:8px; border-left:3px solid #00FF7F;">
                     <div style="display:flex; justify-content:space-between;">
                       <strong style="color:#00FF7F">${d.class}</strong>
                       <span style="color:#666">${(d.confidence*100).toFixed(1)}%</span>
                     </div>
                   </div>`;
    });
    infoHTML += `<p style="color:#999; text-align:center;">Total: ${data.total_detections} detection(s)</p>`;
  } else if (!data.annotated_image) {
    infoHTML += `<div style="padding:20px; background:#f9f9f9; border-radius:8px; text-align:center;">
                   <p style="color:#999;">❌ No objects detected</p>
                 </div>`;
  }

  detectionInfo.innerHTML = infoHTML;
  resultContainer.style.display = 'block';
  setTimeout(() => resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
}

// Test backend connection
async function testConnection() {
  try {
    const healthUrl = API_URL.replace('/analyze', '/health');
    const response = await fetch(healthUrl);
    const data = await response.json();
    console.log('✅ Backend health:', data);
    return data.status === 'ok';
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    return false;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Finder AI frontend loaded');
  testConnection().then(ok => {
    if (!ok) console.warn('⚠️ Backend may not be reachable.');
  });
});
