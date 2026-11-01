import Utils from '../misc/Utils';
import MeshStatic from '../mesh/meshStatic/MeshStatic';
import Mesh from '../mesh/Mesh';

const Edge = function (v1, v2) {
  this.previous = null;
  this.next = null;
  this.v1 = v1;
  this.v2 = v2;
};

const detectHole = function (borderEdges) {
  if (borderEdges.length <= 2)
    return;
  let nbEdges = borderEdges.length;
  const iEnd = borderEdges[0].v1;
  let iLast = borderEdges[0].v2;
  const first = borderEdges[0];
  let last = first;

  borderEdges[0] = borderEdges[--nbEdges];
  let i = 0;
  while (i < nbEdges) {
    const testEdge = borderEdges[i];
    if (testEdge.v1 === iLast) {
      testEdge.previous = last;
      last.next = testEdge;
      last = testEdge;
      iLast = borderEdges[i].v2;
      borderEdges[i] = borderEdges[--nbEdges];
      if (iLast === iEnd)
        break;
      i = 0;
    } else
      i++;
  }
  borderEdges.length = nbEdges;
  if (iLast !== iEnd)
    return;
  first.previous = last;
  last.next = first;
  return first;
};

const detectHoles = function (mesh) {
  const eAr = mesh.getEdges();
  const fAr = mesh.getFaces();
  const feAr = mesh.getFaceEdges();
  const borderEdges = [];
  for (let i = 0, len = mesh.getNbFaces(); i < len; ++i) {
    const id = i * 4;
    const iv4 = feAr[id + 3];
    const isQuad = iv4 !== Utils.TRI_INDEX;
    if (eAr[feAr[id]] === 1) borderEdges.push(new Edge(fAr[id], fAr[id + 1]));
    if (eAr[feAr[id + 1]] === 1) borderEdges.push(new Edge(fAr[id + 1], fAr[id + 2]));
    if (eAr[feAr[id + 2]] === 1) borderEdges.push(new Edge(fAr[id + 2], fAr[isQuad ? id + 3 : id]));
    if (isQuad && eAr[iv4] === 1) borderEdges.push(new Edge(fAr[id + 3], fAr[id]));
  }

  const holes = [];
  while (true) {
    const firstEdge = detectHole(borderEdges);
    if (!firstEdge) break;
    holes.push(firstEdge);
  }
  return holes;
};

const advancingFrontMesh = function (mesh, firstEdge, newTris, newVerts, newColors, newMaterials) {
  const vAr = mesh.getVertices();
  const cAr = mesh.getColors();
  const mAr = mesh.getMaterials();
  // var current = firstEdge;
  // var count = 1;
  // while (current.next !== firstEdge) {
  //   current = current.next;
  //   count++;
  // }
  // console.log(count)

  // TODO : stupid naive hole filling for now
  const last = mesh.getNbVertices() + newVerts.length / 3;
  let current = firstEdge;
  let avx = 0.0;
  let avy = 0.0;
  let avz = 0.0;

  let colr = 0.0;
  let colg = 0.0;
  let colb = 0.0;

  let mat1 = 0.0;
  let mat2 = 0.0;
  let mat3 = 0.0;
  let count = 0;
  do {
    const next = current.next;
    let iv1 = current.v1;
    let iv2 = current.v2;
    let iv3 = next.v2;

    newTris.push(iv1, iv2, last, Utils.TRI_INDEX);
    iv1 *= 3;
    iv2 *= 3;
    iv3 *= 3;
    count++;
    avx += vAr[iv1];
    avy += vAr[iv1 + 1];
    avz += vAr[iv1 + 2];

    colr += cAr[iv1];
    colg += cAr[iv1 + 1];
    colb += cAr[iv1 + 2];

    mat1 += mAr[iv1];
    mat2 += mAr[iv1 + 1];
    mat3 += mAr[iv1 + 2];

    const v2x = vAr[iv2];
    const v2y = vAr[iv2 + 1];
    const v2z = vAr[iv2 + 2];
    // compute normals
    const ax = vAr[iv1] - v2x;
    const ay = vAr[iv1 + 1] - v2y;
    const az = vAr[iv1 + 2] - v2z;
    const bx = vAr[iv3] - v2x;
    const by = vAr[iv3 + 1] - v2y;
    const bz = vAr[iv3 + 2] - v2z;
    const alen = ax * ax + ay * ay + az * az;
    const blen = bx * bx + by * by + bz * bz;
    current.angle = Math.acos((ax * bx + ay * by + az * bz) / Math.sqrt(alen * blen));
    current = next;
  } while (current !== firstEdge);

  newVerts.push(avx / count, avy / count, avz / count);
  newColors.push(colr / count, colg / count, colb / count);
  newMaterials.push(mat1 / count, mat2 / count, mat3 / count);
};

const createMesh = function (mesh, vertices, faces, colors, materials) {
  const newMesh = new MeshStatic();
  newMesh.setID(mesh.getID());
  newMesh.setVertices(vertices);
  if (colors) newMesh.setColors(colors);
  if (materials) newMesh.setMaterials(materials);
  newMesh.setFaces(faces);

  // small hack
  newMesh.setTransformData(mesh.getTransformData());
  newMesh.setRenderData(mesh.getRenderData());

  Mesh.OPTIMIZE = false;
  newMesh.init();
  Mesh.OPTIMIZE = true;

  return newMesh;
};

const closeHoles = function (mesh) {
  const holes = detectHoles(mesh);
  if (holes.length === 0)
    return mesh;

  const newFaces = [];
  const newVerts = [];
  const newColors = [];
  const newMaterials = [];
  // console.time('closeHoles');
  for (let i = 0, nbHoles = holes.length; i < nbHoles; ++i)
    advancingFrontMesh(mesh, holes[i], newFaces, newVerts, newColors, newMaterials);
  // console.timeEnd('closeHoles');

  const oldVertsLen = mesh.getNbVertices() * 3;
  const newVertsLen = oldVertsLen + newVerts.length;

  // set vertices
  const vertices = new Float32Array(newVertsLen);
  vertices.set(mesh.getVertices().subarray(0, oldVertsLen));
  // set colors
  const colors = new Float32Array(newVertsLen);
  colors.set(mesh.getColors().subarray(0, oldVertsLen));
  // set materials
  const materials = new Float32Array(newVertsLen);
  materials.set(mesh.getMaterials().subarray(0, oldVertsLen));

  if (newVertsLen > oldVertsLen) {
    vertices.set(newVerts, oldVertsLen);
    colors.set(newColors, oldVertsLen);
    materials.set(newMaterials, oldVertsLen);
  }

  // set faces
  const faces = new Uint32Array(mesh.getNbFaces() * 4 + newFaces.length);
  faces.set(mesh.getFaces());
  if (newFaces.length > 0)
    faces.set(newFaces, mesh.getNbFaces() * 4);

  return createMesh(mesh, vertices, faces, colors, materials);
};

const HoleFilling = {};

HoleFilling.createClosedMesh = function (mesh) {
  let closed = closeHoles(mesh);
  if (closed === mesh) {
    const lenv = mesh.getNbVertices() * 3;
    const lenf = mesh.getNbFaces() * 4;
    const faces = new Uint32Array(mesh.getFaces().subarray(0, lenf));
    const vertices = new Float32Array(mesh.getVertices().subarray(0, lenv));
    const colors = new Float32Array(mesh.getColors().subarray(0, lenv));
    const materials = new Float32Array(mesh.getMaterials().subarray(0, lenv));
    closed = createMesh(mesh, vertices, faces, colors, materials);
  }
  return closed;
};

export default HoleFilling;
