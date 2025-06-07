// renderer.js

window.addEventListener('DOMContentLoaded', () => {
  const dropArea = document.getElementById('drop-area');
  const fileInput = document.getElementById('file-input');
  const convertBtn = document.getElementById('convert-btn');
  const status = document.getElementById('status');
  let selectedFilePath = null;
  let selectedFileName = null;
  const formatSelect = document.getElementById('format-select');
  // New DOM element references
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  const timeEstimate = document.getElementById('time-estimate');
  const cancelBtn = document.getElementById('cancel-btn');

  dropArea.addEventListener('click', () => fileInput.click());

  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.style.borderColor = 'green';
  });

  dropArea.addEventListener('dragleave', () => {
    dropArea.style.borderColor = '#ccc';
  });

  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFile(file);
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    handleFile(file);
  });

  function handleFile(file) {
    if (file) {
      selectedFilePath = file.path;
      selectedFileName = file.name;
      convertBtn.disabled = false;
      status.textContent = `Selected: ${file.name}`;
    }
  }

  // Cancellation control variable
  let cancelRequested = false;

  convertBtn.addEventListener('click', async () => {
    if (!selectedFilePath) return;
    // Get format and output file name
    const format = formatSelect.value;
    const outputFileName = selectedFileName
      ? selectedFileName.replace(/\.[^/.]+$/, '') + `_whatsapp.${format}`
      : `output_whatsapp.${format}`;
    status.textContent = 'Converting...';
    convertBtn.disabled = true;
    progressContainer.style.display = 'block';
    progressBar.value = 0;
    timeEstimate.textContent = 'Estimated time: ~10s';
    cancelRequested = false;

    const startTime = Date.now();

    const fakeInterval = setInterval(() => {
      if (cancelRequested) {
        clearInterval(fakeInterval);
        progressContainer.style.display = 'none';
        status.textContent = '❌ Conversion canceled.';
        convertBtn.disabled = false;
        return;
      }

      const elapsed = (Date.now() - startTime) / 1000;
      const percent = Math.min(100, (elapsed / 10) * 100);
      progressBar.value = percent;
      const remaining = Math.max(0, 10 - elapsed).toFixed(1);
      timeEstimate.textContent = `Estimated time left: ${remaining}s`;

      if (percent >= 100) {
        clearInterval(fakeInterval);
      }
    }, 200);

    console.log('Starting conversion with:', selectedFilePath, outputFileName);

    try {
      const result = await window.electronAPI.convertVideo(selectedFilePath, outputFileName, outputFileName);
      if (!cancelRequested) {
        if (result.success) {
          status.textContent = `✅ Saved to: ${result.output}`;
        } else {
          status.textContent = `❌ Conversion failed: ${result.error}`;
          console.error('Conversion error:', result.error);
        }
      }
    } catch (err) {
      if (!cancelRequested) {
        console.error(err);
        status.textContent = '❌ Conversion failed';
      }
    } finally {
      convertBtn.disabled = false;
      progressContainer.style.display = 'none';
    }
  });

  // Cancel button event listener
  cancelBtn.addEventListener('click', () => {
    cancelRequested = true;
  });
});