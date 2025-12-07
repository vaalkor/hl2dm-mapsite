import fs from "fs/promises";

const filePath = './docs/scrape_data.json'
const raw = await fs.readFile(filePath, 'utf8');
const data = JSON.parse(raw);

await fs.writeFile(
    filePath,
    JSON.stringify(data, null, 2),
    'utf8'
);
