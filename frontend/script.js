alert("The script is connected!");
// ── Element refs ──
const dropZone      = document.getElementById('dropZone');
const fileInput     = document.getElementById('fileInput');
const uploadCard    = document.querySelector('.upload-card');
const resultSection = document.getElementById('resultSection');
const previewImg    = document.getElementById('previewImg');
const rName         = document.getElementById('rName');
const rSize         = document.getElementById('rSize');
const scanLine      = document.getElementById('scanLine');
const imgOverlay    = document.getElementById('imgOverlay');
const verdictBadge  = document.getElementById('verdictBadge');
const verdictText   = document.getElementById('verdictText');
const confBar       = document.getElementById('confBar');
const confPct       = document.getElementById('confPct');
const btnAnalyze    = document.getElementById('btnAnalyze');
const btnClear      = document.getElementById('btnClear');

var currentFileName = '';

// ── Drag & Drop ──
dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', function() {
    dropZone.classList.remove('dragover');
});
dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

// ── Click to Browse ──
dropZone.addEventListener('click',   function() { fileInput.click(); });
dropZone.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') fileInput.click();
});
fileInput.addEventListener('change', function() {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

// ── Handle File ──
function handleFile(file) {
    var allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
        alert('Please upload JPG, PNG, or WEBP only.');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        alert('File must be under 10MB.');
        return;
    }
    currentFileName = file.name;
    var reader = new FileReader();
    reader.onload = function(e) {
        previewImg.src           = e.target.result;
        rName.textContent        = file.name;
        rSize.textContent        = formatBytes(file.size);
        uploadCard.style.display = 'none';
        resultSection.classList.add('active');
        resetResults();
    };
    reader.readAsDataURL(file);
}

// ── Format Bytes ──
function formatBytes(bytes) {
    if (bytes < 1024)        return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ── Reset Results ──
function resetResults() {
    verdictBadge.className  = 'verdict-badge';
    verdictText.textContent = '--';
    confBar.style.width     = '0%';
    confBar.className       = 'conf-bar';
    confPct.textContent     = '--';
    ['mFace','mTexture','mFreq','mArtifact'].forEach(function(id) {
        var el = document.getElementById(id);
        el.textContent = '--';
        el.style.color = '';
    });
    btnAnalyze.disabled    = false;
    btnAnalyze.textContent = '⚡ RUN ANALYSIS';
}

// ── Run Analysis ──
btnAnalyze.addEventListener('click', function() {
    btnAnalyze.disabled    = true;
    btnAnalyze.textContent = 'ANALYZING...';
    scanLine.classList.add('on');
    imgOverlay.classList.add('on');
    // 2. Prepare the image to be sent to the AI
    var formData = new FormData();
    formData.append('file', fileInput.files[0]);

    // 3. Talk to your Python Backend
    fetch('http://127.0.0.1:5000/predict', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        // 4. Stop animations when the AI answers
        stopScan();

        // 5. Use the REAL results from your model
        var isAuth = (data.label === "Real");
        var score = data.confidence;
        
        // Match the colors/metrics your friend designed
        var metrics = isAuth 
            ? { face:'PASS', texture:'NORMAL', freq:'NORMAL', artifact:'NONE' } 
            : { face:'ANOMALY', texture:'WARPED', freq:'SPIKED', artifact:'DETECTED' };

        showResults(isAuth, score, metrics);
    })
    .catch(error => {
        // 6. Safety Net: If the backend is off, tell the user
        console.error("Error:", error);
        alert("The AI Brain (app.py) is not running! Check your terminal.");
        stopScan();
    });
});

    

// ── Stop Scan ──
function stopScan() {
    scanLine.classList.remove('on');
    imgOverlay.classList.remove('on');
    btnAnalyze.textContent = '⚡ RUN ANALYSIS';
}

// ── Show Results ──
function showResults(isAuth, score, metrics) {
    var cls = isAuth ? 'authentic' : 'deepfake';

    verdictBadge.className  = 'verdict-badge show ' + cls;
    verdictText.textContent = isAuth
        ? '✓  AUTHENTIC IMAGE DETECTED'
        : '⚠  DEEPFAKE DETECTED';

    confPct.textContent = score + '%';
    confBar.className   = 'conf-bar ' + cls;
    setTimeout(function() { confBar.style.width = score + '%'; }, 40);

    setMetric('mFace',     metrics.face,     isAuth ? '#00e676' : '#ff4d6d');
    setMetric('mTexture',  metrics.texture,  isAuth ? '#00e676' : '#ffaa00');
    setMetric('mFreq',     metrics.freq,     isAuth ? '#5a7a8a' : '#ffaa00');
    setMetric('mArtifact', metrics.artifact, isAuth ? '#5a7a8a' : '#ff4d6d');

    btnAnalyze.disabled = false;

    // Save to history
    if (typeof window.saveToHistory === 'function') {
        window.saveToHistory(currentFileName, cls, score);
    }
}

// ── Set Metric ──
function setMetric(id, value, color) {
    var el = document.getElementById(id);
    el.textContent = value;
    el.style.color = color;
}

// ── Clear Button ──
btnClear.addEventListener('click', function() {
    resultSection.classList.remove('active');
    uploadCard.style.display = '';
    fileInput.value  = '';
    previewImg.src   = '';
    currentFileName  = '';
});

// ── Prevent browser opening dropped file ──
document.addEventListener('dragover', function(e) { e.preventDefault(); });
document.addEventListener('drop',     function(e) { e.preventDefault(); });
