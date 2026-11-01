import { vec3, mat4 } from 'gl-matrix';
import Geometry from '../../math3d/Geometry';
import SculptBase from './SculptBase';

class Drag extends SculptBase {

  constructor(main) {
    super(main);

    this._radius = 150;
    this._dragDir = [0.0, 0.0, 0.0];
    this._dragDirSym = [0.0, 0.0, 0.0];
    this._idAlpha = 0;
  }

  sculptStroke() {
    const main = this._main;
    const mesh = this.getMesh();
    const picking = main.getPicking();
    const pickingSym = main.getSculptManager().getSymmetry() ? main.getPickingSymmetry() : null;

    let dx = main._mouseX - this._lastMouseX;
    let dy = main._mouseY - this._lastMouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minSpacing = 0.15 * this._radius;

    const step = 1.0 / Math.floor(dist / minSpacing);
    dx *= step;
    dy *= step;
    let mouseX = this._lastMouseX;
    let mouseY = this._lastMouseY;

    if (!picking.getMesh())
      return;
    picking._mesh = mesh;
    if (pickingSym) {
      pickingSym._mesh = mesh;
      vec3.copy(pickingSym.getIntersectionPoint(), picking.getIntersectionPoint());
      Geometry.mirrorPoint(pickingSym.getIntersectionPoint(), mesh.getSymmetryOrigin(), mesh.getSymmetryNormal());
    }

    for (let i = 0.0; i < 1.0; i += step) {
      if (!this.makeStroke(mouseX, mouseY, picking, pickingSym))
        break;
      mouseX += dx;
      mouseY += dy;
    }

    this.updateRender();

    this._lastMouseX = main._mouseX;
    this._lastMouseY = main._mouseY;
  }

  makeStroke(mouseX, mouseY, picking, pickingSym) {
    const mesh = this.getMesh();
    this.updateDragDir(picking, mouseX, mouseY);
    picking.pickVerticesInSphere(picking.getLocalRadius2());
    picking.computePickedNormal();
    // if dyn topo, we need to the picking and the sculpting altogether
    if (mesh.isDynamic)
      this.stroke(picking, false);

    if (pickingSym) {
      this.updateDragDir(pickingSym, mouseX, mouseY, true);
      pickingSym.setLocalRadius2(picking.getLocalRadius2());
      pickingSym.pickVerticesInSphere(pickingSym.getLocalRadius2());
    }

    if (!mesh.isDynamic) this.stroke(picking, false);
    if (pickingSym) this.stroke(pickingSym, true);
    return true;
  }

  /** On stroke */
  stroke(picking, sym) {
    let iVertsInRadius = picking.getPickedVertices();

    // undo-redo
    this._main.getStateManager().pushVertices(iVertsInRadius);
    iVertsInRadius = this.dynamicTopology(picking);

    picking.updateAlpha(this._lockPosition);
    picking.setIdAlpha(this._idAlpha);
    this.drag(iVertsInRadius, picking.getIntersectionPoint(), picking.getLocalRadius2(), sym, picking);

    const mesh = this.getMesh();
    mesh.updateGeometry(mesh.getFacesFromVertices(iVertsInRadius), iVertsInRadius);
  }

  /** Drag deformation */
  drag(iVerts, center, radiusSquared, sym, picking) {
    const mesh = this.getMesh();
    const vAr = mesh.getVertices();
    const mAr = mesh.getMaterials();
    const radius = Math.sqrt(radiusSquared);
    const cx = center[0];
    const cy = center[1];
    const cz = center[2];
    const dir = sym ? this._dragDirSym : this._dragDir;
    const dirx = dir[0];
    const diry = dir[1];
    const dirz = dir[2];
    for (let i = 0, l = iVerts.length; i < l; ++i) {
      const ind = iVerts[i] * 3;
      const vx = vAr[ind];
      const vy = vAr[ind + 1];
      const vz = vAr[ind + 2];
      const dx = vx - cx;
      const dy = vy - cy;
      const dz = vz - cz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) / radius;
      let fallOff = dist * dist;
      fallOff = 3.0 * fallOff * fallOff - 4.0 * fallOff * dist + 1.0;
      fallOff *= mAr[ind + 2] * picking.getAlpha(vx, vy, vz);
      vAr[ind] = vx + dirx * fallOff;
      vAr[ind + 1] = vy + diry * fallOff;
      vAr[ind + 2] = vz + dirz * fallOff;
    }
  }

  /** Set a few infos that will be needed for the drag function afterwards */
  updateDragDir(picking, mouseX, mouseY, useSymmetry) {
    const mesh = this.getMesh();
    const vNear = picking.unproject(mouseX, mouseY, 0.0);
    const vFar = picking.unproject(mouseX, mouseY, 0.1);
    const matInverse = mat4.create();
    mat4.invert(matInverse, mesh.getMatrix());
    vec3.transformMat4(vNear, vNear, matInverse);
    vec3.transformMat4(vFar, vFar, matInverse);
    let dir = this._dragDir;
    if (useSymmetry) {
      dir = this._dragDirSym;
      const ptPlane = mesh.getSymmetryOrigin();
      const nPlane = mesh.getSymmetryNormal();
      Geometry.mirrorPoint(vNear, ptPlane, nPlane);
      Geometry.mirrorPoint(vFar, ptPlane, nPlane);
    }
    const center = picking.getIntersectionPoint();
    picking.setIntersectionPoint(Geometry.vertexOnLine(center, vNear, vFar));
    vec3.sub(dir, picking.getIntersectionPoint(), center);
    picking._mesh = mesh;
    picking.updateLocalAndWorldRadius2();
    const eyeDir = picking.getEyeDirection();
    vec3.sub(eyeDir, vFar, vNear);
    vec3.normalize(eyeDir, eyeDir);
  }
}

export default Drag;
