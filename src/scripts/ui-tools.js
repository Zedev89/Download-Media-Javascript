// Use a unique name or check for double declarations
const video = videoPreview;

// Mute button logic
document.getElementById("mute-btn").onclick = function () {
  if (video.muted) {
    video.muted = false;
    this.textContent = "Mute";
  } else {
    video.muted = true;
    this.textContent = "Unmute";
  }
};

let memoryPercentProgress = 0;
function updateProgressbar(percent) {
  document.getElementById("pipeline-bar").style.background =
  `linear-gradient(
    to bottom,
    var(--primary-color) 0%,
    var(--primary-color) ${percent}%,
    var(--gray) ${percent}%,
    var(--gray) 100%
  )`;
}


let stepParent = document.getElementById("pipe-step-div");
let allSteps = stepParent.children;

function updateStep(nbStep) {
  // 1. Reset ALL children
  for (let step of allSteps) {
    step.style.borderColor = "var(--gray)"; 
  }

  // 2 Set to blue the steps
  for (let i = nbStep; i >= 0; i--) {
    let step = stepParent.children[i];
    step.style.borderColor = "var(--primary-color)";
  } 
}

function setProgressToGreen() {
  // Set all point to green
  for (let step of allSteps) {
    step.style.borderColor = "var(--green)"; 
  }
  document.getElementById("pipeline-bar").style.background = `var(--green)`;
}


let dropText = document.getElementById("drop-here");
linkBox.addEventListener('input', () => {
  if (linkBox.value.trim() !== "") {
    dropText.innerText = "[ PRESS ENTER ]";
  } else {
    dropText.innerText = "[ DROP ]";
  }
});

function downloadInProgressUI(display) {
  let downloadSection = document.getElementById("download-section");
  let downloadIcon = document.getElementById("download-icon");
  switch (display) {
    case "onlySection":
      downloadSection.style.display = "block";
      downloadIcon.style.display = "none";
      dropText.style.display = "block";
      break;

    case "onlyIcon":
      downloadSection.style.visibility = "hidden";
      downloadIcon.style.display = "block";
      dropText.style.display = "none";
      break;

    default: // hide All
      downloadSection.style.visibility = "hidden";
      downloadIcon.style.display = "none";
      dropText.style.display = "none";
      break;
  }
    
}



/*Its messy but i dont care*/
function loadUI(file) {
  // Set the source
  video.src = file;

  // Disable loading screen
  downloadInProgressUI(false);

  // Wait for the video to load its dimensions
  video.onloadedmetadata = function () {
    let sliderDiv = document.getElementById("slider-div");
    sliderDiv.style.display = "flex";
    updateTimeBoxes();
    document.getElementById("mute-btn").style.display = "block";
    document.getElementById("cropping-controls").style.display = "flex";
    document.getElementById("compress-section").style.display = "flex";
    document.getElementById("video-container").style.display = "flex";
    document.getElementById("video-wrapper").style.border = "none";

    //Display current size
    ffmpeg.ffprobe(file, (err, metadata) => {
      if (err) {return reject(err);}
      let currentMbSpan = document.getElementById("current-mb-display");
      currentMbSpan.innerText = Math.round(metadata.format.size / (1024 * 1024));
    });

    //Progress bar
    document.getElementById("pipeline-container").style.display= "flex";
    updateStep(0);
    

    /* TIMER */
    let timeDisplay = document.getElementById("video-time");
    timeDisplay.style.display = "block";

    video.addEventListener("timeupdate", () => {
      const totalSeconds = Math.floor(video.currentTime);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const formattedTime = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
      timeDisplay.innerText = formattedTime;
    });
  };

}
