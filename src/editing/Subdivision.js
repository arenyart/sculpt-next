import Utils from '../misc/Utils';

const Subdivision = {};
Subdivision.LINEAR = false;

//       v3
//       /\
//      /3T\ 
//   m3/____\m2
//    /\ 0T /\
//   /1T\  /2T\
//  /____\/____\ 
// v1    m1    v2

// v4____m3____v3
// |     |     |
// |     |     |
// |m4___|c____|m2
// |     |     |
// |     |     |
// |_____|_____|
// v1   m1     v2

// Helper class
class OddVertexComputer {

  constructor(mesh, vArOut, cArOut, mArOut) {
    this._vArOut = vArOut;
    this._cArOut = cArOut;
    this._mArOut = mArOut;
    this._vAr = mesh.getVertices();
    this._cAr = mesh.getColors();
    this._mAr = mesh.getMaterials();
    this._eAr = mesh.getEdges();
    this._nbVertices = mesh.getNbVertices();
    this._tagEdges = new Int32Array(mesh.getNbEdges());
  }

  computeTriangleEdgeVertex(iv1, iv2, iv3, ide) {
    const vAr = this._vAr;
    const cAr = this._cAr;
    const mAr = this._mAr;
    const eAr = this._eAr;
    const vArOut = this._vArOut;
    const cArOut = this._cArOut;
    const mArOut = this._mArOut;
    const tagEdges = this._tagEdges;
    const id1 = iv1 * 3;
    const id2 = iv2 * 3;
    const idOpp = iv3 * 3;
    const testEdge = tagEdges[ide] - 1;
    const ivMid = testEdge === -1 ? this._nbVertices++ : testEdge;
    const idMid = ivMid * 3;
    const edgeValue = eAr[ide];
    if (edgeValue === 1 || edgeValue >= 3 || Subdivision.LINEAR) { // mid edge vertex or non manifold shit
      if (testEdge !== -1) // no need to recompute weird non manifold stuffs
        return ivMid;
      tagEdges[ide] = ivMid + 1;
      vArOut[idMid] = 0.5 * (vAr[id1] + vAr[id2]);
      vArOut[idMid + 1] = 0.5 * (vAr[id1 + 1] + vAr[id2 + 1]);
      vArOut[idMid + 2] = 0.5 * (vAr[id1 + 2] + vAr[id2 + 2]);

      cArOut[idMid] = 0.5 * (cAr[id1] + cAr[id2]);
      cArOut[idMid + 1] = 0.5 * (cAr[id1 + 1] + cAr[id2 + 1]);
      cArOut[idMid + 2] = 0.5 * (cAr[id1 + 2] + cAr[id2 + 2]);

      mArOut[idMid] = 0.5 * (mAr[id1] + mAr[id2]);
      mArOut[idMid + 1] = 0.5 * (mAr[id1 + 1] + mAr[id2 + 1]);
      mArOut[idMid + 2] = 0.5 * (mAr[id1 + 2] + mAr[id2 + 2]);
    } else if (testEdge === -1) { // new mid vertex
      tagEdges[ide] = ivMid + 1;
      vArOut[idMid] = 0.125 * vAr[idOpp] + 0.375 * (vAr[id1] + vAr[id2]);
      vArOut[idMid + 1] = 0.125 * vAr[idOpp + 1] + 0.375 * (vAr[id1 + 1] + vAr[id2 + 1]);
      vArOut[idMid + 2] = 0.125 * vAr[idOpp + 2] + 0.375 * (vAr[id1 + 2] + vAr[id2 + 2]);

      cArOut[idMid] = 0.125 * cAr[idOpp] + 0.375 * (cAr[id1] + cAr[id2]);
      cArOut[idMid + 1] = 0.125 * cAr[idOpp + 1] + 0.375 * (cAr[id1 + 1] + cAr[id2 + 1]);
      cArOut[idMid + 2] = 0.125 * cAr[idOpp + 2] + 0.375 * (cAr[id1 + 2] + cAr[id2 + 2]);

      mArOut[idMid] = 0.125 * mAr[idOpp] + 0.375 * (mAr[id1] + mAr[id2]);
      mArOut[idMid + 1] = 0.125 * mAr[idOpp + 1] + 0.375 * (mAr[id1 + 1] + mAr[id2 + 1]);
      mArOut[idMid + 2] = 0.125 * mAr[idOpp + 2] + 0.375 * (mAr[id1 + 2] + mAr[id2 + 2]);
    } else { // mid vertex already exists
      vArOut[idMid] += 0.125 * vAr[idOpp];
      vArOut[idMid + 1] += 0.125 * vAr[idOpp + 1];
      vArOut[idMid + 2] += 0.125 * vAr[idOpp + 2];

      cArOut[idMid] += 0.125 * cAr[idOpp];
      cArOut[idMid + 1] += 0.125 * cAr[idOpp + 1];
      cArOut[idMid + 2] += 0.125 * cAr[idOpp + 2];

      mArOut[idMid] += 0.125 * mAr[idOpp];
      mArOut[idMid + 1] += 0.125 * mAr[idOpp + 1];
      mArOut[idMid + 2] += 0.125 * mAr[idOpp + 2];
    }
    return ivMid;
  }

