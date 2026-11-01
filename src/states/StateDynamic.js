import { vec3 } from 'gl-matrix';
import Utils from '../misc/Utils';

class StateDynamic {

  constructor(main, mesh) {
    this._main = main; // main application
    this._mesh = mesh; // the mesh
    this._center = vec3.copy([0.0, 0.0, 0.0], mesh.getCenter());

    this._nbFacesState = mesh.getNbFaces(); // number of faces
    this._nbVerticesState = mesh.getNbVertices(); // number of vertices

    this._idVertState = []; // ids of vertices
    this._fRingState = []; // ring of faces around vertices
    this._vRingState = []; // ring of faces around vertices
    this._vArState = []; // copies of vertices coordinates
    this._cArState = []; // copies of color vertices
    this._mArState = []; // copies of material vertices

    this._idFaceState = []; // ids of faces
    this._fArState = []; // copies of face indices
  }

  isNoop() {
    return this._idVertState.length === 0 && this._idFaceState.length === 0;
  }

  undo() {
    this.pullVertices();
    this.pullFaces();
    const mesh = this._mesh;
    // mesh.getVerticesRingFace().length = this._nbVerticesState;
    // mesh.getVerticesRingVert().length = this._nbVerticesState;
    mesh.setNbVertices(this._nbVerticesState);
    mesh.setNbFaces(this._nbFacesState);

    mesh.updateTopology( /*this._idFaceState, this._idVertState*/ ); // TODO local update ?
    mesh.updateGeometry( /*this._idFaceState, this._idVertState*/ ); // TODO local update ?
    mesh.updateDuplicateColorsAndMaterials();
    mesh.updateDrawArrays();
    mesh.updateColorBuffer();
    mesh.updateMaterialBuffer();
    mesh.updateBuffers();
    vec3.copy(mesh.getCenter(), this._center);
    this._main.setMesh(mesh);
  }

  redo() {
    this.undo();
  }

  createRedo() {
    const redo = new StateDynamic(this._main, this._mesh);
    this.pushRedoVertices(redo);
    this.pushRedoFaces(redo);
    return redo;
  }

  pushVertices(iVerts) {
    const idVertState = this._idVertState;
    const fRingState = this._fRingState;
    const vRingState = this._vRingState;
    const vArState = this._vArState;
    const cArState = this._cArState;
    const mArState = this._mArState;

    const mesh = this._mesh;
    const fRing = mesh.getVerticesRingFace();
    const vRing = mesh.getVerticesRingVert();
    const vAr = mesh.getVertices();
    const cAr = mesh.getColors();
    const mAr = mesh.getMaterials();
    const vStateFlags = mesh.getVerticesStateFlags();

    const stateFlag = Utils.STATE_FLAG;
    const nbVerts = iVerts.length;
    for (let i = 0; i < nbVerts; ++i) {
      let id = iVerts[i];
      if (vStateFlags[id] === stateFlag)
        continue;
      vStateFlags[id] = stateFlag;
      fRingState.push(fRing[id].slice());
      vRingState.push(vRing[id].slice());
      idVertState.push(id);
      id *= 3;
      vArState.push(vAr[id], vAr[id + 1], vAr[id + 2]);
      cArState.push(cAr[id], cAr[id + 1], cAr[id + 2]);
      mArState.push(mAr[id], mAr[id + 1], mAr[id + 2]);
    }
  }

  pushFaces(iFaces) {
    const idFaceState = this._idFaceState;
    const fArState = this._fArState;

    const mesh = this._mesh;
    const fAr = mesh.getFaces();
    const fStateFlags = mesh.getFacesStateFlags();

    const stateFlag = Utils.STATE_FLAG;
    const nbFaces = iFaces.length;
    for (let i = 0; i < nbFaces; ++i) {
      let id = iFaces[i];
      if (fStateFlags[id] === stateFlag)
        continue;
      fStateFlags[id] = stateFlag;
      idFaceState.push(id);
      id *= 4;
      fArState.push(fAr[id], fAr[id + 1], fAr[id + 2], fAr[id + 3]);
    }
  }

