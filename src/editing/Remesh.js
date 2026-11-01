import { vec3, mat4 } from 'gl-matrix';
import HoleFilling from './HoleFilling';
import SurfaceNets from './SurfaceNets';
import MarchingCubes from './MarchingCubes';
import Geometry from '../math3d/Geometry';
import MeshStatic from '../mesh/meshStatic/MeshStatic';
import Utils from '../misc/Utils';
import Enums from '../misc/Enums';
import Smooth from './tools/Smooth';

const Remesh = {};
Remesh.RESOLUTION = 150;
Remesh.BLOCK = false;
Remesh.SMOOTHING = true;

const floodFill = function (voxels) {
  const step = voxels.step;
  const res = voxels.dims;
  const rx = res[0];
  const ry = res[1];
  const rxy = rx * ry;

  const crossedEdges = voxels.crossedEdges;
  const distField = voxels.distanceField;
  const datalen = distField.length;
  const tagCell = new Uint8Array(datalen); // 0 interior, 1 exterior
  const stack = new Int32Array(datalen);

  stack[0] = 0;
  let curStack = 1;

  const dirs = [-1, 1, -rx, rx, -rxy, rxy];
  const dirsEdge = [0, 0, 1, 1, 2, 2];
  const nbDir = dirs.length;
  let i = 0;
  let idNext = 0;

  while (curStack > 0) {
    const cell = stack[--curStack];
    const cellDist = distField[cell];
    if (cellDist < step) {
      // border hit
      for (i = 0; i < nbDir; ++i) {
        const off = dirs[i];
        idNext = cell + off;
        if (idNext >= datalen || idNext < 0) continue; // range check
        if (tagCell[idNext] === 1) continue; // check if already tagged as exterior
        if (distField[idNext] === Infinity) continue; // check if we are in the far exterior zone
        if (crossedEdges[(off >= 0 ? cell : idNext) * 3 + dirsEdge[i]] === 0) {
          tagCell[idNext] = 1;
          stack[curStack++] = idNext;
        }
      }
    } else {
      // exterior
      for (i = 0; i < nbDir; ++i) {
        idNext = cell + dirs[i];
        if (idNext >= datalen || idNext < 0) continue; // range check
        if (tagCell[idNext] === 1) continue; // check if already tagged as exterior
        tagCell[idNext] = 1;
        stack[curStack++] = idNext;
      }
    }
  }

  for (let id = 0; id < datalen; ++id) {
    if (distField[id] === 0) console.log('hit');
    if (tagCell[id] === 0)
      distField[id] = -distField[id];
  }
};