  computeQuadEdgeVertex(iv1, iv2, iv3, iv4, ide) {
    const vAr = this._vAr;
    const cAr = this._cAr;
    const mAr = this._mAr;
    const eAr = this._eAr;
    const vArOut = this._vArOut;
    const cArOut = this._cArOut;
    const mArOut = this._mArOut;
    const tagEdges = this._tagEdges;
    const id1 = iv1 * 3;
    const id2 = iv2 * 3;
    const idOpp = iv3 * 3;
    const idOpp2 = iv4 * 3;
    const testEdge = tagEdges[ide] - 1;
    const ivMid = testEdge === -1 ? this._nbVertices++ : testEdge;
    const idMid = ivMid * 3;
    const edgeValue = eAr[ide];
    if (edgeValue === 1 || edgeValue >= 3 || Subdivision.LINEAR) { // mid edge vertex or non manifold shit
      if (testEdge !== -1) // no need to recompute weird non manifold stuffs
        return ivMid;
      tagEdges[ide] = ivMid + 1;
      vArOut[idMid] = 0.5 * (vAr[id1] + vAr[id2]);
      vArOut[idMid + 1] = 0.5 * (vAr[id1 + 1] + vAr[id2 + 1]);
      vArOut[idMid + 2] = 0.5 * (vAr[id1 + 2] + vAr[id2 + 2]);

      cArOut[idMid] = 0.5 * (cAr[id1] + cAr[id2]);
      cArOut[idMid + 1] = 0.5 * (cAr[id1 + 1] + cAr[id2 + 1]);
      cArOut[idMid + 2] = 0.5 * (cAr[id1 + 2] + cAr[id2 + 2]);

      mArOut[idMid] = 0.5 * (mAr[id1] + mAr[id2]);
      mArOut[idMid + 1] = 0.5 * (mAr[id1 + 1] + mAr[id2 + 1]);
      mArOut[idMid + 2] = 0.5 * (mAr[id1 + 2] + mAr[id2 + 2]);
    } else if (testEdge === -1) { // new mid vertex
      tagEdges[ide] = ivMid + 1;
      vArOut[idMid] = 0.0625 * (vAr[idOpp] + vAr[idOpp2]) + 0.375 * (vAr[id1] + vAr[id2]);
      vArOut[idMid + 1] = 0.0625 * (vAr[idOpp + 1] + vAr[idOpp2 + 1]) + 0.375 * (vAr[id1 + 1] + vAr[id2 + 1]);
      vArOut[idMid + 2] = 0.0625 * (vAr[idOpp + 2] + vAr[idOpp2 + 2]) + 0.375 * (vAr[id1 + 2] + vAr[id2 + 2]);

      cArOut[idMid] = 0.0625 * (cAr[idOpp] + cAr[idOpp2]) + 0.375 * (cAr[id1] + cAr[id2]);
      cArOut[idMid + 1] = 0.0625 * (cAr[idOpp + 1] + cAr[idOpp2 + 1]) + 0.375 * (cAr[id1 + 1] + cAr[id2 + 1]);
      cArOut[idMid + 2] = 0.0625 * (cAr[idOpp + 2] + cAr[idOpp2 + 2]) + 0.375 * (cAr[id1 + 2] + cAr[id2 + 2]);

      mArOut[idMid] = 0.0625 * (mAr[idOpp] + mAr[idOpp2]) + 0.375 * (mAr[id1] + mAr[id2]);
      mArOut[idMid + 1] = 0.0625 * (mAr[idOpp + 1] + mAr[idOpp2 + 1]) + 0.375 * (mAr[id1 + 1] + mAr[id2 + 1]);
      mArOut[idMid + 2] = 0.0625 * (mAr[idOpp + 2] + mAr[idOpp2 + 2]) + 0.375 * (mAr[id1 + 2] + mAr[id2 + 2]);
    } else { // mid vertex already exists
      vArOut[idMid] += 0.0625 * (vAr[idOpp] + vAr[idOpp2]);
      vArOut[idMid + 1] += 0.0625 * (vAr[idOpp + 1] + vAr[idOpp2 + 1]);
      vArOut[idMid + 2] += 0.0625 * (vAr[idOpp + 2] + vAr[idOpp2 + 2]);

      cArOut[idMid] += 0.0625 * (cAr[idOpp] + cAr[idOpp2]);
      cArOut[idMid + 1] += 0.0625 * (cAr[idOpp + 1] + cAr[idOpp2 + 1]);
      cArOut[idMid + 2] += 0.0625 * (cAr[idOpp + 2] + cAr[idOpp2 + 2]);

      mArOut[idMid] += 0.0625 * (mAr[idOpp] + mAr[idOpp2]);
      mArOut[idMid + 1] += 0.0625 * (mAr[idOpp + 1] + mAr[idOpp2 + 1]);
      mArOut[idMid + 2] += 0.0625 * (mAr[idOpp + 2] + mAr[idOpp2 + 2]);
    }
    return ivMid;
  }

