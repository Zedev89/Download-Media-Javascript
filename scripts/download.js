const youtubedl = require('youtube-dl-exec');
const videoPreview = document.getElementById('video-preview'); //Dont delete

window.download = async function(outputFolder, link) {

    // First, get the video title
    let videoTitle = 'download';
    try {
        const info = await youtubedl(link, { print: '%(title)s', skipDownload: true });
        videoTitle = info.trim();
    } catch (e) {
        console.log("Could not get title, using default name", e);
    }

    // Sanitize: remove emojis/unicode, replace special chars, trim
    function sanitizeFilename(name) {
        return name
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\x20-\x7E]/g, '')
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/\.+$/g, '')
            .replace(/\.{2,}/g, '.')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 100)
            || 'download';
    }

    const safeName = sanitizeFilename(videoTitle);
    console.log("Safe filename:", safeName);

    let options = {
        output: path.join(outputFolder, `${safeName}.%(ext)s`),
        print: 'after_move:filepath',
        format: 'bv*+ba/b',
        mergeOutputFormat: 'mp4'
    };

    // Download the file
    try {
        console.log("Download start...");
        const output = await youtubedl(link, options);
        const downloadedPath = output.trim();
        
        console.log("Download done! File:", downloadedPath);
        return downloadedPath;
    } catch (error) {
        console.log("Download failed");
        console.error("Full error:", error);
        console.error("Error message:", error.message);
        console.error("Error stderr:", error.stderr);
        return null;
    }
};
