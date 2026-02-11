const youtubedl = require('youtube-dl-exec');
const videoPreview = document.getElementById('video-preview'); //Dont delete

// Track active processes for cancellation
let activeYtdlpProcess = null;
let activeFfmpegCommand = null;
let downloadCancelled = false;

// Steps: Fetch=0, Download=1, Convert=2, Done=3
const DL_STEP_COUNT = 4;

// Detect platform from URL
function detectPlatform(url) {
    if (/tiktok\.com/i.test(url)) return 'tiktok';
    if (/facebook\.com|fb\.watch/i.test(url)) return 'facebook';
    if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
    if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
    if (/instagram\.com/i.test(url)) return 'instagram';
    return 'other';
}

// Clean TikTok URL
function cleanTikTokUrl(url) {
    try {
        const u = new URL(url);
        const m = u.pathname.match(/(\/@[^/]+\/video\/\d+)/);
        if (m) return `https://www.tiktok.com${m[1]}`;
        return url;
    } catch (e) { return url; }
}

// Sanitize filename
function sanitizeFilename(name) {
    return name
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/[<>:"/\\|?*#%&@!]/g, '')
        .replace(/\.+$/g, '').replace(/\.{2,}/g, '.').replace(/\s+/g, ' ')
        .trim().substring(0, 100) || 'download';
}

const TIKTOK_HEADERS = [
    'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Referer:https://www.tiktok.com/',
    'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language:en-US,en;q=0.5'
];

// === UI Functions (using HTML elements from index.html) ===

function showProgressUI() {
    document.getElementById('download-icon').style.display = 'none';
    document.getElementById('drop-here').style.display = 'none';
    document.getElementById('download-section').style.visibility = 'hidden';
    document.getElementById('dl-progress-container').style.display = 'flex';
}

function hideProgressUI() {
    document.getElementById('dl-progress-container').style.display = 'none';
    // Reset step colors
    for (let i = 0; i < DL_STEP_COUNT; i++) {
        document.getElementById('dl-step-c-' + i).style.borderColor = '#828282';
        document.getElementById('dl-step-l-' + i).style.color = '#828282';
    }
    document.getElementById('dl-steps-bar').style.width = '0%';
    document.getElementById('dl-steps-bar').style.background = 'rgb(126,143,216)';
    document.getElementById('dl-pct-bar-bg').style.display = 'none';
    document.getElementById('dl-pct-bar').style.width = '0%';
}

function setStep(stepIndex) {
    const bar = document.getElementById('dl-steps-bar');
    const pct = stepIndex >= DL_STEP_COUNT - 1 ? 100 : (stepIndex / (DL_STEP_COUNT - 1)) * 100;
    bar.style.width = pct + '%';

    for (let i = 0; i < DL_STEP_COUNT; i++) {
        const c = document.getElementById('dl-step-c-' + i);
        const l = document.getElementById('dl-step-l-' + i);
        if (i <= stepIndex) {
            c.style.borderColor = 'rgb(126,143,216)';
            l.style.color = 'white';
        } else {
            c.style.borderColor = '#828282';
            l.style.color = '#828282';
        }
    }
}

function setStepsDone() {
    for (let i = 0; i < DL_STEP_COUNT; i++) {
        document.getElementById('dl-step-c-' + i).style.borderColor = '#3bad4c';
        document.getElementById('dl-step-l-' + i).style.color = '#3bad4c';
    }
    document.getElementById('dl-steps-bar').style.width = '100%';
    document.getElementById('dl-steps-bar').style.background = '#3bad4c';
}

function setStatusText(text) {
    document.getElementById('dl-progress-text').innerText = text;
}

function setPctBar(percent) {
    const bg = document.getElementById('dl-pct-bar-bg');
    const bar = document.getElementById('dl-pct-bar');
    if (percent !== null && percent > 0) {
        bg.style.display = 'block';
        bar.style.width = Math.min(percent, 100) + '%';
    } else {
        bg.style.display = 'none';
        bar.style.width = '0%';
    }
}

// Cancel button handler
document.getElementById('dl-cancel-btn').onclick = function() {
    downloadCancelled = true;
    console.log("Download cancelled by user");
    if (activeYtdlpProcess) { try { activeYtdlpProcess.kill('SIGTERM'); } catch(e) {} activeYtdlpProcess = null; }
    if (activeFfmpegCommand) { try { activeFfmpegCommand.kill('SIGTERM'); } catch(e) {} activeFfmpegCommand = null; }
    hideProgressUI();
};

// === Download with progress ===
function downloadWithProgress(link, options) {
    return new Promise((resolve, reject) => {
        const subprocess = youtubedl.exec(link, { ...options, noOverwrites: true });
        activeYtdlpProcess = subprocess;
        let stdoutData = '';
        let stderrData = '';

        subprocess.stdout.on('data', (data) => {
            const text = data.toString();
            stdoutData += text;
            for (const line of text.split('\n')) {
                const match = line.match(/\[download\]\s+(\d+\.?\d*)%\s+of\s+~?([\d.]+\s*\w+)(?:\s+at\s+([\d.]+\s*\w+\/s))?(?:\s+ETA\s+(\S+))?/);
                if (match) {
                    const pct = parseFloat(match[1]);
                    const size = match[2] || '';
                    const speed = match[3] || '';
                    const eta = match[4] || '';
                    let msg = `${Math.round(pct)}%`;
                    if (size) msg += ` of ${size}`;
                    if (speed) msg += ` @ ${speed}`;
                    if (eta && eta !== '00:00') msg += `  ETA ${eta}`;
                    setStatusText(msg);
                    setPctBar(pct);
                }
                if (line.includes('[Merger]') || line.includes('[ffmpeg]')) {
                    setStatusText('Merging audio/video...');
                    setPctBar(100);
                }
                if (line.includes('[download] Destination:')) {
                    setStatusText('Downloading...');
                    setPctBar(2);
                }
            }
        });

        subprocess.stderr.on('data', (data) => { stderrData += data.toString(); });
        subprocess.on('close', (code) => {
            activeYtdlpProcess = null;
            if (downloadCancelled) reject(new Error('cancelled'));
            else if (code === 0) resolve(stdoutData);
            else { const e = new Error(`yt-dlp exit ${code}`); e.stderr = stderrData; reject(e); }
        });
        subprocess.on('error', (err) => { activeYtdlpProcess = null; reject(err); });
    });
}

// === Re-encode HEVC to H.264 ===
function reencodeToH264(inputPath, outputFolder) {
    return new Promise((resolve, reject) => {
        if (downloadCancelled) return reject(new Error('cancelled'));
        const baseName = path.basename(inputPath, path.extname(inputPath));
        const outputPath = path.join(outputFolder, baseName + '_h264.mp4');

        setStatusText('0%');
        setPctBar(0);

        const command = ffmpeg(inputPath)
            .videoCodec('libx264').audioCodec('aac')
            .outputOptions(['-preset', 'fast', '-crf', '23', '-movflags', '+faststart'])
            .output(outputPath)
            .on('progress', (progress) => {
                if (downloadCancelled) { command.kill('SIGTERM'); return; }
                if (progress.percent) {
                    const pct = Math.min(Math.round(progress.percent), 100);
                    setStatusText(`${pct}%`);
                    setPctBar(pct);
                }
            })
            .on('end', () => {
                activeFfmpegCommand = null;
                if (downloadCancelled) return reject(new Error('cancelled'));
                try {
                    fs.unlinkSync(inputPath);
                    const finalPath = path.join(outputFolder, baseName + '.mp4');
                    fs.renameSync(outputPath, finalPath);
                    resolve(finalPath);
                } catch (e) { resolve(outputPath); }
            })
            .on('error', (err) => {
                activeFfmpegCommand = null;
                if (downloadCancelled) return reject(new Error('cancelled'));
                resolve(inputPath);
            });
        activeFfmpegCommand = command;
        command.run();
    });
}

// Find downloaded file
function findDownloadedFile(folder, safeName) {
    try {
        const files = fs.readdirSync(folder);
        const exts = ['.mp4', '.webm', '.mkv', '.mov', '.avi'];
        const exact = files.find(f => f.startsWith(safeName) && exts.includes(path.extname(f).toLowerCase()));
        if (exact) return path.join(folder, exact);
        const any = files.find(f => exts.includes(path.extname(f).toLowerCase()) && fs.statSync(path.join(folder, f)).isFile() && !f.includes('_h264'));
        if (any) return path.join(folder, any);
    } catch (e) {}
    return null;
}

// Build yt-dlp options
function buildDownloadOptions(outputFolder, safeName, platform) {
    let options = {
        output: path.join(outputFolder, `${safeName}.%(ext)s`),
        print: 'after_move:filepath',
        noCheckCertificates: true,
    };
    if (platform === 'tiktok') {
        options.format = 'best[vcodec^=avc]/best[ext=mp4]/best';
        options.addHeader = TIKTOK_HEADERS;
        options.forceIpv4 = true;
    } else {
        options.format = 'bv*+ba/b';
        options.mergeOutputFormat = 'mp4';
    }
    return options;
}

// Parse filepath from stdout
function parseFilePath(stdout, outputFolder, safeName) {
    const lines = stdout.split('\n').map(l => l.trim()).filter(l => l);
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (line && !line.startsWith('[') && !line.startsWith('WARNING') && !line.startsWith('ERROR')) {
            if (fs.existsSync(line)) return line;
        }
    }
    return findDownloadedFile(outputFolder, safeName);
}

