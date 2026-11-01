import Utils from '../../misc/Utils';

const DecData = {
  _mesh: null,
  _states: null, // for undo-redo

  _iTrisToDelete: [], // triangles to be deleted
  _iVertsToDelete: [], // vertices to be deleted
  _iVertsDecimated: [] // vertices to be updated (mainly for the VBO's, used in decimation and adaptive topo)
};

const sortFunc = function (a, b) {
  return a - b;
};

/** Return the valid modified triangles (no duplicates) */
const getValidModifiedTriangles = function (iVerts, iTris) {
  const mesh = DecData._mesh;
  const ftf = mesh.getFacesTagFlags();
  const nbTriangles = mesh.getNbTriangles();

  const newTris = mesh.getFacesFromVertices(iVerts);
  const temp = iTris;
  let nbTris = iTris.length;
  iTris = new Uint32Array(nbTris + newTris.length);
  iTris.set(temp);
  iTris.set(newTris, nbTris);

  const tagFlag = ++Utils.TAG_FLAG;
  nbTris = iTris.length;
  const validTriangles = new Uint32Array(Utils.getMemory(nbTris * 4), 0, nbTris);
  let nbValid = 0;
  for (let i = 0; i < nbTris; ++i) {
    const iTri = iTris[i];
    if (iTri >= nbTriangles)
      continue;
    if (ftf[iTri] === tagFlag)
      continue;
    ftf[iTri] = tagFlag;
    validTriangles[nbValid++] = iTri;
  }
  return new Uint32Array(validTriangles.subarray(0, nbValid));
};

/** Return the valid modified vertices (no duplicates) */
const getValidModifiedVertices = function () {
  const mesh = DecData._mesh;
  const vtf = mesh.getVerticesTagFlags();
  const nbVertices = mesh.getNbVertices();

  const tagFlag = ++Utils.TAG_FLAG;
  const iVertsDecimated = DecData._iVertsDecimated;
  const nbVertsDecimated = iVertsDecimated.length;
  const validVertices = new Uint32Array(Utils.getMemory(nbVertsDecimated * 4), 0, nbVertsDecimated);
  let nbValid = 0;
  for (let i = 0; i < nbVertsDecimated; ++i) {
    const iVert = iVertsDecimated[i];
    if (iVert >= nbVertices)
      continue;
    if (vtf[iVert] === tagFlag)
      continue;
    vtf[iVert] = tagFlag;
    validVertices[nbValid++] = iVert;
  }
  return new Uint32Array(validVertices.subarray(0, nbValid));
};

/** Update last triangle of array and move its position */
const deleteTriangle = function (iTri) {
  const mesh = DecData._mesh;
  const vrf = mesh.getVerticesRingFace();
  const ftf = mesh.getFacesTagFlags();
  const fAr = mesh.getFaces();
  const pil = mesh.getFacePosInLeaf();
  const fleaf = mesh.getFaceLeaf();
  const fstf = mesh.getFacesStateFlags();

  const oldPos = pil[iTri];
  const iTrisLeaf = fleaf[iTri]._iFaces;
  const lastTri = iTrisLeaf[iTrisLeaf.length - 1];
  if (iTri !== lastTri) {
    iTrisLeaf[oldPos] = lastTri;
    pil[lastTri] = oldPos;
  }
  iTrisLeaf.pop();

  const lastPos = mesh.getNbTriangles() - 1;
  if (lastPos === iTri) {
    mesh.addNbFace(-1);
    return;
  }
  const id = lastPos * 4;
  const iv1 = fAr[id];
  const iv2 = fAr[id + 1];
  const iv3 = fAr[id + 2];

  // undo-redo
  DecData._states.pushVertices([iv1, iv2, iv3]);
  DecData._states.pushFaces([lastPos]);

  Utils.replaceElement(vrf[iv1], lastPos, iTri);
  Utils.replaceElement(vrf[iv2], lastPos, iTri);
  Utils.replaceElement(vrf[iv3], lastPos, iTri);

  const leafLast = fleaf[lastPos];
  const pilLast = pil[lastPos];
  leafLast._iFaces[pilLast] = iTri;
  fleaf[iTri] = leafLast;
  pil[iTri] = pilLast;

  ftf[iTri] = ftf[lastPos];
  fstf[iTri] = fstf[lastPos];
  iTri *= 4;
  fAr[iTri] = iv1;
  fAr[iTri + 1] = iv2;
  fAr[iTri + 2] = iv3;
  fAr[iTri + 3] = Utils.TRI_INDEX;

  DecData._iVertsDecimated.push(iv1, iv2, iv3);

  mesh.addNbFace(-1);
};

