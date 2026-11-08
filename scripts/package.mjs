import {mkdir, readdir, readFile, writeFile, copyFile} from 'node:fs/promises';
import path from 'node:path';
import {deflateRawSync} from 'node:zlib';

// A portable ZIP writer: delivery must not require npm packages or an OS zip command.
const crcTable = Array.from({length: 256}, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  return value >>> 0;
});
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = (value >>> 8) ^ crcTable[(value ^ byte) & 255];
  return (value ^ 0xffffffff) >>> 0;
}

export async function packageSource(root) {
  const files = [];
  async function collect(directory) {
    for (const entry of await readdir(path.join(root, directory), {withFileTypes: true})) {
      // Never include a previous delivery archive or transient browser state.
      if (entry.name === 'lifebatt-source.zip' || entry.name === 'browser-profile' || entry.name.startsWith('.')) continue;
      const relative = path.posix.join(directory, entry.name);
      if (entry.isDirectory()) await collect(relative);
      else if (entry.isFile()) files.push(relative);
    }
  }
  for (const directory of ['src', 'scripts', 'public', 'source-content', 'docs', 'checks', 'preview']) await collect(directory);
  files.push('README.md', 'AGENTS.md', 'package.json', 'package-lock.json', '.gitignore');
  const records = [], directory = [];
  let offset = 0;
  for (const file of files.sort()) {
    let bytes = await readFile(path.join(root, file));
    // The extracted offline copy already contains the sources; avoid a self-referencing ZIP.
    if (file === 'preview/prototype-guide.html') {
      bytes = Buffer.from(bytes.toString().replace(/<a\b[^>]*href="lifebatt-source\.zip"[^>]*>.*?<\/a>/g, ''));
    }
    const compressed = deflateRawSync(bytes);
    const name = Buffer.from(`lifebatt/${file}`);
    const crc = crc32(bytes);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6); // UTF-8 paths.
    local.writeUInt16LE(8, 8); // Deflate.
    local.writeUInt16LE(33, 12); // Deterministic date: 1980-01-01.
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(bytes.length, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    local.copy(central, 6, 4, 30);
    central.writeUInt32LE(offset, 42);
    records.push(local, name, compressed);
    directory.push(central, name);
    offset += local.length + name.length + compressed.length;
  }
  const index = Buffer.concat(directory), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(index.length, 12);
  end.writeUInt32LE(offset, 16);
  const delivery = path.join(root, 'delivery/lifebatt-source.zip');
  await mkdir(path.dirname(delivery), {recursive: true});
  await writeFile(delivery, Buffer.concat([...records, index, end]));
  for (const folder of ['dist', 'preview']) await copyFile(delivery, path.join(root, folder, 'lifebatt-source.zip'));
  console.log(`Source archive refreshed: ${files.length} files, available in dist and preview.`);
}