const voxelize = function (mesh, voxels) {
  const min = voxels.min;
  const step = voxels.step;
  const dims = voxels.dims;
  const invStep = 1.0 / step;

  const vminx = min[0];
  const vminy = min[1];
  const vminz = min[2];

  const rx = dims[0];
  const ry = dims[1];
  const rxy = rx * ry;
  const distField = voxels.distanceField;
  const crossedEdges = voxels.crossedEdges;
  const colors = voxels.colorField;
  const materials = voxels.materialField;

  const iAr = mesh.getTriangles();
  const vAr = mesh.getVertices();
  const cAr = mesh.getColors();
  const mAr = mesh.getMaterials();
  const nbTriangles = mesh.getNbTriangles();

  const v1 = [0.0, 0.0, 0.0];
  const v2 = [0.0, 0.0, 0.0];
  const v3 = [0.0, 0.0, 0.0];
  const triEdge1 = [0.0, 0.0, 0.0];
  const triEdge2 = [0.0, 0.0, 0.0];
  const point = [0.0, 0.0, 0.0];
  const closest = [0.0, 0.0, 0.0, 0];
  const dirUnit = [
    [1.0, 0.0, 0.0],
    [0.0, 1.0, 0.0],
    [0.0, 0.0, 1.0]
  ];

  const inv3 = 1 / 3;
  for (let iTri = 0; iTri < nbTriangles; ++iTri) {
    const idTri = iTri * 3;

    const iv1 = iAr[idTri] * 3;
    const iv2 = iAr[idTri + 1] * 3;
    const iv3 = iAr[idTri + 2] * 3;

    const v1x = v1[0] = vAr[iv1];
    const v1y = v1[1] = vAr[iv1 + 1];
    const v1z = v1[2] = vAr[iv1 + 2];
    const v2x = v2[0] = vAr[iv2];
    const v2y = v2[1] = vAr[iv2 + 1];
    const v2z = v2[2] = vAr[iv2 + 2];
    const v3x = v3[0] = vAr[iv3];
    const v3y = v3[1] = vAr[iv3 + 1];
    const v3z = v3[2] = vAr[iv3 + 2];

    const c1x = (cAr[iv1] + cAr[iv2] + cAr[iv3]) * inv3;
    const c1y = (cAr[iv1 + 1] + cAr[iv2 + 1] + cAr[iv3 + 1]) * inv3;
    const c1z = (cAr[iv1 + 2] + cAr[iv2 + 2] + cAr[iv3 + 2]) * inv3;
    const m1x = (mAr[iv1] + mAr[iv2] + mAr[iv3]) * inv3;
    const m1y = (mAr[iv1 + 1] + mAr[iv2 + 1] + mAr[iv3 + 1]) * inv3;
    const m1z = (mAr[iv1 + 2] + mAr[iv2 + 2] + mAr[iv3 + 2]) * inv3;

    // bounding box recomputation (we already have the bbox of the quad but
    // not of the triangles...)
    const xmin = v1x < v2x ? v1x < v3x ? v1x : v3x : v2x < v3x ? v2x : v3x;
    const xmax = v1x > v2x ? v1x > v3x ? v1x : v3x : v2x > v3x ? v2x : v3x;
    const ymin = v1y < v2y ? v1y < v3y ? v1y : v3y : v2y < v3y ? v2y : v3y;
    const ymax = v1y > v2y ? v1y > v3y ? v1y : v3y : v2y > v3y ? v2y : v3y;
    const zmin = v1z < v2z ? v1z < v3z ? v1z : v3z : v2z < v3z ? v2z : v3z;
    const zmax = v1z > v2z ? v1z > v3z ? v1z : v3z : v2z > v3z ? v2z : v3z;

    // cache what can be cached for faster ray-tri and point-tri tests
    // basically edge stuffs
    const e1x = triEdge1[0] = v2x - v1x;
    const e1y = triEdge1[1] = v2y - v1y;
    const e1z = triEdge1[2] = v2z - v1z;
    const e2x = triEdge2[0] = v3x - v1x;
    const e2y = triEdge2[1] = v3y - v1y;
    const e2z = triEdge2[2] = v3z - v1z;
    const a00 = e1x * e1x + e1y * e1y + e1z * e1z;
    const a01 = e1x * e2x + e1y * e2y + e1z * e2z;
    const a11 = e2x * e2x + e2y * e2y + e2z * e2z;

    const snapMinx = Math.floor((xmin - vminx) * invStep);
    const snapMiny = Math.floor((ymin - vminy) * invStep);
    const snapMinz = Math.floor((zmin - vminz) * invStep);

    const snapMaxx = Math.ceil((xmax - vminx) * invStep);
    const snapMaxy = Math.ceil((ymax - vminy) * invStep);
    const snapMaxz = Math.ceil((zmax - vminz) * invStep);

    for (let k = snapMinz; k <= snapMaxz; ++k) {
      for (let j = snapMiny; j <= snapMaxy; ++j) {
        for (let i = snapMinx; i <= snapMaxx; ++i) {
          const x = vminx + i * step;
          const y = vminy + j * step;
          const z = vminz + k * step;
          const n = i + j * rx + k * rxy;

          point[0] = x;
          point[1] = y;
          point[2] = z;
          let newDist = Geometry.distance2PointTriangleEdges(point, triEdge1, triEdge2, v1, a00, a01, a11, closest);
          newDist = Math.sqrt(newDist);
          if (newDist < distField[n]) {
            distField[n] = newDist;
            const n3 = n * 3;
            colors[n3] = c1x;
            colors[n3 + 1] = c1y;
            colors[n3 + 2] = c1z;
            materials[n3] = m1x;
            materials[n3 + 1] = m1y;
            materials[n3 + 2] = m1z;
          }

          if (newDist > step)
            continue;

          for (let it = 0; it < 3; ++it) {
            const val = closest[it] - point[it];
            if (val < 0.0 || val > step)
              continue;

            const idEdge = n * 3 + it;
            if (crossedEdges[idEdge] === 1)
              continue;

            const dist = Geometry.intersectionRayTriangleEdges(point, dirUnit[it], triEdge1, triEdge2, v1);
            if (dist < 0.0 || dist > step)
              continue;

            crossedEdges[idEdge] = 1;
          }

        }
      }
    }
  }
};

