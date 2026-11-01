import { vec3 } from 'gl-matrix';
import Utils from '../misc/Utils';

class StateGeometry {

  constructor(main, mesh) {
    this._main = main; // main application
    this._mesh = mesh; // the mesh
    this._center = vec3.copy([0.0, 0.0, 0.0], mesh.getCenter());

    this._idVertState = []; // ids of vertices
    this._vArState = []; // copies of vertices coordinates
  }

  isNoop() {
    return this._idVertState.length === 0;
  }

  undo() {
    this.pullVertices();
    const mesh = this._mesh;
    mesh.updateGeometry(mesh.getFacesFromVertices(this._idVertState), this._idVertState);
    mesh.updateGeometryBuffers();
    vec3.copy(mesh.getCenter(), this._center);
    this._main.setMesh(mesh);
  }

  redo() {
    this.undo();
  }

  createRedo() {
    const redo = new StateGeometry(this._main, this._mesh);
    this.pushRedoVertices(redo);
    return redo;
  }

  pushVertices(iVerts) {
    const idVertState = this._idVertState;
    const vArState = this._vArState;

    const mesh = this._mesh;
    const vAr = mesh.getVertices();
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
      vArState.push(vAr[id], vAr[id + 1], vAr[id + 2]);
    }
  }

  pushRedoVertices(redoState) {
    const mesh = redoState._mesh;
    const vAr = mesh.getVertices();

    const idVertUndoState = this._idVertState;
    const nbVerts = idVertUndoState.length;

    const vArRedoState = redoState._vArState = new Float32Array(nbVerts * 3);
    const idVertRedoState = redoState._idVertState = new Uint32Array(nbVerts);
    for (let i = 0; i < nbVerts; ++i) {
      let id = idVertRedoState[i] = idVertUndoState[i];
      id *= 3;
      const j = i * 3;
      vArRedoState[j] = vAr[id];
      vArRedoState[j + 1] = vAr[id + 1];
      vArRedoState[j + 2] = vAr[id + 2];
    }
  }

  pullVertices() {
    const vArState = this._vArState;
    const idVertState = this._idVertState;
    const nbVerts = idVertState.length;

    const mesh = this._mesh;
    const vAr = mesh.getVertices();
    for (let i = 0; i < nbVerts; ++i) {
      const id = idVertState[i] * 3;
      const j = i * 3;
      vAr[id] = vArState[j];
      vAr[id + 1] = vArState[j + 1];
      vAr[id + 2] = vArState[j + 2];
    }
  }
}

export default StateGeometry;
