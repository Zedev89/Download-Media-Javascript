/*Cool resize box*/

let mouseDownPos = { x: 0, y: 0 };
let isDragging = false;
let croppingAreaDefined = false;

const cropAreaDiv = document.getElementById("crop-area-div");

videoPreview.addEventListener("mousedown", (event) => {
  isDragging = true;
  mouseDownPos = { x: event.offsetX, y: event.offsetY };
});

window.addEventListener("mousemove", (event) => {
  if (!isDragging) return;
  croppingAreaDefined = true;

  cropAreaDiv.style.display = "flex";
  cropAreaDiv.style.width = "0px";
  cropAreaDiv.style.height = "0px";

  videoPreview.controls = false;

  const rect = videoPreview.getBoundingClientRect();

  // Calculate current mouse position relative to video
  let currentX = event.clientX - rect.left;
  let currentY = event.clientY - rect.top;

  // Constrain (Clamp) the coordinates within the video boundaries
  currentX = Math.max(0, Math.min(currentX, rect.width));
  currentY = Math.max(0, Math.min(currentY, rect.height));

  // Calculate dimensions
  const left = Math.min(mouseDownPos.x, currentX);
  const top = Math.min(mouseDownPos.y, currentY);
  const width = Math.abs(currentX - mouseDownPos.x);
  const height = Math.abs(currentY - mouseDownPos.y);

  // Update CSS
  cropAreaDiv.style.left = (left / rect.width) * 100 + "%";
  cropAreaDiv.style.top = (top / rect.height) * 100 + "%";
  cropAreaDiv.style.width = (width / rect.width) * 100 + "%";
  cropAreaDiv.style.height = (height / rect.height) * 100 + "%";

});

window.addEventListener("mouseup", () => {
  isDragging = false;
  videoPreview.controls = true;
});



/* Actual cropping function */

window.ratio = async function (file, outputFolder) {
  if (croppingAreaDefined) {

    const actualHeight = videoPreview.videoHeight; // Actual video height
    const actualWidth = videoPreview.videoWidth; // Actual video width

    // Get the percent to crop each side
    const cropHeightPercent = parseFloat(cropAreaDiv.style.height);
    const cropWidthPercent = parseFloat(cropAreaDiv.style.width);
    const cropLeftPercent = parseFloat(cropAreaDiv.style.left);
    const cropTopPercent = parseFloat(cropAreaDiv.style.top);


    // convert % to px
    const h = Math.floor(cropHeightPercent * actualHeight / 100);
    const w = Math.floor(cropWidthPercent * actualWidth / 100);
    const x = Math.floor(cropLeftPercent * actualWidth / 100);
    const y = Math.floor(cropTopPercent * actualHeight / 100);

    const videoFilters = `crop=${w}:${h}:${x}:${y}`;



    // Make the new file have the same name
    const fileExtension = path.extname(file);
    const fileOutput = path.join(outputFolder, `tmp${fileExtension}`);

    // Resize the video using ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(file)
        .videoFilters(videoFilters)
        .outputOptions(['-preset', 'veryfast', '-pix_fmt', 'yuv420p',  '-threads', '0'])
            .on('start', () => {
              console.log("Resize started...");
              memoryPercentProgress = 25;
              updateProgressbar(25);
              updateStep(1);
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
              console.log("Ratio done!");
              memoryPercentProgress = 50;
              updateProgressbar(50);
              updateStep(2);
              resolve();
            })
        .save(fileOutput);
    });

    return fileOutput;
  } else {
    console.log("Ratio skipped");
    return;
  }
};
