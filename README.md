# Ian Paulo Mercado — Portfolio

A personal portfolio website showcasing professional experience, selected project samples, creative work, and interactive development. The site includes a professional portfolio, a personal creative section, a browser-based space game, and a locally loaded music-library experience.

## Project structure

```text
.
├── index.html                         # Main professional portfolio
├── other-side.html                    # Personal / creative portfolio section
├── Ian-Paulo-Mercado-CV.pdf           # Downloadable CV
├── README.md                          # Project overview and deployment guide
├── css/
│   ├── style.css                      # Main portfolio styles
│   └── other-side.css                 # Personal section, poetry, and music-player styles
├── js/
│   ├── music-player.js                # Local music-library and cassette playback
│   └── poetry.js                      # Poem content and inline accordion behavior
├── images/
│   ├── IPM_Logo.png                   # Portfolio logo / favicon
│   ├── profile.webp                    # Profile image
│   ├── photo-gallery/                 # Personal photo albums (HiBy R1, Trafalgar Law, and everyday details)
│   ├── siomai-tracker/                # Project preview images
│   └── space-defender/                # Space Defender screenshots
├── projects/
│   ├── Database_Rental_Management_Sample.accdb
│   └── Spreadsheet_Business_Tracker_Sample.xlsx
└── space-defender/
    ├── game.html                      # Space Defender game page
    ├── game.js                        # Game logic
    ├── style.css                      # Game styles
    ├── ipm-sd-background.webp          # Game background
    ├── ipm-sd-favicon.png             # Game favicon
    └── ipm-sd-logo.webp                # Game logo
```

## Run locally

This is a static website and does not require a build step or package installation.

1. Download or clone this repository.
2. Open `index.html` in a modern browser, or open the project folder in a code editor and start a local development server.
3. Use the site's navigation to visit the professional portfolio and **The Other Side of Me**.

The retro cassette player plays music selected by each visitor from their own local music folder. The browser reads the selected audio files on the visitor's device; the files are not uploaded to the website. Folder-selection support varies by browser, and the site provides a compatibility folder picker for browsers without the modern folder-picker API.

The poetry collection is embedded directly in `other-side.html`. Its poem text and accordion behavior are maintained in `js/poetry.js`, while its presentation is styled in `css/other-side.css`. When a poem is opened, its title and category are presented in a centered reading heading above the centered poem text.

The **Through My Lens** section contains three expandable photo albums. The original photographs are stored in `images/photo-gallery/`; their paths are referenced directly by `other-side.html`. Album expand/collapse behavior is maintained in `js/photo-gallery.js`.

## Deploy with GitHub Pages

The project is plain HTML, CSS, JavaScript, and static assets, so GitHub Pages can host it without a build command.

1. Create a GitHub repository for the portfolio.
2. Upload or push the **contents of this project folder** to the repository's root. Make sure `index.html` is at the repository root, not inside an additional nested folder.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the branch containing the portfolio (commonly `main`) and choose **/(root)** as the folder, then save.
6. Wait for the Pages deployment to finish. GitHub will display the published site address in the Pages settings.

After future updates, commit and push the changed files to the selected branch. GitHub Pages will publish the updated static site automatically.

## Project notes

- Project cards present selected work samples; they are not intended to represent every project or all professional experience.
- The Access database and Excel workbook samples are stored in `projects/`.
- Space Defender is a self-contained browser game in `space-defender/`; its screenshots are stored in `images/space-defender/`.
- Keep file paths in HTML and CSS synchronized if assets are moved or renamed. File and folder names are case-sensitive on GitHub Pages.
- Review the downloadable CV, database, and workbook for personal or confidential information before publishing or updating the repository.


## Image performance

Website imagery is served as optimized WebP files. Original JPG/PNG source images were not included in this optimized package; keep your separate original-photo backup. Images use lazy loading where appropriate and asynchronous decoding.
