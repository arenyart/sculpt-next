import Tablet from '../../misc/Tablet';
import SculptBase from './SculptBase';

class Flatten extends SculptBase {

  constructor(main) {
    super(main);

    this._radius = 50;
    this._intensity = 0.75;
    this._negative = true;
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

    const iVertsFront = this.getFrontVertices(iVertsInRadius, picking.getEyeDirection());
    if (this._culling)
      iVertsInRadius = iVertsFront;

    const aNormal = this.areaNormal(iVertsFront);
    if (!aNormal)
      return;
    const aCenter = this.areaCenter(iVertsFront);
    picking.updateAlpha(this._lockPosition);
    picking.setIdAlpha(this._idAlpha);
    this.flatten(iVertsInRadius, aNormal, aCenter, picking.getIntersectionPoint(), picking.getLocalRadius2(), intensity, picking);

    const mesh = this.getMesh();
    mesh.updateGeometry(mesh.getFacesFromVertices(iVertsInRadius), iVertsInRadius);
  }

  /** Flatten, projection of the sculpting vertex onto a plane defined by the barycenter and normals of all the sculpting vertices */
  flatten(iVertsInRadius, aNormal, aCenter, center, radiusSquared, intensity, picking) {
    const mesh = this.getMesh();
    const vAr = mesh.getVertices();
    const mAr = mesh.getMaterials();
    const radius = Math.sqrt(radiusSquared);
    const vProxy = this._accumulate === false && this._lockPosition === false ? mesh.getVerticesProxy() : vAr;
    const cx = center[0];
    const cy = center[1];
    const cz = center[2];
    const ax = aCenter[0];
    const ay = aCenter[1];
    const az = aCenter[2];
    const anx = aNormal[0];
    const any = aNormal[1];
    const anz = aNormal[2];
    const comp = this._negative ? -1.0 : 1.0;
    for (let i = 0, l = iVertsInRadius.length; i < l; ++i) {
      const ind = iVertsInRadius[i] * 3;
      const vx = vAr[ind];
      const vy = vAr[ind + 1];
      const vz = vAr[ind + 2];
      const distToPlane = (vx - ax) * anx + (vy - ay) * any + (vz - az) * anz;
      if (distToPlane * comp > 0.0)
        continue;
      const dx = vProxy[ind] - cx;
      const dy = vProxy[ind + 1] - cy;
      const dz = vProxy[ind + 2] - cz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) / radius;
      if (dist >= 1.0)
        continue;
      let fallOff = dist * dist;
      fallOff = 3.0 * fallOff * fallOff - 4.0 * fallOff * dist + 1.0;
      fallOff *= distToPlane * intensity * mAr[ind + 2] * picking.getAlpha(vx, vy, vz);
      vAr[ind] -= anx * fallOff;
      vAr[ind + 1] -= any * fallOff;
      vAr[ind + 2] -= anz * fallOff;
    }
  }
}

export default Flatten;