/** Update last vertex of array and move its position */
const deleteVertex = function (iVert) {
  const mesh = DecData._mesh;
  const vrv = mesh.getVerticesRingVert();
  const vrf = mesh.getVerticesRingFace();
  const vAr = mesh.getVertices();
  const nAr = mesh.getNormals();
  const cAr = mesh.getColors();
  const mAr = mesh.getMaterials();
  const fAr = mesh.getFaces();
  const vtf = mesh.getVerticesTagFlags();
  const vstf = mesh.getVerticesStateFlags();
  const vsctf = mesh.getVerticesSculptFlags();

  const lastPos = mesh.getNbVertices() - 1;
  if (iVert === lastPos) {
    mesh.addNbVertice(-1);
    return;
  }
  let id = 0;

  // undo-redo
  const states = DecData._states;
  states.pushVertices([lastPos]);

  const iTris = vrf[lastPos];
  const ring = vrv[lastPos];
  const nbTris = iTris.length;
  const nbRing = ring.length;
  let i = 0;
  for (i = 0; i < nbTris; ++i) {
    id = iTris[i];
    states.pushFaces([id]); // undo-redo

    id *= 4;
    if (fAr[id] === lastPos) fAr[id] = iVert;
    else if (fAr[id + 1] === lastPos) fAr[id + 1] = iVert;
    else fAr[id + 2] = iVert;
  }

  for (i = 0; i < nbRing; ++i) {
    id = ring[i];
    states.pushVertices([id]); // undo-redo
    Utils.replaceElement(vrv[id], lastPos, iVert);
  }

  vrv[iVert] = vrv[lastPos].slice(); // slice ?
  vrf[iVert] = vrf[lastPos].slice(); // slice ?
  vtf[iVert] = vtf[lastPos];
  vstf[iVert] = vstf[lastPos];
  vsctf[iVert] = vsctf[lastPos];
  const idLast = lastPos * 3;
  id = iVert * 3;
  vAr[id] = vAr[idLast];
  vAr[id + 1] = vAr[idLast + 1];
  vAr[id + 2] = vAr[idLast + 2];
  nAr[id] = nAr[idLast];
  nAr[id + 1] = nAr[idLast + 1];
  nAr[id + 2] = nAr[idLast + 2];
  cAr[id] = cAr[idLast];
  cAr[id + 1] = cAr[idLast + 1];
  cAr[id + 2] = cAr[idLast + 2];
  mAr[id] = mAr[idLast];
  mAr[id + 1] = mAr[idLast + 1];
  mAr[id + 2] = mAr[idLast + 2];

  mesh.addNbVertice(-1);
};

/** Apply deletion on vertices and triangles */
const applyDeletion = function () {
  const iTrisToDelete = DecData._iTrisToDelete;
  Utils.tidy(iTrisToDelete);
  const nbTrisDelete = iTrisToDelete.length;
  let i = 0;
  for (i = nbTrisDelete - 1; i >= 0; --i)
    deleteTriangle(iTrisToDelete[i]);

  const iVertsToDelete = DecData._iVertsToDelete;
  Utils.tidy(iVertsToDelete);
  const nbVertsToDelete = iVertsToDelete.length;
  for (i = nbVertsToDelete - 1; i >= 0; --i)
    deleteVertex(iVertsToDelete[i]);
};

