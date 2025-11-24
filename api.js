// API Configuration
const API_URL = 'https://finder-backend-v1i2.onrender.com/api/analyze'; // ← ADD /api/analyze

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
  
  // Convert canvas to blob-u 
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
  if (loading) loading.style.display = 'block';

  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('prompt', prompt);

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();

    // Render results (basic default rendering; adapt to your UI structure)
    resultContainer.innerHTML = '';
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(data, null, 2);
    resultContainer.appendChild(pre);
    resultContainer.style.display = 'block';
  } catch (error) {
    console.error('API error:', error);
    alert('An error occurred while analyzing the image. Please try again.');
  } finally {
    if (loading) loading.style.display = 'none';
  }
}