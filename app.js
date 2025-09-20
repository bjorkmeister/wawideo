const FFMPEG_VERSION = '0.12.4';

const INLINE_FALLBACKS = Array.isArray(window.__ffmpegFallbackSources)
  ? window.__ffmpegFallbackSources.filter((src) => typeof src === 'string' && src.length > 0)
  : [
      'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.4/dist/ffmpeg.min.js',
      'https://unpkg.com/@ffmpeg/ffmpeg@0.12.4/dist/ffmpeg.min.js'
    ];

const FFMPEG_SCRIPT_SOURCES = [
  'vendor/ffmpeg/ffmpeg.min.js',
  ...INLINE_FALLBACKS.filter((src, index, arr) => arr.indexOf(src) === index)
];

const FFMPEG_CORE_PATHS = [
  {
    label: 'local vendor bundle',
    loadOptions: {
      corePath: 'vendor/ffmpeg/ffmpeg-core.js',
      wasmPath: 'vendor/ffmpeg/ffmpeg-core.wasm',
      workerPath: 'vendor/ffmpeg/ffmpeg-core.worker.js'
    }
  },
  {
    label: 'jsDelivr CDN',
    loadOptions: {
      corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.12.4/dist/ffmpeg-core.js',
      wasmPath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.12.4/dist/ffmpeg-core.wasm',
      workerPath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.12.4/dist/ffmpeg-core.worker.js'
    }
  },
  {
    label: 'unpkg CDN',
    loadOptions: {
      corePath: 'https://unpkg.com/@ffmpeg/core-st@0.12.4/dist/ffmpeg-core.js',
      wasmPath: 'https://unpkg.com/@ffmpeg/core-st@0.12.4/dist/ffmpeg-core.wasm',
      workerPath: 'https://unpkg.com/@ffmpeg/core-st@0.12.4/dist/ffmpeg-core.worker.js'
    }
  }
];

let ffmpegScriptPromise = null;
let ffmpegLoadPromise = null;

const recordedScriptErrors = [];

function describeAttempts(prefix, attempts) {
  if (!attempts.length) {
    return prefix;
  }

  const detail = attempts
    .map(({ source, error }) => `- ${source}: ${error.message || error}`)
    .join('\n');
  return `${prefix}\n${detail}`;
}

function loadScriptTag(src) {
  return new Promise((resolve, reject) => {
    document.querySelectorAll(`script[data-dynamic-ffmpeg="${src}"]`).forEach((element) => {
      element.remove();
    });

    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset.dynamicFfmpeg = src;
    script.onload = () => resolve(src);
    script.onerror = () => reject(new Error('Failed to load script'));
    document.head.appendChild(script);
  });
}

async function ensureFfmpegScriptLoaded() {
  if (typeof createFFmpeg === 'function') {
    return { source: 'preloaded' };
  }

  if (ffmpegScriptPromise) {
    return ffmpegScriptPromise;
  }

  const triedLocal =
    document.querySelector('script[data-ffmpeg-script="local"][data-ffmpeg-failed="true"]') !== null;

  const sourcesToTry = FFMPEG_SCRIPT_SOURCES.filter((src, index) => index !== 0 || !triedLocal);

  const attempts = [];

  ffmpegScriptPromise = (async () => {
    for (const source of sourcesToTry) {
      try {
        await loadScriptTag(source);
        if (typeof createFFmpeg === 'function') {
          console.info(`[FFmpeg] Using script from ${source}`);
          return { source };
        }
        throw new Error('Script loaded, but createFFmpeg is undefined.');
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error(String(error));
        attempts.push({ source, error: normalized });
        recordedScriptErrors.push({ source, error: normalized });
      }
    }

    ffmpegScriptPromise = null;
    const message = describeAttempts(
      '[FFmpeg] Unable to load @ffmpeg/ffmpeg after trying every source:',
      attempts
    );
    throw new Error(message);
  })();

  return ffmpegScriptPromise;
}

async function loadFfmpeg(options = {}) {
  if (ffmpegLoadPromise) {
    return ffmpegLoadPromise;
  }

  ffmpegLoadPromise = (async () => {
    const scriptInfo = await ensureFfmpegScriptLoaded();

    const coreAttempts = [];

    for (const entry of FFMPEG_CORE_PATHS) {
      const createOptions = {
        log: Boolean(options.log),
        ...(options.create || {})
      };
      const loadOptions = {
        ...entry.loadOptions,
        ...(options.load || {})
      };

      const ffmpeg = createFFmpeg(createOptions);
      try {
        await ffmpeg.load(loadOptions);
        console.info(`[FFmpeg] Loaded core from ${entry.label}`);
        return {
          ffmpeg,
          scriptSource: scriptInfo.source,
          coreSource: entry
        };
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error(String(error));
        coreAttempts.push({ entry, error: normalized });
        try {
          ffmpeg.exit();
        } catch (exitError) {
          console.warn('[FFmpeg] Failed to tear down ffmpeg instance after error.', exitError);
        }
      }
    }

    ffmpegLoadPromise = null;
    const message = describeAttempts(
      '[FFmpeg] Unable to load @ffmpeg/core-st after exhausting every option:',
      coreAttempts.map(({ entry, error }) => ({ source: entry.label, error }))
    );
    throw new Error(message);
  })();

  return ffmpegLoadPromise;
}

window.ffmpegLoader = {
  FFMPEG_VERSION,
  FFMPEG_SCRIPT_SOURCES,
  FFMPEG_CORE_PATHS,
  ensureFfmpegScriptLoaded,
  loadFfmpeg,
  getLastScriptErrors() {
    return [...recordedScriptErrors];
  }
};