/** Decimate 2 triangles (collapse 1 edge) */
const edgeCollapse = function (iTri1, iTri2, iv1, iv2, ivOpp1, ivOpp2, iTris) {
  const mesh = DecData._mesh;
  const vAr = mesh.getVertices();
  const nAr = mesh.getNormals();
  const cAr = mesh.getColors();
  const mAr = mesh.getMaterials();
  const fAr = mesh.getFaces();

  const vtf = mesh.getVerticesTagFlags();
  const ftf = mesh.getFacesTagFlags();
  const vrv = mesh.getVerticesRingVert();
  const vrf = mesh.getVerticesRingFace();

  const ring1 = vrv[iv1];
  const ring2 = vrv[iv2];
  const tris1 = vrf[iv1];
  const tris2 = vrf[iv2];

  // vertices on the edge... we don't do anything
  if (ring1.length !== tris1.length || ring2.length !== tris2.length)
    return;

  const ringOpp1 = vrv[ivOpp1];
  const ringOpp2 = vrv[ivOpp2];
  const trisOpp1 = vrf[ivOpp1];
  const trisOpp2 = vrf[ivOpp2];
  if (ringOpp1.length !== trisOpp1.length || ringOpp2.length !== trisOpp2.length)
    return;

  DecData._iVertsDecimated.push(iv1, iv2);

  // undo-redo
  DecData._states.pushVertices(ring1);
  DecData._states.pushVertices(ring2);
  DecData._states.pushFaces(tris1);
  DecData._states.pushFaces(tris2);

  ring1.sort(sortFunc);
  ring2.sort(sortFunc);

  let id = 0;
  if (Utils.intersectionArrays(ring1, ring2).length >= 3) { // edge flip
    Utils.removeElement(tris1, iTri2);
    Utils.removeElement(tris2, iTri1);
    trisOpp1.push(iTri2);
    trisOpp2.push(iTri1);

    id = iTri1 * 4;
    if (fAr[id] === iv2) fAr[id] = ivOpp2;
    else if (fAr[id + 1] === iv2) fAr[id + 1] = ivOpp2;
    else fAr[id + 2] = ivOpp2;

    id = iTri2 * 4;
    if (fAr[id] === iv1) fAr[id] = ivOpp1;
    else if (fAr[id + 1] === iv1) fAr[id + 1] = ivOpp1;
    else fAr[id + 2] = ivOpp1;

    mesh.computeRingVertices(iv1);
    mesh.computeRingVertices(iv2);
    mesh.computeRingVertices(ivOpp1);
    mesh.computeRingVertices(ivOpp2);
    // cleanUpSingularVertex(iv1);
    // cleanUpSingularVertex(iv2);
    // cleanUpSingularVertex(ivOpp1);
    // cleanUpSingularVertex(ivOpp2);
    return;
  }

  id = iv1 * 3;
  const id2 = iv2 * 3;
  let nx = nAr[id] + nAr[id2];
  let ny = nAr[id + 1] + nAr[id2 + 1];
  let nz = nAr[id + 2] + nAr[id2 + 2];
  let len = nx * nx + ny * ny + nz * nz;
  if (len === 0) {
    nx = 1.0;
  } else {
    len = 1.0 / Math.sqrt(len);
    nx *= len;
    ny *= len;
    nz *= len;
  }
  nAr[id] = nx;
  nAr[id + 1] = ny;
  nAr[id + 2] = nz;
  cAr[id] = (cAr[id] + cAr[id2]) * 0.5;
  cAr[id + 1] = (cAr[id + 1] + cAr[id2 + 1]) * 0.5;
  cAr[id + 2] = (cAr[id + 2] + cAr[id2 + 2]) * 0.5;
  mAr[id] = (mAr[id] + mAr[id2]) * 0.5;
  mAr[id + 1] = (mAr[id + 1] + mAr[id2 + 1]) * 0.5;
  mAr[id + 2] = (mAr[id + 2] + mAr[id2 + 2]) * 0.5;

  Utils.removeElement(tris1, iTri1);
  Utils.removeElement(tris1, iTri2);
  Utils.removeElement(tris2, iTri1);
  Utils.removeElement(tris2, iTri2);
  Utils.removeElement(trisOpp1, iTri1);
  Utils.removeElement(trisOpp2, iTri2);

  let nb = tris2.length;
  let i = 0;
  for (i = 0; i < nb; ++i) {
    const tri2 = tris2[i];
    tris1.push(tri2);
    const iTri = tri2 * 4;
    if (fAr[iTri] === iv2) fAr[iTri] = iv1;
    else if (fAr[iTri + 1] === iv2) fAr[iTri + 1] = iv1;
    else fAr[iTri + 2] = iv1;
  }
  nb = ring2.length;
  for (i = 0; i < nb; ++i)
    ring1.push(ring2[i]);

  mesh.computeRingVertices(iv1);

  // flat smooth the vertex...
  let meanX = 0.0;
  let meanY = 0.0;
  let meanZ = 0.0;
  const nbRing1 = ring1.length;
  for (i = 0; i < nbRing1; ++i) {
    let ivRing = ring1[i];
    mesh.computeRingVertices(ivRing);
    ivRing *= 3;
    meanX += vAr[ivRing];
    meanY += vAr[ivRing + 1];
    meanZ += vAr[ivRing + 2];
  }
  meanX /= nbRing1;
  meanY /= nbRing1;
  meanZ /= nbRing1;
  const dot = nx * (meanX - vAr[id]) + ny * (meanY - vAr[id + 1]) + nz * (meanZ - vAr[id + 2]);
  vAr[id] = meanX - nx * dot;
  vAr[id + 1] = meanY - ny * dot;
  vAr[id + 2] = meanZ - nz * dot;

  vtf[iv2] = ftf[iTri1] = ftf[iTri2] = -1;
  DecData._iVertsToDelete.push(iv2);
  DecData._iTrisToDelete.push(iTri1, iTri2);

  nb = tris1.length;
  for (i = 0; i < nb; ++i)
    iTris.push(tris1[i]);

  // cleanUpSingularVertex(iv1);
};

