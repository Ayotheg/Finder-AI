// Send image to API
async function sendImageToAPI(imageFile, prompt) {
  const loading = document.getElementById('loading');
  const resultContainer = document.getElementById('result-container');
  
  resultContainer.style.display = 'none';
  if (loading) loading.style.display = 'flex';

  try {
    // Ensure prompt is always a non-empty string
    prompt = (prompt || '').trim();
    if (!prompt) {
      prompt = 'all objects'; // Default fallback for Roboflow
      console.log('⚠️  No prompt provided, using default:', prompt);
    }

    // Build FormData for backend
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('prompt', prompt);

    console.log('📤 Sending request...');
    console.log('Prompt:', prompt);
    console.log('File:', imageFile.name, imageFile.type, `${(imageFile.size / 1024).toFixed(2)} KB`);

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('❌ Error response:', errorData);
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}`, details: await response.text() };
      }
      throw new Error(errorData.error || errorData.message || `API Error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ API Response:', result);

    if (loading) loading.style.display = 'none';
    displayResults(result);

  } catch (error) {
    if (loading) loading.style.display = 'none';
    let errorMsg = error.message.includes('Failed to fetch') 
      ? 'Cannot connect to backend server. Check backend URL, CORS, and server status.'
      : error.message;
    alert(`Error: ${errorMsg}`);
    console.error('❌ Full error:', error);
  }
}
