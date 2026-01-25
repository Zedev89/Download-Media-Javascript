
/* Slider logics */
let slider1 = document.getElementById("slider-1");
let slider2 = document.getElementById("slider-2");
let sliderTrack = document.getElementById("slider-track");
let timeStartBox = document.getElementById("timeStartBox");
let timeEndBox = document.getElementById("timeEndBox");
const minGap = 0;
const sliderMaxValue = 1000;

/* Prevent from overlapping */
slider1.addEventListener("input", slideOne);
slider2.addEventListener("input", slideTwo);


function slideOne() {
  if (parseInt(slider2.value) - parseInt(slider1.value) <= minGap) {
    slider1.value = parseInt(slider2.value) - minGap;
  }
  updateColorTrack();
  updateTimeBoxes();
  upadteTimeboxesPosition();

  /* Appear above if overlap */
  timeStartBox.style.zIndex = 2
  timeEndBox.style.zIndex = 1

  video.currentTime = (slider1.value*video.duration/sliderMaxValue);
}

function slideTwo() {
  if (parseInt(slider2.value) - parseInt(slider1.value) <= minGap) {
    slider2.value = parseInt(slider1.value) + minGap;
  }
  updateColorTrack();
  updateTimeBoxes();
  upadteTimeboxesPosition();

  /* Appear above if overlap */
  timeStartBox.style.zIndex = 1
  timeEndBox.style.zIndex = 2

  video.currentTime = (slider2.value*video.duration/sliderMaxValue);
}

function upadteTimeboxesPosition() {
  timeStartBox.style.setProperty("left", (slider1.value / 10) + "%");
  timeEndBox.style.setProperty("left", (slider2.value / 10) + "%");
}


function updateColorTrack() {
  let slider1Value = parseFloat(slider1.value/10); //range max value = 1000
  let slider2Value = parseFloat(slider2.value/10); //so divide by 10 to be in %
  sliderTrack.style.background =
  `linear-gradient(
    to right,
    transparent ${slider1Value}%,
    var(--primary-color) ${slider1Value}%,
    var(--primary-color) ${slider2Value}%,
    transparent ${slider2Value}%
  )`;

}

// Makes the slider and the boxes update each others
function updateTimeBoxes() {
  timeStartBox.value = secToTimecodeConvert(slider1.value*video.duration/sliderMaxValue);
  timeEndBox.value = secToTimecodeConvert(slider2.value*video.duration/sliderMaxValue);
  if (slider2.value - slider1.value == 0) {
    timeStartBox.value = "Invalid";
    timeEndBox.value = "Invalid";
  }
}


function secToTimecodeConvert(totalSeconds) {
  let date = new Date(totalSeconds * 1000); 
  return date.toISOString().slice(14, 22).replace('.', ':');
}






/* Cropping */

window.crop = async function crop(file, outputFolder) {

    if(slider1.value == 0 && slider2.value == sliderMaxValue) {
      console.log("Cropping skipped");  
      return;
    } else if (slider1.value == slider2.value) {
      console.log("Cropping skipped");  
      return;
    } else {

      let timeStart = slider1.value*video.duration/sliderMaxValue;
      let timeEnd = slider2.value*video.duration/sliderMaxValue;

      const fileExtension = path.extname(file);
      const fileOutput= path.join(outputFolder, `tmp${fileExtension}`);
      
      await new Promise((resolve, reject) => {
          ffmpeg(file)
            .setStartTime(timeStart)
            .setDuration(timeEnd - timeStart)
            .outputOptions('-c copy')
                .on('start', () => {
                  console.log("Cropping started...");
                  memoryPercentProgress = 0;
                  updateProgressbar(0);
                  updateStep(0);
                })
                .on('progress', (progress) => {
                  if (progress.percent) {
                    console.log(`Processing: ${progress.percent.toFixed(2)}%`);
                    updateProgressbar(memoryPercentProgress + Math.round(progress.percent)/4);
                  }
                })
                .on('error', (err) => {
                  console.error(err);
                  reject(err);
                })
                .on('end', () => {
                  console.log("Cropping done!");
                  memoryPercentProgress = 25;
                  updateProgressbar(25);
                  updateStep(1);
                  resolve();
                })
            .save(fileOutput);
      });

      return fileOutput;
        
    };
}; 
