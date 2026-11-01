import { vec3, mat3 } from 'gl-matrix';
import Utils from '../../misc/Utils';
import SculptBase from './SculptBase';
import Paint from './Paint';
import Smooth from './Smooth';
import MeshStatic from '../../mesh/meshStatic/MeshStatic';

class Masking extends SculptBase {

  constructor(main) {
    super(main);

    this._radius = 50;
    this._hardness = 0.25;
    this._intensity = 1.0;
    this._negative = true;
    this._culling = false;
    this._idAlpha = 0;
    this._lockPosition = false;

    this._thickness = 1.0;
  }

  pushState() {
    // too lazy to add a pushStateMaterial
    this._main.getStateManager().pushStateColorAndMaterial(this.getMesh());
  }

  updateMeshBuffers() {
    const mesh = this.getMesh();
    if (mesh.isDynamic)
      mesh.updateBuffers();
    else
      mesh.updateMaterialBuffer();
  }

  stroke(picking) {
    Paint.prototype.stroke.call(this, picking);
  }

  dynamicTopology(picking) {
    // no dynamic topo with masking
    return picking.getPickedVertices();
  }

  /** Paint color vertices */
  paint(iVerts, center, radiusSquared, intensity, hardness, picking) {
    const mesh = this.getMesh();
    const vAr = mesh.getVertices();
    const mAr = mesh.getMaterials();
    const radius = Math.sqrt(radiusSquared);
    const cx = center[0];
    const cy = center[1];
    const cz = center[2];
    const softness = 2 * (1 - hardness);
    const maskIntensity = this._negative ? -intensity : intensity;
    for (let i = 0, l = iVerts.length; i < l; ++i) {
      const ind = iVerts[i] * 3;
      const vx = vAr[ind];
      const vy = vAr[ind + 1];
      const vz = vAr[ind + 2];
      const dx = vx - cx;
      const dy = vy - cy;
      const dz = vz - cz;
      let dist = Math.sqrt(dx * dx + dy * dy + dz * dz) / radius;
      if (dist > 1) dist = 1.0;

      let fallOff = Math.pow(1.0 - dist, softness);
      fallOff *= maskIntensity * picking.getAlpha(vx, vy, vz);
      mAr[ind + 2] = Math.min(Math.max(mAr[ind + 2] + fallOff, 0.0), 1.0);
    }
  }

  updateAndRenderMask() {
    const mesh = this.getMesh();
    mesh.updateDuplicateColorsAndMaterials();
    mesh.updateDrawArrays();
    this.updateRender();
  }

  blur() {
    const mesh = this.getMesh();
    let iVerts = this.getMaskedVertices();
    if (iVerts.length === 0)
      return;
    iVerts = mesh.expandsVertices(iVerts, 1);

    this.pushState();
    this._main.getStateManager().pushVertices(iVerts);

    const mAr = mesh.getMaterials();
    const nbVerts = iVerts.length;
    const smoothVerts = new Float32Array(nbVerts * 3);
    this.laplacianSmooth(iVerts, smoothVerts, mAr);
    for (let i = 0; i < nbVerts; ++i)
      mAr[iVerts[i] * 3 + 2] = smoothVerts[i * 3 + 2];
    this.updateAndRenderMask();
  }

  sharpen() {
    const mesh = this.getMesh();
    const iVerts = this.getMaskedVertices();
    if (iVerts.length === 0)
      return;

    this.pushState();
    this._main.getStateManager().pushVertices(iVerts);

    const mAr = mesh.getMaterials();
    const nbVerts = iVerts.length;
    for (let i = 0; i < nbVerts; ++i) {
      const idm = iVerts[i] * 3 + 2;
      const val = mAr[idm];
      mAr[idm] = val > 0.5 ? Math.min(val + 0.1, 1.0) : Math.max(val - 1.0, 0.0);
    }
    this.updateAndRenderMask();
  }

  clear() {
    const mesh = this.getMesh();
    const iVerts = this.getMaskedVertices();
    if (iVerts.length === 0)
      return;

    this.pushState();
    this._main.getStateManager().pushVertices(iVerts);

    const mAr = mesh.getMaterials();
    for (let i = 0, nb = iVerts.length; i < nb; ++i)
      mAr[iVerts[i] * 3 + 2] = 1.0;

    this.updateAndRenderMask();
  }

  invert(isState, meshState) {
    let mesh = meshState;
    if (!mesh) mesh = this.getMesh();
    if (!isState)
      this._main.getStateManager().pushStateCustom(this.invert.bind(this, true, mesh));

    const mAr = mesh.getMaterials();
    for (let i = 0, nb = mesh.getNbVertices(); i < nb; ++i)
      mAr[i * 3 + 2] = 1.0 - mAr[i * 3 + 2];

    this.updateAndRenderMask();
  }

