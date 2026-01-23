const moveFile = async (file, output) => {
  const finalPath = path.join(output, path.basename(file));
  await fs.promises.rename(file, finalPath);
  return finalPath;
};

const cleanUp = async (tempFile, fileInputPath, folderToOutputFile, folderToDelete) => {
  try {
    tempFile = await moveFile(tempFile, folderToDelete); 
    await fs.promises.rename(tempFile, fileInputPath);
    let fileOutput = await moveFile(fileInputPath, folderToOutputFile);
    await fs.rm(folderToDelete, { recursive: true, force: true });
    return fileOutput;
  } catch (err) {
    throw err;
  }
};

window.moveFile = moveFile;
window.cleanUp = cleanUp;