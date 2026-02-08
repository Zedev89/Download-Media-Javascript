const { webUtils } = require('electron');
const downloadSection = document.getElementById('download-section');
const videoWrapper = document.getElementById('video-wrapper'); // Dont delete
let dropEnabled = true;

videoWrapper.ondragover = (e) => {
  e.preventDefault();
  videoWrapper.classList.add("drag-active");
};

videoWrapper.ondragleave = (e) => {
  e.preventDefault();
  videoWrapper.classList.remove("drag-active");
};

// 1. Drop file
videoWrapper.ondrop = (e) => {
    e.preventDefault();

    // If disabled
    if (!dropEnabled) return;

    // cool css shit i guess
    videoWrapper.classList.add("drop");
    videoWrapper.classList.remove("drag-active");

    // Get the first file dropped
    let droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) {return};
    console.log(droppedFile);

    file = webUtils.getPathForFile(droppedFile);

    // Check if video
    if (!droppedFile.type.startsWith('video/')) {
        alert("This is not a valid video file!");
        return;
    }

    // Check if exist
    if (!fs.existsSync(file)) {
        alert("Invalid file path. Try again.");
        return;
    }

    //Create tmp folders like wwhen download
    createTMPFolders(operationFolderOutput);

    // Move file to doenload folder
    try {
        let fileName = path.basename(file); 
        let destination = path.join(operationFolder, fileName);
        fs.copyFileSync(file, destination);
        file = destination;
        console.log("File moved successfully to: ", file);
    } catch (err) {
        console.error("Error moving file:", err);
        return;
    }


    // Disable downlaod
    downloadSection.style.visibility = "hidden";

    // Disable new drop + file memory + laodUI + enable change
    onceReady();

};