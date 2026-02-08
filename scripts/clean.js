const moveFile = async (file, output) => {
  let finalPath = path.join(output, path.basename(file));
  await fs.promises.rename(file, finalPath);
  return finalPath;
};

const cleanUp = async (tmpFile, fileInputPath, folderToOutputFile, folderToDelete) => {
  try {
    await fs.promises.rename(tmpFile, fileInputPath);
    let fileOutput = await moveFile(fileInputPath, folderToOutputFile);
    if (folderToDelete !== folderToOutputFile) {
      await fs.promises.rm(folderToDelete, { recursive: true, force: true });
    }
    return fileOutput;
  } catch (err) {
    throw err;
  }
};

window.moveFile = moveFile;
window.cleanUp = cleanUp;