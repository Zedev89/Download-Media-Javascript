

let activeSize = null;

const customInput = document.getElementById('custom-mb-input');
const customRadio = document.querySelector('input[value="custom"]');


document.querySelectorAll('input[name="size-group"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    updateVariable();
  });
});


customInput.addEventListener('input', () => {
  customRadio.checked = true; 
  updateVariable();
});

/* Set varriable to the clicked button */
function updateVariable() {
  const selectedRadio = document.querySelector('input[name="size-group"]:checked');
  
  if (!selectedRadio) return;

  if (selectedRadio.value === 'custom') {
    compressInput = customInput.value;
  } else {
    compressInput = selectedRadio.value;
  }
  
}








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
