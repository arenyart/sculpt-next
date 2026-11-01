import Utils from '../misc/Utils';

class StateColorAndMaterial {

  constructor(main, mesh) {
    this._main = main; // main application
    this._mesh = mesh; // the mesh
    this._idVertState = []; // ids of vertices
    this._cArState = []; // copies of color vertices
    this._mArState = []; // copies of material vertices
  }

  isNoop() {
    return this._idVertState.length === 0;
  }

  undo() {
    this.pullVertices();
    const mesh = this._mesh;
    mesh.updateDuplicateColorsAndMaterials();
    mesh.updateDrawArrays();
    mesh.updateColorBuffer();
    mesh.updateMaterialBuffer();
    this._main.setMesh(mesh);
  }

  redo() {
    this.undo();
  }

  createRedo() {
    const redo = new StateColorAndMaterial(this._main, this._mesh);
    this.pushRedoVertices(redo);
    return redo;
  }

  pushVertices(iVerts) {
    const idVertState = this._idVertState;
    const cArState = this._cArState;
    const mArState = this._mArState;

    const mesh = this._mesh;
    const cAr = mesh.getColors();
    const mAr = mesh.getMaterials();
    const vertStateFlags = mesh.getVerticesStateFlags();

    const stateFlag = Utils.STATE_FLAG;
    const nbVerts = iVerts.length;
    for (let i = 0; i < nbVerts; ++i) {
      let id = iVerts[i];
      if (vertStateFlags[id] === stateFlag)
        continue;
      vertStateFlags[id] = stateFlag;
      idVertState.push(id);
      id *= 3;
      cArState.push(cAr[id], cAr[id + 1], cAr[id + 2]);
      mArState.push(mAr[id], mAr[id + 1], mAr[id + 2]);
    }
  }

  pushRedoVertices(redoState) {
    const mesh = redoState._mesh;
    const cAr = mesh.getColors();
    const mAr = mesh.getMaterials();

    const idVertUndoState = this._idVertState;
    const nbVerts = idVertUndoState.length;

    const cArRedoState = redoState._cArState = new Float32Array(nbVerts * 3);
    const mArRedoState = redoState._mArState = new Float32Array(nbVerts * 3);
    const idVertRedoState = redoState._idVertState = new Uint32Array(nbVerts);
    for (let i = 0; i < nbVerts; ++i) {
      let id = idVertRedoState[i] = idVertUndoState[i];
      id *= 3;
      const j = i * 3;
      cArRedoState[j] = cAr[id];
      cArRedoState[j + 1] = cAr[id + 1];
      cArRedoState[j + 2] = cAr[id + 2];
      mArRedoState[j] = mAr[id];
      mArRedoState[j + 1] = mAr[id + 1];
      mArRedoState[j + 2] = mAr[id + 2];
    }
  }

  pullVertices() {
    const cArState = this._cArState;
    const mArState = this._mArState;
    const idVertState = this._idVertState;
    const nbVerts = idVertState.length;

    const mesh = this._mesh;
    const cAr = mesh.getColors();
    const mAr = mesh.getMaterials();
    for (let i = 0; i < nbVerts; ++i) {
      const id = idVertState[i] * 3;
      const j = i * 3;
      cAr[id] = cArState[j];
      cAr[id + 1] = cArState[j + 1];
      cAr[id + 2] = cArState[j + 2];
      mAr[id] = mArState[j];
      mAr[id + 1] = mArState[j + 1];
      mAr[id + 2] = mArState[j + 2];
    }
  }
}

export default StateColorAndMaterial;
