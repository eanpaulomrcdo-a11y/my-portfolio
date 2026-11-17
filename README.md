# Ian Paulo Mercado — Portfolio

A personal portfolio website showcasing professional projects, creative work, and interactive development.

## Project structure

```text
.
├── index.html                 # Main portfolio
├── other-side.html            # Creative / personal section
├── poetry.html                # Poetry collection
├── Ian-Paulo-Mercado-CV.pdf   # Public portfolio CV
├── css/                       # Site stylesheets
├── js/                        # Poetry and local music player scripts
├── images/                    # Site and project images
├── projects/                  # Downloadable project samples
└── space-defender/            # Space Defender game
```

## Run locally

No build step is required. Open `index.html` in a modern browser, or serve this folder with a local development server for a more consistent browser experience.

The music player only reads audio files from a folder that a visitor explicitly selects. Browser support for folder selection can vary.

## Deployment

For GitHub Pages, place the contents of this folder at the repository root so that `index.html` is at the top level. Then enable GitHub Pages for the chosen branch and root directory.

## Project notes

- Keep asset paths in the HTML and CSS in sync if files are moved or renamed.
- The downloadable CV is intended for public viewing; review it before publishing any future revision.
- The project samples in `projects/` are the files currently included in this portfolio package.
