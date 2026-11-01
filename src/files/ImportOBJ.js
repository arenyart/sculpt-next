import Utils from '../misc/Utils';
import MeshStatic from '../mesh/meshStatic/MeshStatic';

const Import = {};

/** Import OBJ file */
Import.importOBJ = function (data, gl) {
  const meshes = [];

  const vAr = [];
  const cAr = [];
  const cArMrgb = [];
  const mAr = [];
  const mArMat = [];
  const texAr = [];
  const fAr = [];
  const uvfAr = [];

  let offsetVertices = 0;
  let offsetTexCoords = 0;
  let nbVertices = 0;
  let nbTexCoords = 0;

  const lines = data.split('\n');
  let split = [];
  const inv255 = 1.0 / 255;
  const nbLength = lines.length;

  for (let i = 0; i < nbLength; ++i) {
    const line = lines[i].trim();

    if (line.length === 0) continue;

    const firstChar = line[0];
    let secondChar;

    if (firstChar === 'v') {

      secondChar = line[1];

      if (secondChar === ' ') {

        split = line.split(/\s+/);
        vAr.push(parseFloat(split[1]), parseFloat(split[2]), parseFloat(split[3]));
        if (split[4])
          cAr.push(parseFloat(split[4]), parseFloat(split[5]), parseFloat(split[6]));
        ++nbVertices;

      } else if (secondChar === 't') {

        split = line.split(/\s+/);
        texAr.push(parseFloat(split[1]), parseFloat(split[2]));
        ++nbTexCoords;

      }

    } else if (firstChar === 'f') {

      split = line.split(/\s+/);

      const nbVerts = split.length - 1;
      if (nbVerts < 3) // at least 3 vertices
        continue;

      const nbPrim = Math.ceil(nbVerts / 2) - 1;
      // quandrangulate polygons (+ 1 tri)
      for (let j = 0; j < nbPrim; ++j) {
        const id1 = j + 1;
        const id2 = j + 2;
        let id3 = nbVerts - id1;
        let id4 = nbVerts - j;
        if (id3 === id2) {
          id3 = id4;
          id4 = Utils.TRI_INDEX;
        }

        const sp1 = split[id1].split('/');
        const sp2 = split[id2].split('/');
        const sp3 = split[id3].split('/');
        const isQuad = id4 !== Utils.TRI_INDEX;
        let sp4;
        if (isQuad) sp4 = split[id4].split('/');

        let iv1 = parseInt(sp1[0], 10);
        let iv2 = parseInt(sp2[0], 10);
        let iv3 = parseInt(sp3[0], 10);
        let iv4 = isQuad ? parseInt(sp4[0], 10) : undefined;
        if (isQuad && (iv4 === iv1 || iv4 === iv2 || iv4 === iv3))
          continue;

        if (iv1 === iv2 || iv1 === iv3 || iv2 === iv3)
          continue;

        iv1 = (iv1 < 0 ? iv1 + nbVertices : iv1 - 1) - offsetVertices;
        iv2 = (iv2 < 0 ? iv2 + nbVertices : iv2 - 1) - offsetVertices;
        iv3 = (iv3 < 0 ? iv3 + nbVertices : iv3 - 1) - offsetVertices;
        if (isQuad) iv4 = (iv4 < 0 ? iv4 + nbVertices : iv4 - 1) - offsetVertices;
        fAr.push(iv1, iv2, iv3, isQuad ? iv4 : Utils.TRI_INDEX);

        if (sp1[1]) {
          let uv1 = parseInt(sp1[1], 10);
          let uv2 = parseInt(sp2[1], 10);
          let uv3 = parseInt(sp3[1], 10);
          let uv4 = isQuad ? parseInt(sp4[1], 10) : undefined;
          uv1 = (uv1 < 0 ? uv1 + nbTexCoords : uv1 - 1) - offsetTexCoords;
          uv2 = (uv2 < 0 ? uv2 + nbTexCoords : uv2 - 1) - offsetTexCoords;
          uv3 = (uv3 < 0 ? uv3 + nbTexCoords : uv3 - 1) - offsetTexCoords;
          if (isQuad) uv4 = (uv4 < 0 ? uv4 + nbTexCoords : uv4 - 1) - offsetTexCoords;

          uvfAr.push(uv1, uv2, uv3, isQuad ? uv4 : Utils.TRI_INDEX);

        } else if (uvfAr.length > 0) {

          uvfAr.push(iv1, iv2, iv3, isQuad ? iv4 : Utils.TRI_INDEX);
        }
      }

    } else if (firstChar === '#') {

      if (line[1] !== 'M')
        continue;

      if (line.startsWith('#MRGB ')) {

        // zbrush-like vertex color
        split = line.split(/\s+/);
        const blockMRGB = split[1];
        for (let m = 2, mlen = blockMRGB.length; m < mlen; m += 8) {
          const hex = parseInt(blockMRGB.slice(m, m + 6), 16);
          cArMrgb.push((hex >> 16) * inv255, (hex >> 8 & 0xff) * inv255, (hex & 0xff) * inv255);
        }

      } else if (line.startsWith('#MAT ')) {

        // zbrush-like vertex material
        split = line.split(/\s+/);
        const blockMAT = split[1];
        for (let n = 0, nlen = blockMAT.length; n < nlen; n += 6) {
          const hex2 = parseInt(blockMAT.slice(n, n + 6), 16);
          mArMat.push((hex2 >> 16) * inv255, (hex2 >> 8 & 0xff) * inv255, (hex2 & 0xff) * inv255);
        }
      }

    } else if (line.startsWith('o ')) {

      if (meshes.length > 0) {
        Import.initMeshOBJ(meshes[meshes.length - 1], vAr, fAr, cAr, mAr, texAr, uvfAr, cArMrgb, mArMat);
        offsetVertices = nbVertices;
        offsetTexCoords = nbTexCoords;
      }

      meshes.push(new MeshStatic(gl));

    }

  }

  if (meshes.length === 0) meshes[0] = new MeshStatic(gl);
  Import.initMeshOBJ(meshes[meshes.length - 1], vAr, fAr, cAr, mAr, texAr, uvfAr, cArMrgb, mArMat);

  return meshes;
};

Import.initMeshOBJ = function (mesh, vAr, fAr, cAr, mAr, texAr, uvfAr, cArMrgb, mArMat) {
  mesh.setVertices(new Float32Array(vAr));
  mesh.setFaces(new Uint32Array(fAr));

  if (cArMrgb.length === vAr.length) mesh.setColors(new Float32Array(cArMrgb));
  else if (cAr.length === vAr.length) mesh.setColors(new Float32Array(cAr));

  if (mArMat.length === vAr.length) mesh.setMaterials(new Float32Array(mArMat));
  else if (mAr.length === vAr.length) mesh.setMaterials(new Float32Array(mAr));

  if (texAr.length > 0 && uvfAr.length === fAr.length)
    mesh.initTexCoordsDataFromOBJData(texAr, uvfAr);

  vAr.length = fAr.length = 0;
  cArMrgb.length = cAr.length = 0;
  mArMat.length = mAr.length = 0;
  texAr.length = uvfAr.length = 0;
};

export default Import;