  computeFaceVertex(iv1, iv2, iv3, iv4) {
    const id1 = iv1 * 3;
    const id2 = iv2 * 3;
    const id3 = iv3 * 3;
    const id4 = iv4 * 3;
    const vAr = this._vAr;
    const cAr = this._cAr;
    const mAr = this._mAr;
    const vArOut = this._vArOut;
    const cArOut = this._cArOut;
    const mArOut = this._mArOut;
    const ivCen = this._nbVertices++;
    const idCen = ivCen * 3;
    vArOut[idCen] = 0.25 * (vAr[id1] + vAr[id2] + vAr[id3] + vAr[id4]);
    vArOut[idCen + 1] = 0.25 * (vAr[id1 + 1] + vAr[id2 + 1] + vAr[id3 + 1] + vAr[id4 + 1]);
    vArOut[idCen + 2] = 0.25 * (vAr[id1 + 2] + vAr[id2 + 2] + vAr[id3 + 2] + vAr[id4 + 2]);

    cArOut[idCen] = 0.25 * (cAr[id1] + cAr[id2] + cAr[id3] + cAr[id4]);
    cArOut[idCen + 1] = 0.25 * (cAr[id1 + 1] + cAr[id2 + 1] + cAr[id3 + 1] + cAr[id4 + 1]);
    cArOut[idCen + 2] = 0.25 * (cAr[id1 + 2] + cAr[id2 + 2] + cAr[id3 + 2] + cAr[id4 + 2]);

    mArOut[idCen] = 0.25 * (mAr[id1] + mAr[id2] + mAr[id3] + mAr[id4]);
    mArOut[idCen + 1] = 0.25 * (mAr[id1 + 1] + mAr[id2 + 1] + mAr[id3 + 1] + mAr[id4 + 1]);
    mArOut[idCen + 2] = 0.25 * (mAr[id1 + 2] + mAr[id2 + 2] + mAr[id3 + 2] + mAr[id4 + 2]);
    return ivCen;
  }
}

