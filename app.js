(() => {
  const statusPill = document.querySelector('[data-status]');
  if (!window.FFmpeg) {
    if (statusPill) {
      statusPill.dataset.state = 'error';
      statusPill.textContent = 'Unable to load FFmpeg.wasm. Check your connection and refresh.';
    }
    console.error('FFmpeg global not found.');
    return;
  }

  const {
    createFFmpeg,
    fetchFile
  } = window.FFmpeg;

  const CORE_PATH = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.12.4/dist/ffmpeg-core.js';
  const ffmpeg = createFFmpeg({
    log: false,
    corePath: CORE_PATH
  });

  const elements = {
    dropzone: document.querySelector('[data-dropzone]'),
    fileInput: document.getElementById('file-input'),
    convertButton: document.getElementById('convert-btn'),
    fileSummary: document.querySelector('[data-file-summary]'),
    fileName: document.querySelector('[data-file-name]'),
    fileSize: document.querySelector('[data-file-size]'),
    fileDuration: document.querySelector('[data-file-duration]'),
    fileResolution: document.querySelector('[data-file-resolution]'),
    resetButton: document.querySelector('[data-reset]'),
    quality: document.getElementById('quality'),
    resolution: document.getElementById('resolution'),
    frameRate: document.getElementById('framerate'),
    trimStatus: document.getElementById('trim-status'),
    progressPanel: document.querySelector('[data-progress-panel]'),
    progressBar: document.querySelector('[data-progress-bar]'),
    stageLabel: document.querySelector('[data-stage]'),
    progressValue: document.querySelector('[data-progress-value]'),
    result: document.querySelector('[data-result]'),
    preview: document.querySelector('[data-preview]'),
    download: document.querySelector('[data-download]'),
    outputSize: document.querySelector('[data-output-size]'),
    outputReduction: document.querySelector('[data-output-reduction]'),
    outputWarning: document.querySelector('[data-output-warning]'),
    buttonText: document.querySelector('#convert-btn .button-text')
  };

  const qualityProfiles = {
    crisp: { crf: 23, maxRate: 3500 },
    balanced: { crf: 26, maxRate: 2500 },
    compact: { crf: 30, maxRate: 1800 }
  };

  const resolutionLimits = {
    auto: 1280,
    hd: 1920,
    sd: 960,
    compact: 720
  };

  let selectedFile = null;
  let ffmpegReady = false;
  let ffmpegLoadingPromise = null;
  let outputUrl = null;
  let isConverting = false;

  const WHATSAPP_LIMIT_BYTES = 16 * 1024 * 1024;

  function updateStatus(state, message) {
    if (!statusPill) return;
    if (state) {
      statusPill.dataset.state = state;
    }
    statusPill.textContent = message;
  }

  function setProgress(percent) {
    const value = Math.max(0, Math.min(100, Math.round(percent)));
    if (elements.progressBar) {
      elements.progressBar.style.setProperty('--progress', `${value}%`);
    }
    if (elements.progressValue) {
      elements.progressValue.textContent = `${value}%`;
    }
  }

  function updateStage(percent) {
    if (!elements.stageLabel) return;
    if (percent < 5) {
      elements.stageLabel.textContent = 'Preparing FFmpeg';
    } else if (percent < 25) {
      elements.stageLabel.textContent = 'Analysing source';
    } else if (percent < 80) {
      elements.stageLabel.textContent = 'Encoding video';
    } else if (percent < 100) {
      elements.stageLabel.textContent = 'Packaging output';
    } else {
      elements.stageLabel.textContent = 'Done';
    }
  }

  function cleanupOutput() {
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      outputUrl = null;
    }
    if (elements.preview) {
      elements.preview.removeAttribute('src');
      elements.preview.load();
    }
  }

  function resetResult() {
    cleanupOutput();
    if (elements.result) {
      elements.result.hidden = true;
    }
    if (elements.outputWarning) {
      elements.outputWarning.hidden = true;
    }
  }

  function resetSelection() {
    selectedFile = null;
    if (elements.fileInput) {
      elements.fileInput.value = '';
    }
    if (elements.fileSummary) {
      elements.fileSummary.hidden = true;
    }
    if (elements.convertButton) {
      elements.convertButton.disabled = true;
    }
    if (elements.progressPanel) {
      elements.progressPanel.hidden = true;
    }
    setProgress(0);
    updateStage(0);
    resetResult();
    updateStatus('idle', 'Drop a video to begin');
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
    return `${value.toFixed(precision)} ${units[unitIndex]}`;
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return '—';
    const totalSeconds = Math.round(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${secs}s`;
  }

  function slugify(value) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .replace(/-{2,}/g, '-')
      || 'video';
  }

  function getExtension(name) {
    const parts = name.split('.');
    if (parts.length <= 1) return 'mp4';
    return parts.pop().toLowerCase();
  }

  function getScaleFilter() {
    const value = elements.resolution?.value || 'auto';
    if (value === 'original') return null;
    const limit = resolutionLimits[value] ?? resolutionLimits.auto;
    return `scale='if(gt(iw,ih),min(${limit},iw),-2)':'if(gt(iw,ih),-2,min(${limit},ih))',setsar=1`;
  }

  async function readVideoMetadata(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.src = url;
      video.onloadedmetadata = () => {
        const details = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight
        };
        URL.revokeObjectURL(url);
        resolve(details);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read metadata'));
      };
    });
  }

  async function ensureFFmpegLoaded() {
    if (ffmpegReady) return ffmpeg;
    if (!ffmpegLoadingPromise) {
      ffmpegLoadingPromise = ffmpeg.load()
        .then(() => {
          ffmpegReady = true;
          return ffmpeg;
        })
        .catch((error) => {
          ffmpegLoadingPromise = null;
          throw error;
        });
    }
    return ffmpegLoadingPromise;
  }

  function showResult(blob, filename) {
    cleanupOutput();
    outputUrl = URL.createObjectURL(blob);
    if (elements.preview) {
      elements.preview.src = outputUrl;
    }
    if (elements.download) {
      elements.download.href = outputUrl;
      elements.download.download = filename;
    }
    if (elements.outputSize) {
      elements.outputSize.textContent = formatBytes(blob.size);
    }
    if (elements.outputReduction) {
      if (selectedFile && selectedFile.size) {
        const delta = 1 - blob.size / selectedFile.size;
        const formatted = `${Math.abs(delta * 100).toFixed(1)}% ${delta >= 0 ? 'smaller' : 'larger'}`;
        elements.outputReduction.textContent = formatted;
      } else {
        elements.outputReduction.textContent = '—';
      }
    }
    if (elements.outputWarning) {
      elements.outputWarning.hidden = blob.size <= WHATSAPP_LIMIT_BYTES;
    }
    if (elements.result) {
      elements.result.hidden = false;
    }
  }

  function buildArguments(inputName, outputName) {
    const args = ['-hide_banner', '-y', '-i', inputName];
    const scaleFilter = getScaleFilter();
    if (scaleFilter) {
      args.push('-vf', scaleFilter);
    }
    const profile = qualityProfiles[elements.quality?.value || 'balanced'] || qualityProfiles.balanced;
    const fps = parseInt(elements.frameRate?.value || '30', 10);
    if (!Number.isNaN(fps) && fps > 0) {
      args.push('-r', String(fps));
    }
    args.push(
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-profile:v', 'main',
      '-level', '3.1',
      '-crf', String(profile.crf),
      '-pix_fmt', 'yuv420p'
    );
    if (profile.maxRate) {
      args.push('-maxrate', `${profile.maxRate}k`, '-bufsize', `${profile.maxRate * 2}k`);
    }
    args.push(
      '-movflags', '+faststart',
      '-c:a', 'aac',
      '-b:a', '96k',
      '-ac', '2',
      '-ar', '48000',
      '-map_metadata', '-1',
      '-map_chapters', '-1'
    );
    if (elements.trimStatus?.checked) {
      args.push('-t', '30');
    }
    args.push(outputName);
    return args;
  }

  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      updateStatus('error', 'Unsupported file type. Please choose a video.');
      if (elements.convertButton) {
        elements.convertButton.disabled = true;
      }
      if (elements.fileSummary) {
        elements.fileSummary.hidden = true;
      }
      selectedFile = null;
      return;
    }
    selectedFile = file;
    resetResult();
    updateStatus('ready', 'Video loaded — adjust settings and convert');
    if (elements.convertButton) {
      elements.convertButton.disabled = false;
    }
    if (elements.fileSummary) {
      elements.fileSummary.hidden = false;
    }
    if (elements.fileName) {
      elements.fileName.textContent = file.name;
    }
    if (elements.fileSize) {
      elements.fileSize.textContent = formatBytes(file.size);
    }
    if (elements.fileDuration) {
      elements.fileDuration.textContent = 'Detecting…';
    }
    if (elements.fileResolution) {
      elements.fileResolution.textContent = 'Detecting…';
    }
    if (elements.progressPanel) {
      elements.progressPanel.hidden = true;
    }
    setProgress(0);
    updateStage(0);

    readVideoMetadata(file)
      .then((info) => {
        if (elements.fileDuration) {
          elements.fileDuration.textContent = formatDuration(info.duration);
        }
        if (elements.fileResolution) {
          const width = info.width || 0;
          const height = info.height || 0;
          if (width && height) {
            elements.fileResolution.textContent = `${width}×${height}`;
          } else {
            elements.fileResolution.textContent = '—';
          }
        }
      })
      .catch(() => {
        if (elements.fileDuration) {
          elements.fileDuration.textContent = '—';
        }
        if (elements.fileResolution) {
          elements.fileResolution.textContent = '—';
        }
      });
  }

  async function convertVideo() {
    if (!selectedFile || isConverting) return;
    isConverting = true;
    resetResult();
    updateStatus('busy', 'Loading FFmpeg engine…');
    if (elements.convertButton) {
      elements.convertButton.disabled = true;
    }
    if (elements.buttonText) {
      elements.buttonText.textContent = 'Converting…';
    }
    if (elements.progressPanel) {
      elements.progressPanel.hidden = false;
    }
    setProgress(5);
    updateStage(0);

    let inputName;
    let outputName;

    try {
      const instance = await ensureFFmpegLoaded();
      updateStatus('busy', 'Encoding for WhatsApp…');
      instance.setProgress(({ ratio }) => {
        const percent = Math.min(99, Math.round(ratio * 100));
        setProgress(percent);
        updateStage(percent);
      });

      inputName = `input.${getExtension(selectedFile.name)}`;
      const baseName = slugify(selectedFile.name.replace(/\.[^/.]+$/, ''));
      outputName = `${baseName}_whatsapp.mp4`;

      setProgress(12);
      updateStage(12);
      instance.FS('writeFile', inputName, await fetchFile(selectedFile));

      const args = buildArguments(inputName, outputName);
      await instance.run(...args);

      const data = instance.FS('readFile', outputName);
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      showResult(blob, outputName);
      setProgress(100);
      updateStage(100);
      updateStatus('success', 'All set! Ready to send on WhatsApp.');
    } catch (error) {
      console.error('Conversion failed', error);
      updateStatus('error', `Conversion failed: ${error?.message || error}`);
    } finally {
      try {
        if (inputName) ffmpeg.FS('unlink', inputName);
      } catch (err) {
        // ignore cleanup errors
      }
      try {
        if (outputName) ffmpeg.FS('unlink', outputName);
      } catch (err) {
        // ignore cleanup errors
      }
      if (elements.convertButton) {
        elements.convertButton.disabled = !selectedFile;
      }
      if (elements.buttonText) {
        elements.buttonText.textContent = 'Convert for WhatsApp';
      }
      isConverting = false;
    }
  }

  if (elements.dropzone) {
    let dragDepth = 0;
    elements.dropzone.addEventListener('dragenter', (event) => {
      event.preventDefault();
      dragDepth += 1;
      elements.dropzone.classList.add('is-dragover');
    });
    elements.dropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
    });
    elements.dropzone.addEventListener('dragleave', (event) => {
      event.preventDefault();
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) {
        elements.dropzone.classList.remove('is-dragover');
      }
    });
    elements.dropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      dragDepth = 0;
      elements.dropzone.classList.remove('is-dragover');
      const file = event.dataTransfer?.files?.[0];
      handleFile(file);
    });
  }

  if (elements.fileInput) {
    elements.fileInput.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      handleFile(file);
    });
  }

  if (elements.resetButton) {
    elements.resetButton.addEventListener('click', () => {
      resetSelection();
      elements.fileInput?.click();
    });
  }

  if (elements.convertButton) {
    elements.convertButton.addEventListener('click', convertVideo);
  }

  updateStatus('idle', 'Drop a video to begin');
})();