/** Decimate triangles (find orientation of the 2 triangles) */
const decimateTriangles = function (iTri1, iTri2, iTris) {
  if (iTri2 === -1)
    return;
  const fAr = DecData._mesh.getFaces();

  let id = iTri1 * 4;
  const iv11 = fAr[id];
  const iv21 = fAr[id + 1];
  const iv31 = fAr[id + 2];

  id = iTri2 * 4;
  const iv12 = fAr[id];
  const iv22 = fAr[id + 1];
  const iv32 = fAr[id + 2];

  if (iv11 === iv12) {
    if (iv21 === iv32) edgeCollapse(iTri1, iTri2, iv11, iv21, iv31, iv22, iTris);
    else edgeCollapse(iTri1, iTri2, iv11, iv31, iv21, iv32, iTris);
  } else if (iv11 === iv22) {
    if (iv21 === iv12) edgeCollapse(iTri1, iTri2, iv11, iv21, iv31, iv32, iTris);
    else edgeCollapse(iTri1, iTri2, iv11, iv31, iv21, iv12, iTris);
  } else if (iv11 === iv32) {
    if (iv21 === iv22) edgeCollapse(iTri1, iTri2, iv11, iv21, iv31, iv12, iTris);
    else edgeCollapse(iTri1, iTri2, iv11, iv31, iv21, iv22, iTris);
  } else if (iv21 === iv12) edgeCollapse(iTri1, iTri2, iv31, iv21, iv11, iv22, iTris);
  else if (iv21 === iv22) edgeCollapse(iTri1, iTri2, iv31, iv21, iv11, iv32, iTris);
  else edgeCollapse(iTri1, iTri2, iv31, iv21, iv11, iv12, iTris);
};

/** Find opposite triangle */
const findOppositeTriangle = function (iTri, iv1, iv2) {
  const vrf = DecData._mesh.getVerticesRingFace();
  const iTris1 = vrf[iv1];
  const iTris2 = vrf[iv2];
  iTris1.sort(sortFunc);
  iTris2.sort(sortFunc);
  const res = Utils.intersectionArrays(iTris1, iTris2);
  if (res.length !== 2)
    return -1;
  return res[0] === iTri ? res[1] : res[0];
};

