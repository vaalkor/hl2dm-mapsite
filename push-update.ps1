git reset
git add docs/scrape_data.json
if (Test-Path -LiteralPath docs/images/screenshots) {
    git add docs/images/screenshots
}
git commit -m "Update scrape data"
git push
