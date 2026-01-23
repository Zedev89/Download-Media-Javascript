const youtubedl = require('youtube-dl-exec');
const videoPreview = document.getElementById('video-preview'); //Dont delete

window.download = async function(outputFolder, link) {
    // Options
    let options = {
        output: path.join(outputFolder, '%(title)s.%(ext)s'), // Output path
        print: 'after_move:filepath'
    }

    // Options
    options.format = 'bv*+ba/b';
    options.mergeOutputFormat = 'mp4';


    // Download the file
    try {
        console.log("Download start...");

        //TODO Make it print the percentages
        const output = await youtubedl(link, options);

        console.log("Download done!");
        return output.trim();
    } catch (error) {
        console.log("Download failed");
        console.error(error);
        return null;
    }
};
