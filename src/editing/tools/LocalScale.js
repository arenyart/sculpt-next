import SculptBase from './SculptBase';

class LocalScale extends SculptBase {

  constructor(main) {
    super(main);

    this._radius = 50;
    this._culling = false;
    this._idAlpha = 0;
  }

  startSculpt() {
    const main = this._main;
    if (main.getSculptManager().getSymmetry()) {
      const pickingSym = main.getPickingSymmetry();
      pickingSym.intersectionMouseMesh();
      pickingSym.setLocalRadius2(main.getPicking().getLocalRadius2());
    }
  }

  /** Make a brush scale stroke */
  sculptStroke() {
    const main = this._main;
    const delta = main._mouseX - main._lastMouseX;
    const picking = main.getPicking();
    const rLocal2 = picking.getLocalRadius2();
    picking.pickVerticesInSphere(rLocal2);
    this.stroke(picking, delta);

    if (main.getSculptManager().getSymmetry()) {
      const pickingSym = main.getPickingSymmetry();
      if (pickingSym.getMesh()) {
        pickingSym.pickVerticesInSphere(rLocal2);
        this.stroke(pickingSym, delta);
      }
    }
    this.updateRender();
  }

  /** On stroke */
  stroke(picking, delta) {
    let iVertsInRadius = picking.getPickedVertices();

    // undo-redo
    this._main.getStateManager().pushVertices(iVertsInRadius);
    iVertsInRadius = this.dynamicTopology(picking);

    if (this._culling)
      iVertsInRadius = this.getFrontVertices(iVertsInRadius, picking.getEyeDirection());

    picking.updateAlpha(false);
    picking.setIdAlpha(this._idAlpha);
    this.scale(iVertsInRadius, picking.getIntersectionPoint(), picking.getLocalRadius2(), delta, picking);

    const mesh = this.getMesh();
    mesh.updateGeometry(mesh.getFacesFromVertices(iVertsInRadius), iVertsInRadius);
  }

  /** Scale the vertices around the mouse point intersection */
  scale(iVerts, center, radiusSquared, intensity, picking) {
    const mesh = this.getMesh();
    const vAr = mesh.getVertices();
    const mAr = mesh.getMaterials();
    const deltaScale = intensity * 0.01;
    const radius = Math.sqrt(radiusSquared);
    const cx = center[0];
    const cy = center[1];
    const cz = center[2];
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
      fallOff *= deltaScale * mAr[ind + 2] * picking.getAlpha(vx, vy, vz);
      vAr[ind] = vx + dx * fallOff;
      vAr[ind + 1] = vy + dy * fallOff;
      vAr[ind + 2] = vz + dz * fallOff;
    }
  }
}

export default LocalScale;