  remapAndMirrorIndices(fAr, nbFaces, iVerts) {
    const nbVertices = this.getMesh().getNbVertices();
    const iTag = new Uint32Array(Utils.getMemory(nbVertices * 4), 0, nbVertices);
    let i = 0;
    let j = 0;
    const nbVerts = iVerts.length;
    for (i = 0; i < nbVerts; ++i)
      iTag[iVerts[i]] = i;

    const endFaces = nbFaces * 2;
    for (i = 0; i < endFaces; ++i) {
      j = i * 4;
      const offset = i < nbFaces ? 0 : nbVerts;
      fAr[j] = iTag[fAr[j]] + offset;
      fAr[j + 1] = iTag[fAr[j + 1]] + offset;
      fAr[j + 2] = iTag[fAr[j + 2]] + offset;
      const id4 = fAr[j + 3];
      if (id4 !== Utils.TRI_INDEX) fAr[j + 3] = iTag[id4] + offset;
    }

    const end = fAr.length / 4;
    for (i = endFaces; i < end; ++i) {
      j = i * 4;
      fAr[j] = iTag[fAr[j]];
      fAr[j + 1] = iTag[fAr[j + 1]];
      fAr[j + 2] = iTag[fAr[j + 2]] + nbVerts;
      fAr[j + 3] = iTag[fAr[j + 3]] + nbVerts;
    }
  }

  invertFaces(fAr) {
    for (let i = 0, nb = fAr.length / 4; i < nb; ++i) {
      const id = i * 4;
      const temp = fAr[id];
      fAr[id] = fAr[id + 2];
      fAr[id + 2] = temp;
    }
  }

  extractFaces(iFaces, iVerts, maskClamp) {
    const mesh = this.getMesh();
    const fAr = mesh.getFaces();
    const mAr = mesh.getMaterials();
    const eAr = mesh.getVerticesOnEdge();

    const noThick = this._thickness === 0;

    const nbFaces = iFaces.length;
    const nbNewFaces = new Uint32Array(Utils.getMemory(nbFaces * 4 * 4 * 3), 0, nbFaces * 4 * 3);
    let offsetFLink = noThick ? nbFaces : nbFaces * 2;
    for (let i = 0; i < nbFaces; ++i) {
      let idf = i * 4;
      const idOld = iFaces[i] * 4;
      const iv1 = nbNewFaces[idf] = fAr[idOld];
      const iv2 = nbNewFaces[idf + 1] = fAr[idOld + 1];
      const iv3 = nbNewFaces[idf + 2] = fAr[idOld + 2];
      const iv4 = nbNewFaces[idf + 3] = fAr[idOld + 3];
      if (noThick)
        continue;
      const isQuad = iv4 !== Utils.TRI_INDEX;

      const b1 = mAr[iv1 * 3 + 2] >= maskClamp || eAr[iv1] >= 1;
      const b2 = mAr[iv2 * 3 + 2] >= maskClamp || eAr[iv2] >= 1;
      const b3 = mAr[iv3 * 3 + 2] >= maskClamp || eAr[iv3] >= 1;
      const b4 = isQuad ? mAr[iv4 * 3 + 2] >= maskClamp || eAr[iv4] >= 1 : false;

      // create opposite face (layer), invert clockwise
      // quad =>
      // 1 2    3 2
      // 4 3    4 1
      // tri => 
      // 1 2    3 2
      //  3      1

      idf += nbFaces * 4;
      nbNewFaces[idf] = iv3;
      nbNewFaces[idf + 1] = iv2;
      nbNewFaces[idf + 2] = iv1;
      nbNewFaces[idf + 3] = iv4;

      // create bridges faces
      if (b2) {
        if (b1) {
          idf = 4 * (offsetFLink++);
          nbNewFaces[idf] = nbNewFaces[idf + 3] = iv2;
          nbNewFaces[idf + 1] = nbNewFaces[idf + 2] = iv1;
        }
        if (b3) {
          idf = 4 * (offsetFLink++);
          nbNewFaces[idf] = nbNewFaces[idf + 3] = iv3;
          nbNewFaces[idf + 1] = nbNewFaces[idf + 2] = iv2;
        }
      }
      if (isQuad) {
        if (b4) {
          if (b1) {
            idf = 4 * (offsetFLink++);
            nbNewFaces[idf] = nbNewFaces[idf + 3] = iv1;
            nbNewFaces[idf + 1] = nbNewFaces[idf + 2] = iv4;
          }
          if (b3) {
            idf = 4 * (offsetFLink++);
            nbNewFaces[idf] = nbNewFaces[idf + 3] = iv4;
            nbNewFaces[idf + 1] = nbNewFaces[idf + 2] = iv3;
          }
        }
      } else {
        if (b1 && b3) {
          idf = 4 * (offsetFLink++);
          nbNewFaces[idf] = nbNewFaces[idf + 3] = iv1;
          nbNewFaces[idf + 1] = nbNewFaces[idf + 2] = iv3;
        }
      }
    }

    const fArNew = new Uint32Array(nbNewFaces.subarray(0, offsetFLink * 4));
    this.remapAndMirrorIndices(fArNew, nbFaces, iVerts);
    if (this._thickness > 0)
      this.invertFaces(fArNew);
    return fArNew;
  }

