# Nebula AI Place

Nebula AI Place is a local-first desktop AI workspace built with Electron and Ollama. It keeps chats and generated projects on your machine, can write project files, preview coding activity, and open the project folder directly from the app.

## Features

- Local Ollama-based chat and coding assistant.
- Model catalog with downloadable Ollama models.
- Project folders stored in `~/NebulaProject`.
- Cross-platform desktop shell for Windows, macOS, and Linux.
- Dark and light themes with downloadable interface language packs.
- Optional Python package installation for generated Python projects.

## Requirements

- Node.js 18 or newer.
- npm.
- Ollama installed or available in `PATH`.

Nebula tries to start Ollama automatically. On Windows and Linux it can also attempt an automatic install. On macOS, install Ollama from the official app if it is not already available.

## Run

```bash
npm install
npm start
```

Windows users can also run:

```bat
start.cmd
```

macOS and Linux users can run:

```bash
./start.sh
```

## Development Checks

```bash
npm run check
```

## Data Locations

- App data: `~/.nebula-data`
- Generated projects: `~/NebulaProject`
- Optional bundled Ollama binary: `resources/ollama`

## Repository

This folder is ready to be used as a Git repository named `Nebula AI Place` locally. Add a remote when you are ready to publish it.
