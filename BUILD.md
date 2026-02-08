# Video Downloader - Build Portable Windows (.exe)

## Prérequis

1. **Node.js** (v18+) installé sur Windows
2. **FFmpeg binaries** pour Windows

## Étapes de build

### 1. Installer les dépendances

```bash
npm install
```

### 2. Télécharger FFmpeg

Télécharger les binaires FFmpeg depuis : https://www.gyan.dev/ffmpeg/builds/

- Prendre `ffmpeg-release-essentials.zip`
- Extraire le zip
- Copier `ffmpeg.exe` et `ffprobe.exe` depuis le dossier `bin/` de l'archive
- Les placer dans le dossier `bin/` de ce projet

```
video-downloader-portable/
├── bin/
│   ├── ffmpeg.exe      ← ici
│   └── ffprobe.exe     ← ici
├── scripts/
├── index.js
├── index.html
├── index.css
├── preload.js
└── package.json
```

### 3. Tester en développement

```bash
npm start
```

### 4. Builder le .exe portable

```bash
npm run build
```

Le fichier portable sera généré dans :
```
release/VideoDownloader-Portable-1.0.0.exe
```

## Notes

- **youtube-dl-exec** embarque automatiquement `yt-dlp` — pas besoin de l'installer séparément.
- Le `.exe` portable ne nécessite **aucune installation** — il se lance directement.
- Les vidéos sont sauvegardées dans `%USERPROFILE%\Videos\Captures\` par défaut.
- Pour changer le dossier de sortie, définir la variable d'environnement `VIDEO_CAPTURES_DIR`.

## Dépannage

- **FFmpeg not found** : Vérifier que `ffmpeg.exe` et `ffprobe.exe` sont bien dans `bin/`
- **Build échoue** : Lancer `npm cache clean --force` puis réessayer
- **yt-dlp errors** : Le binaire est embarqué via `youtube-dl-exec`, mais certains sites nécessitent des mises à jour fréquentes de yt-dlp
