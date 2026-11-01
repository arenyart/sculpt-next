import Tablet from '../../misc/Tablet';
import SculptBase from './SculptBase';

class Inflate extends SculptBase {

  constructor(main) {
    super(main);

    this._radius = 50;
    this._intensity = 0.3;
    this._negative = false;
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
    this.inflate(iVertsInRadius, picking.getIntersectionPoint(), picking.getLocalRadius2(), intensity, picking);

    const mesh = this.getMesh();
    mesh.updateGeometry(mesh.getFacesFromVertices(iVertsInRadius), iVertsInRadius);
  }

  /** Inflate a group of vertices */
  inflate(iVerts, center, radiusSquared, intensity, picking) {
    const mesh = this.getMesh();
    const vAr = mesh.getVertices();
    const mAr = mesh.getMaterials();
    const vProxy = mesh.getVerticesProxy();
    const nAr = mesh.getNormals();
    const radius = Math.sqrt(radiusSquared);
    let deformIntensity = intensity * radius * 0.1;
    if (this._negative)
      deformIntensity = -deformIntensity;
    const cx = center[0];
    const cy = center[1];
    const cz = center[2];
    for (let i = 0, l = iVerts.length; i < l; ++i) {
      const ind = iVerts[i] * 3;
      const dx = vProxy[ind] - cx;
      const dy = vProxy[ind + 1] - cy;
      const dz = vProxy[ind + 2] - cz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) / radius;
      if (dist >= 1.0)
        continue;
      let fallOff = dist * dist;
      fallOff = 3.0 * fallOff * fallOff - 4.0 * fallOff * dist + 1.0;
      fallOff = deformIntensity * fallOff;
      const vx = vAr[ind];
      const vy = vAr[ind + 1];
      const vz = vAr[ind + 2];
      const nx = nAr[ind];
      const ny = nAr[ind + 1];
      const nz = nAr[ind + 2];
      fallOff /= Math.sqrt(nx * nx + ny * ny + nz * nz);
      fallOff *= mAr[ind + 2] * picking.getAlpha(vx, vy, vz);
      vAr[ind] = vx + nx * fallOff;
      vAr[ind + 1] = vy + ny * fallOff;
      vAr[ind + 2] = vz + nz * fallOff;
    }
  }
}

export default Inflate;
