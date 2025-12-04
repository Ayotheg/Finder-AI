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
    // Create FormData - match backend expectations
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('prompt', prompt || ''); // Backend uses "all objects" if empty

    console.log('📤 Sending request...');
    console.log('Prompt:', prompt || '(empty - backend will use default)');
    console.log('File:', imageFile.name, imageFile.type, `${(imageFile.size / 1024).toFixed(2)} KB`);

    // Send to backend
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData
      // Don't set Content-Type - browser handles it for FormData
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('❌ Error response:', errorData);
      } catch (e) {
        errorData = { 
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: await response.text()
        };
      }
      
      throw new Error(errorData.error || errorData.message || `API Error: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ API Response:', result);
    
    // Hide loading
    if (loading) loading.style.display = 'none';
    
    // Display results
    displayResults(result);

  } catch (error) {
    if (loading) loading.style.display = 'none';
    
    // Better error messages
    let errorMsg = error.message;
    if (error.message.includes('Failed to fetch')) {
      errorMsg = 'Cannot connect to backend server. Please check:\n' +
                 '1. Backend is running\n' +
                 '2. URL is correct\n' +
                 '3. CORS is enabled';
    }
    
    alert(`Error: ${errorMsg}`);
    console.error('❌ Full error:', error);
  }
}

// Display results
function displayResults(data) {
  const resultContainer = document.getElementById('result-container');
  const resultImage = document.getElementById('result-image');
  const detectionInfo = document.getElementById('detection-info');

  console.log('🎨 Displaying results:', data);

  // Show annotated image (if available)
  if (data.annotated_image && data.annotated_image.trim() !== '') {
    const base64String = data.annotated_image.trim();
    
    // Remove data URL prefix if present
    const cleanBase64 = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
    
    console.log('🖼️  Annotated image found, length:', cleanBase64.length);
    
    // Try PNG first (SAM3 mask visualizations are usually PNG)
    resultImage.src = `data:image/png;base64,${cleanBase64}`;
    resultImage.style.display = 'block';
    
    console.log('🖼️  Loading annotated image...');
    
    // Error handler if PNG fails
    resultImage.onerror = function() {
      console.warn('⚠️  Failed as PNG, trying JPEG...');
      resultImage.src = `data:image/jpeg;base64,${cleanBase64}`;
      
      resultImage.onerror = function() {
        console.error('❌ Failed to load annotated image');
        resultImage.style.display = 'none';
        
        // Show error in detection info instead
        const errorBox = document.createElement('div');
        errorBox.style.cssText = 'padding: 15px; background: #fee; border-left: 4px solid #c33; border-radius: 8px; margin-bottom: 15px;';
        errorBox.innerHTML = '<p style="margin: 0; color: #c33;">⚠️ Could not load annotated image. Image data may be corrupted.</p>';
        detectionInfo.insertBefore(errorBox, detectionInfo.firstChild);
      };
    };
    
    resultImage.onload = function() {
      console.log('✅ Annotated image loaded successfully');
    };
  } else {
    console.warn('⚠️  No annotated_image in response or image is empty');
    resultImage.style.display = 'none';
    
    // Check if this is an expected "no detections" case
    if (data.total_detections === 0) {
      console.log('ℹ️  No detections found - this is expected');
    } else {
      console.error('❌ Detections exist but no visualization - workflow issue!');
    }
  }

  // Display detection information
  let infoHTML = '';
  
  // Show main message from backend
  if (data.message) {
    // Determine styling based on whether objects were found
    const hasDetections = data.total_detections > 0;
    const messageColor = hasDetections ? '#00FF7F' : '#ff9800';
    const messageIcon = hasDetections ? '✅' : '⚠️';
    const bgColor = hasDetections ? '#e8f5e9' : '#fff3e0';
    
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
    infoHTML += '<h4 style="margin-top:0; margin-bottom: 10px;">Detected Objects:</h4>';
    
    data.detections.forEach((detection, index) => {
      const confidence = detection.confidence || 1.0;
      const className = detection.class || data.prompt || 'object';
      
      infoHTML += `
        <div class="detection-item" style="padding: 12px; margin: 8px 0; background: #f5f5f5; 
                                          border-radius: 8px; border-left: 3px solid #00FF7F;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: #00FF7F; font-size: 16px;">${className}</strong>
            <span style="color: #666; font-size: 14px;">
              ${(confidence * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      `;
    });
    
    // Show total count
    infoHTML += `<p style="color: #999; margin-top: 15px; font-size: 14px; text-align: center;">
      Total: ${data.total_detections} detection(s)
    </p>`;
  } else {
    // No detections found
    infoHTML += `
      <div style="padding: 20px; background: #f9f9f9; border-radius: 8px; text-align: center;">
        <p style="color: #999; margin: 0; font-size: 16px;">❌ No objects detected</p>
        <p style="color: #666; font-size: 14px; margin-top: 10px;">
          💡 Tips:
        </p>
        <ul style="color: #666; font-size: 14px; text-align: left; margin: 10px auto; max-width: 300px;">
          <li>Ensure the object is clearly visible</li>
          <li>Try better lighting</li>
          <li>Get closer to the object</li>
          <li>Use simpler prompts (e.g., "person", "phone")</li>
        </ul>
      </div>
    `;
  }

  detectionInfo.innerHTML = infoHTML;
  resultContainer.style.display = 'block';

  // Smooth scroll to results
  setTimeout(() => {
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}

// Test backend connection on page load
async function testConnection() {
  try {
    const healthUrl = API_URL.replace('/analyze', '/health');
    console.log('🔍 Testing backend connection:', healthUrl);
    
    const response = await fetch(healthUrl);
    const data = await response.json();
    
    console.log('✅ Backend health check:', data);
    return data.status === 'ok';
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    return false;
  }
}

// Run connection test on page load
window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Finder AI loaded');
  console.log('📡 Backend URL:', API_URL);
  
  testConnection().then(connected => {
    if (connected) {
      console.log('✅ Backend is online and ready');
    } else {
      console.warn('⚠️ Backend is not responding. Features may not work.');
      // Optionally show a warning to the user
    }
  });
});