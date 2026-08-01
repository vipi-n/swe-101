# GitHub Pages upload guide

This repository is set up so the original Markdown notes stay in place. The site files are additive:

- `site/` contains the static UI.
- `scripts/build_site.py` builds the static site from the existing content folders.
- `.github/workflows/pages.yml` publishes the site with GitHub Actions.

## Manual upload flow

Because you upload files from the GitHub website, keep `main` unchanged and upload the site files to a new branch named `robot`.

1. Open the repository on GitHub.
2. Open the branch dropdown.
3. Type `robot`.
4. Choose "Create branch: robot from main".
5. Make sure the branch selector says `robot` before uploading files.

Add these new paths to the `robot` branch:

- `site/index.html`
- `site/styles.css`
- `site/app.js`
- `scripts/build_site.py`
- `.github/workflows/pages.yml`
- `.gitignore`
- `GITHUB_PAGES_UPLOAD_GUIDE.md`

For `.github/workflows/pages.yml`, use GitHub's "Add file" -> "Create new file" option and type the full path as the filename.

Do not upload the generated `_site/` folder. GitHub Actions creates it during deployment.

## Enable Pages

After the files are uploaded:

1. Open the repository on GitHub.
2. Go to Settings -> Pages.
3. Set Source to "GitHub Actions".
4. Push/upload the files to the `robot` branch.
5. Wait for the "Deploy GitHub Pages" workflow to finish.

The site should be available at:

```text
https://vipi-n.github.io/swe-101/
```

## Local preview

From the repository folder:

```bash
python3 scripts/build_site.py --dist _site
python3 -m http.server 8000 --directory _site
```

Then open:

```text
http://localhost:8000
```