/** Even vertices smoothing */
const applyEvenSmooth = function (baseMesh, even, colorOut, materialOut) {
  const nbVerts = baseMesh.getNbVertices();

  colorOut.set(baseMesh.getColors().subarray(0, nbVerts * 3));
  materialOut.set(baseMesh.getMaterials().subarray(0, nbVerts * 3));

  const vArOld = baseMesh.getVertices();
  const fArOld = baseMesh.getFaces();
  const eArOld = baseMesh.getEdges();
  const feArOld = baseMesh.getFaceEdges();
  const vertOnEdgeOld = baseMesh.getVerticesOnEdge();
  const vrvStartCount = baseMesh.getVerticesRingVertStartCount();
  const vertRingVert = baseMesh.getVerticesRingVert();
  const vrfStartCount = baseMesh.getVerticesRingFaceStartCount();
  const vertRingFace = baseMesh.getVerticesRingFace();
  const onlyTri = baseMesh.hasOnlyTriangles();

  for (let i = 0; i < nbVerts; ++i) {
    const j = i * 3;
    let avx = 0.0;
    let avy = 0.0;
    let avz = 0.0;
    let beta = 0.0;
    let alpha = 0.0;
    let k = 0;
    let id = 0;

    // edge vertex
    if (vertOnEdgeOld[i] || Subdivision.LINEAR) {
      const startF = vrfStartCount[i * 2];
      const endF = startF + vrfStartCount[i * 2 + 1];
      for (k = startF; k < endF; ++k) {
        const idFace = vertRingFace[k] * 4;
        const i1 = fArOld[idFace];
        const i2 = fArOld[idFace + 1];
        const i3 = fArOld[idFace + 2];
        const i4 = fArOld[idFace + 3];
        const isTri = i4 === Utils.TRI_INDEX;
        id = Utils.TRI_INDEX;

        if (i1 === i) {
          if (eArOld[feArOld[idFace]] === 1) id = i2;
          else if (eArOld[feArOld[isTri ? idFace + 2 : idFace + 3]] === 1) id = isTri ? i3 : i4;
        } else if (i2 === i) {
          if (eArOld[feArOld[idFace]] === 1) id = i1;
          else if (eArOld[feArOld[idFace + 1]] === 1) id = i3;
        } else if (i3 === i) {
          if (eArOld[feArOld[idFace + 1]] === 1) id = i2;
          else if (eArOld[feArOld[idFace + 2]] === 1) id = isTri ? i1 : i4;
        } else if (i4 === i) {
          if (eArOld[feArOld[idFace + 2]] === 1) id = i3;
          else if (eArOld[feArOld[idFace + 3]] === 1) id = i1;
        }

        if (id === Utils.TRI_INDEX) continue;
        id *= 3;
        avx += vArOld[id];
        avy += vArOld[id + 1];
        avz += vArOld[id + 2];
        beta++;
      }
      if (beta < 2) { // non manifold boring stuffs
        even[j] = vArOld[j];
        even[j + 1] = vArOld[j + 1];
        even[j + 2] = vArOld[j + 2];
      } else {
        beta = 0.25 / beta;
        alpha = 0.75;
        even[j] = vArOld[j] * alpha + avx * beta;
        even[j + 1] = vArOld[j + 1] * alpha + avy * beta;
        even[j + 2] = vArOld[j + 2] * alpha + avz * beta;
      }
      continue;
    }
    const start = vrvStartCount[i * 2];
    const count = vrvStartCount[i * 2 + 1];
    const end = start + count;
    // interior vertex
    for (k = start; k < end; ++k) {
      id = vertRingVert[k] * 3;
      avx += vArOld[id];
      avy += vArOld[id + 1];
      avz += vArOld[id + 2];
    }
    // only vertex tri
    if (onlyTri) {
      if (count === 6) {
        beta = 0.0625;
        alpha = 0.625;
      } else if (count === 3) { // warren weights
        beta = 0.1875;
        alpha = 0.4375;
      } else {
        beta = 0.375 / count;
        alpha = 0.625;
      }
      even[j] = vArOld[j] * alpha + avx * beta;
      even[j + 1] = vArOld[j + 1] * alpha + avy * beta;
      even[j + 2] = vArOld[j + 2] * alpha + avz * beta;
      continue;
    }
    let oppx = 0.0;
    let oppy = 0.0;
    let oppz = 0.0;
    let gamma = 0.0;

    const startFace = vrfStartCount[i * 2];
    const endFace = startFace + vrfStartCount[i * 2 + 1];
    let nbQuad = 0;
    for (k = startFace; k < endFace; ++k) {
      id = vertRingFace[k] * 4;
      const iv4 = fArOld[id + 3];
      if (iv4 === Utils.TRI_INDEX) continue;

      nbQuad++;
      const iv1 = fArOld[id];
      const iv2 = fArOld[id + 1];
      const iv3 = fArOld[id + 2];
      let ivOpp = 0;
      if (iv1 === i) ivOpp = iv3 * 3;
      else if (iv2 === i) ivOpp = iv4 * 3;
      else if (iv3 === i) ivOpp = iv1 * 3;
      else ivOpp = iv2 * 3;
      oppx += vArOld[ivOpp];
      oppy += vArOld[ivOpp + 1];
      oppz += vArOld[ivOpp + 2];
    }

    // interior vertex quad
    if (nbQuad === (endFace - startFace)) {
      if (count === 4) {
        alpha = 0.5625;
        beta = 0.09375;
        gamma = 0.015625;
      } else {
        beta = 1.5 / (count * count);
        gamma = 0.25 / (count * count);
        alpha = 1.0 - (beta + gamma) * count;
      }
      even[j] = vArOld[j] * alpha + avx * beta + oppx * gamma;
      even[j + 1] = vArOld[j + 1] * alpha + avy * beta + oppy * gamma;
      even[j + 2] = vArOld[j + 2] * alpha + avz * beta + oppz * gamma;
      continue;
    }
    // interior vertex tri
    if (nbQuad === 0) {
      if (count === 6) {
        beta = 0.0625;
        alpha = 0.625;
      } else if (count === 3) { // warren weights
        beta = 0.1875;
        alpha = 0.4375;
      } else {
        beta = 0.375 / count;
        alpha = 0.625;
      }
      even[j] = vArOld[j] * alpha + avx * beta;
      even[j + 1] = vArOld[j + 1] * alpha + avy * beta;
      even[j + 2] = vArOld[j + 2] * alpha + avz * beta;
      continue;
    }
    // interior tri-quad
    alpha = 1.0 / (1.0 + count * 0.5 + nbQuad * 0.25);
    beta = alpha * 0.5;
    gamma = alpha * 0.25;
    even[j] = vArOld[j] * alpha + avx * beta + oppx * gamma;
    even[j + 1] = vArOld[j + 1] * alpha + avy * beta + oppy * gamma;
    even[j + 2] = vArOld[j + 2] * alpha + avz * beta + oppz * gamma;
  }
};

