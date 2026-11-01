import Utils from '../misc/Utils';
import MeshStatic from '../mesh/meshStatic/MeshStatic';

const Import = {};

/** Import STL file */
Import.importSTL = function (buffer, gl) {
  let nbTriangles = new Uint32Array(buffer, 80, 1)[0] || 0;
  const isBinary = 84 + (nbTriangles * 50) === buffer.byteLength;
  let vb = isBinary ? Import.importBinarySTL(buffer, nbTriangles) : Import.importAsciiSTL(Utils.ab2str(buffer));
  let vbc;
  if (isBinary) {
    vbc = vb[1];
    vb = vb[0];
  }
  nbTriangles = vb.length / 9;
  const mapVertices = new Map();
  const nbVertices = [0];
  const iAr = new Uint32Array(nbTriangles * 4);
  for (let i = 0; i < nbTriangles; ++i) {
    const idt = i * 4;
    const idv = i * 9;
    iAr[idt] = Import.detectNewVertex(mapVertices, vb, vbc, idv, nbVertices);
    iAr[idt + 1] = Import.detectNewVertex(mapVertices, vb, vbc, idv + 3, nbVertices);
    iAr[idt + 2] = Import.detectNewVertex(mapVertices, vb, vbc, idv + 6, nbVertices);
    iAr[idt + 3] = Utils.TRI_INDEX;
  }
  const mesh = new MeshStatic(gl);
  mesh.setVertices(vb.subarray(0, nbVertices[0] * 3));
  if (vbc)
    mesh.setColors(vbc.subarray(0, nbVertices[0] * 3));
  mesh.setFaces(iAr);
  return [mesh];
};

/** Check if the vertex already exists */
Import.detectNewVertex = function (mapVertices, vb, vbc, start, nbVertices) {
  const x = vb[start];
  const y = vb[start + 1];
  const z = vb[start + 2];
  const hash = x + '+' + y + '+' + z;
  let idVertex = mapVertices.get(hash);
  if (idVertex === undefined) {
    idVertex = nbVertices[0];
    mapVertices.set(hash, idVertex);
    const id = idVertex * 3;
    vb[id] = x;
    vb[id + 1] = y;
    vb[id + 2] = z;
    if (vbc) {
      vbc[id] = vbc[start];
      vbc[id + 1] = vbc[start + 1];
      vbc[id + 2] = vbc[start + 2];
    }
    nbVertices[0]++;
  }
  return idVertex;
};

/** Import Ascii STL file */
Import.importAsciiSTL = function (data) {
  const lines = data.split('\n');
  const nbLength = lines.length;
  const vb = new Float32Array(Math.ceil(nbLength * 9 / 7));
  let acc = 0;
  for (let i = 0; i < nbLength; ++i) {
    const line = lines[i].trim();
    if (line.startsWith('facet')) {
      let split = lines[i + 2].trim().split(/\s+/);
      vb[acc++] = parseFloat(split[1]);
      vb[acc++] = parseFloat(split[2]);
      vb[acc++] = parseFloat(split[3]);
      split = lines[i + 3].trim().split(/\s+/);
      vb[acc++] = parseFloat(split[1]);
      vb[acc++] = parseFloat(split[2]);
      vb[acc++] = parseFloat(split[3]);
      split = lines[i + 4].trim().split(/\s+/);
      vb[acc++] = parseFloat(split[1]);
      vb[acc++] = parseFloat(split[2]);
      vb[acc++] = parseFloat(split[3]);
    }
  }
  return vb.subarray(0, acc);
};

/** Import binary STL file */
Import.importBinarySTL = function (buffer, nbTriangles) {
  const data = new Uint8Array(buffer);

  const dataHeader = data.subarray(0, 80);
  const colorMagic = String.fromCharCode.apply(null, dataHeader).indexOf('COLOR=') !== -1;

  let i = 0;
  const vb = new Uint8Array(nbTriangles * 36);
  let vbc = new Uint8Array(nbTriangles * 2);
  let offset = 96;
  let j = 0;
  let jc = 0;
  for (i = 0; i < nbTriangles; i++) {
    for (let inc = 0; inc < 36; ++inc) {
      vb[j++] = data[offset++];
    }
    vbc[jc++] = data[offset++];
    vbc[jc++] = data[offset++];
    offset += 12;
  }

  const uc = new Uint16Array(vbc.buffer);
  vbc = new Float32Array(nbTriangles * 9);
  const inv = 1.0 / 31;
  for (i = 0; i < nbTriangles; ++i) {
    j = i * 9;
    const u = uc[i];

    let r = 1.0;
    let g = 1.0;
    let b = 1.0;

    const bit15 = u & 32768;
    // https://en.wikipedia.org/wiki/STL_(file_format)#Color_in_binary_STL
    if (colorMagic) {
      // Materialise Magics
      if (!bit15) {
        r = ((u & 31) & 31) * inv;
        g = ((u >> 5) & 31) * inv;
        b = ((u >> 10) & 31) * inv;
      }
    } else if (bit15) {
      // VisCAM and SolidView 
      r = ((u >> 10) & 31) * inv;
      g = ((u >> 5) & 31) * inv;
      b = ((u & 31) & 31) * inv;
    }

    vbc[j] = vbc[j + 3] = vbc[j + 6] = r;
    vbc[j + 1] = vbc[j + 4] = vbc[j + 7] = g;
    vbc[j + 2] = vbc[j + 5] = vbc[j + 8] = b;
  }
  return [new Float32Array(vb.buffer), vbc];
};

export default Import;
