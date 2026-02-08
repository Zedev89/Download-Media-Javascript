const youtubedl = require('youtube-dl-exec');
const videoPreview = document.getElementById('video-preview'); //Dont delete

window.download = async function(outputFolder, link) {

    // First, get the video title
    let videoTitle = 'download';
    try {
        const info = await youtubedl(link, { print: '%(title)s', skipDownload: true });
        videoTitle = info.trim();
    } catch (e) {
        console.log("Could not get title, using default name");
    }

    // Sanitize: remove emojis/unicode, replace special chars, trim
    function sanitizeFilename(name) {
        return name
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // accents → ascii (é→e, è→e, ô→o)
            .replace(/[^\x20-\x7E]/g, '')                      // remove non-ASCII (emojis etc)
            .replace(/[<>:"/\\|?*]/g, '')                       // remove Windows forbidden chars
            .replace(/\.+$/g, '')                                // remove trailing dots
            .replace(/\.{2,}/g, '.')                             // collapse multiple dots
            .replace(/\s+/g, ' ')                               // collapse whitespace
            .trim()
            .substring(0, 100)                                  // max length
            || 'download';                                      // fallback if empty
    }

    const safeName = sanitizeFilename(videoTitle);
    console.log("Safe filename:", safeName);

    let options = {
        output: path.join(outputFolder, `${safeName}.%(ext)s`),
        print: 'after_move:filepath',
        format: 'bv*+ba/b',
        mergeOutputFormat: 'mp4'
    }

    // Download the file
    try {
        console.log("Download start...");

        const output = await youtubedl(link, options);
        const downloadedPath = output.trim();
        
        console.log("Download done! File:", downloadedPath);
        return downloadedPath;
    } catch (error) {
        console.log("Download failed");
        console.error(error);
        return null;
    }
};