/** Odd vertices smoothing */
const applyOddSmooth = function (mesh, odds, colorOut, materialOut, fArOut) {
  const fAr = mesh.getFaces();
  const feAr = mesh.getFaceEdges();
  const oddComputer = new OddVertexComputer(mesh, odds, colorOut, materialOut);
  for (let i = 0, len = mesh.getNbFaces(); i < len; ++i) {
    let id = i * 4;
    const iv1 = fAr[id];
    const iv2 = fAr[id + 1];
    const iv3 = fAr[id + 2];
    const iv4 = fAr[id + 3];
    const isQuad = iv4 !== Utils.TRI_INDEX;
    let ivMid1, ivMid2, ivMid3, ivMid4, ivCen;

    if (isQuad) {
      ivMid1 = oddComputer.computeQuadEdgeVertex(iv1, iv2, iv3, iv4, feAr[id]);
      ivMid2 = oddComputer.computeQuadEdgeVertex(iv2, iv3, iv4, iv1, feAr[id + 1]);
      ivMid3 = oddComputer.computeQuadEdgeVertex(iv3, iv4, iv1, iv2, feAr[id + 2]);
      ivMid4 = oddComputer.computeQuadEdgeVertex(iv4, iv1, iv2, iv3, feAr[id + 3]);
      ivCen = oddComputer.computeFaceVertex(iv1, iv2, iv3, iv4);
    } else {
      ivMid1 = oddComputer.computeTriangleEdgeVertex(iv1, iv2, iv3, feAr[id]);
      ivMid2 = oddComputer.computeTriangleEdgeVertex(iv2, iv3, iv1, feAr[id + 1]);
      ivMid3 = oddComputer.computeTriangleEdgeVertex(iv3, iv1, iv2, feAr[id + 2]);
    }

    if (!fArOut)
      continue;

    id *= 4;
    if (isQuad) {
      fArOut[id + 1] = fArOut[id + 4] = ivMid1;
      fArOut[id + 6] = fArOut[id + 9] = ivMid2;
      fArOut[id + 11] = fArOut[id + 14] = ivMid3;
      fArOut[id + 3] = fArOut[id + 12] = ivMid4;
      fArOut[id + 2] = fArOut[id + 7] = fArOut[id + 8] = fArOut[id + 13] = ivCen;
      fArOut[id] = iv1;
      fArOut[id + 5] = iv2;
      fArOut[id + 10] = iv3;
      fArOut[id + 15] = iv4;
    } else {
      fArOut[id] = fArOut[id + 5] = fArOut[id + 8] = ivMid1;
      fArOut[id + 1] = fArOut[id + 10] = fArOut[id + 12] = ivMid2;
      fArOut[id + 2] = fArOut[id + 6] = fArOut[id + 14] = ivMid3;
      fArOut[id + 3] = fArOut[id + 7] = fArOut[id + 11] = fArOut[id + 15] = Utils.TRI_INDEX;
      fArOut[id + 4] = iv1;
      fArOut[id + 9] = iv2;
      fArOut[id + 13] = iv3;
    }
  }
  return oddComputer._tagEdges;
};