  extractVertices(iVerts) {
    const mesh = this.getMesh();

    const vAr = mesh.getVertices();
    const nAr = mesh.getNormals();
    const mat = mesh.getMatrix();
    const nMat = mat3.normalFromMat4(mat3.create(), mat);
    const nbVerts = iVerts.length;
    const vArNew = new Float32Array(nbVerts * 2 * 3);
    const vTemp = [0.0, 0.0, 0.0];
    const nTemp = [0.0, 0.0, 0.0];
    const vOffset = nbVerts * 3;
    const thick = this._thickness;
    let eps = 0.01;
    if (thick < 0) eps = -eps;
    for (let i = 0; i < nbVerts; ++i) {
      let idv = i * 3;
      const idvOld = iVerts[i] * 3;
      vTemp[0] = vAr[idvOld];
      vTemp[1] = vAr[idvOld + 1];
      vTemp[2] = vAr[idvOld + 2];
      nTemp[0] = nAr[idvOld];
      nTemp[1] = nAr[idvOld + 1];
      nTemp[2] = nAr[idvOld + 2];
      vec3.transformMat3(nTemp, nTemp, nMat);
      vec3.normalize(nTemp, nTemp);

      vec3.transformMat4(vTemp, vTemp, mat);
      vec3.scaleAndAdd(vTemp, vTemp, nTemp, eps);
      vArNew[idv] = vTemp[0];
      vArNew[idv + 1] = vTemp[1];
      vArNew[idv + 2] = vTemp[2];

      vec3.scaleAndAdd(vTemp, vTemp, nTemp, thick);
      idv += vOffset;
      vArNew[idv] = vTemp[0];
      vArNew[idv + 1] = vTemp[1];
      vArNew[idv + 2] = vTemp[2];
    }
    return vArNew;
  }

  smoothBorder(mesh, iFaces) {
    const startBridge = iFaces.length * 2;
    const fBridge = new Uint32Array(mesh.getNbFaces() - startBridge);
    for (let i = 0, nbBridge = fBridge.length; i < nbBridge; ++i)
      fBridge[i] = startBridge + i;
    const vBridge = mesh.expandsVertices(mesh.getVerticesFromFaces(fBridge), 1);
    const smo = new Smooth();
    smo.setToolMesh(mesh);
    smo.smooth(vBridge, 1.0);
    smo.smooth(vBridge, 1.0);
    smo.smooth(vBridge, 1.0);
  }

  extract() {
    const mesh = this.getMesh();
    const maskClamp = 0.5;

    let iVerts = this.filterMaskedVertices(-Infinity, maskClamp);
    if (iVerts.length === 0)
      return;
    const iFaces = mesh.getFacesFromVertices(iVerts);
    iVerts = mesh.getVerticesFromFaces(iFaces);

    const fArNew = this.extractFaces(iFaces, iVerts, maskClamp);
    const vArNew = this.extractVertices(iVerts);

    const newMesh = new MeshStatic(mesh.getGL());
    newMesh.setVertices(vArNew);
    newMesh.setFaces(fArNew);

    // we don't use newMesh.init because we want to smooth
    // the border (we want to avoid an update octree/normal/etc...)
    newMesh.initColorsAndMaterials();
    newMesh.allocateArrays();
    newMesh.initTopology();
    if (this._thickness !== 0.0)
      this.smoothBorder(newMesh, iFaces);
    newMesh.updateGeometry();
    newMesh.updateDuplicateColorsAndMaterials();

    newMesh.copyRenderConfig(mesh);
    newMesh.initRender();

    const main = this._main;
    main.addNewMesh(newMesh);
    main.setMesh(mesh);
  }
}

export default Masking;
