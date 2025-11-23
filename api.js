// API Configuration
const API_URL = 'https://finder-backend-v1i2.onrender.com'; // Change this to your deployed backend URL

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
  if (!prompt) {
    alert('Please enter what you are looking for first!');
    return;
  }

  await sendImageToAPI(file, prompt);
}

// Open camera
async function openCamera() {
  const prompt = document.getElementById('search-prompt').value.trim();
  if (!prompt) {
    alert('Please enter what you are looking for first!');
    return;
  }

  const modal = document.getElementById('camera-modal');
  const video = document.getElementById('camera-stream');

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });
    video.srcObject = cameraStream;
    modal.style.display = 'flex';
  } catch (error) {
    alert('Unable to access camera. Please check permissions.');
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
  
  // Convert canvas to blob
  canvas.toBlob(async (blob) => {
    const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
    const prompt = document.getElementById('search-prompt').value.trim();
    
    closeCamera();
    await sendImageToAPI(file, prompt);
  }, 'image/jpeg', 0.95);
}

// Send image to API
async function sendImageToAPI(imageFile, prompt) {
  const loading = document.getElementById('loading');
  const resultContainer = document.getElementById('result-container');
  
  // Hide previous results
  resultContainer.style.display = 'none';
  
  // Show loading
  loading.style.display = 'flex';

  try {
    // Create FormData
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('prompt', prompt);

    // Send to backend
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    const result = await response.json();
    
    // Hide loading
    loading.style.display = 'none';
    
    // Display results
    displayResults(result);

  } catch (error) {
    loading.style.display = 'none';
    alert(`Error: ${error.message}`);
    console.error('API Error:', error);
  }
}

// Display results
function displayResults(data) {
  const resultContainer = document.getElementById('result-container');
  const resultImage = document.getElementById('result-image');
  const detectionInfo = document.getElementById('detection-info');

  // Show annotated image
  if (data.annotated_image) {
    resultImage.src = `data:image/jpeg;base64,${data.annotated_image}`;
  }

  // Display detection information
  let infoHTML = '<h4 style="margin-top:0;">Detected Objects:</h4>';
  
  if (data.detections && data.detections.length > 0) {
    data.detections.forEach((detection, index) => {
      infoHTML += `
        <div class="detection-item">
          <strong>${detection.class}</strong> 
          (Confidence: ${(detection.confidence * 100).toFixed(1)}%)
        </div>
      `;
    });
  } else {
    infoHTML += '<p style="color: #999;">No objects detected matching your prompt.</p>';
  }

  detectionInfo.innerHTML = infoHTML;
  resultContainer.style.display = 'block';

  // Scroll to results
  resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}