/** Computes uv faces and uv coordinates for center vertices */
const computeFaceTexCoords = function (mesh, newMesh, tagEdges) {
  const fArUVOld = mesh.getFacesTexCoord();
  const fAr = newMesh.getFaces();
  const fArUV = new Uint32Array(fAr.length);
  const feAr = mesh.getFaceEdges();

  const nbVertices = mesh.getNbVertices();
  const offset = newMesh.getNbVertices() - nbVertices;

  const startCount = newMesh.getVerticesDuplicateStartCount();
  const uvAr = newMesh.getTexCoords();
  for (let i = 0, len = mesh.getNbFaces(); i < len; ++i) {
    let id = i * 4;
    let iuv1 = fArUVOld[id];
    let iuv2 = fArUVOld[id + 1];
    let iuv3 = fArUVOld[id + 2];
    let iuv4 = fArUVOld[id + 3];
    if (iuv1 >= nbVertices) iuv1 += offset;
    if (iuv2 >= nbVertices) iuv2 += offset;
    if (iuv3 >= nbVertices) iuv3 += offset;
    if (iuv4 !== Utils.TRI_INDEX && iuv4 >= nbVertices) iuv4 += offset;

    let ide = feAr[id];
    let tg1 = tagEdges[ide] - 1;
    if (tg1 < 0)
      tg1 = startCount[(-tg1 - 1) * 2];
    else if (startCount[tg1 * 2] > 0)
      tagEdges[ide] = -tg1;

    ide = feAr[id + 1];
    let tg2 = tagEdges[ide] - 1;
    if (tg2 < 0)
      tg2 = startCount[(-tg2 - 1) * 2];
    else if (startCount[tg2 * 2] > 0)
      tagEdges[ide] = -tg2;

    ide = feAr[id + 2];
    let tg3 = tagEdges[ide] - 1;
    if (tg3 < 0)
      tg3 = startCount[(-tg3 - 1) * 2];
    else if (startCount[tg3 * 2] > 0)
      tagEdges[ide] = -tg3;

    id *= 4;
    if (iuv4 !== Utils.TRI_INDEX) {
      ide = feAr[i * 4 + 3];
      let tg4 = tagEdges[ide] - 1;
      if (tg4 < 0)
        tg4 = startCount[(-tg4 - 1) * 2];
      else if (startCount[tg4 * 2] > 0)
        tagEdges[ide] = -tg4;

      fArUV[id + 1] = fArUV[id + 4] = tg1;
      fArUV[id + 6] = fArUV[id + 9] = tg2;
      fArUV[id + 11] = fArUV[id + 14] = tg3;
      fArUV[id + 3] = fArUV[id + 12] = tg4;
      fArUV[id + 2] = fArUV[id + 7] = fArUV[id + 8] = fArUV[id + 13] = fAr[id + 2];
      fArUV[id] = iuv1;
      fArUV[id + 5] = iuv2;
      fArUV[id + 10] = iuv3;
      fArUV[id + 15] = iuv4;

      // even averaging for center quad
      const im = fAr[id + 2] * 2;
      uvAr[im] = (uvAr[iuv1 * 2] + uvAr[iuv2 * 2] + uvAr[iuv3 * 2] + uvAr[iuv4 * 2]) * 0.25;
      uvAr[im + 1] = (uvAr[iuv1 * 2 + 1] + uvAr[iuv2 * 2 + 1] + uvAr[iuv3 * 2 + 1] + uvAr[iuv4 * 2 + 1]) * 0.25;
    } else {
      fArUV[id] = fArUV[id + 5] = fArUV[id + 8] = tg1;
      fArUV[id + 1] = fArUV[id + 10] = fArUV[id + 12] = tg2;
      fArUV[id + 2] = fArUV[id + 6] = fArUV[id + 14] = tg3;
      fArUV[id + 3] = fArUV[id + 7] = fArUV[id + 11] = fArUV[id + 15] = Utils.TRI_INDEX;
      fArUV[id + 4] = iuv1;
      fArUV[id + 9] = iuv2;
      fArUV[id + 13] = iuv3;
    }
  }

  newMesh.setFacesTexCoord(fArUV);
};

