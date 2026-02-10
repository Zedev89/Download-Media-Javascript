/*
  compress.js - Refactored
  
  Deux modes mutuellement exclusifs :
  - "Current" (défaut) : pas de taille cible. On peut changer la résolution si on veut.
  - "Custom" (taille cible) : l'utilisateur entre une taille en MB. Une résolution est
    auto-sélectionnée selon le ratio cible/current.

  La résolution (1080/720/480/320) est toujours sélectionnable indépendamment.

  Au Save :
  - Current + même résolution = rien à faire
  - Current + résolution différente = resize seulement
  - Custom + taille cible = resize (auto ou manuel) + compression bitrate pour atteindre la cible
*/

let currentFileSizeMB = 0;
let originalResolution = null; // La résolution détectée du vidéo source
let videoDuration = 1;         // Durée en secondes
let sourceAudioBitrate = 128;  // Bitrate audio source en kbit/s
let sizeMode = 'current';      // 'current' ou 'custom'

const customInput = document.getElementById('custom-mb-input');
const customRadio = document.querySelector('input[name="size-group"][value="custom"]');
const currentContainer = document.getElementById('current-mb-container');
const presetRadios = document.querySelectorAll('input[name="size-group"]');

// ─── Helpers ───

const availableRes = ['320', '480', '720', '1080'];

// Minimum viable video bitrate (kbit/s) for acceptable quality at each resolution
const minBitrateForRes = {
  '1080': 2000,
  '720':  1000,
  '480':  500,
  '320':  250
};

function computeVideoBudget(targetMB) {
  if (targetMB <= 0 || videoDuration <= 0) return 0;
  const totalBitrate = (targetMB * 1024 * 8) / videoDuration; // kbit/s
  const audioBudget = Math.max(Math.min(sourceAudioBitrate || 64, Math.floor(totalBitrate * 0.15)), 32);
  return Math.max(totalBitrate - audioBudget, 50);
}

function computeRecommendedResolution(targetMB) {
  if (currentFileSizeMB <= 0 || targetMB <= 0) return null;
  
  const videoBudget = computeVideoBudget(targetMB);
  
  // Pick highest resolution where videoBudget >= minimum viable bitrate
  let recommended = '320'; // fallback
  for (let i = availableRes.length - 1; i >= 0; i--) {
    const res = availableRes[i];
    if (videoBudget >= minBitrateForRes[res]) {
      recommended = res;
      break;
    }
  }

  // Never upscale: cap at original resolution
  if (originalResolution) {
    const origIdx = availableRes.indexOf(originalResolution);
    const recIdx = availableRes.indexOf(recommended);
    if (origIdx >= 0 && recIdx > origIdx) {
      recommended = originalResolution;
    }
  }

  return recommended;
}

// Disable resolutions above original (upscale) AND resolutions too high for target size
function updateDisabledResolutions(targetMB) {
  const origIdx = originalResolution ? availableRes.indexOf(originalResolution) : availableRes.length - 1;
  const videoBudget = targetMB > 0 ? computeVideoBudget(targetMB) : Infinity;

  availableRes.forEach((res, idx) => {
    const radio = document.querySelector(`input[name="size-group"][value="${res}"]`);
    if (!radio) return;
    const lbl = radio.closest('label');

    // Disable if above original resolution OR if bitrate would be too low for this resolution
    const aboveOriginal = (origIdx >= 0 && idx > origIdx);
    const tooHighForBudget = (targetMB > 0 && videoBudget < minBitrateForRes[res]);
    
    if (aboveOriginal || tooHighForBudget) {
      radio.disabled = true;
      if (lbl) lbl.classList.add('disabled');
      // If this was checked, uncheck it
      if (radio.checked) radio.checked = false;
    } else {
      radio.disabled = false;
      if (lbl) lbl.classList.remove('disabled');
    }
  });
}

function parseCustomValue() {
  // Accept both comma and dot as decimal separator
  const raw = customInput.value.replace(',', '.');
  return Number(raw) || 0;
}

function clampCustomInput() {
  if (currentFileSizeMB <= 0) return;
  const val = parseCustomValue();
  if (val > currentFileSizeMB) {
    customInput.value = currentFileSizeMB.toFixed(1);
  }
}

function formatCustomInput() {
  // Normalize display: replace comma with dot for consistency
  const val = parseCustomValue();
  if (val > 0) {
    customInput.value = val.toFixed(1);
  }
}

function getSelectedResolution() {
  const checked = document.querySelector('input[name="size-group"]:checked');
  if (checked && ['1080', '720', '480', '320'].includes(checked.value)) {
    return checked.value;
  }
  return null;
}

