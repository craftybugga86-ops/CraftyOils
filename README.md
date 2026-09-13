# Crafty Enterprise

This is the parent repository for the Crafty Enterprise — the umbrella that
houses **Crafty Oils** and whatever other mechanics/projects join it over
time. Each project lives in its own folder under `projects/`, with its own
README, and can be run, built, and deployed independently.

## Projects

| Project | Description | Path |
| --- | --- | --- |
| 🛢️ [Crafty Oils](projects/crafty-oils/README.md) | Drilling mini-game (web + Android WebView wrapper) | `projects/crafty-oils/` |

More mechanics land here as new folders under `projects/`, each self-contained
with its own README, assets, and (if needed) its own CI workflow under
`.github/workflows/`.

## Repository layout

```
.
├── README.md                 # you are here
├── .github/workflows/        # CI shared across (or scoped per) project
└── projects/
    └── crafty-oils/           # first project: see its own README
        ├── index.html
        ├── dig-grid.html
        ├── css/
        ├── js/
        ├── android/           # native WebView wrapper
        └── dist/              # built artifacts (e.g. debug APK)
```

## Adding a new project/mechanic

1. Create a new folder under `projects/<name>/`.
2. Give it its own `README.md` describing what it does and how to run it.
3. If it needs CI, add a workflow under `.github/workflows/` scoped to its
   path (see `build-android-apk.yml` for an example that filters on
   `projects/crafty-oils/android/**`).
4. Add a row for it in the Projects table above.