/** Subdivide tex coords mesh */
const computeTexCoords = function (mesh, newMesh, tagEdges) {
  const newNbVertices = newMesh.getNbVertices();
  const startCount = new Uint32Array(newNbVertices * 2);
  startCount.set(mesh.getVerticesDuplicateStartCount());

  const fArOld = mesh.getFaces();
  const fArUVOld = mesh.getFacesTexCoord();

  const bound = newMesh.getNbFaces() * 3;
  const uvArOld = mesh.getTexCoords();
  const uvAr = new Float32Array(Utils.getMemory(bound * 4 * 2), 0, bound * 2);

  let i = 0;
  let len = mesh.getNbVertices();
  const offset = newNbVertices - len;
  // reorder even duplicates vertex indices
  for (i = 0; i < len; ++i) {
    const start = startCount[i * 2];
    if (start > 0)
      startCount[i * 2] = start + offset;
  }
  uvAr.set(uvArOld);
  uvAr.set(uvArOld.subarray(len * 2), (len + offset) * 2);
  const nbTexCoords = mesh.getNbTexCoords();

  let acc = offset + nbTexCoords;
  const feAr = mesh.getFaceEdges();

  // compute uv for new odd vertices
  const tagUVMin = new Uint32Array(tagEdges.length);
  const tagUVMax = new Uint32Array(tagEdges.length);
  len = fArOld.length;
  for (i = 0; i < len; ++i) {
    const ide = feAr[i];
    if (ide === Utils.TRI_INDEX)
      continue;

    const iNext = (i + 1) % 4 === 0 ? i - 3 : i + 1;
    const iuv1 = fArUVOld[i];
    let iuv2 = fArUVOld[iNext];
    if (iuv2 === Utils.TRI_INDEX)
      iuv2 = fArUVOld[i - 2];
    const tg = tagEdges[ide] - 1;

    // test if we already processed this edge
    const tgMax = tagUVMax[ide];
    const iuvMax = iuv1 > iuv2 ? iuv1 : iuv2;
    const iuvMin = iuv1 < iuv2 ? iuv1 : iuv2;
    if (tgMax !== 0) {
      // test if we already processed this UV edge or if it's a duplicate
      if (tgMax !== iuvMax || tagUVMin[ide] !== iuvMin) {
        uvAr[acc * 2] = (uvArOld[iuv1 * 2] + uvArOld[iuv2 * 2]) * 0.5;
        uvAr[acc * 2 + 1] = (uvArOld[iuv1 * 2 + 1] + uvArOld[iuv2 * 2 + 1]) * 0.5;
        startCount[tg * 2] = acc++;
        startCount[tg * 2 + 1] = 1;
      }
    } else {
      // first time we process this edge
      uvAr[tg * 2] = (uvArOld[iuv1 * 2] + uvArOld[iuv2 * 2]) * 0.5;
      uvAr[tg * 2 + 1] = (uvArOld[iuv1 * 2 + 1] + uvArOld[iuv2 * 2 + 1]) * 0.5;
      tagUVMin[ide] = iuvMin;
      tagUVMax[ide] = iuvMax;
    }
  }
  const texCoords = new Float32Array(acc * 2);
  texCoords.set(uvAr.subarray(0, acc * 2));

  newMesh.setTexCoords(texCoords);
  newMesh.setVerticesDuplicateStartCount(startCount);

  computeFaceTexCoords(mesh, newMesh, tagEdges);
};

