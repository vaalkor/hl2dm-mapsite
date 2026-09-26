import express from "express";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

export function createApp(publicDir = path.join(process.cwd(), "docs")) {
const app = express();

const PUBLIC_DIR = publicDir;
// All metadata writes share a queue so uploads and rating edits cannot overwrite each other.
let pendingWrite = Promise.resolve();
function writeMap(change) {
    const operation = pendingWrite.then(async () => {
        const filePath = path.join(PUBLIC_DIR, 'scrape_data.json');
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        const result = await change(data);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        return result;
    });
    pendingWrite = operation.catch(() => {});
    return operation;
}
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
    return writeMap(async (data) => {
    var mapToUpdate = data.MapInfo.find(x => x.Id === updatedInfo.id);
    if (!mapToUpdate) throw Object.assign(new Error('Map not found'), { status: 404 });
    mapToUpdate.RobRating = updatedInfo.rating;
    mapToUpdate.RobVideo = updatedInfo.videoLink;
    mapToUpdate.RobLabels = updatedInfo.labels;
    mapToUpdate.RobComment = updatedInfo.comment;
    if(mapToUpdate.InitialRatingTimestamp == null)
      mapToUpdate.InitialRatingTimestamp = Math.floor(Date.now() / 1000);

    });
}

app.post('/maps/:id/screenshots', express.raw({ type: 'image/*', limit: '20mb' }), async (req, res) => {
    const bytes = req.body;
    const type = req.get('Content-Type')?.split(';')[0];
    const signatures = {
        'image/png': ['png', b => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))],
        'image/jpeg': ['jpg', b => b[0] === 255 && b[1] === 216 && b[2] === 255],
        'image/gif': ['gif', b => ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString())],
        'image/webp': ['webp', b => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP']
    };
    const format = signatures[type];
    if (!Buffer.isBuffer(bytes) || !format || !format[1](bytes)) {
        return res.status(415).json({ error: 'Paste a PNG, JPEG, GIF or WebP image.' });
    }
    const id = randomUUID();
    const screenshot = { id, path: `images/screenshots/${id}.${format[0]}` };
    const filePath = path.join(PUBLIC_DIR, screenshot.path);
    let imageWritten = false;
    try {
        await writeMap(async (data) => {
            const map = data.MapInfo.find(x => x.Id === Number(req.params.id));
            if (!map) throw Object.assign(new Error('Map not found'), { status: 404 });
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, bytes, { flag: 'wx' });
            imageWritten = true;
            (map.RobScreenshots ??= []).push(screenshot);
        });
    } catch (error) {
        if (imageWritten) await fs.unlink(filePath);
        throw error;
    }
    res.status(201).json(screenshot);
});

app.delete('/maps/:id/screenshots/:screenshotId', async (req, res) => {
    const filePath = await writeMap(async (data) => {
        const map = data.MapInfo.find(x => x.Id === Number(req.params.id));
        const screenshot = map?.RobScreenshots?.find(x => x.id === req.params.screenshotId);
        if (!screenshot) throw Object.assign(new Error('Screenshot not found'), { status: 404 });
        // Only delete files from the screenshot directory, using the stored reference.
        const directory = path.resolve(PUBLIC_DIR, 'images/screenshots');
        const target = path.resolve(PUBLIC_DIR, screenshot.path);
        if (path.dirname(target) !== directory) throw new Error('Invalid screenshot path');
        map.RobScreenshots = map.RobScreenshots.filter(x => x.id !== screenshot.id);
        return target;
    });
    await fs.rm(filePath, { force: true });
    res.sendStatus(204);
});

app.post("/update", async (req, res) => {
    const updatedMapInfo = req.body; // whatever the client sends

    await updateMapInfo(updatedMapInfo);
    res.sendStatus(200);
});

app.use((error, req, res, next) => {
    const status = error.status || 500;
    res.status(status).json({ error: status === 413 ? 'Images must be 20 MB or smaller.' : status === 500 ? 'Could not save changes.' : error.message });
});
return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) createApp().listen(3000, () => {
  console.log("listening on port 3000");
});
