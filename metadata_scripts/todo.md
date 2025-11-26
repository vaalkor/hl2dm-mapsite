Map extraction:

- For any folder that has 1 bsp, we can store that bsp file

- For any folder that has NO bsp in it, but has an archive, we can look in that archive and if there is one bsp, use that as the map name


Edge cases to consider

- Folders that have more than 1 bsp file
- Folders that have a bsp file AND an archive file.. (should we just extract the archive file into the same folder, for all archives, and see what happens?)
- Folders that have more than 1 archive?
- folders that have an archive, which contains an archive???? Let's think about that...