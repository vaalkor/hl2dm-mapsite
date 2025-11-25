import express from "express";
import path from "path";
import fs from "fs/promises";

const app = express();

const PUBLIC_DIR = path.join(process.cwd(), "site");
app.use((req, res, next) => {
    res.setHeader('can-submit-updates', 'true');
    next();
});
app.use(express.static(PUBLIC_DIR));
app.use(express.json());

// optional explicit root redirect to index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

async function updateMapInfo(updatedInfo) {
    const filePath = './site/scrape_data.json'
    const raw = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(raw);

    var mapToUpdate = data.MapInfo.find(x => x.Id === updatedInfo.id);
    mapToUpdate.RobRating = updatedInfo.rating;
    mapToUpdate.RobVideo = updatedInfo.videoLink;
    mapToUpdate.RobLabels = updatedInfo.labels;
    mapToUpdate.RobComment = updatedInfo.comment;
    if(mapToUpdate.InitialRatingTimestamp == null)
      mapToUpdate.InitialRatingTimestamp = Math.floor(Date.now() / 1000);

    await fs.writeFile(
        filePath,
        JSON.stringify(data, null, 2),
        'utf8'
    );

    return;
}

app.post("/update", async (req, res) => {
    const updatedMapInfo = req.body; // whatever the client sends

    await updateMapInfo(updatedMapInfo);
    res.sendStatus(200);
});

app.listen(3000, () => {
  console.log("listening on port 3000");
});