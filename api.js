// API Configuration
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
  
  // Prompt is now optional - backend will use "all objects" as default
  await sendImageToAPI(file, prompt);
}

// Open camera
async function openCamera() {
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
  if (loading) loading.style.display = 'flex';

  try {
    // Create FormData - CRITICAL: Match backend expectations
    const formData = new FormData();
    formData.append('image', imageFile);
    
    // Send prompt even if empty - backend handles default
    formData.append('prompt', prompt || '');

    console.log('Sending request...');
    console.log('Prompt:', prompt || '(empty - will use default)');

    // Send to backend
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      console.error('API Error:', errorData);
      throw new Error(errorData.error || errorData.message || `API Error: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('API Response:', result);
    
    // Hide loading
    if (loading) loading.style.display = 'none';
    
    // Display results
    displayResults(result);

  } catch (error) {
    if (loading) loading.style.display = 'none';
    
    // More detailed error messages
    let errorMsg = error.message;
    if (error.message.includes('Failed to fetch')) {
      errorMsg = 'Cannot connect to backend. Please check if the server is running.';
    }
    
    alert(`Error: ${errorMsg}`);
    console.error('Full error:', error);
  }
}

// Display results
function displayResults(data) {
  const resultContainer = document.getElementById('result-container');
  const resultImage = document.getElementById('result-image');
  const detectionInfo = document.getElementById('detection-info');

  console.log('Displaying results:', data);

  // Show annotated image
  if (data.annotated_image) {
    const base64String = data.annotated_image.trim();
    
    // Remove data URL prefix if present
    const cleanBase64 = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Try PNG first (most common for SAM3 mask visualizations)
    resultImage.src = `data:image/png;base64,${cleanBase64}`;
    resultImage.style.display = 'block';
    
    console.log('Loading annotated image...');
    
    // Error handler if image fails to load
    resultImage.onerror = function() {
      console.warn('Failed to load as PNG, trying JPEG...');
      resultImage.src = `data:image/jpeg;base64,${cleanBase64}`;
      
      resultImage.onerror = function() {
        console.error('Failed to load annotated image');
        resultImage.style.display = 'none';
        detectionInfo.innerHTML = '<p style="color: red;">⚠️ Could not load annotated image</p>';
      };
    };
    
    resultImage.onload = function() {
      console.log('✓ Annotated image loaded successfully');
    };
  } else {
    console.warn('No annotated_image in response');
    resultImage.style.display = 'none';
  }

  // Display detection information
  let infoHTML = '';
  
  // Show main message from backend
  if (data.message) {
    // Determine if this is a "not found" scenario
    const isNotFound = data.total_detections === 0;
    const messageColor = isNotFound ? '#ff9800' : '#00FF7F';
    const messageIcon = isNotFound ? '❌' : '✓';
    const bgColor = isNotFound ? '#fff3e0' : '#e8f5e9';
    
    infoHTML += `
      <div style="padding: 12px; margin-bottom: 15px; background: ${bgColor}; 
                  border-left: 4px solid ${messageColor}; border-radius: 8px;">
        <p style="margin: 0; color: #333; font-weight: 500;">
          ${messageIcon} ${data.message}
        </p>
      </div>
    `;
  }
  
  // Show detection details
  if (data.detections && data.detections.length > 0) {
    infoHTML += '<h4 style="margin-top:0;">Detected Objects:</h4>';
    
    data.detections.forEach((detection, index) => {
      const confidence = detection.confidence || 1.0;
      const className = detection.class || data.prompt || 'object';
      
      infoHTML += `
        <div class="detection-item" style="padding: 10px; margin: 5px 0; background: #f5f5f5; border-radius: 8px;">
          <strong style="color: #00FF7F;">${className}</strong> 
          <span style="color: #666;">(Confidence: ${(confidence * 100).toFixed(1)}%)</span>
        </div>
      `;
    });
    
    // Show count
    infoHTML += `<p style="color: #999; margin-top: 10px; font-size: 14px;">
      Total: ${data.total_detections} detection(s)
    </p>`;
  } else {
    // No detections
    infoHTML += '<div style="padding: 15px; background: #f9f9f9; border-radius: 8px; text-align: center;">';
    infoHTML += '<p style="color: #999; margin: 0;">❌ No objects detected in the image.</p>';
    infoHTML += '<p style="color: #666; font-size: 14px; margin-top: 10px;">';
    infoHTML += '💡 Try taking a clearer photo or ensure the object is well-lit and visible.';
    infoHTML += '</p></div>';
  }

  detectionInfo.innerHTML = infoHTML;
  resultContainer.style.display = 'block';

  // Scroll to results smoothly
  setTimeout(() => {
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}

// Optional: Add connection test function
async function testConnection() {
  try {
    const response = await fetch(API_URL.replace('/analyze', '/health'));
    const data = await response.json();
    console.log('Backend health check:', data);
    return data.status === 'ok';
  } catch (error) {
    console.error('Backend connection failed:', error);
    return false;
  }
}

// Test connection on page load
window.addEventListener('DOMContentLoaded', () => {
  testConnection().then(connected => {
    if (connected) {
      console.log('✓ Backend connected');
    } else {
      console.warn('⚠️ Backend not responding');
    }
  });
});