var fs = require("fs");
var os = require("os");
var path = require("path");
var ffmpeg = require('fluent-ffmpeg');
const { shell, ipcRenderer } = require("electron");
const { time } = require("console");
const { get } = require("http");

// Set ffmpeg/ffprobe paths for packaged app
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}
if (process.env.FFPROBE_PATH) {
  ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
}

// Cross-platform: Use VIDEO_CAPTURES_DIR env variable, or fallback to Videos/Captures
function getVideosFolder() {
  if (process.env.VIDEO_CAPTURES_DIR) {
    return process.env.VIDEO_CAPTURES_DIR;
  } else if (process.platform === 'win32') {
    return path.join(process.env.USERPROFILE, "Videos", "Captures");
  } else {
    return path.join(process.env.HOME || os.homedir(), "Videos", "Captures");
  }
}

const outputFolder = getVideosFolder();
fs.mkdirSync(outputFolder, { recursive: true });
const operationFolder = path.join(outputFolder, "downloading");
const operationFolderOutput = path.join(operationFolder, "tmp");
let file = null;
let fileTmp = null;
let fileNameMemory = null;


// 1. Download or drop file (voir dropBox.js)
const linkBox = document.getElementById("link-input");
linkBox.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    downloadMain();
  }
  
});

const downloadMain = async function () {
  
  //Get link
  let link = linkBox.value;

  //Check link
  if (!link.trim()) {
    alert('Please enter a link.');
    return;
  } else {

    // Reset previous state
    resetUI();
    linkBox.value = link; // Restore the link after reset clears it

    // Create both tmp folders
    createTMPFolders(operationFolderOutput);

    // Downlaod screen
    downloadInProgressUI("onlyIcon");

    //Download
    file = await download(operationFolder, link);

    if (!file) {
      alert("Video not found :(");
      downloadInProgressUI("onlySection");
      linkBox.value = "";
    } else {
      onceReady();
    }

  };
};

window.createTMPFolders = function(folderPath) {
  fs.mkdirSync(folderPath, { recursive: true });
}

window.onceReady = function() {

    // Disable drop feature
    dropEnabled = false;

    //Remember file name for output
    fileNameMemory = file;

    // Load preview video after download
    downloadInProgressUI(false);
    loadUI(file);
    

    //Enable save/cancel
    document.getElementById("cancel-button").disabled = false;
    document.getElementById("apply-button").disabled = false;
}




// 2. Operation pipeline Crop -> Ratio -> Compress
document.getElementById("apply-button").onclick = async function () {

  try {
    // Disable buttons during processing
    document.getElementById("apply-button").disabled = true;
    document.getElementById("cancel-button").disabled = true;

    // Ensure tmp folders exist
    createTMPFolders(operationFolderOutput);

    // Work on a copy: rename to tmp.mp4 for pipeline
    const fileExtension = path.extname(file);
    const workingPath = path.join(operationFolder, `tmp${fileExtension}`);
    await fs.promises.copyFile(file, workingPath);
    let workingFile = workingPath;

    // 2.1 Crop
    fileTmp = await crop(workingFile, operationFolderOutput);
    if (fileTmp) {
      await fs.promises.rename(fileTmp, workingFile);
    }

    // 2.2 Ratio
    fileTmp = await ratio(workingFile, operationFolderOutput);
    if (fileTmp) {
      await fs.promises.rename(fileTmp, workingFile);
    }

    // 2.3 Compress
    fileTmp = await compress(workingFile, operationFolderOutput);
    if (fileTmp) {
      await fs.promises.rename(fileTmp, workingFile);
    }

    // Move result to output folder with original name
    const outputPath = path.join(outputFolder, path.basename(fileNameMemory));
    await fs.promises.copyFile(workingFile, outputPath);

    // Keep original if checkbox is checked
    const keepOriginal = document.getElementById('keep-original-checkbox').checked;
    if (keepOriginal) {
      const ext = path.extname(fileNameMemory);
      const baseName = path.basename(fileNameMemory, ext);
      const originalOutputPath = path.join(outputFolder, `${baseName}_Original${ext}`);
      await fs.promises.copyFile(file, originalOutputPath);
      console.log("Original saved to:", originalOutputPath);
    }
    
    // Cleanup tmp files (but keep the original)
    await fs.promises.rm(workingPath, { force: true });
    await fs.promises.rm(operationFolderOutput, { recursive: true, force: true });

    console.log("Changes applied successfully! Saved to:", outputPath);
    shell.showItemInFolder(outputPath);

  } catch (err) {
    console.log(err);
  } finally {
    // UI Progress bar
    memoryPercentProgress = 100;
    updateProgressbar(100);
    updateStep(4);
    setProgressToGreen();

    // Re-enable buttons for re-editing
    await new Promise(r => setTimeout(r, 1000));
    document.getElementById("apply-button").disabled = false;
    document.getElementById("cancel-button").disabled = false;
    document.getElementById("newdownload-container").style.display = "block";

    // Reset progress bar after a short delay
    await new Promise(r => setTimeout(r, 1500));
    memoryPercentProgress = 0;
    updateProgressbar(0);
    updateStep(0);
  }

};

