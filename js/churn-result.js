const BACKEND_URL = 'http://localhost:5000';

function getVal(id) {
  const e = document.getElementById(id);
  if (!e) return null;
  if (e.type === 'checkbox') return e.checked;
  if (e.type === 'number') return e.value === '' ? null : Number(e.value);
  return e.value;
}

function mapNetworkType(nt) {
  if (!nt) return 0;
  const s = nt.toString().toLowerCase();
  if (s.includes('5')) return 5;
  if (s.includes('4')) return 4;
  if (s.includes('3')) return 3;
  if (s.includes('2')) return 2;
  return 0;
}

function buildInputVector() {
  // Collect all features as object for backend
  const features = {
    mobile_age: getVal('mobile_age') || 0,
    network_type: getVal('network_type') || '4G',
    avg_packetloss: getVal('avg_packetloss') || 0,
    operator: getVal('operator') || 'Jio',
    tower_density: getVal('tower_density') || 0
  };

  console.log('Sending features object to backend:', features);
  return features;
}

// Check backend health on page load
async function checkBackendHealth() {
  try {
    const res = await fetch(BACKEND_URL + '/models', { method: 'GET' });
    if (res.ok) {
      document.getElementById('backend-status').value = '✓ Backend Ready';
      document.getElementById('backend-status').style.background = '#d4edda';
      document.getElementById('backend-status').style.color = '#155724';
      return true;
    } else {
      updateBackendStatus('⚠ Backend Error', '#f8d7da', '#721c24');
      return false;
    }
  } catch (err) {
    updateBackendStatus('✗ Backend Offline', '#f8d7da', '#721c24');
    return false;
  }
}

function updateBackendStatus(status, bgColor, textColor) {
  const statusEl = document.getElementById('backend-status');
  statusEl.value = status;
  statusEl.style.background = bgColor;
  statusEl.style.color = textColor;
}

// Clear form
document.getElementById('reset').addEventListener('click', (e) => {
  e.preventDefault();
  document.querySelectorAll('input[type="number"], input[type="text"]').forEach(inp => {
    inp.value = '';
  });
  document.querySelectorAll('select').forEach(sel => {
    sel.value = '';
  });
  document.getElementById('prediction-result').classList.remove('show');
  document.getElementById('prediction-error').classList.remove('show');
});

// Send prediction
document.getElementById('send').addEventListener('click', async (e) => {
  e.preventDefault();
  
  const model = 'rf'; // Use Random Forest model
  const btn = document.getElementById('send');
  const statusEl = document.getElementById('backend-status');
  
  btn.disabled = true;
  statusEl.value = '⏳ Predicting...';
  
  try {
    const vec = buildInputVector();
    const res = await fetch(BACKEND_URL + '/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, features: vec })
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => null);
      throw new Error('Server error ' + res.status + (txt ? ': ' + txt : ''));
    }

    const data = await res.json();
    displayPredictionResult(data, 'xgb');
    statusEl.value = '✓ Prediction Complete';
    statusEl.style.background = '#d4edda';
    statusEl.style.color = '#155724';
  } catch (err) {
    showError('Failed to get prediction: ' + err.message);
    updateBackendStatus('✗ Request Failed', '#f8d7da', '#721c24');
    document.getElementById('help').style.display = 'block';
  } finally {
    btn.disabled = false;
  }
});

function displayPredictionResult(data, model) {
  const resultCard = document.getElementById('prediction-result');
  const errorCard = document.getElementById('prediction-error');
  
  errorCard.classList.remove('show');
  
  if (data.error) {
    showError('Prediction error: ' + data.error);
    return;
  }

  if (!data.results || data.results.length === 0) {
    showError('No results received from backend');
    return;
  }

  let result = data.results[0];
  let prediction = result.prediction;
  
  console.log('Backend result:', result);
  
  // If no proba but have raw_prediction, estimate from score
  if ((!result.proba || result.proba.length !== 2) && result.raw_prediction !== undefined) {
    let score = result.raw_prediction;
    let churnProb = Math.min(1, Math.max(0, score / 50)); // assume score up to 50
    let noChurnProb = 1 - churnProb;
    result.proba = [noChurnProb, churnProb];
  }
  
  // Get probabilities from backend
  let noChurnProb = 0.5;
  let churnProb = 0.5;
  
  if (result.proba && result.proba.length === 2) {
    noChurnProb = result.proba[0];
    churnProb = result.proba[1];
  } else if (prediction === 1) {
    noChurnProb = 0.3;
    churnProb = 0.7;
  } else {
    noChurnProb = 0.7;
    churnProb = 0.3;
  }
  
  // Determine prediction based on model output
  const isChurn = prediction === 1;
  const predictionBool = isChurn ? 'true' : 'false';
  
  // Display result
  const label = document.getElementById('prediction-label');
  const value = document.getElementById('prediction-value');
  const proba = document.getElementById('prediction-proba');
  
  // Colors: 1 = GREEN (churn alert), 0 = RED (no churn)
  const labelText = isChurn ? '⚠️ Churn Prediction: TRUE' : '❌ Churn Prediction: FALSE';
  const labelColor = isChurn ? '#10b981' : '#ef4444';  // TRUE=Green, FALSE=Red
  
  label.textContent = labelText;
  label.style.color = labelColor;
  
  value.textContent = predictionBool.toUpperCase();
  value.style.color = labelColor;
  
  // Display probabilities
  proba.innerHTML = `
    <strong>Prediction Probability:</strong><br>
    Not Churn: ${(noChurnProb * 100).toFixed(1)}% | Churn: ${(churnProb * 100).toFixed(1)}%
  `;
  
  // Update card styling based on prediction
  if (isChurn) {
    // TRUE = GREEN card (customer will churn - alert)
    resultCard.style.background = 'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(16,185,129,0.05))';
    resultCard.style.borderColor = '#10b981';
  } else {
    // FALSE = RED card (customer won't churn - safe)
    resultCard.style.background = 'linear-gradient(135deg,rgba(239,68,68,0.1),rgba(239,68,68,0.05))';
    resultCard.style.borderColor = '#ef4444';
  }
  
  resultCard.classList.add('show');
}

function showError(msg) {
  const errorCard = document.getElementById('prediction-error');
  errorCard.textContent = msg;
  errorCard.classList.add('show');
  document.getElementById('prediction-result').classList.remove('show');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkBackendHealth();
  
  // Add real-time prediction updates when operator or plan changes
  const operatorSelect = document.getElementById('operator');
  const planSelect = document.getElementById('plan_type');
  
  if (operatorSelect) {
    operatorSelect.addEventListener('change', () => {
      // Auto-predict when operator changes
      const sendBtn = document.getElementById('send');
      if (sendBtn) {
        // Check if form has values before auto-predicting
        const hasValues = document.getElementById('mobile_age').value ||
                         document.getElementById('avg_upload_speed').value ||
                         document.getElementById('avg_download_speed').value;
        if (hasValues) {
          sendBtn.click();
        }
      }
    });
  }
  
  if (planSelect) {
    planSelect.addEventListener('change', () => {
      // Auto-predict when plan changes
      const sendBtn = document.getElementById('send');
      if (sendBtn) {
        // Check if form has values before auto-predicting
        const hasValues = document.getElementById('mobile_age').value ||
                         document.getElementById('avg_upload_speed').value ||
                         document.getElementById('avg_download_speed').value;
        if (hasValues) {
          sendBtn.click();
        }
      }
    });
  }
});
