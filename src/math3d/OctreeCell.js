class OctreeCell {

  constructor(parent) {
    this._parent = parent ? parent : null; // parent
    this._depth = parent ? parent._depth + 1 : 0; // depth of current node
    this._children = []; // children

    // extended boundary for intersect test
    this._aabbLoose = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];

    // boundary in order to store exactly the face according to their center
    this._aabbSplit = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    this._iFaces = []; // faces (if cell is a leaf)

    this._flag = 0; // to track deleted cell
  }

  resetNbFaces(nbFaces) {
    const facesAll = this._iFaces;
    facesAll.length = nbFaces;
    for (let i = 0; i < nbFaces; ++i)
      facesAll[i] = i;
  }

  /** Subdivide octree, aabbSplit must be already set, and aabbLoose will be expanded if it's a leaf  */
  build(mesh) {
    let i = 0;

    const stack = OctreeCell.STACK;
    stack[0] = this;
    let curStack = 1;
    const leaves = [];
    while (curStack > 0) {
      const cell = stack[--curStack];
      const nbFaces = cell._iFaces.length;
      if (nbFaces > OctreeCell.MAX_FACES && cell._depth < OctreeCell.MAX_DEPTH) {
        cell.constructChildren(mesh);
        const children = cell._children;
        for (i = 0; i < 8; ++i)
          stack[curStack + i] = children[i];
        curStack += 8;
      } else if (nbFaces > 0) {
        leaves.push(cell);
      }
    }

    const nbLeaves = leaves.length;
    for (i = 0; i < nbLeaves; ++i)
      leaves[i].constructLeaf(mesh);
  }

  /** Construct the leaf  */
  constructLeaf(mesh) {
    const iFaces = this._iFaces;
    const nbFaces = iFaces.length;
    let bxmin = Infinity;
    let bymin = Infinity;
    let bzmin = Infinity;
    let bxmax = -Infinity;
    let bymax = -Infinity;
    let bzmax = -Infinity;
    const faceBoxes = mesh.getFaceBoxes();
    const facePosInLeaf = mesh.getFacePosInLeaf();
    const faceLeaf = mesh.getFaceLeaf();
    for (let i = 0; i < nbFaces; ++i) {
      let id = iFaces[i];
      faceLeaf[id] = this;
      facePosInLeaf[id] = i;
      id *= 6;
      const xmin = faceBoxes[id];
      const ymin = faceBoxes[id + 1];
      const zmin = faceBoxes[id + 2];
      const xmax = faceBoxes[id + 3];
      const ymax = faceBoxes[id + 4];
      const zmax = faceBoxes[id + 5];
      if (xmin < bxmin) bxmin = xmin;
      if (xmax > bxmax) bxmax = xmax;
      if (ymin < bymin) bymin = ymin;
      if (ymax > bymax) bymax = ymax;
      if (zmin < bzmin) bzmin = zmin;
      if (zmax > bzmax) bzmax = zmax;
    }
    this.expandsAabbLoose(bxmin, bymin, bzmin, bxmax, bymax, bzmax);
  }

  /** Construct sub cells of the octree */
  constructChildren(mesh) {
    const split = this._aabbSplit;
    const xmin = split[0];
    const ymin = split[1];
    const zmin = split[2];
    const xmax = split[3];
    const ymax = split[4];
    const zmax = split[5];
    const dX = (xmax - xmin) * 0.5;
    const dY = (ymax - ymin) * 0.5;
    const dZ = (zmax - zmin) * 0.5;
    const xcen = (xmax + xmin) * 0.5;
    const ycen = (ymax + ymin) * 0.5;
    const zcen = (zmax + zmin) * 0.5;

    const child0 = new OctreeCell(this);
    const child1 = new OctreeCell(this);
    const child2 = new OctreeCell(this);
    const child3 = new OctreeCell(this);
    const child4 = new OctreeCell(this);
    const child5 = new OctreeCell(this);
    const child6 = new OctreeCell(this);
    const child7 = new OctreeCell(this);

    const iFaces0 = child0._iFaces;
    const iFaces1 = child1._iFaces;
    const iFaces2 = child2._iFaces;
    const iFaces3 = child3._iFaces;
    const iFaces4 = child4._iFaces;
    const iFaces5 = child5._iFaces;
    const iFaces6 = child6._iFaces;
    const iFaces7 = child7._iFaces;
    const faceCenters = mesh.getFaceCenters();
    const iFaces = this._iFaces;
    const nbFaces = iFaces.length;
    for (let i = 0; i < nbFaces; ++i) {
      const iFace = iFaces[i];
      const id = iFace * 3;
      const cx = faceCenters[id];
      const cy = faceCenters[id + 1];
      const cz = faceCenters[id + 2];

      if (cx > xcen) {
        if (cy > ycen) {
          if (cz > zcen) iFaces6.push(iFace);
          else iFaces5.push(iFace);
        } else {
          if (cz > zcen) iFaces2.push(iFace);
          else iFaces1.push(iFace);
        }
      } else {
        if (cy > ycen) {
          if (cz > zcen) iFaces7.push(iFace);
          else iFaces4.push(iFace);
        } else {
          if (cz > zcen) iFaces3.push(iFace);
          else iFaces0.push(iFace);
        }
      }
    }

    child0.setAabbSplit(xmin, ymin, zmin, xcen, ycen, zcen);
    child1.setAabbSplit(xmin + dX, ymin, zmin, xcen + dX, ycen, zcen);
    child2.setAabbSplit(xcen, ycen - dY, zcen, xmax, ymax - dY, zmax);
    child3.setAabbSplit(xmin, ymin, zmin + dZ, xcen, ycen, zcen + dZ);
    child4.setAabbSplit(xmin, ymin + dY, zmin, xcen, ycen + dY, zcen);
    child5.setAabbSplit(xcen, ycen, zcen - dZ, xmax, ymax, zmax - dZ);
    child6.setAabbSplit(xcen, ycen, zcen, xmax, ymax, zmax);
    child7.setAabbSplit(xcen - dX, ycen, zcen, xmax - dX, ymax, zmax);

    this._children.length = 0;
    this._children.push(child0, child1, child2, child3, child4, child5, child6, child7);
    iFaces.length = 0;
  }

  setAabbSplit(xmin, ymin, zmin, xmax, ymax, zmax) {
    const aabb = this._aabbSplit;
    aabb[0] = xmin;
    aabb[1] = ymin;
    aabb[2] = zmin;
    aabb[3] = xmax;
    aabb[4] = ymax;
    aabb[5] = zmax;
  }

  setAabbLoose(xmin, ymin, zmin, xmax, ymax, zmax) {
    const aabb = this._aabbLoose;
    aabb[0] = xmin;
    aabb[1] = ymin;
    aabb[2] = zmin;
    aabb[3] = xmax;
    aabb[4] = ymax;
    aabb[5] = zmax;
  }

  /** Collect faces in cells hit by a ray */
  collectIntersectRay(vNear, eyeDir, collectFaces, leavesHit) {
    const vx = vNear[0];
    const vy = vNear[1];
    const vz = vNear[2];
    const irx = 1.0 / eyeDir[0];
    const iry = 1.0 / eyeDir[1];
    const irz = 1.0 / eyeDir[2];
    let acc = 0;

    const stack = OctreeCell.STACK;
    stack[0] = this;
    let curStack = 1;
    while (curStack > 0) {
      const cell = stack[--curStack];
      const loose = cell._aabbLoose;
      const t1 = (loose[0] - vx) * irx;
      const t2 = (loose[3] - vx) * irx;
      const t3 = (loose[1] - vy) * iry;
      const t4 = (loose[4] - vy) * iry;
      const t5 = (loose[2] - vz) * irz;
      const t6 = (loose[5] - vz) * irz;
      const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4), Math.min(t5, t6));
      const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4), Math.max(t5, t6));
      if (tmax < 0 || tmin > tmax) // no intersection
        continue;

      const children = cell._children;
      if (children.length === 8) {
        for (let i = 0; i < 8; ++i)
          stack[curStack + i] = children[i];
        curStack += 8;
      } else {
        if (leavesHit) leavesHit.push(cell);
        const iFaces = cell._iFaces;
        collectFaces.set(iFaces, acc);
        acc += iFaces.length;
      }
    }
    return new Uint32Array(collectFaces.subarray(0, acc));
  }

  /** Collect faces inside a sphere */
  collectIntersectSphere(vert, radiusSquared, collectFaces, leavesHit) {
    const vx = vert[0];
    const vy = vert[1];
    const vz = vert[2];
    let acc = 0;

    const stack = OctreeCell.STACK;
    stack[0] = this;
    let curStack = 1;
    while (curStack > 0) {
      const cell = stack[--curStack];
      const loose = cell._aabbLoose;
      let dx = 0.0;
      let dy = 0.0;
      let dz = 0.0;

      if (loose[0] > vx) dx = loose[0] - vx;
      else if (loose[3] < vx) dx = loose[3] - vx;
      else dx = 0.0;

      if (loose[1] > vy) dy = loose[1] - vy;
      else if (loose[4] < vy) dy = loose[4] - vy;
      else dy = 0.0;

      if (loose[2] > vz) dz = loose[2] - vz;
      else if (loose[5] < vz) dz = loose[5] - vz;
      else dz = 0.0;

      if ((dx * dx + dy * dy + dz * dz) > radiusSquared) // no intersection
        continue;

      const children = cell._children;
      if (children.length === 8) {
        for (let i = 0; i < 8; ++i)
          stack[curStack + i] = children[i];
        curStack += 8;
      } else {
        if (leavesHit) leavesHit.push(cell);
        const iFaces = cell._iFaces;
        collectFaces.set(iFaces, acc);
        acc += iFaces.length;
      }
    }
    return new Uint32Array(collectFaces.subarray(0, acc));
  }

  /** Add a face in the octree, subdivide the cell if necessary */
  addFace(faceId, bxmin, bymin, bzmin, bxmax, bymax, bzmax, cx, cy, cz) {
    const stack = OctreeCell.STACK;
    stack[0] = this;
    let curStack = 1;
    while (curStack > 0) {
      const cell = stack[--curStack];
      const split = cell._aabbSplit;
      if (cx <= split[0]) continue;
      if (cy <= split[1]) continue;
      if (cz <= split[2]) continue;
      if (cx > split[3]) continue;
      if (cy > split[4]) continue;
      if (cz > split[5]) continue;

      const loose = cell._aabbLoose;
      // expands cell aabb loose with aabb face
      if (bxmin < loose[0]) loose[0] = bxmin;
      if (bymin < loose[1]) loose[1] = bymin;
      if (bzmin < loose[2]) loose[2] = bzmin;
      if (bxmax > loose[3]) loose[3] = bxmax;
      if (bymax > loose[4]) loose[4] = bymax;
      if (bzmax > loose[5]) loose[5] = bzmax;
      const children = cell._children;

      if (children.length === 8) {
        for (let i = 0; i < 8; ++i)
          stack[curStack + i] = children[i];
        curStack += 8;
      } else {
        cell._iFaces.push(faceId);
        return cell;
      }
    }
  }

  /** Cut leaves if needed */
  pruneIfPossible() {
    let cell = this;
    while (cell._parent) {
      const parent = cell._parent;

      const children = parent._children;
      // means that the current cell has already pruned
      if (children.length === 0)
        return;

      // check if we can prune
      for (let i = 0; i < 8; ++i) {
        const child = children[i];
        if (child._iFaces.length > 0 || child._children.length === 8) {
          return;
        }
      }

      children.length = 0;
      cell = parent;
    }
  }

  /** Expand aabb loose */
  expandsAabbLoose(bxmin, bymin, bzmin, bxmax, bymax, bzmax) {
    let parent = this;
    while (parent) {
      const pLoose = parent._aabbLoose;
      let proceed = false;
      if (bxmin < pLoose[0]) {
        pLoose[0] = bxmin;
        proceed = true;
      }
      if (bymin < pLoose[1]) {
        pLoose[1] = bymin;
        proceed = true;
      }
      if (bzmin < pLoose[2]) {
        pLoose[2] = bzmin;
        proceed = true;
      }
      if (bxmax > pLoose[3]) {
        pLoose[3] = bxmax;
        proceed = true;
      }
      if (bymax > pLoose[4]) {
        pLoose[4] = bymax;
        proceed = true;
      }
      if (bzmax > pLoose[5]) {
        pLoose[5] = bzmax;
        proceed = true;
      }
      parent = proceed ? parent._parent : null;
    }
  }
}

OctreeCell.FLAG = 0;

OctreeCell.MAX_DEPTH = 8;
OctreeCell.MAX_FACES = 100; // maximum faces per cell
(function () {
  const nb = 1 + 7 * OctreeCell.MAX_DEPTH;
  const stack = OctreeCell.STACK = new Array(nb);
  for (let i = 0; i < nb; ++i)
    stack[i] = null;
})();

export default OctreeCell;