function selectResolutionRadio(value) {
  presetRadios.forEach(r => {
    if (r.value === 'custom') return; // Don't touch custom radio
    r.checked = (r.value === value);
  });
  clearRecommendedVisual();
}

function clearRecommendedVisual() {
  document.querySelectorAll('label.radio-btn').forEach(lbl => {
    lbl.classList.remove('recommended');
    lbl.classList.remove('applied');
  });
}

function showRecommendedVisual(resValue) {
  clearRecommendedVisual();
  const recInput = document.querySelector(`input[name="size-group"][value="${resValue}"]`);
  if (recInput) {
    const lbl = recInput.closest('label');
    if (lbl) {
      lbl.classList.add('recommended');
      lbl.classList.add('applied');
    }
  }
}

function updateSizeModeUI() {
  if (sizeMode === 'current') {
    currentContainer.classList.add('active');
    if (customRadio) customRadio.checked = false;
  } else {
    currentContainer.classList.remove('active');
  }
}

function switchToCurrentMode() {
  sizeMode = 'current';
  customInput.value = '';
  if (customRadio) customRadio.checked = false;
  document.getElementById('customInputLabel').classList.remove('active');
  clearRecommendedVisual();
  updateSizeModeUI();
}

function switchToCustomMode() {
  sizeMode = 'custom';
  if (customRadio) customRadio.checked = true;
  document.getElementById('customInputLabel').classList.add('active');
  updateSizeModeUI();
}

// ─── Event listeners ───

// Click on "Current" box → switch to current mode, restore original resolution
currentContainer.addEventListener('click', () => {
  switchToCurrentMode();
  updateDisabledResolutions(0); // Reset: only disable above original
  if (originalResolution) {
    selectResolutionRadio(originalResolution);
  }
});

// Click on a resolution preset radio
presetRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      switchToCustomMode();
      customInput.focus();
      return;
    }
    // Pour les presets de résolution (1080/720/480/320) :
    // On ne change PAS le sizeMode. Current reste current, custom reste custom.
    // On clear juste le visual "recommended" puisque c'est un choix manuel.
    if (['1080', '720', '480', '320'].includes(val)) {
      clearRecommendedVisual();
    }
  });
});

// Typing in custom input → switch to custom mode + auto-select resolution
customInput.addEventListener('input', () => {
  // Allow only digits and dot, replace comma with dot
  customInput.value = customInput.value.replace(',', '.').replace(/[^0-9.]/g, '');
  
  const raw = customInput.value;
  const value = parseCustomValue();
  
  // If field has content (even partial like "0."), stay in custom mode
  if (raw.length > 0) {
    switchToCustomMode();
    
    // Only update resolution recommendation if we have a real value
    if (value > 0 && currentFileSizeMB > 0) {
      updateDisabledResolutions(value);
      const recommended = computeRecommendedResolution(value);
      if (recommended) {
        selectResolutionRadio(recommended);
        showRecommendedVisual(recommended);
      }
    }
  } else {
    // Field completely empty → back to current mode
    switchToCurrentMode();
    updateDisabledResolutions(0); // Reset: only disable above original
    if (originalResolution) {
      selectResolutionRadio(originalResolution);
    }
  }
});

// On blur: clamp to max and normalize display format
customInput.addEventListener('blur', () => {
  const val = parseCustomValue();
  if (val > 0) {
    clampCustomInput();
    formatCustomInput();
    // Re-trigger recommendation with clamped value
    const clamped = parseCustomValue();
    if (currentFileSizeMB > 0 && clamped > 0) {
      updateDisabledResolutions(clamped);
      const recommended = computeRecommendedResolution(clamped);
      if (recommended) {
        selectResolutionRadio(recommended);
        showRecommendedVisual(recommended);
      }
    }
  }
});

// Focusing the custom input → switch to custom mode
customInput.addEventListener('focus', () => {
  switchToCustomMode();
});

// ─── API for other modules ───

window.setCurrentFileSizeMB = function (mb) {
  currentFileSizeMB = mb;
};

window.setOriginalResolution = function (res) {
  originalResolution = res;
};

// Called from ui-tools after loading video
window.initCompressUI = function (fileSizeMB, detectedResolution, duration, audioBitrateKbps) {
  currentFileSizeMB = fileSizeMB;
  originalResolution = detectedResolution;
  videoDuration = duration || 1;
  sourceAudioBitrate = audioBitrateKbps || 128;
  
  // Disable resolution presets above original
  updateDisabledResolutions(0);
  
  switchToCurrentMode();
  if (detectedResolution) {
    selectResolutionRadio(detectedResolution);
  }
};

