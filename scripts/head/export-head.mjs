// Converts the head scan (LeePerrySmith.glb) into the small binary both avatars load:
//   public/models/head.bytes                                   (three.js, src/lib/avatar.js)
//   unity/JarvisAvatar/Assets/Jarvis/Resources/head.bytes      (Unity, HeadMeshBuilder.cs)
// Layout (little-endian): "JHD1", u32 vertexCount, u32 indexCount,
//   f32 position[v*3], f32 normal[v*3], f32 mouth[v], u16 index[i]
// Positions are in three.js space (+z = face), centred on the head and scaled to ~2 units tall.
// mouth = how much each vertex drops when the mouth opens (lower lip and jaw).
// Run: node scripts/head/export-head.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '../..');
const glb = readFileSync(join(here, 'LeePerrySmith.glb'));
if (glb.toString('ascii', 0, 4) !== 'glTF') throw new Error('Not a .glb file');
const jsonLen = glb.readUInt32LE(12);
const gltf = JSON.parse(glb.toString('utf8', 20, 20 + jsonLen));
const bin = glb.subarray(20 + jsonLen + 8);

const read = (accessorIndex, Type, comps) => {
  const a = gltf.accessors[accessorIndex], bv = gltf.bufferViews[a.bufferView];
  const start = bin.byteOffset + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  return new Type(bin.buffer.slice(start, start + a.count * comps * Type.BYTES_PER_ELEMENT));
};
const prim = gltf.meshes[0].primitives[0];
if (gltf.accessors[prim.indices].componentType !== 5123) throw new Error('Expected 16-bit indices');
const pos = read(prim.attributes.POSITION, Float32Array, 3);
const nrm = read(prim.attributes.NORMAL, Float32Array, 3);
const idx = read(prim.indices, Uint16Array, 1);
const v = pos.length / 3;

// landmarks measured on this scan (model units): crown y≈4, nose tip y≈1.2, mouth line y≈0.1, chin y≈-0.9
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mouth = new Float32Array(v);
const CENTER = [0, 1.5, 0.2], SCALE = 0.4;
for (let i = 0; i < v; i++) {
  const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
  mouth[i] = ss(0.2, 0, y) * (1 - ss(-0.9, -1.4, y)) * Math.exp(-((x / 1.1) ** 2)) * ss(1.0, 1.8, z);
  for (let k = 0; k < 3; k++) pos[i * 3 + k] = (pos[i * 3 + k] - CENTER[k]) * SCALE;
}

const header = Buffer.alloc(12);
header.write('JHD1', 0, 'ascii'); header.writeUInt32LE(v, 4); header.writeUInt32LE(idx.length, 8);
const out = Buffer.concat([header, Buffer.from(pos.buffer), Buffer.from(nrm.buffer), Buffer.from(mouth.buffer), Buffer.from(idx.buffer)]);
for (const p of ['public/models/head.bytes', 'unity/JarvisAvatar/Assets/Jarvis/Resources/head.bytes']) writeFileSync(join(root, p), out);
console.log(`head.bytes: ${v} vertices, ${idx.length / 3} triangles, ${out.length} bytes`);