// === Main ===
window.download = async function(outputFolder, link) {
    downloadCancelled = false;
    activeYtdlpProcess = null;
    activeFfmpegCommand = null;

    let platform = detectPlatform(link);
    let needsConvert = (platform === 'tiktok');
    console.log("=== Download Start ===", platform, link);

    if (platform === 'tiktok') link = cleanTikTokUrl(link);

    // Show UI
    showProgressUI();

    // Step 0: Fetch
    setStep(0);
    setStatusText('Fetching video info...');
    setPctBar(null);

    let videoTitle = 'download';
    try {
        let infoOpts = { print: '%(title)s', skipDownload: true, noCheckCertificates: true };
        if (platform === 'tiktok') { infoOpts.addHeader = TIKTOK_HEADERS; infoOpts.forceIpv4 = true; }
        const info = await youtubedl(link, infoOpts);
        videoTitle = info.trim();
    } catch (e) { videoTitle = `${platform}_${Date.now()}`; }

    if (downloadCancelled) { hideProgressUI(); return null; }
    const safeName = sanitizeFilename(videoTitle);

    // Step 1: Download
    setStep(1);
    setStatusText('Starting download...');
    setPctBar(0);

    let downloadedPath = null;
    const options = buildDownloadOptions(outputFolder, safeName, platform);

    try {
        const output = await downloadWithProgress(link, options);
        downloadedPath = parseFilePath(output, outputFolder, safeName);
    } catch (error) {
        if (downloadCancelled) { hideProgressUI(); return null; }
    }

    if (!downloadedPath && platform === 'tiktok' && !downloadCancelled) {
        try {
            setStatusText('Trying alternate method...');
            setPctBar(0);
            const opts2 = { ...options, addHeader: ['User-Agent:com.zhiliaoapp.musically/2023501030 (Linux; U; Android 13; en_US; Pixel 7; Build/TD1A.220804.031; Cronet/58.0.2991.0)'] };
            const output2 = await downloadWithProgress(link, opts2);
            downloadedPath = parseFilePath(output2, outputFolder, safeName);
        } catch (e2) { if (downloadCancelled) { hideProgressUI(); return null; } }
    }

    if (!downloadedPath && platform === 'tiktok' && !downloadCancelled) {
        for (const browser of ['chrome', 'edge', 'firefox']) {
            if (downloadCancelled) break;
            try {
                setStatusText(`Trying ${browser} cookies...`);
                setPctBar(0);
                const opts3 = { ...options, cookiesFromBrowser: browser };
                const output3 = await downloadWithProgress(link, opts3);
                downloadedPath = parseFilePath(output3, outputFolder, safeName);
                if (downloadedPath) break;
            } catch (e3) {}
        }
    }

    if (downloadCancelled) { hideProgressUI(); return null; }
    if (!downloadedPath) downloadedPath = findDownloadedFile(outputFolder, safeName);
    if (!downloadedPath || !fs.existsSync(downloadedPath)) { hideProgressUI(); return null; }

    // Step 2: Convert
    if (needsConvert && !downloadCancelled) {
        setStep(2);
        setStatusText('Converting to H.264...');
        setPctBar(0);
        try {
            downloadedPath = await reencodeToH264(downloadedPath, outputFolder);
        } catch (err) { if (downloadCancelled) { hideProgressUI(); return null; } }
    } else {
        setStep(2);
    }

    // Step 3: Done
    setStep(3);
    setStepsDone();
    setStatusText('Done!');
    setPctBar(100);
    await new Promise(r => setTimeout(r, 800));

    hideProgressUI();
    console.log("=== Download Complete ===", downloadedPath);
    return downloadedPath;
};
