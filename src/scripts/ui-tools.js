// Use a unique name or check for double declarations
const video = videoPreview;

// Mute button logic
/* NOT IN USED
document.getElementById("mute-btn").onclick = function () {
  if (video.muted) {
    video.muted = false;
    this.textContent = "Mute";
  } else {
    video.muted = true;
    this.textContent = "Unmute";
  }
};
*/

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
  // Set the source - use proper file URL for Electron
  video.src = `file://${file.replace(/\\/g, '/')}`;

  // Disable loading screen
  downloadInProgressUI(false);

  // Wait for the video to load its dimensions
  video.onloadedmetadata = function () {
    document.getElementById("done-container").style.display = "block";
    let sliderDiv = document.getElementById("slider-div");
    sliderDiv.style.display = "flex";
    updateTimeBoxes();
    document.getElementById("cropping-controls").style.display = "flex";
    document.getElementById("compress-section").style.display = "flex";
    const wrapper = document.getElementById('video-wrapper');
    const container = document.getElementById('video-container');
    wrapper.style.border = "none";
    container.style.display = "flex";

    //Display current size
    ffmpeg.ffprobe(file, (err, metadata) => {
      if (err) {return console.error(err);}
      let currentMbSpan = document.getElementById("current-mb-display");
      currentMbSpan.innerText = Math.round(metadata.format.size / (1024 * 1024));
    });

    /* Just to make so when u click on the custom compress box it auto focus */
    const customInputLabel = document.getElementById('customInputLabel');
    customInputLabel.addEventListener('click', () => {
      customInput.focus();
    });

    /*Uses JS for video size because fuck CSS never works like it should*/
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const wrapperHeight = entry.contentRect.height;
        const wrapperWidth = entry.contentRect.width;
        video.style.maxHeight = `${wrapperHeight}px`;
        video.style.maxWidth = `${wrapperWidth}px`;
        container.style.maxHeight = `${wrapperHeight}px`;
        container.style.maxWidth = `${wrapperWidth}px`;
      }
    });resizeObserver.observe(wrapper);

    video.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
    }, true);

    //Progress bar
    document.getElementById("pipeline-wrapper").style.display = "flex";
    updateStep(0);

    //Auto focus 
    document.getElementById("apply-button").focus();


  };

}
