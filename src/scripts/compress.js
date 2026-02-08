

let activeSize = null;
let compressInput = 0;

const customInput = document.getElementById('custom-mb-input');
const customRadio = document.querySelector('input[value="custom"]');


document.querySelectorAll('input[name="size-group"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    // Clear custom input when a preset is selected
    if (e.target.value !== 'custom') {
      customInput.value = '';
    }
    updateVariable();
  });
});


customInput.addEventListener('input', () => {
  customRadio.checked = true; 
  updateVariable();
});

/* Set variable to the clicked button */
function updateVariable() {
  const selectedRadio = document.querySelector('input[name="size-group"]:checked');
  const currentContainer = document.getElementById('current-mb-container');
  
  // A preset is selected → Current is not active
  currentContainer.classList.remove('active');

  if (!selectedRadio) {
    compressInput = 0;
    currentContainer.classList.add('active');
    return;
  }

  if (selectedRadio.value === 'custom') {
    compressInput = customInput.value;
  } else {
    compressInput = selectedRadio.value;
  }
}

/* Click Current to deselect any compression (keep original size) */
document.getElementById('current-mb-container').addEventListener('click', () => {
  document.querySelectorAll('input[name="size-group"]').forEach(r => r.checked = false);
  customInput.value = '';
  compressInput = 0;
  document.getElementById('current-mb-container').classList.add('active');
});








/* Compress */
window.compress = async function (file, outputFolder) {

  let targetValueMB = Number(compressInput) || 0;
  
  //Wrap the whole thing in a promess to make sure the rest of the code waits for it to be done
  return new Promise((resolve, reject) => {

    ffmpeg.ffprobe(file, async (err, metadata) => {
      if (err) {return reject(err);}

      
      let sizeInMB = (metadata.format.size / (1024 * 1024)).toFixed(2);

      if (targetValueMB > 0 && sizeInMB > targetValueMB) {

        const fileExtension = path.extname(file);
        const fileOutput = path.join(outputFolder, `tmp${fileExtension}`);

        let duration = metadata.format.duration;
        let newVideoBitrate = Math.floor((targetValueMB * 1024 * 8) / duration) - 128;

        ffmpeg(file)
        .videoCodec("libx264")
        .videoBitrate(`${newVideoBitrate}k`)
        .videoFilters("scale='trunc(iw/4)*2:trunc(ih/4)*2'")
        .audioBitrate('128k')
        .outputOptions(['-preset', 'fast', '-threads', '0'])
            .on("start", () => {
              console.log("Compression start...");
              memoryPercentProgress = 50;
              updateProgressbar(50);
              updateStep(2);
            })
            .on("progress", (progress) => {
              if (progress.percent) {
                console.log("Processing: " + (progress.percent).toFixed(2));
                updateProgressbar(memoryPercentProgress + Math.round(progress.percent)/4);
              }
            })
            .on("error", (err) => {
              reject(err);
            })
            .on("end", () => {
              console.log("Compression done!");
              memoryPercentProgress = 75;
              updateProgressbar(75);
              updateStep(3);
              resolve(fileOutput);
            })
        .save(fileOutput);


        return fileOutput;

      } else {
        console.log("Compression skipped!");
        resolve(null);
      }


    });

  });
};