  pushRedoVertices(redoState) {
    const mesh = redoState._mesh;
    const nbMeshVertices = mesh.getNbVertices();
    const fRing = mesh.getVerticesRingFace();
    const vRing = mesh.getVerticesRingVert();
    const vAr = mesh.getVertices();
    const cAr = mesh.getColors();
    const mAr = mesh.getMaterials();

    let i = 0;
    let id = 0;
    let acc = 0;
    const idVertUndoState = this._idVertState;
    let nbVerts = idVertUndoState.length;
    const nbVerticesState = this._nbVerticesState;
    const nbMin = Math.min(nbVerticesState, nbMeshVertices);
    let idVertRedoState = new Uint32Array(Utils.getMemory(nbMeshVertices * 4), 0, nbMeshVertices);
    for (i = 0; i < nbVerts; ++i) {
      id = idVertUndoState[i];
      if (id < nbMin)
        idVertRedoState[acc++] = id;
    }
    for (i = nbVerticesState; i < nbMeshVertices; ++i) {
      idVertRedoState[acc++] = i;
    }

    nbVerts = acc;
    idVertRedoState = redoState._idVertState = new Uint32Array(idVertRedoState.subarray(0, nbVerts));
    const fRingRedoState = redoState._fRingState = new Array(nbVerts);
    const vRingRedoState = redoState._vRingState = new Array(nbVerts);
    const vArRedoState = redoState._vArState = new Float32Array(nbVerts * 3);
    const cArRedoState = redoState._cArState = new Float32Array(nbVerts * 3);
    const mArRedoState = redoState._mArState = new Float32Array(nbVerts * 3);
    for (i = 0; i < nbVerts; ++i) {
      id = idVertRedoState[i];
      fRingRedoState[i] = fRing[id].slice();
      vRingRedoState[i] = vRing[id].slice();
      id *= 3;
      const j = i * 3;
      vArRedoState[j] = vAr[id];
      vArRedoState[j + 1] = vAr[id + 1];
      vArRedoState[j + 2] = vAr[id + 2];
      cArRedoState[j] = cAr[id];
      cArRedoState[j + 1] = cAr[id + 1];
      cArRedoState[j + 2] = cAr[id + 2];
      mArRedoState[j] = mAr[id];
      mArRedoState[j + 1] = mAr[id + 1];
      mArRedoState[j + 2] = mAr[id + 2];
    }
  }

  pushRedoFaces(redoState) {
    const mesh = redoState._mesh;
    const nbMeshFaces = mesh.getNbFaces();
    const fAr = mesh.getFaces();

    let i = 0;
    let id = 0;
    let acc = 0;
    const idFaceUndoState = this._idFaceState;
    let nbFaces = idFaceUndoState.length;
    const nbFacesState = this._nbFacesState;
    const nbMin = Math.min(nbFacesState, nbMeshFaces);
    let idFaceRedoState = new Uint32Array(Utils.getMemory(nbMeshFaces * 4), 0, nbMeshFaces);
    for (i = 0; i < nbFaces; ++i) {
      id = idFaceUndoState[i];
      if (id < nbMin)
        idFaceRedoState[acc++] = id;
    }
    for (i = nbFacesState; i < nbMeshFaces; ++i) {
      idFaceRedoState[acc++] = i;
    }

    nbFaces = acc;
    idFaceRedoState = redoState._idFaceState = new Uint32Array(idFaceRedoState.subarray(0, nbFaces));
    const fArRedoState = redoState._fArState = new Int32Array(nbFaces * 4);
    for (i = 0; i < nbFaces; ++i) {
      id = idFaceRedoState[i];
      id *= 4;
      const j = i * 4;
      fArRedoState[j] = fAr[id];
      fArRedoState[j + 1] = fAr[id + 1];
      fArRedoState[j + 2] = fAr[id + 2];
      fArRedoState[j + 3] = fAr[id + 3];
    }
  }

  pullVertices() {
    const nbMeshVertices = this._nbVerticesState;
    const fRingState = this._fRingState;
    const vRingState = this._vRingState;
    const vArState = this._vArState;
    const cArState = this._cArState;
    const mArState = this._mArState;
    const idVertState = this._idVertState;
    const nbVerts = idVertState.length;

    const mesh = this._mesh;
    const fRing = mesh.getVerticesRingFace();
    const vRing = mesh.getVerticesRingVert();
    const vAr = mesh.getVertices();
    const cAr = mesh.getColors();
    const mAr = mesh.getMaterials();
    for (let i = 0; i < nbVerts; ++i) {
      let id = idVertState[i];
      if (id >= nbMeshVertices)
        continue;
      fRing[id] = fRingState[i].slice();
      vRing[id] = vRingState[i].slice();
      id *= 3;
      const j = i * 3;
      vAr[id] = vArState[j];
      vAr[id + 1] = vArState[j + 1];
      vAr[id + 2] = vArState[j + 2];
      cAr[id] = cArState[j];
      cAr[id + 1] = cArState[j + 1];
      cAr[id + 2] = cArState[j + 2];
      mAr[id] = mArState[j];
      mAr[id + 1] = mArState[j + 1];
      mAr[id + 2] = mArState[j + 2];
    }
  }

  pullFaces() {
    const nbMeshFaces = this._nbFacesState;
    const fArState = this._fArState;
    const idFaceState = this._idFaceState;
    const nbFaces = idFaceState.length;

    const mesh = this._mesh;
    const fAr = mesh.getFaces();
    for (let i = 0; i < nbFaces; ++i) {
      let id = idFaceState[i];
      if (id >= nbMeshFaces)
        continue;
      id *= 4;
      const j = i * 4;
      fAr[id] = fArState[j];
      fAr[id + 1] = fArState[j + 1];
      fAr[id + 2] = fArState[j + 2];
      fAr[id + 3] = fArState[j + 3];
    }
  }
}

export default StateDynamic;