// ─── Compress function (called from pipeline) ───

window.compress = async function (file, outputFolder) {
  const selectedRes = getSelectedResolution();
  const selectedResNum = selectedRes ? Number(selectedRes) : null;
  const originalResNum = originalResolution ? Number(originalResolution) : null;
  const customVal = parseCustomValue();

  // Determine what needs to happen
  const resolutionChanged = selectedResNum && originalResNum && (selectedResNum !== originalResNum);
  const isUpscale = selectedResNum && originalResNum && (selectedResNum > originalResNum);
  const hasTargetSize = (sizeMode === 'custom' && customVal > 0);

  // Nothing to do (upscale = no resize)
  const effectiveResChange = resolutionChanged && !isUpscale;
  if (!effectiveResChange && !hasTargetSize) {
    console.log("Compress skipped: no downscale, no target size.");
    return null;
  }

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, async (err, metadata) => {
      if (err) return reject(err);

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const currentHeight = videoStream ? videoStream.height : 0;
      const sizeInMB = Number((metadata.format.size / (1024 * 1024)).toFixed(2));
      const duration = Number(metadata.format.duration) || 1;

      // Always output as .mp4 (libx264 is not compatible with .webm container)
      const fileOutput = path.join(outputFolder, `tmp.mp4`);

      let videoFilters = [];
      let newVideoBitrate = null;
      let targetAudioBitrate = 128; // default

      // 1. Resolution change (downscale only) → scale filter + default bitrate
      if (resolutionChanged && !isUpscale && selectedResNum) {
        if (currentHeight > 0) {
          videoFilters.push(`scale=trunc(iw*${selectedResNum}/${currentHeight}/2)*2:${selectedResNum}:flags=lanczos`);
        } else {
          videoFilters.push(`scale=-2:${selectedResNum}:flags=lanczos`);
        }

        // Default bitrate for the target resolution
        if (selectedResNum >= 1080) newVideoBitrate = 6000;
        else if (selectedResNum >= 720) newVideoBitrate = 3500;
        else if (selectedResNum >= 480) newVideoBitrate = 1500;
        else newVideoBitrate = 800;
      }

      // 2. Target size → calculate bitrate, add scale if not already added
      if (hasTargetSize) {
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
        const originalAudioBitrate = (audioStream && audioStream.bit_rate) ? (Number(audioStream.bit_rate) / 1000) : 0;
        
        // Total target bitrate for the file
        const totalTargetBitrate = Math.floor((customVal * 1024 * 8) / duration);
        // Audio: keep original or reduce proportionally, min 32k
        const audioBudget = Math.max(Math.min(originalAudioBitrate || 64, Math.floor(totalTargetBitrate * 0.15)), 32);
        const videoBudget = Math.max(totalTargetBitrate - audioBudget, 50);
        
        console.log(`Compress: total=${totalTargetBitrate}k, audio=${audioBudget}k, video=${videoBudget}k`);
        
        newVideoBitrate = videoBudget;
        targetAudioBitrate = audioBudget;
        
        // If no resolution change was applied but we have a selected resolution (downscale only)
        if (!resolutionChanged && selectedResNum && currentHeight > 0 && selectedResNum < currentHeight) {
          videoFilters.push(`scale=trunc(iw*${selectedResNum}/${currentHeight}/2)*2:${selectedResNum}:flags=lanczos`);
        }
      }

      if (!newVideoBitrate) {
        console.log("Compress skipped: no bitrate adjustment needed.");
        return resolve(null);
      }

      let cmd = ffmpeg(file)
        .videoCodec('libx264')
        .videoBitrate(`${newVideoBitrate}k`)
        .audioBitrate(`${targetAudioBitrate}k`)
        .outputOptions(['-preset', 'medium', '-threads', '0']);

      if (videoFilters.length > 0) {
        cmd = cmd.videoFilters(videoFilters.join(','));
      }

      cmd
        .on('start', () => {
          memoryPercentProgress = 50;
          updateProgressbar(50);
          updateStep(2);
        })
        .on('progress', (progress) => {
          if (progress.percent) updateProgressbar(memoryPercentProgress + Math.round(progress.percent) / 4);
        })
        .on('error', (err) => reject(err))
        .on('end', () => {
          memoryPercentProgress = 75;
          updateProgressbar(75);
          updateStep(3);
          resolve(fileOutput);
        })
        .save(fileOutput);
    });
  });
};