// 4. Reset UI for a new download
function resetUI() {
  // Reset variables
  file = null;
  fileTmp = null;
  fileNameMemory = null;
  dropEnabled = true;

  // Reset input
  linkBox.value = "";

  // Reset video preview
  const video = document.getElementById("video-preview");
  video.pause();
  video.removeAttribute("src");
  video.load();

  // Reset UI visibility
  document.getElementById("download-section").style.display = "block";
  document.getElementById("download-section").style.visibility = "visible";
  document.getElementById("video-container").style.display = "none";
  document.getElementById("download-icon").style.display = "none";
  document.getElementById("drop-here").style.display = "block";
  document.getElementById("drop-here").innerText = "[ DROP ]";
  document.getElementById("cropping-controls").style.display = "none";
  document.getElementById("compress-section").style.display = "none";
  document.getElementById("pipeline-wrapper").style.display = "none";
  document.getElementById("done-container").style.display = "none";
  document.getElementById("newdownload-container").style.display = "none";
  document.getElementById("cancel-button").disabled = true;
  document.getElementById("apply-button").disabled = true;

  // Reset video wrapper border
  document.getElementById("video-wrapper").style.border = "";
  document.getElementById("video-wrapper").classList.remove("drop");

  // Reset progress bar
  memoryPercentProgress = 0;
  updateProgressbar(0);

  // Reset sliders
  document.getElementById("slider-1").value = 0;
  document.getElementById("slider-2").value = 1000;
  updateColorTrack();

  // Reset crop area
  const cropAreaDiv = document.getElementById("crop-area-div");
  cropAreaDiv.style.display = "none";
  cropAreaDiv.style.width = "0px";
  cropAreaDiv.style.height = "0px";
  croppingAreaDefined = false;

  // Reset compress radio buttons & variable
  document.querySelectorAll('input[name="size-group"]').forEach(r => r.checked = false);
  document.getElementById("custom-mb-input").value = "";
  document.getElementById("keep-original-checkbox").checked = false;
  compressInput = 0;
  document.getElementById("current-mb-container").classList.add("active");

  // Focus on input
  linkBox.focus();
}

document.getElementById("newdownload-button").onclick = async function () {
  try {
    if (fs.existsSync(operationFolder)) {
      await fs.promises.rm(operationFolder, { recursive: true, force: true });
    }
  } catch (e) { console.error(e); }
  resetUI();
};


// Cancel
document.getElementById("cancel-button").onclick = async function () {
  try {
    if (fs.existsSync(operationFolder)) {
      await fs.promises.rm(operationFolder, { recursive: true, force: true });
    }
  } catch (error) {
    console.error(error);
  } finally {
    resetUI();
  }
}