/** Apply a complete subdivision (by updating the topology) */
Subdivision.fullSubdivision = function (baseMesh, newMesh) {
  const nbVertices = baseMesh.getNbVertices() + baseMesh.getNbEdges() + baseMesh.getNbQuads();
  newMesh.setVertices(new Float32Array(nbVertices * 3));
  newMesh.setColors(new Float32Array(nbVertices * 3));
  newMesh.setMaterials(new Float32Array(nbVertices * 3));
  newMesh.setFaces(new Uint32Array(baseMesh.getNbFaces() * 4 * 4));
  applyEvenSmooth(baseMesh, newMesh.getVertices(), newMesh.getColors(), newMesh.getMaterials());
  const tags = applyOddSmooth(baseMesh, newMesh.getVertices(), newMesh.getColors(), newMesh.getMaterials(), newMesh.getFaces());
  if (baseMesh.hasUV())
    computeTexCoords(baseMesh, newMesh, tags);
  newMesh.allocateArrays();
};

/** Apply subdivision without topology computation */
Subdivision.partialSubdivision = function (baseMesh, vertOut, colorOut, materialOut) {
  applyEvenSmooth(baseMesh, vertOut, colorOut, materialOut);
  applyOddSmooth(baseMesh, vertOut, colorOut, materialOut);
};

export default Subdivision;
