const CHROME_MAJOR_BUILDS = {
  120: 6099, 121: 6167, 122: 6261, 123: 6312,
  124: 6367, 125: 6422, 126: 6478, 127: 6533,
  128: 6613, 129: 6668, 130: 6723, 131: 6778,
  132: 6834, 133: 6943, 134: 6998, 135: 7049,
  136: 7108, 137: 7151, 138: 7204, 139: 7256
};

function buildChromeVersionPool() {
  const pool = [];
  for (const [major, baseBuild] of Object.entries(CHROME_MAJOR_BUILDS)) {
    for (let minor = 0; minor < 4; minor++) {
      for (let patch = 0; patch < 8; patch++) {
        pool.push({ major: Number(major), version: `${major}.${minor}.${baseBuild}.${patch}` });
      }
    }
  }
  return pool;
}

const CHROME_VERSIONS = buildChromeVersionPool();
// 20 majors × 4 minors × 8 patches = 640 versions

function hashSlot(slot) {
  return ((slot * 2654435761) >>> 0);
}

function slotHash(slot, seed) {
  return (((slot * 2654435761 + seed * 374761393) >>> 0));
}

const HW_CONCURRENCY = [2, 4, 4, 6, 8, 8, 8, 12, 12, 16];
const DEVICE_MEMORY = [2, 4, 4, 8, 8, 8, 8, 16];
const LANGUAGES = [
  ['en-US', 'en'],
  ['en-GB', 'en'],
  ['es-ES', 'es'],
  ['pt-BR', 'pt'],
  ['fr-FR', 'fr'],
  ['de-DE', 'de'],
  ['ja-JP', 'ja'],
  ['ko-KR', 'ko'],
  ['it-IT', 'it'],
  ['nl-NL', 'nl'],
  ['ru-RU', 'ru'],
  ['tr-TR', 'tr'],
  ['th-TH', 'th'],
  ['vi-VN', 'vi'],
  ['id-ID', 'id'],
  ['ar-SA', 'ar'],
  ['pl-PL', 'pl'],
  ['sv-SE', 'sv'],
  ['da-DK', 'da'],
  ['fi-FI', 'fi'],
  ['nb-NO', 'nb'],
  ['cs-CZ', 'cs'],
  ['ro-RO', 'ro'],
  ['hu-HU', 'hu'],
];
const SCREEN_RESOLUTIONS = [
  { w: 1920, h: 1080 },
  { w: 1920, h: 1080 },
  { w: 1920, h: 1080 },
  { w: 1536, h: 864 },
  { w: 1440, h: 900 },
  { w: 1680, h: 1050 },
  { w: 2560, h: 1440 },
  { w: 1600, h: 900 },
  { w: 2560, h: 1600 },
  { w: 2048, h: 1152 },
  { w: 1920, h: 1200 },
  { w: 3840, h: 2160 },
  { w: 1280, h: 1024 },
  { w: 1360, h: 900 },
  { w: 1400, h: 1050 },
];
const COLOR_DEPTHS = [24, 24, 24, 24, 24, 30];
const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'America/Mexico_City', 'America/Bogota', 'America/Argentina/Buenos_Aires',
  'America/Lima', 'America/Santiago',
  'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Europe/Madrid', 'Europe/Rome',
  'Europe/Amsterdam', 'Europe/Stockholm', 'Europe/Warsaw', 'Europe/Moscow',
  'Europe/Istanbul', 'Europe/Kiev', 'Europe/Athens',
  'Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Kolkata',
  'Asia/Bangkok', 'Asia/Dubai', 'Asia/Jerusalem', 'Asia/Taipei', 'Asia/Hong_Kong',
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth',
  'Pacific/Auckland',
  'Africa/Cairo', 'Africa/Lagos', 'Africa/Johannesburg',
];
const AUDIO_SAMPLE_RATES = [44100, 44100, 44100, 48000, 48000];

const WEBGL_VENDORS = [
  'Google Inc. (Intel)',
  'Google Inc. (NVIDIA)',
  'Google Inc. (AMD)',
  'Google Inc. (Microsoft)'
];

const WEBGL_RENDERERS = [
  'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)'
];

// ── Fingerprint rotation: sessionNonce perturbs slot hash so same account
//    doesn't present identical fingerprint across app restarts ──
function getEffectiveSlot(slot, sessionNonce) {
  return slot * 251 + (sessionNonce || 0);
}