// grid structure
const createVoxelData = function (box) {
  const step = Math.max((box[3] - box[0]), (box[4] - box[1]), (box[5] - box[2])) / Remesh.RESOLUTION;
  const stepMin = step * 1.51;
  const stepMax = step * 1.51;
  const min = [box[0] - stepMin, box[1] - stepMin, box[2] - stepMin];
  const max = [box[3] + stepMax, box[4] + stepMax, box[5] + stepMax];

  const rx = Math.ceil((max[0] - min[0]) / step);
  const ry = Math.ceil((max[1] - min[1]) / step);
  const rz = Math.ceil((max[2] - min[2]) / step);

  const datalen = rx * ry * rz;
  const buffer = Utils.getMemory((4 * (1 + 3 + 3) + 3) * datalen);
  const distField = new Float32Array(buffer, 0, datalen);
  const colors = new Float32Array(buffer, 4 * datalen, datalen * 3);
  const materials = new Float32Array(buffer, 16 * datalen, datalen * 3);
  const crossedEdges = new Uint8Array(buffer, 28 * datalen, datalen * 3);

  // Initialize data
  for (let idf = 0; idf < datalen; ++idf)
    distField[idf] = Infinity;

  for (let ide = 0, datalene = datalen * 3; ide < datalene; ++ide)
    crossedEdges[ide] = 0;

  for (let idc = 0, datalenc = datalen * 3; idc < datalenc; ++idc)
    colors[idc] = materials[idc] = -1;

  const voxels = {};
  voxels.dims = [rx, ry, rz];
  voxels.step = step;
  voxels.min = min;
  voxels.max = max;
  voxels.crossedEdges = crossedEdges;
  voxels.distanceField = distField;
  voxels.colorField = colors;
  voxels.materialField = materials;
  return voxels;
};

const createMesh = function (mesh, faces, vertices, colors, materials) {
  const newMesh = new MeshStatic(mesh.getGL());
  newMesh.setID(mesh.getID());
  newMesh.setFaces(faces);
  newMesh.setVertices(vertices);
  if (colors) newMesh.setColors(colors);
  if (materials) newMesh.setMaterials(materials);
  newMesh.setRenderData(mesh.getRenderData());
  newMesh.init();
  newMesh.initRender();
  return newMesh;
};

// hole filling + transform to world + ComputeBox
const prepareMeshes = function (meshes) {
  const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  const tmp = [0.0, 0.0, 0.0];
  for (let i = 0, nbm = meshes.length; i < nbm; ++i) {
    let mesh = meshes[i];
    if (mesh.isUsingTexCoords())
      mesh.setShaderType(Enums.Shader.MATCAP);
    const matrix = mesh.getMatrix();

    mesh = meshes[i] = HoleFilling.createClosedMesh(mesh);
    const vAr = mesh.getVertices();
    for (let j = 0, nbv = mesh.getNbVertices(); j < nbv; ++j) {
      const id = j * 3;
      tmp[0] = vAr[id];
      tmp[1] = vAr[id + 1];
      tmp[2] = vAr[id + 2];
      vec3.transformMat4(tmp, tmp, matrix);
      const x = vAr[id] = tmp[0];
      const y = vAr[id + 1] = tmp[1];
      const z = vAr[id + 2] = tmp[2];
      if (x < box[0]) box[0] = x;
      if (y < box[1]) box[1] = y;
      if (z < box[2]) box[2] = z;
      if (x > box[3]) box[3] = x;
      if (y > box[4]) box[4] = y;
      if (z > box[5]) box[5] = z;
    }
  }
  return box;
};

