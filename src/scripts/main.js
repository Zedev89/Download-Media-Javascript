var fs = require("fs");
var os = require("os");
var path = require("path");
var ffmpeg = require('fluent-ffmpeg');
const { shell, ipcRenderer } = require("electron");
const { time } = require("console");
const { get } = require("http");

const outputFolder = path.join(os.homedir(), "Downloads");
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
  const downlaodButton = document.getElementById("download-button");

  //Check link
  if (!link.trim()) {
    alert('Please enter a link.');
    return;
  } else {

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
    


    //Enable apply + done
    document.getElementById("apply-button").disabled = false;
    document.getElementById("done-button").disabled = false;
}




// 2. Operation pipeline Crop -> Ratio -> Compress
document.getElementById("apply-button").onclick = async function () {
  document.getElementById("done-button").disabled = true;

  try {

    //rename the file to tmp.mp4 for easier handling
    const fileExtension = path.extname(file);
    const newPath = path.join(operationFolder, `tmp${fileExtension}`);
    await fs.promises.rename(file, newPath); 
    file = newPath;


    // 2.1 Crop
    fileTmp = await crop(file, operationFolderOutput);
    if (fileTmp) {await moveFile(fileTmp, operationFolder)};

    // 2.2 Ratio
    fileTmp = await ratio(file, operationFolderOutput);
    if (fileTmp) {await moveFile(fileTmp, operationFolder)};

    // 2.3 Compress
    fileTmp = await compress(file, operationFolderOutput);
    if (fileTmp) {await moveFile(fileTmp, operationFolder)};

  } catch (err) {
    console.log(err);
  } finally {
    console.log("Changes applied successfully!");

    //Re-enable done
    document.getElementById("done-button").disabled = false;

    // UI Progress bar
    memoryPercentProgress = 100;
    updateProgressbar(100);
    updateStep(4);
    setProgressToGreen();
  }

};

// 3. Cleanup (move to Downloads and delete tmp folders created in download.js)
document.getElementById("done-button").onclick = async function () {
  try {
    file = await cleanUp(file, fileNameMemory, outputFolder, operationFolder);
    shell.showItemInFolder(file);
  } catch (error) {console.error(error);}
  finally {/*window.close();*/}
};