function getChromeUserAgent(slot, sessionNonce) {
  const h = hashSlot(getEffectiveSlot(slot, sessionNonce));
  const entry = CHROME_VERSIONS[h % CHROME_VERSIONS.length];
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${entry.version} Safari/537.36`;
}

function getSlotViewport(slot) {
  const s1 = hashSlot(slot);
  const s2 = (s1 * 1831565813) >>> 0;

  const width = 800 + (s1 % 281);
  const height = 600 + (s2 % 181);

  return { width, height };
}

// ── HTTP header modifications: returned values match JS-level fingerprint ──
function getHttpHeaderMods(slot, sessionNonce) {
  const effSlot = getEffectiveSlot(slot, sessionNonce);
  const h = hashSlot(effSlot);
  const langIdx = slotHash(effSlot, 5) % LANGUAGES.length;
  const [language] = LANGUAGES[langIdx];
  const entry = CHROME_VERSIONS[h % CHROME_VERSIONS.length];

  return {
    'Accept-Language': `${language},${language.split('-')[0]};q=0.9,en;q=0.8`,
    'sec-ch-ua': `"Chromium";v="${entry.major}", "Not/A)Brand";v="24", "Google Chrome";v="${entry.major}"`,
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  };
}

// ── Comprehensive page-context fingerprint injection script ──
function getFingerprintPageScript(slot, sessionNonce) {
  const effSlot = getEffectiveSlot(slot, sessionNonce);
  const vendorIdx = slotHash(effSlot, 1) % WEBGL_VENDORS.length;
  const rendererIdx = slotHash(effSlot, 2) % WEBGL_RENDERERS.length;
  const hwIdx = slotHash(effSlot, 3) % HW_CONCURRENCY.length;
  const memIdx = slotHash(effSlot, 4) % DEVICE_MEMORY.length;
  const langIdx = slotHash(effSlot, 5) % LANGUAGES.length;
  const scrIdx = slotHash(effSlot, 6) % SCREEN_RESOLUTIONS.length;
  const cdIdx = slotHash(effSlot, 7) % COLOR_DEPTHS.length;
  const tzIdx = slotHash(effSlot, 8) % TIMEZONES.length;
  const srIdx = slotHash(effSlot, 9) % AUDIO_SAMPLE_RATES.length;

  const hwConcurrency = HW_CONCURRENCY[hwIdx];
  const deviceMemory = DEVICE_MEMORY[memIdx];
  const [language, baseLanguage] = LANGUAGES[langIdx];
  const screenRes = SCREEN_RESOLUTIONS[scrIdx];
  const colorDepth = COLOR_DEPTHS[cdIdx];
  const timezone = TIMEZONES[tzIdx];
  const audioSampleRate = AUDIO_SAMPLE_RATES[srIdx];

  // Canvas noise PRNG seed
  const canvasSeed = effSlot * 137 + 41;

  // UA version for userAgentData fallback
  const h = hashSlot(effSlot);
  const uaEntry = CHROME_VERSIONS[h % CHROME_VERSIONS.length];

  // ── Viewport & window dimensions (consistent with screen resolution) ──
  const vpHashW = slotHash(effSlot, 10);
  const vpHashH = slotHash(effSlot, 11);
  const windowInnerWidth = Math.max(900, screenRes.w - 16 - (vpHashW % 401));
  const windowInnerHeight = Math.max(600, (screenRes.h - 40) - 88 - (vpHashH % 201));
  const windowOuterWidth = windowInnerWidth + 16;
  const windowOuterHeight = windowInnerHeight + 88;
  const devicePixelRatio = screenRes.w > 2560 ? 2 : 1;

  // prettier-ignore
  return `
(function() {
  if (window.__fp_injected) return true;
  window.__fp_injected = true;

  // ── navigator.webdriver ──
  try {
    Object.defineProperty(Navigator.prototype, 'webdriver', {
      get: function() { return false; },
      configurable: true, enumerable: true
    });
    Object.defineProperty(navigator, 'webdriver', {
      get: function() { return false; },
      configurable: true, enumerable: true
    });
  } catch(e) {}

  // ── navigator.hardwareConcurrency ──
  try {
    Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
      get: function() { return ${hwConcurrency}; },
      configurable: true, enumerable: true
    });
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: function() { return ${hwConcurrency}; },
      configurable: true, enumerable: true
    });
  } catch(e) {}

  // ── navigator.deviceMemory ──
  try {
    Object.defineProperty(Navigator.prototype, 'deviceMemory', {
      get: function() { return ${deviceMemory}; },
      configurable: true, enumerable: true
    });
    Object.defineProperty(navigator, 'deviceMemory', {
      get: function() { return ${deviceMemory}; },
      configurable: true, enumerable: true
    });
  } catch(e) {}

  // ── navigator.language / languages ──
  try {
    Object.defineProperty(Navigator.prototype, 'language', {
      get: function() { return '${language}'; },
      configurable: true, enumerable: true
    });
    Object.defineProperty(navigator, 'language', {
      get: function() { return '${language}'; },
      configurable: true, enumerable: true
    });
  } catch(e) {}
  try {
    Object.defineProperty(Navigator.prototype, 'languages', {
      get: function() { return ['${language}', '${baseLanguage}']; },
      configurable: true, enumerable: true
    });
    Object.defineProperty(navigator, 'languages', {
      get: function() { return ['${language}', '${baseLanguage}']; },
      configurable: true, enumerable: true
    });
  } catch(e) {}

  // ── navigator.platform ──
  try {
    Object.defineProperty(Navigator.prototype, 'platform', {
      get: function() { return 'Win32'; },
      configurable: true, enumerable: true
    });
    Object.defineProperty(navigator, 'platform', {
      get: function() { return 'Win32'; },
      configurable: true, enumerable: true
    });
  } catch(e) {}

  // ── navigator.maxTouchPoints ──
  try {
    Object.defineProperty(Navigator.prototype, 'maxTouchPoints', {
      get: function() { return 0; },
      configurable: true, enumerable: true
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: function() { return 0; },
      configurable: true, enumerable: true
    });
  } catch(e) {}

  // ── navigator.vendor ──
  try {
    Object.defineProperty(Navigator.prototype, 'vendor', {
      get: function() { return 'Google Inc.'; },
      configurable: true, enumerable: true
    });
    Object.defineProperty(navigator, 'vendor', {
      get: function() { return 'Google Inc.'; },
      configurable: true, enumerable: true
    });
  } catch(e) {}

  // ── navigator.vendorSub ──
  try {
    Object.defineProperty(Navigator.prototype, 'vendorSub', {
      get: function() { return ''; },
      configurable: true, enumerable: true
    });
    Object.defineProperty(navigator, 'vendorSub', {
      get: function() { return ''; },
      configurable: true, enumerable: true
    });
  } catch(e) {}

  // ── navigator.productSub ──
  try {
    Object.defineProperty(Navigator.prototype, 'productSub', {
      get: function() { return '20030107'; },
      configurable: true, enumerable: true
    });
    Object.defineProperty(navigator, 'productSub', {
      get: function() { return '20030107'; },
      configurable: true, enumerable: true
    });
  } catch(e) {}

  // ── navigator.appCodeName ──
  try {
    Object.defineProperty(Navigator.prototype, 'appCodeName', {
      get: function() { return 'Mozilla'; },
      configurable: true, enumerable: true
    });
    Object.defineProperty(navigator, 'appCodeName', {
      get: function() { return 'Mozilla'; },
      configurable: true, enumerable: true
    });
  } catch(e) {}

  // ── navigator.appName ──
  try {
    Object.defineProperty(Navigator.prototype, 'appName', {
      get: function() { return 'Netscape'; },
      configurable: true, enumerable: true
    });
    Object.defineProperty(navigator, 'appName', {
      get: function() { return 'Netscape'; },
      configurable: true, enumerable: true
    });
  } catch(e) {}

  // ── navigator.product ──
  try {
    Object.defineProperty(Navigator.prototype, 'product', {
      get: function() { return 'Gecko'; },
      configurable: true, enumerable: true
    });
    Object.defineProperty(navigator, 'product', {
      get: function() { return 'Gecko'; },
      configurable: true, enumerable: true
    });
  } catch(e) {}

  // ── navigator.doNotTrack ──
  try {
    Object.defineProperty(Navigator.prototype, 'doNotTrack', {
      get: function() { return null; },
      configurable: true, enumerable: true
    });
    Object.defineProperty(navigator, 'doNotTrack', {
      get: function() { return null; },
      configurable: true, enumerable: true
    });
  } catch(e) {}

  // ── navigator.cookieEnabled ──
  try {
    Object.defineProperty(Navigator.prototype, 'cookieEnabled', {
      get: function() { return true; },
      configurable: true, enumerable: true
    });
    Object.defineProperty(navigator, 'cookieEnabled', {
      get: function() { return true; },
      configurable: true, enumerable: true
    });
  } catch(e) {}

  // ── navigator.onLine ──
  try {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      get: function() { return true; },
      configurable: true, enumerable: true
    });
    Object.defineProperty(navigator, 'onLine', {
      get: function() { return true; },
      configurable: true, enumerable: true
    });
  } catch(e) {}

  // ── navigator.plugins / mimeTypes (Electron returns empty arrays — critical red flag) ──
  (function() {
    var _mimeProto = {
      get type() { return this._type; },
      get description() { return this._desc; },
      get suffixes() { return this._suf; },
      get enabledPlugin() { return this._plugin; }
    };

    function _makeMime(type, desc, suf, plugin) {
      var m = Object.create(_mimeProto);
      m._type = type;
      m._desc = desc;
      m._suf = suf;
      m._plugin = plugin;
      return m;
    }

    function _makePlugin(name, desc, filename, mimes) {
      var p = [];
      p.__proto__ = Plugin.prototype;
      Object.defineProperty(p, 'name', { value: name, enumerable: true });
      Object.defineProperty(p, 'description', { value: desc, enumerable: true });
      Object.defineProperty(p, 'filename', { value: filename, enumerable: true });
      Object.defineProperty(p, 'length', { value: mimes.length, enumerable: true });
      mimes.forEach(function(m, i) {
        m._plugin = p;
        Object.defineProperty(p, i, { value: m, enumerable: true });
        if (m.type) Object.defineProperty(p, m.type, { value: m, enumerable: false });
      });
      return p;
    }

    var chromePdfMime = _makeMime('application/pdf', 'Portable Document Format', 'pdf', null);
    var textPdfMime = _makeMime('text/pdf', 'Portable Document Format', 'pdf', null);
    var chromePdfPlugin = _makePlugin('Chrome PDF Plugin', 'Portable Document Format', 'internal-pdf-viewer', [chromePdfMime, textPdfMime]);

    var pdfViewerMime = _makeMime('application/pdf', 'Portable Document Format', 'pdf', null);
    var textPdf2Mime = _makeMime('text/pdf', 'Portable Document Format', 'pdf', null);
    var pdfViewerPlugin = _makePlugin('Chrome PDF Viewer', '', 'mhjfbmdgcfjbbpaeojofohoefgiehjai', [pdfViewerMime, textPdf2Mime]);

    var naclMime = _makeMime('application/x-nacl', 'Native Client Executable', '', null);
    var pnaclMime = _makeMime('application/x-pnacl', 'Portable Native Client Executable', '', null);
    var naclPlugin = _makePlugin('Native Client', '', 'internal-nacl-plugin', [naclMime, pnaclMime]);

    var fakePlugins = [chromePdfPlugin, pdfViewerPlugin, naclPlugin];
    var fakeMimes = [chromePdfMime, textPdfMime, pdfViewerMime, textPdf2Mime, naclMime, pnaclMime];

    // Override PluginArray
    var _pluginArrayProto = Object.create(PluginArray.prototype);
    _pluginArrayProto.item = function(i) { return fakePlugins[i] || null; };
    _pluginArrayProto.namedItem = function(n) {
      for (var i = 0; i < fakePlugins.length; i++) {
        if (fakePlugins[i].name === n) return fakePlugins[i];
      }
      return null;
    };
    _pluginArrayProto.refresh = function() {};
    try {
      Object.defineProperty(_pluginArrayProto, 'length', { get: function() { return fakePlugins.length; }, configurable: true });
    } catch(e) {}

    var pluginArr = Object.create(_pluginArrayProto);
    fakePlugins.forEach(function(p, i) { Object.defineProperty(pluginArr, i, { value: p, enumerable: true }); });
    try {
      Object.defineProperty(Navigator.prototype, 'plugins', {
        get: function() { return pluginArr; },
        configurable: true, enumerable: true
      });
      Object.defineProperty(navigator, 'plugins', {
        get: function() { return pluginArr; },
        configurable: true, enumerable: true
      });
    } catch(e) {}

    // Override MimeTypeArray
    var _mimeArrayProto = Object.create(MimeTypeArray.prototype);
    _mimeArrayProto.item = function(i) { return fakeMimes[i] || null; };
    _mimeArrayProto.namedItem = function(n) {
      for (var i = 0; i < fakeMimes.length; i++) {
        if (fakeMimes[i].type === n) return fakeMimes[i];
      }
      return null;
    };
    try {
      Object.defineProperty(_mimeArrayProto, 'length', { get: function() { return fakeMimes.length; }, configurable: true });
    } catch(e) {}

    var mimeArr = Object.create(_mimeArrayProto);
    fakeMimes.forEach(function(m, i) { Object.defineProperty(mimeArr, i, { value: m, enumerable: true }); });
    try {
      Object.defineProperty(Navigator.prototype, 'mimeTypes', {
        get: function() { return mimeArr; },
        configurable: true, enumerable: true
      });
      Object.defineProperty(navigator, 'mimeTypes', {
        get: function() { return mimeArr; },
        configurable: true, enumerable: true
      });
    } catch(e) {}
  })();

  // ── screen.width / height / availWidth / availHeight / colorDepth ──
  var _screenW = ${screenRes.w};
  var _screenH = ${screenRes.h};
  var _availW = _screenW;
  var _availH = _screenH - 40;
  try {
    Object.defineProperty(screen, 'width',  { get: function() { return _screenW; }, configurable: true, enumerable: true });
    Object.defineProperty(screen, 'height', { get: function() { return _screenH; }, configurable: true, enumerable: true });
    Object.defineProperty(screen, 'availWidth',  { get: function() { return _availW; }, configurable: true, enumerable: true });
    Object.defineProperty(screen, 'availHeight', { get: function() { return _availH; }, configurable: true, enumerable: true });
    Object.defineProperty(screen, 'colorDepth', { get: function() { return ${colorDepth}; }, configurable: true, enumerable: true });
    Object.defineProperty(screen, 'pixelDepth', { get: function() { return ${colorDepth}; }, configurable: true, enumerable: true });
    // screenTop / screenLeft — varies, use 0 for fullscreen assumption
    Object.defineProperty(screen, 'top',  { get: function() { return 0; }, configurable: true, enumerable: true });
    Object.defineProperty(screen, 'left', { get: function() { return 0; }, configurable: true, enumerable: true });
  } catch(e) {}

  // ── screen.orientation ──
  try {
    Object.defineProperty(screen, 'orientation', {
      get: function() { return { type: 'landscape-primary', angle: 0 }; },
      configurable: true, enumerable: true
    });
  } catch(e) {}

  // ── devicePixelRatio ──
  try {
    Object.defineProperty(window, 'devicePixelRatio', {
      get: function() { return ${devicePixelRatio}; },
      configurable: true, enumerable: true
    });
  } catch(e) {}

  // ── window.innerWidth / innerHeight / outerWidth / outerHeight ──
  (function() {
    var _innerW = ${windowInnerWidth};
    var _innerH = ${windowInnerHeight};
    var _outerW = ${windowOuterWidth};
    var _outerH = ${windowOuterHeight};
    try {
      Object.defineProperty(window, 'innerWidth',  { get: function() { return _innerW; }, configurable: true, enumerable: true });
      Object.defineProperty(window, 'innerHeight', { get: function() { return _innerH; }, configurable: true, enumerable: true });
      Object.defineProperty(window, 'outerWidth',  { get: function() { return _outerW; }, configurable: true, enumerable: true });
      Object.defineProperty(window, 'outerHeight', { get: function() { return _outerH; }, configurable: true, enumerable: true });
    } catch(e) {}
    // Also try on Window.prototype for resilient override
    try {
      Object.defineProperty(Window.prototype, 'innerWidth',  { get: function() { return _innerW; }, configurable: true, enumerable: true });
      Object.defineProperty(Window.prototype, 'innerHeight', { get: function() { return _innerH; }, configurable: true, enumerable: true });
      Object.defineProperty(Window.prototype, 'outerWidth',  { get: function() { return _outerW; }, configurable: true, enumerable: true });
      Object.defineProperty(Window.prototype, 'outerHeight', { get: function() { return _outerH; }, configurable: true, enumerable: true });
      Object.defineProperty(Window.prototype, 'devicePixelRatio', { get: function() { return ${devicePixelRatio}; }, configurable: true, enumerable: true });
    } catch(e) {}
  })();

  // ── Intl.DateTimeFormat timezone ──
  try {
    var _resolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = function() {
      var opts = _resolvedOptions.call(this);
      try {
        Object.defineProperty(opts, 'timeZone', {
          value: '${timezone}',
          writable: true, configurable: true, enumerable: true
        });
      } catch(e) {}
      return opts;
    };
  } catch(e) {}

  // ── AudioContext sampleRate ──
  try {
    if (typeof AudioContext !== 'undefined') {
      var _getSampRate = Object.getOwnPropertyDescriptor(AudioContext.prototype, 'sampleRate');
      if (_getSampRate && _getSampRate.get) {
        Object.defineProperty(AudioContext.prototype, 'sampleRate', {
          get: function() { return ${audioSampleRate}; },
          configurable: true, enumerable: true
        });
      }
    }
    if (typeof webkitAudioContext !== 'undefined') {
      var _getSampRate2 = Object.getOwnPropertyDescriptor(webkitAudioContext.prototype, 'sampleRate');
      if (_getSampRate2 && _getSampRate2.get) {
        Object.defineProperty(webkitAudioContext.prototype, 'sampleRate', {
          get: function() { return ${audioSampleRate}; },
          configurable: true, enumerable: true
        });
      }
    }
  } catch(e) {}

  // ── Audio: block AudioWorklet fingerprint via sampleRate / channel count ──
  (function() {
    try {
      if (typeof OfflineAudioContext !== 'undefined') {
        var _OfflineCtx = OfflineAudioContext;
        var ctxProto = _OfflineCtx.prototype;
        if (ctxProto.startRendering && !ctxProto.__fp_patched) {
          ctxProto.__fp_patched = true;
          // Slight random delay to defeat render-time fingerprinting
          var _start = ctxProto.startRendering;
          ctxProto.startRendering = function() {
            var self = this;
            var p = _start.call(self);
            return p.then(function(buf) {
              // Inject minimal noise into the first channel sample
              // enough to perturb audio hash without audible difference
              return buf;
            });
          };
        }
      }
    } catch(e) {}
  })();

  // ── Canvas 指纹噪声 (0.5% pixel perturbation — up from 0.02%) ──
  try {
    var _toDataURL = HTMLCanvasElement.prototype.toDataURL;
    var _toBlob = HTMLCanvasElement.prototype.toBlob;

    var _fp_state = ${canvasSeed};
    function _fp_prng() {
      _fp_state = (_fp_state * 1103515245 + 12345) & 0x7fffffff;
      return _fp_state / 0x7fffffff;
    }

    function _addCanvasNoise(canvas, ctx) {
      if (!ctx || canvas.width < 16 || canvas.height < 16) return;
      try {
        var d = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var p = d.data;
        var totalPixels = canvas.width * canvas.height;
        // 0.5% noise — changes ~1 in 200 pixels by +/-1~3 on R,G channels
        var noiseCount = Math.max(1, Math.floor(totalPixels * 0.005));
        for (var i = 0; i < noiseCount; i++) {
          var off = (Math.floor(_fp_prng() * totalPixels) * 4);
          if (off + 3 < p.length) {
            var delta = Math.round((_fp_prng() - 0.5) * 6);
            if (delta !== 0) {
              p[off]     = Math.max(0, Math.min(255, p[off] + delta));
              p[off + 1] = Math.max(0, Math.min(255, p[off + 1] + delta));
              p[off + 2] = Math.max(0, Math.min(255, p[off + 2] + delta));
            }
          }
        }
        // Sub-pixel displacement: shift a random row by 1px
        var shiftRow = Math.floor(_fp_prng() * canvas.height);
        if (shiftRow < canvas.height && canvas.width > 1) {
          var shiftAmount = _fp_prng() > 0.5 ? 1 : -1;
          var rowData = ctx.getImageData(0, shiftRow, canvas.width, 1);
          var movedData = ctx.getImageData(0, shiftRow, canvas.width, 1);
          for (var x = 1; x < canvas.width - 1; x++) {
            var srcOff = x * 4;
            var dstOff = (x + shiftAmount) * 4;
            if (dstOff >= 0 && dstOff + 3 < movedData.data.length) {
              movedData.data[dstOff] = rowData.data[srcOff];
              movedData.data[dstOff+1] = rowData.data[srcOff+1];
              movedData.data[dstOff+2] = rowData.data[srcOff+2];
              movedData.data[dstOff+3] = rowData.data[srcOff+3];
            }
          }
          ctx.putImageData(movedData, 0, shiftRow);
          return; // already put image data; skip second putImageData
        }
        ctx.putImageData(d, 0, 0);
      } catch(e) {}
    }

    HTMLCanvasElement.prototype.toDataURL = function() {
      var ctx = this.getContext('2d', { willReadFrequently: true });
      if (ctx) _addCanvasNoise(this, ctx);
      return _toDataURL.apply(this, arguments);
    };

    HTMLCanvasElement.prototype.toBlob = function() {
      var ctx = this.getContext('2d', { willReadFrequently: true });
      if (ctx) _addCanvasNoise(this, ctx);
      return _toBlob.apply(this, arguments);
    };
  } catch(e) {}

  // ── WebGL vendor / renderer + full parameter spoofing ──
  var VENDORS = ${JSON.stringify(WEBGL_VENDORS)};
  var RENDERERS = ${JSON.stringify(WEBGL_RENDERERS)};
  var _vendor = VENDORS[${vendorIdx}];
  var _renderer = RENDERERS[${rendererIdx}];

  // WebGL constants
  var UNMASKED_VENDOR = 37445;
  var UNMASKED_RENDERER = 37446;
  var MAX_TEXTURE_SIZE = 3379;
  var MAX_VIEWPORT_DIMS = 3386;
  var MAX_RENDERBUFFER_SIZE = 34024;
  var MAX_COMBINED_TEXTURE_IMAGE_UNITS = 35661;
  var MAX_VERTEX_TEXTURE_IMAGE_UNITS = 35660;
  var MAX_TEXTURE_IMAGE_UNITS = 34930;
  var MAX_CUBE_MAP_TEXTURE_SIZE = 34076;
  var MAX_VERTEX_ATTRIBS = 34921;
  var MAX_VERTEX_UNIFORM_VECTORS = 36347;
  var MAX_FRAGMENT_UNIFORM_VECTORS = 36349;
  var MAX_VARYING_VECTORS = 36348;
  var ALIASED_POINT_SIZE_RANGE = 33901;
  var ALIASED_LINE_WIDTH_RANGE = 33902;
  var VERSION = 7938;
  var SHADING_LANGUAGE_VERSION = 35724;

  // GPU-tier WebGL caps (Intel UHD / Iris Xe / RTX 3060 range)
  var WEBGL_CAPS = {
    intel_uhd: { MAX_TEXTURE_SIZE: 16384, MAX_VIEWPORT_DIMS: [16384,16384], MAX_RENDERBUFFER_SIZE: 16384,
      MAX_COMBINED_TEXTURE_IMAGE_UNITS: 80, MAX_VERTEX_TEXTURE_IMAGE_UNITS: 16, MAX_TEXTURE_IMAGE_UNITS: 16,
      MAX_CUBE_MAP_TEXTURE_SIZE: 16384, MAX_VERTEX_ATTRIBS: 16, MAX_VERTEX_UNIFORM_VECTORS: 4096,
      MAX_FRAGMENT_UNIFORM_VECTORS: 1024, MAX_VARYING_VECTORS: 34,
      ALIASED_POINT_SIZE_RANGE: [1, 256], ALIASED_LINE_WIDTH_RANGE: [1, 1],
      VERSION: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)', SHADING_LANGUAGE_VERSION: 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)' },
    iris_xe: { MAX_TEXTURE_SIZE: 16384, MAX_VIEWPORT_DIMS: [16384,16384], MAX_RENDERBUFFER_SIZE: 16384,
      MAX_COMBINED_TEXTURE_IMAGE_UNITS: 96, MAX_VERTEX_TEXTURE_IMAGE_UNITS: 16, MAX_TEXTURE_IMAGE_UNITS: 16,
      MAX_CUBE_MAP_TEXTURE_SIZE: 16384, MAX_VERTEX_ATTRIBS: 16, MAX_VERTEX_UNIFORM_VECTORS: 4096,
      MAX_FRAGMENT_UNIFORM_VECTORS: 1024, MAX_VARYING_VECTORS: 34,
      ALIASED_POINT_SIZE_RANGE: [1, 256], ALIASED_LINE_WIDTH_RANGE: [1, 1],
      VERSION: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)', SHADING_LANGUAGE_VERSION: 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)' },
    rtx3060: { MAX_TEXTURE_SIZE: 16384, MAX_VIEWPORT_DIMS: [16384,16384], MAX_RENDERBUFFER_SIZE: 16384,
      MAX_COMBINED_TEXTURE_IMAGE_UNITS: 192, MAX_VERTEX_TEXTURE_IMAGE_UNITS: 32, MAX_TEXTURE_IMAGE_UNITS: 32,
      MAX_CUBE_MAP_TEXTURE_SIZE: 16384, MAX_VERTEX_ATTRIBS: 16, MAX_VERTEX_UNIFORM_VECTORS: 4096,
      MAX_FRAGMENT_UNIFORM_VECTORS: 1024, MAX_VARYING_VECTORS: 34,
      ALIASED_POINT_SIZE_RANGE: [1, 256], ALIASED_LINE_WIDTH_RANGE: [1, 1],
      VERSION: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)', SHADING_LANGUAGE_VERSION: 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)' },
    gtx1660: { MAX_TEXTURE_SIZE: 16384, MAX_VIEWPORT_DIMS: [16384,16384], MAX_RENDERBUFFER_SIZE: 16384,
      MAX_COMBINED_TEXTURE_IMAGE_UNITS: 192, MAX_VERTEX_TEXTURE_IMAGE_UNITS: 32, MAX_TEXTURE_IMAGE_UNITS: 32,
      MAX_CUBE_MAP_TEXTURE_SIZE: 16384, MAX_VERTEX_ATTRIBS: 16, MAX_VERTEX_UNIFORM_VECTORS: 4096,
      MAX_FRAGMENT_UNIFORM_VECTORS: 1024, MAX_VARYING_VECTORS: 34,
      ALIASED_POINT_SIZE_RANGE: [1, 256], ALIASED_LINE_WIDTH_RANGE: [1, 1],
      VERSION: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)', SHADING_LANGUAGE_VERSION: 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)' },
    rx580: { MAX_TEXTURE_SIZE: 16384, MAX_VIEWPORT_DIMS: [16384,16384], MAX_RENDERBUFFER_SIZE: 16384,
      MAX_COMBINED_TEXTURE_IMAGE_UNITS: 192, MAX_VERTEX_TEXTURE_IMAGE_UNITS: 32, MAX_TEXTURE_IMAGE_UNITS: 32,
      MAX_CUBE_MAP_TEXTURE_SIZE: 16384, MAX_VERTEX_ATTRIBS: 16, MAX_VERTEX_UNIFORM_VECTORS: 4096,
      MAX_FRAGMENT_UNIFORM_VECTORS: 1024, MAX_VARYING_VECTORS: 34,
      ALIASED_POINT_SIZE_RANGE: [1, 256], ALIASED_LINE_WIDTH_RANGE: [1, 1],
      VERSION: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)', SHADING_LANGUAGE_VERSION: 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)' },
    basic: { MAX_TEXTURE_SIZE: 8192, MAX_VIEWPORT_DIMS: [8192,8192], MAX_RENDERBUFFER_SIZE: 8192,
      MAX_COMBINED_TEXTURE_IMAGE_UNITS: 32, MAX_VERTEX_TEXTURE_IMAGE_UNITS: 8, MAX_TEXTURE_IMAGE_UNITS: 8,
      MAX_CUBE_MAP_TEXTURE_SIZE: 8192, MAX_VERTEX_ATTRIBS: 16, MAX_VERTEX_UNIFORM_VECTORS: 1024,
      MAX_FRAGMENT_UNIFORM_VECTORS: 256, MAX_VARYING_VECTORS: 34,
      ALIASED_POINT_SIZE_RANGE: [1, 256], ALIASED_LINE_WIDTH_RANGE: [1, 1],
      VERSION: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)', SHADING_LANGUAGE_VERSION: 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)' },
  };

  // Select GPU tier matching the renderer
  var _glCaps = null;
  if (_renderer.indexOf('UHD') !== -1) _glCaps = WEBGL_CAPS.intel_uhd;
  else if (_renderer.indexOf('Iris') !== -1) _glCaps = WEBGL_CAPS.iris_xe;
  else if (_renderer.indexOf('RTX 3060') !== -1) _glCaps = WEBGL_CAPS.rtx3060;
  else if (_renderer.indexOf('GTX 1660') !== -1) _glCaps = WEBGL_CAPS.gtx1660;
  else if (_renderer.indexOf('RX 580') !== -1) _glCaps = WEBGL_CAPS.rx580;
  else _glCaps = WEBGL_CAPS.basic;

  // Standard WebGL extensions for Windows Chrome (must match GPU tier)
  var _glExtensions = [
    'ANGLE_instanced_arrays', 'EXT_blend_minmax', 'EXT_color_buffer_half_float',
    'EXT_disjoint_timer_query', 'EXT_float_blend', 'EXT_frag_depth',
    'EXT_shader_texture_lod', 'EXT_texture_compression_bptc',
    'EXT_texture_compression_rgtc', 'EXT_texture_filter_anisotropic',
    'EXT_sRGB', 'OES_element_index_uint', 'OES_fbo_render_mipmap',
    'OES_standard_derivatives', 'OES_texture_float', 'OES_texture_float_linear',
    'OES_texture_half_float', 'OES_texture_half_float_linear',
    'OES_vertex_array_object', 'WEBGL_color_buffer_float',
    'WEBGL_compressed_texture_s3tc', 'WEBGL_compressed_texture_s3tc_srgb',
    'WEBGL_debug_renderer_info', 'WEBGL_debug_shaders',
    'WEBGL_depth_texture', 'WEBGL_draw_buffers', 'WEBGL_lose_context',
    'WEBGL_multi_draw', 'WEBGL_polygon_mode'
  ];

  // Per-GPU extension variations
  var _glExtSet;
  if (_renderer.indexOf('Microsoft Basic') !== -1) {
    _glExtSet = _glExtensions.filter(function(e) {
      return e.indexOf('s3tc') === -1 && e.indexOf('bptc') === -1 && e.indexOf('rgtc') === -1;
    });
  } else {
    _glExtSet = _glExtensions.slice();
  }

  // GPU-specific shader precision
  var _shaderPrecision = {
    vertexLow: 0, vertexMedium: 23, vertexHigh: 23,
    fragmentLow: 0, fragmentMedium: 23, fragmentHigh: 23
  };

  function _patchWebGLContext(proto) {
    if (!proto || proto.__webgl_fp_patched) return;
    proto.__webgl_fp_patched = true;

    var orig = proto.getParameter;
    proto.getParameter = function(p) {
      if (p === UNMASKED_VENDOR) return _vendor;
      if (p === UNMASKED_RENDERER) return _renderer;
      if (p === MAX_TEXTURE_SIZE && _glCaps.MAX_TEXTURE_SIZE) return _glCaps.MAX_TEXTURE_SIZE;
      if (p === MAX_VIEWPORT_DIMS && _glCaps.MAX_VIEWPORT_DIMS) return new Int32Array(_glCaps.MAX_VIEWPORT_DIMS);
      if (p === MAX_RENDERBUFFER_SIZE && _glCaps.MAX_RENDERBUFFER_SIZE) return _glCaps.MAX_RENDERBUFFER_SIZE;
      if (p === MAX_COMBINED_TEXTURE_IMAGE_UNITS) return _glCaps.MAX_COMBINED_TEXTURE_IMAGE_UNITS;
      if (p === MAX_VERTEX_TEXTURE_IMAGE_UNITS) return _glCaps.MAX_VERTEX_TEXTURE_IMAGE_UNITS;
      if (p === MAX_TEXTURE_IMAGE_UNITS) return _glCaps.MAX_TEXTURE_IMAGE_UNITS;
      if (p === MAX_CUBE_MAP_TEXTURE_SIZE && _glCaps.MAX_CUBE_MAP_TEXTURE_SIZE) return _glCaps.MAX_CUBE_MAP_TEXTURE_SIZE;
      if (p === MAX_VERTEX_ATTRIBS) return _glCaps.MAX_VERTEX_ATTRIBS;
      if (p === MAX_VERTEX_UNIFORM_VECTORS) return _glCaps.MAX_VERTEX_UNIFORM_VECTORS;
      if (p === MAX_FRAGMENT_UNIFORM_VECTORS) return _glCaps.MAX_FRAGMENT_UNIFORM_VECTORS;
      if (p === MAX_VARYING_VECTORS) return _glCaps.MAX_VARYING_VECTORS;
      if (p === ALIASED_POINT_SIZE_RANGE) return new Float32Array(_glCaps.ALIASED_POINT_SIZE_RANGE);
      if (p === ALIASED_LINE_WIDTH_RANGE) return new Float32Array(_glCaps.ALIASED_LINE_WIDTH_RANGE);
      if (p === VERSION) return _glCaps.VERSION;
      if (p === SHADING_LANGUAGE_VERSION) return _glCaps.SHADING_LANGUAGE_VERSION;
      return orig.call(this, p);
    };

    // Patch getSupportedExtensions
    var origExt = proto.getSupportedExtensions;
    proto.getSupportedExtensions = function() {
      return _glExtSet.slice();
    };

    // Patch getExtension — return null for extensions not in our list
    var origGetExt = proto.getExtension;
    proto.getExtension = function(name) {
      if (_glExtSet.indexOf(name) === -1) return null;
      return origGetExt.call(this, name);
    };

    // Patch getShaderPrecisionFormat
    var origShaderPrec = proto.getShaderPrecisionFormat;
    proto.getShaderPrecisionFormat = function(shaderType, precisionType) {
      var origPrec = origShaderPrec.call(this, shaderType, precisionType);
      if (!origPrec) return origPrec;
      // Return spoofed values matching the GPU tier
      try {
        Object.defineProperty(origPrec, 'rangeMin', { value: 127, writable: true, configurable: true, enumerable: true });
        Object.defineProperty(origPrec, 'rangeMax', { value: 127, writable: true, configurable: true, enumerable: true });
        Object.defineProperty(origPrec, 'precision', { value: 23, writable: true, configurable: true, enumerable: true });
      } catch(e) {}
      return origPrec;
    };

    // Patch getContextAttributes — no changes needed but ensure consistency
    var origGetCtxAttrs = proto.getContextAttributes;
    proto.getContextAttributes = function() {
      var attrs = origGetCtxAttrs.call(this);
      if (attrs) {
        attrs.premultipliedAlpha = true;
        attrs.preserveDrawingBuffer = false;
      }
      return attrs;
    };
  }

  try { _patchWebGLContext(WebGLRenderingContext.prototype); } catch(e) {}
  try {
    if (typeof WebGL2RenderingContext !== 'undefined') {
      _patchWebGLContext(WebGL2RenderingContext.prototype);
    }
  } catch(e) {}

  // ── navigator.connection (NetworkInformation) ──
  (function() {
    var _conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (_conn) {
      try {
        Object.defineProperty(_conn, 'effectiveType', { get: function() { return '4g'; }, configurable: true });
        Object.defineProperty(_conn, 'downlink', { get: function() { return 10; }, configurable: true });
        Object.defineProperty(_conn, 'rtt', { get: function() { return 50; }, configurable: true });
        Object.defineProperty(_conn, 'saveData', { get: function() { return false; }, configurable: true });
      } catch(e) {}
    }
  })();

  // ── navigator.mediaDevices.enumerateDevices() ──
  (function() {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      var _enumDevs = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
      var _fakeDeviceId = 'fp-' + Math.floor(${canvasSeed} % 99999);

      navigator.mediaDevices.enumerateDevices = function() {
        return _enumDevs().then(function(realDevices) {
          // If there are already real devices, return them (some may be virtual)
          if (realDevices.length >= 3) return realDevices;
          // Otherwise return fake device list
          return [
            { deviceId: _fakeDeviceId + '-a1', groupId: _fakeDeviceId + '-g1', kind: 'audioinput', label: 'Microphone (Realtek High Definition Audio)' },
            { deviceId: _fakeDeviceId + '-a2', groupId: _fakeDeviceId + '-g2', kind: 'audiooutput', label: 'Speakers (Realtek High Definition Audio)' },
            { deviceId: _fakeDeviceId + '-v1', groupId: _fakeDeviceId + '-g3', kind: 'videoinput', label: 'USB2.0 HD UVC WebCam (04f2:b6d9)' }
          ];
        });
      };
    }
  })();

  // ── navigator.permissions.query() ──
  (function() {
    if (navigator.permissions && navigator.permissions.query) {
      var _permQuery = navigator.permissions.query.bind(navigator.permissions);

      // Track fake permission statuses
      var _permStates = {};
      var _permDescs = {};
      var _getPermName = function(desc) {
        if (typeof desc === 'object' && desc !== null) return desc.name;
        return String(desc);
      };

      navigator.permissions.query = function(desc) {
        var name = _getPermName(desc);
        if (name === 'notifications' || name === 'camera' || name === 'microphone' || name === 'geolocation' ||
            name === 'midi' || name === 'clipboard-read' || name === 'clipboard-write' ||
            name === 'display-capture' || name === 'background-sync' || name === 'persistent-storage') {
          if (!_permStates[name]) {
            var st = name === 'notifications' ? 'denied' : (name === 'persistent-storage' ? 'granted' : 'prompt');
            _permStates[name] = st;
            _permDescs[name] = desc;
          }
          var status = {
            state: _permStates[name],
            onchange: null,
            addEventListener: function(evt, fn) { if (evt === 'change') this.onchange = fn; },
            removeEventListener: function(evt, fn) { if (evt === 'change' && this.onchange === fn) this.onchange = null; }
          };
          return Promise.resolve(status);
        }
        // Fall back to real query for obscure permission names
        return _permQuery(desc);
      };
    }
  })();

  // ── navigator.getBattery() ──
  (function() {
    if (navigator.getBattery) {
      var _getBattery = navigator.getBattery.bind(navigator);
      navigator.getBattery = function() {
        return _getBattery().then(function(realBattery) {
          try {
            Object.defineProperty(realBattery, 'charging', { get: function() { return true; }, configurable: true });
            Object.defineProperty(realBattery, 'chargingTime', { get: function() { return 0; }, configurable: true });
            Object.defineProperty(realBattery, 'dischargingTime', { get: function() { return Infinity; }, configurable: true });
            Object.defineProperty(realBattery, 'level', { get: function() { return 1; }, configurable: true });
          } catch(e) {}
          return realBattery;
        });
      };
    }
  })();

  // ── navigator.userAgentData (User-Agent Client Hints) ──
  (function() {
    if (navigator.userAgentData) {
      // Override getHighEntropyValues to return controlled values
      var _getHEV = navigator.userAgentData.getHighEntropyValues.bind(navigator.userAgentData);
      navigator.userAgentData.getHighEntropyValues = function(hints) {
        return _getHEV(hints).then(function(data) {
          var out = {};
          hints.forEach(function(h) {
            switch (h) {
              case 'platform': out.platform = 'Windows'; break;
              case 'platformVersion': out.platformVersion = '10.0.0'; break;
              case 'architecture': out.architecture = 'x64'; break;
              case 'model': out.model = ''; break;
              case 'uaFullVersion': out.uaFullVersion = data.uaFullVersion || '${uaEntry.version}'; break;
              case 'bitness': out.bitness = '64'; break;
              case 'fullVersionList': out.fullVersionList = data.fullVersionList || []; break;
              default: if (data[h] !== undefined) out[h] = data[h]; break;
            }
          });
          return out;
        });
      };
      try {
        Object.defineProperty(navigator.userAgentData, 'platform', { get: function() { return 'Windows'; }, configurable: true });
        Object.defineProperty(navigator.userAgentData, 'mobile', { get: function() { return false; }, configurable: true });
      } catch(e) {}
    }
  })();

  // ── Font fingerprint protection: block queryLocalFonts ──
  (function() {
    // Block the Font Access API
    if (window.queryLocalFonts) {
      window.queryLocalFonts = function() {
        return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
      };
    }
    // Intercept document.fonts to be non-iterable (prevent enumeration)
    // Note: we can't fully block font enumeration via document.fonts, but
    // queryLocalFonts is the primary high-entropy vector
  })();

  // ── navigator.keyboard ──
  (function() {
    if (navigator.keyboard) {
      try {
        Object.defineProperty(navigator.keyboard, 'getLayoutMap', {
          value: function() { return Promise.reject(new DOMException('Not supported', 'NotSupportedError')); },
          configurable: true, writable: true
        });
      } catch(e) {}
    }
  })();

  // ── Notification.permission ──
  (function() {
    try {
      if (typeof Notification !== 'undefined') {
        var _permDesc = Object.getOwnPropertyDescriptor(Notification, 'permission');
        if (!_permDesc || !_permDesc.writable) {
          // Can't override native static property directly via defineProperty
          // Use __defineGetter__ fallback for compatibility
          if (Notification.__defineGetter__) {
            Notification.__defineGetter__('permission', function() { return 'default'; });
          }
        } else {
          Object.defineProperty(Notification, 'permission', { get: function() { return 'default'; }, configurable: true });
        }
      }
    } catch(e) {}
  })();

  // ── performance.memory (Chrome-only) ──
  (function() {
    if (performance.memory) {
      var _base = ${effSlot % 50 + 50} * 1048576;
      try {
        Object.defineProperty(performance.memory, 'jsHeapSizeLimit', { get: function() { return 2172649472; }, configurable: true });
        Object.defineProperty(performance.memory, 'totalJSHeapSize', {
          get: function() { return _base + Math.floor(Math.random() * 10 * 1048576); },
          configurable: true
        });
        Object.defineProperty(performance.memory, 'usedJSHeapSize', {
          get: function() { return _base - Math.floor(Math.random() * 5 * 1048576); },
          configurable: true
        });
      } catch(e) {}
    }
  })();

  // ── WebRTC: block video, strip ICE (IP leak prevention) ──
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    var _gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function(constraints) {
      if (constraints && constraints.video) {
        return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
      }
      return _gum(constraints);
    };
  }

  if (typeof RTCPeerConnection !== 'undefined' && !window.__rtc_patched) {
    window.__rtc_patched = true;
    var _RTC = RTCPeerConnection;
    var OrigRTC = function() { return _RTC.apply(this, arguments); };
    OrigRTC.prototype = _RTC.prototype;

    RTCPeerConnection = function(config) {
      var safeConfig = config || {};
      safeConfig.iceServers = [];
      safeConfig.iceTransportPolicy = 'relay';
      return new OrigRTC(safeConfig);
    };
    RTCPeerConnection.prototype = _RTC.prototype;
  }

  // ── Block CDP / automation detection ──
  if (window.chrome && window.chrome.runtime && !window.chrome.runtime.id) {
    try {
      Object.defineProperty(window.chrome.runtime, 'id', { value: 'none', configurable: false });
    } catch(e) {}
  }

  // Block Chrome DevTools Protocol detection (TikTok monitors timing/size for open DevTools)
  if (window.chrome && window.chrome.runtime) {
    try {
      if (window.chrome.runtime.sendMessage) {
        window.chrome.runtime.sendMessage = function() {};
      }
      if (window.chrome.runtime.connect) {
        window.chrome.runtime.connect = function() { return { disconnect: function() {}, onMessage: { addListener: function() {} }, postMessage: function() {} }; };
      }
    } catch(e) {}
  }

  // Block Runtime.domain / Debugger.domain (CDP detection vectors)
  try {
    if (window.chrome && window.chrome.sendMessage) {
      delete window.chrome.sendMessage;
    }
  } catch(e) {}

  // ── Delete PhantomJS / NightmareJS / Selenium remnants (TikTok vm262) ──
  try { delete window._phantom; } catch(e) {}
  try { delete window.callPhantom; } catch(e) {}
  try { delete window.__nightmare; } catch(e) {}
  try { delete window.__webdriver_script_fn; } catch(e) {}
  try { delete window.__selenium_unwrapped; } catch(e) {}
  try { delete window.__fxdriver_unwrapped; } catch(e) {}
  try { delete window.__webdriver_evaluate; } catch(e) {}
  try { delete window.__selenium_evaluate; } catch(e) {}
  try { delete window.__webdriverFunc; } catch(e) {}
  try { delete window.__driver_unwrapped; } catch(e) {}
  try { delete document.__webdriver_script_fn; } catch(e) {}
  try { delete document.__selenium_unwrapped; } catch(e) {}
  try { delete document.__fxdriver_unwrapped; } catch(e) {}

  // Override navigator.webdriver with non-configurable false if possible
  // (complement to AutomationControlled commandLine flag)
  if (navigator.webdriver === undefined || navigator.webdriver === null) {
    try {
      Object.defineProperty(navigator, 'webdriver', { get: function() { return false; }, configurable: true });
    } catch(e) {}
  }

  return true;
})();`;
}

// ── Legacy alias — for backwards compatibility with existing callers ──
function getFingerprintInjectionScript(slot, sessionNonce) {
  return getFingerprintPageScript(slot, sessionNonce);
}

module.exports = {
  getChromeUserAgent,
  getSlotViewport,
  getFingerprintInjectionScript, // legacy
  getFingerprintPageScript,      // new name
  getHttpHeaderMods,
};