const alignMeshBound = function (mesh, box) {
  const oldMin = [box[0], box[1], box[2]];
  const oldMax = [box[3], box[4], box[5]];
  const oldRadius = vec3.dist(oldMin, oldMax);
  const oldCenter = vec3.add([], oldMin, oldMax);
  vec3.scale(oldCenter, oldCenter, 0.5);

  const newBox = mesh.getLocalBound();
  const newMin = [newBox[0], newBox[1], newBox[2]];
  const newMax = [newBox[3], newBox[4], newBox[5]];
  const newRadius = vec3.dist(newMin, newMax);
  const newCenter = vec3.add([], newMin, newMax);
  vec3.scale(newCenter, newCenter, 0.5);

  const scale = oldRadius / newRadius;
  const tr = vec3.scale([], oldCenter, 1.0 / scale);
  vec3.sub(tr, tr, newCenter);

  const mat = mesh.getMatrix();
  mat4.identity(mat);
  mat4.scale(mat, mat, [scale, scale, scale]);
  mat4.translate(mat, mat, tr);
};

const tangentialSmoothing = function (mesh) {
  const nbVertices = mesh.getNbVertices();
  const indices = new Uint32Array(nbVertices);
  for (let i = 0; i < nbVertices; ++i) indices[i] = i;

  const smo = new Smooth();
  smo.setToolMesh(mesh);
  smo.smoothTangent(indices, 1.0);
  mesh.updateGeometry();
  mesh.updateGeometryBuffers();
};

Remesh.remesh = function (meshes, baseMesh, manifold) {
  console.time('remesh total');

  console.time('1. prepareMeshes');
  meshes = meshes.slice();
  const box = prepareMeshes(meshes);
  console.timeEnd('1. prepareMeshes');

  console.time('2. voxelization');
  const voxels = createVoxelData(box);
  for (let i = 0, l = meshes.length; i < l; ++i)
    voxelize(meshes[i], voxels);
  console.timeEnd('2. voxelization');

  console.time('3. flood');
  floodFill(voxels);
  console.timeEnd('3. flood');

  let res;
  if (manifold) {
    console.time('4. marchingCubes');
    MarchingCubes.BLOCK = Remesh.BLOCK;
    res = MarchingCubes.computeSurface(voxels);
    console.timeEnd('4. marchingCubes');
  } else {
    console.time('4. surfaceNets');
    SurfaceNets.BLOCK = Remesh.BLOCK;
    res = SurfaceNets.computeSurface(voxels);
    console.timeEnd('4. surfaceNets');
  }

  console.time('5. createMesh');
  const nmesh = createMesh(baseMesh, res.faces, res.vertices, res.colors, res.materials);
  console.timeEnd('5. createMesh');

  alignMeshBound(nmesh, box);

  if (manifold && Remesh.SMOOTHING) {
    console.time('6. tangential smoothing');
    tangentialSmoothing(nmesh);
    console.timeEnd('6. tangential smoothing');
  }

  console.timeEnd('remesh total');
  console.log('\n');
  return nmesh;
};

