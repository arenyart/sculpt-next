import { vec3, mat4 } from 'gl-matrix';
import Gizmo from '../Gizmo';
import SculptBase from './SculptBase';

class Transform extends SculptBase {

  constructor(main) {
    super(main);

    this._gizmo = new Gizmo(main);
  }

  isIdentity(m) {
    if (m[0] !== 1.0 || m[5] !== 1.0 || m[10] !== 1.0 || m[15] !== 1.0) return false;
    if (m[1] !== 0.0 || m[2] !== 0.0 || m[3] !== 0.0 || m[4] !== 0.0) return false;
    if (m[6] !== 0.0 || m[7] !== 0.0 || m[8] !== 0.0 || m[9] !== 0.0) return false;
    if (m[11] !== 0.0 || m[12] !== 0.0 || m[13] !== 0.0 || m[14] !== 0.0) return false;
    return true;
  }

  preUpdate() {
    const picking = this._main.getPicking();

    const mesh = picking.getMesh();
    this._gizmo.onMouseOver();
    picking._mesh = mesh;

    this._main.setCanvasCursor('default');
  }

  start(ctrl) {
    const main = this._main;
    const mesh = this.getMesh();
    const picking = main.getPicking();

    if (mesh && this._gizmo.onMouseDown()) {
      picking._mesh = mesh;
      return true;
    }

    if (!picking.intersectionMouseMeshes(main.getMeshes(), main._mouseX, main._mouseY))
      return false;

    if (!main.setOrUnsetMesh(picking.getMesh(), ctrl))
      return false;

    this._lastMouseX = main._mouseX;
    this._lastMouseY = main._mouseY;
    return false;
  }

  end() {
    this._gizmo.onMouseUp();

    if (!this.getMesh() || this.isIdentity(this.getMesh().getEditMatrix()))
      return;

    const meshes = this._main.getSelectedMeshes();
    for (let i = 0; i < meshes.length; ++i) {
      this._forceToolMesh = meshes[i];

      this.pushState();
      if (i > 0) this._main.getStateManager().getCurrentState().squash = true;

      const iVerts = this.getUnmaskedVertices();
      this._main.getStateManager().pushVertices(iVerts);
      this.applyEditMatrix(iVerts);

      if (iVerts.length === 0) continue;
      this.updateMeshBuffers();
    }
    this._forceToolMesh = null;
  }

  applyEditMatrix(iVerts) {
    const mesh = this.getMesh();
    const em = mesh.getEditMatrix();
    const mAr = mesh.getMaterials();
    const vAr = mesh.getVertices();
    const vTemp = [0.0, 0.0, 0.0];
    for (let i = 0, nb = iVerts.length; i < nb; ++i) {
      const j = iVerts[i] * 3;
      const mask = mAr[j + 2];
      const x = vTemp[0] = vAr[j];
      const y = vTemp[1] = vAr[j + 1];
      const z = vTemp[2] = vAr[j + 2];
      vec3.transformMat4(vTemp, vTemp, em);
      const iMask = 1.0 - mask;
      vAr[j] = x * iMask + vTemp[0] * mask;
      vAr[j + 1] = y * iMask + vTemp[1] * mask;
      vAr[j + 2] = z * iMask + vTemp[2] * mask;
    }
    vec3.transformMat4(mesh.getCenter(), mesh.getCenter(), em);
    mat4.identity(em);
    if (iVerts.length === mesh.getNbVertices()) mesh.updateGeometry();
    else mesh.updateGeometry(mesh.getFacesFromVertices(iVerts), iVerts);
  }

  update() {}

  postRender() {
    if (this.getMesh())
      this._gizmo.render();
  }

  addSculptToScene(scene) {
    if (this.getMesh())
      this._gizmo.addGizmoToScene(scene);
  }
}

export default Transform;