const Decimation = {};

/** Decimation */
Decimation.decimation = function (mesh, iTris, center, radius2, detail2, states) {
  DecData._mesh = mesh;
  DecData._states = states;
  DecData._iVertsDecimated.length = 0;
  DecData._iTrisToDelete.length = 0;
  DecData._iVertsToDelete.length = 0;

  const radius = Math.sqrt(radius2);
  const ftf = mesh.getFacesTagFlags();
  const vAr = mesh.getVertices();
  const mAr = mesh.getMaterials();
  const fAr = mesh.getFaces();

  const cenx = center[0];
  const ceny = center[1];
  const cenz = center[2];

  let i = 0;
  const nbInit = iTris.length;
  const dynArr = new Array(nbInit);
  for (i = 0; i < nbInit; ++i)
    dynArr[i] = iTris[i];

  for (i = 0; i < dynArr.length; ++i) {
    const iTri = dynArr[i];
    if (ftf[iTri] < 0)
      continue;

    const id = iTri * 4;
    const iv1 = fAr[id];
    const iv2 = fAr[id + 1];
    const iv3 = fAr[id + 2];

    const ind1 = iv1 * 3;
    const ind2 = iv2 * 3;
    const ind3 = iv3 * 3;

    const v1x = vAr[ind1];
    const v1y = vAr[ind1 + 1];
    const v1z = vAr[ind1 + 2];

    const v2x = vAr[ind2];
    const v2y = vAr[ind2 + 1];
    const v2z = vAr[ind2 + 2];

    const v3x = vAr[ind3];
    const v3y = vAr[ind3 + 1];
    const v3z = vAr[ind3 + 2];

    let dx = (v1x + v2x + v3x) / 3.0 - cenx;
    let dy = (v1y + v2y + v3y) / 3.0 - ceny;
    let dz = (v1z + v2z + v3z) / 3.0 - cenz;
    let fallOff = dx * dx + dy * dy + dz * dz;

    if (fallOff < radius2)
      fallOff = 1.0;
    else if (fallOff < radius2 * 2.0) {
      fallOff = (Math.sqrt(fallOff) - radius) / (radius * Math.SQRT2 - radius);
      const f2 = fallOff * fallOff;
      fallOff = 3.0 * f2 * f2 - 4.0 * f2 * fallOff + 1.0;
    } else
      continue;

    dx = v2x - v1x;
    dy = v2y - v1y;
    dz = v2z - v1z;
    const len1 = dx * dx + dy * dy + dz * dz;

    dx = v2x - v3x;
    dy = v2y - v3y;
    dz = v2z - v3z;
    const len2 = dx * dx + dy * dy + dz * dz;

    dx = v1x - v3x;
    dy = v1y - v3y;
    dz = v1z - v3z;
    const len3 = dx * dx + dy * dy + dz * dz;

    const m1 = mAr[ind1 + 2];
    const m2 = mAr[ind2 + 2];
    const m3 = mAr[ind3 + 2];

    if (len1 < len2 && len1 < len3) {
      if (len1 < detail2 * fallOff * (m1 + m2) * 0.5)
        decimateTriangles(iTri, findOppositeTriangle(iTri, iv1, iv2), dynArr);
    } else if (len2 < len3) {
      if (len2 < detail2 * fallOff * (m2 + m3) * 0.5)
        decimateTriangles(iTri, findOppositeTriangle(iTri, iv2, iv3), dynArr);
    } else {
      if (len3 < detail2 * fallOff * (m1 + m3) * 0.5)
        decimateTriangles(iTri, findOppositeTriangle(iTri, iv1, iv3), dynArr);
    }
  }

  applyDeletion();
  iTris = getValidModifiedTriangles(getValidModifiedVertices(), dynArr);
  return iTris;
};

export default Decimation;
