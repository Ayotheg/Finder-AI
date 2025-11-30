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
  // REMOVED PROMPT REQUIREMENT - now optional
  
  await sendImageToAPI(file, prompt);
}

// Open camera
async function openCamera() {
  const prompt = document.getElementById('search-prompt').value.trim();
  // REMOVED PROMPT REQUIREMENT - now optional

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
    // Create FormData
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('prompt', prompt); // Can be empty now

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
    
    console.log('API Response:', result); // DEBUG
    
    // Hide loading
    if (loading) loading.style.display = 'none';
    
    // Display results
    displayResults(result);

  } catch (error) {
    if (loading) loading.style.display = 'none';
    alert(`Error: ${error.message}`);
    console.error('API Error:', error);
  }
}

// Display results
function displayResults(data) {
  const resultContainer = document.getElementById('result-container');
  const resultImage = document.getElementById('result-image');
  const detectionInfo = document.getElementById('detection-info');

  console.log('Displaying results:', data); // DEBUG

  // Show annotated image
  if (data.annotated_image) {
    const base64String = data.annotated_image.trim();
    
    // Try PNG first (most common for annotations)
    resultImage.src = `data:image/png;base64,${base64String}`;
    resultImage.style.display = 'block';
    
    // Error handler if image fails to load
    resultImage.onerror = function() {
      console.warn('Failed to load as PNG, trying JPEG...');
      resultImage.src = `data:image/jpeg;base64,${base64String}`;
      
      resultImage.onerror = function() {
        console.error('Failed to load annotated image');
        resultImage.style.display = 'none';
        detectionInfo.innerHTML = '<p style="color: red;">⚠️ Could not load annotated image</p>';
      };
    };
  } else {
    console.warn('No annotated_image in response');
    resultImage.style.display = 'none';
  }

  // Display detection information with filter status handling
  let infoHTML = '';
  
  // Show message from backend
  if (data.message) {
    const isWarning = data.filter_status === 'no_match';
    const messageColor = isWarning ? '#ff9800' : '#00FF7F';
    const messageIcon = isWarning ? '⚠️' : '✓';
    
    infoHTML += `
      <div style="padding: 12px; margin-bottom: 15px; background: ${isWarning ? '#fff3e0' : '#e8f5e9'}; 
                  border-left: 4px solid ${messageColor}; border-radius: 8px;">
        <p style="margin: 0; color: #333; font-weight: 500;">
          ${messageIcon} ${data.message}
        </p>
      </div>
    `;
  }
  
  infoHTML += '<h4 style="margin-top:0;">Detected Objects:</h4>';
  
  if (data.detections && data.detections.length > 0) {
    data.detections.forEach((detection, index) => {
      infoHTML += `
        <div class="detection-item" style="padding: 10px; margin: 5px 0; background: #f5f5f5; border-radius: 8px;">
          <strong style="color: #00FF7F;">${detection.class}</strong> 
          <span style="color: #666;">(Confidence: ${(detection.confidence * 100).toFixed(1)}%)</span>
        </div>
      `;
    });
    
    infoHTML += `<p style="color: #999; margin-top: 10px;">
      ${data.filtered_detections} of ${data.total_detections} objects shown
    </p>`;
    
    // Show what classes are available if filter didn't match
    if (data.filter_status === 'no_match' && data.detected_classes) {
      infoHTML += `
        <div style="margin-top: 15px; padding: 10px; background: #f9f9f9; border-radius: 8px;">
          <p style="margin: 0 0 5px 0; font-size: 12px; color: #666;">
            💡 <strong>Tip:</strong> Model can detect:
          </p>
          <p style="margin: 0; font-size: 12px; color: #999;">
            ${data.detected_classes.join(', ')}
          </p>
        </div>
      `;
    }
  } else {
    infoHTML += '<p style="color: #999;">❌ No objects detected in the image.</p>';
    
    // Show model capabilities if available
    if (data.detected_classes && data.detected_classes.length === 0) {
      infoHTML += `
        <p style="color: #666; font-size: 14px; margin-top: 10px;">
          💡 Try taking a clearer photo or ensure the object is well-lit and in frame.
        </p>
      `;
    }
  }

  detectionInfo.innerHTML = infoHTML;
  resultContainer.style.display = 'block';

  // Scroll to results smoothly
  setTimeout(() => {
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}