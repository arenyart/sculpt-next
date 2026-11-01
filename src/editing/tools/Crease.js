import Tablet from '../../misc/Tablet';
import SculptBase from './SculptBase';

class Crease extends SculptBase {

  constructor(main) {
    super(main);

    this._radius = 25;
    this._intensity = 0.75;
    this._negative = true;
    this._culling = false;
    this._idAlpha = 0;
    this._lockPosition = false;
  }

  stroke(picking) {
    let iVertsInRadius = picking.getPickedVertices();
    const intensity = this._intensity * Tablet.getPressureIntensity();

    this.updateProxy(iVertsInRadius);
    // undo-redo
    this._main.getStateManager().pushVertices(iVertsInRadius);
    iVertsInRadius = this.dynamicTopology(picking);

    if (this._culling)
      iVertsInRadius = this.getFrontVertices(iVertsInRadius, picking.getEyeDirection());

    picking.updateAlpha(this._lockPosition);
    picking.setIdAlpha(this._idAlpha);
    this.crease(iVertsInRadius, picking.getPickedNormal(), picking.getIntersectionPoint(), picking.getLocalRadius2(), intensity, picking);

    const mesh = this.getMesh();
    mesh.updateGeometry(mesh.getFacesFromVertices(iVertsInRadius), iVertsInRadius);
  }

  /** Pinch+brush-like sculpt */
  crease(iVertsInRadius, aNormal, center, radiusSquared, intensity, picking) {
    const mesh = this.getMesh();
    const vAr = mesh.getVertices();
    const mAr = mesh.getMaterials();
    const vProxy = mesh.getVerticesProxy();
    const radius = Math.sqrt(radiusSquared);
    const cx = center[0];
    const cy = center[1];
    const cz = center[2];
    const anx = aNormal[0];
    const any = aNormal[1];
    const anz = aNormal[2];
    const deformIntensity = intensity * 0.07;
    let brushFactor = deformIntensity * radius;
    if (this._negative)
      brushFactor = -brushFactor;
    for (let i = 0, l = iVertsInRadius.length; i < l; ++i) {
      const ind = iVertsInRadius[i] * 3;
      const dx = cx - vProxy[ind];
      const dy = cy - vProxy[ind + 1];
      const dz = cz - vProxy[ind + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) / radius;
      if (dist >= 1.0)
        continue;
      const vx = vAr[ind];
      const vy = vAr[ind + 1];
      const vz = vAr[ind + 2];
      let fallOff = dist * dist;
      fallOff = 3.0 * fallOff * fallOff - 4.0 * fallOff * dist + 1.0;
      fallOff *= mAr[ind + 2] * picking.getAlpha(vx, vy, vz);
      const brushModifier = Math.pow(fallOff, 5) * brushFactor;
      fallOff *= deformIntensity;
      vAr[ind] = vx + dx * fallOff + anx * brushModifier;
      vAr[ind + 1] = vy + dy * fallOff + any * brushModifier;
      vAr[ind + 2] = vz + dz * fallOff + anz * brushModifier;
    }
  }
}

export default Crease;