Remesh.mergeArrays = function (meshes, arr) {
  let nbVertices = 0;
  let nbFaces = 0;
  let nbQuads = 0;
  let nbTriangles = 0;
  let i, j;

  const nbMeshes = meshes.length;
  let k = 0;
  for (i = 0; i < nbMeshes; ++i) {
    nbVertices += meshes[i].getNbVertices();
    nbFaces += meshes[i].getNbFaces();
    nbQuads += meshes[i].getNbQuads();
    nbTriangles += meshes[i].getNbTriangles();
  }

  arr.nbVertices = nbVertices;
  arr.nbFaces = nbFaces;
  arr.nbQuads = nbQuads;
  arr.nbTriangles = nbTriangles;

  const vAr = arr.vertices = arr.vertices !== undefined ? new Float32Array(nbVertices * 3) : null;
  const cAr = arr.colors = arr.colors !== undefined ? new Float32Array(nbVertices * 3) : null;
  const mAr = arr.materials = arr.materials !== undefined ? new Float32Array(nbVertices * 3) : null;
  const fAr = arr.faces = arr.faces !== undefined ? new Uint32Array(nbFaces * 4) : null;
  const iAr = arr.triangles = arr.triangles !== undefined ? new Uint32Array(nbTriangles * 3) : null;

  const ver = [0.0, 0.0, 0.0];
  let offsetVerts = 0;
  let offsetFaces = 0;
  let offsetTris = 0;
  let offsetIndex = 0;
  for (i = 0; i < nbMeshes; ++i) {
    const mesh = meshes[i];
    const mVerts = mesh.getVertices();
    const mCols = mesh.getColors();
    const mMats = mesh.getMaterials();
    const mFaces = mesh.getFaces();
    const mTris = mesh.getTriangles();

    const mNbVertices = mesh.getNbVertices();
    const mNbFaces = mesh.getNbFaces();
    const mNbTriangles = mesh.getNbTriangles();
    const matrix = mesh.getMatrix();

    for (j = 0; j < mNbVertices; ++j) {
      k = j * 3;
      ver[0] = mVerts[k];
      ver[1] = mVerts[k + 1];
      ver[2] = mVerts[k + 2];
      vec3.transformMat4(ver, ver, matrix);
      vAr[offsetVerts + k] = ver[0];
      vAr[offsetVerts + k + 1] = ver[1];
      vAr[offsetVerts + k + 2] = ver[2];
      if (cAr) {
        cAr[offsetVerts + k] = mCols[k];
        cAr[offsetVerts + k + 1] = mCols[k + 1];
        cAr[offsetVerts + k + 2] = mCols[k + 2];
      }
      if (mAr) {
        mAr[offsetVerts + k] = mMats[k];
        mAr[offsetVerts + k + 1] = mMats[k + 1];
        mAr[offsetVerts + k + 2] = mMats[k + 2];
      }
    }

    offsetVerts += mNbVertices * 3;
    if (fAr) {
      for (j = 0; j < mNbFaces; ++j) {
        k = j * 4;
        fAr[offsetFaces + k] = mFaces[k] + offsetIndex;
        fAr[offsetFaces + k + 1] = mFaces[k + 1] + offsetIndex;
        fAr[offsetFaces + k + 2] = mFaces[k + 2] + offsetIndex;
        fAr[offsetFaces + k + 3] = mFaces[k + 3] === Utils.TRI_INDEX ? Utils.TRI_INDEX : mFaces[k + 3] + offsetIndex;
      }
    }

    if (iAr) {
      for (j = 0; j < mNbTriangles; ++j) {
        k = j * 3;
        iAr[offsetTris + k] = mTris[k] + offsetIndex;
        iAr[offsetTris + k + 1] = mTris[k + 1] + offsetIndex;
        iAr[offsetTris + k + 2] = mTris[k + 2] + offsetIndex;
      }
    }

    offsetIndex += mNbVertices;
    offsetFaces += mNbFaces * 4;
    offsetTris += mNbTriangles * 3;
  }

  return arr;
};

Remesh.mergeMeshes = function (meshes, baseMesh) {
  const arr = { vertices: null, colors: null, materials: null, faces: null };
  Remesh.mergeArrays(meshes, arr);
  return createMesh(baseMesh, arr.faces, arr.vertices, arr.colors, arr.materials);
};

export default Remesh;
