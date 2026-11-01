import Tablet from '../../misc/Tablet';
import SculptBase from './SculptBase';

class Pinch extends SculptBase {

  constructor(main) {
    super(main);

    this._radius = 50;
    this._intensity = 0.75;
    this._negative = false;
    this._culling = false;
    this._idAlpha = 0;
    this._lockPosition = false;
  }

  stroke(picking) {
    let iVertsInRadius = picking.getPickedVertices();
    const intensity = this._intensity * Tablet.getPressureIntensity();

    // undo-redo
    this._main.getStateManager().pushVertices(iVertsInRadius);
    iVertsInRadius = this.dynamicTopology(picking);

    if (this._culling)
      iVertsInRadius = this.getFrontVertices(iVertsInRadius, picking.getEyeDirection());

    picking.updateAlpha(this._lockPosition);
    picking.setIdAlpha(this._idAlpha);
    this.pinch(iVertsInRadius, picking.getIntersectionPoint(), picking.getLocalRadius2(), intensity, picking);

    const mesh = this.getMesh();
    mesh.updateGeometry(mesh.getFacesFromVertices(iVertsInRadius), iVertsInRadius);
  }

  /** Pinch, vertices gather around intersection point */
  pinch(iVertsInRadius, center, radiusSquared, intensity, picking) {
    const mesh = this.getMesh();
    const vAr = mesh.getVertices();
    const mAr = mesh.getMaterials();
    const radius = Math.sqrt(radiusSquared);
    const cx = center[0];
    const cy = center[1];
    const cz = center[2];
    let deformIntensity = intensity * 0.05;
    if (this._negative)
      deformIntensity = -deformIntensity;
    for (let i = 0, l = iVertsInRadius.length; i < l; ++i) {
      const ind = iVertsInRadius[i] * 3;
      const vx = vAr[ind];
      const vy = vAr[ind + 1];
      const vz = vAr[ind + 2];
      const dx = cx - vx;
      const dy = cy - vy;
      const dz = cz - vz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) / radius;
      let fallOff = dist * dist;
      fallOff = 3.0 * fallOff * fallOff - 4.0 * fallOff * dist + 1.0;
      fallOff *= deformIntensity * mAr[ind + 2] * picking.getAlpha(vx, vy, vz);
      vAr[ind] = vx + dx * fallOff;
      vAr[ind + 1] = vy + dy * fallOff;
      vAr[ind + 2] = vz + dz * fallOff;
    }
  }
}

export default Pinch;
