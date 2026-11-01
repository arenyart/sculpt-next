import { vec3 } from 'gl-matrix';
import Tablet from '../../misc/Tablet';
import SculptBase from './SculptBase';
import Flatten from './Flatten';

class Brush extends SculptBase {

  constructor(main) {
    super(main);

    this._radius = 50;
    this._intensity = 0.5;
    this._negative = false;
    this._clay = true;
    this._culling = false;
    this._accumulate = true; // if we ignore the proxy
    this._idAlpha = 0;
    this._lockPosition = false;
  }

  stroke(picking) {
    let iVertsInRadius = picking.getPickedVertices();
    const intensity = this._intensity * Tablet.getPressureIntensity();

    if (!this._accumulate && !this._lockPosition)
      this.updateProxy(iVertsInRadius);
    // undo-redo
    this._main.getStateManager().pushVertices(iVertsInRadius);
    if (!this._lockPosition)
      iVertsInRadius = this.dynamicTopology(picking);

    const iVertsFront = this.getFrontVertices(iVertsInRadius, picking.getEyeDirection());
    if (this._culling)
      iVertsInRadius = iVertsFront;

    const r2 = picking.getLocalRadius2();
    picking.updateAlpha(this._lockPosition);
    picking.setIdAlpha(this._idAlpha);

    if (!this._clay) {
      this.brush(iVertsInRadius, picking.getPickedNormal(), picking.getIntersectionPoint(), r2, intensity, picking);
    } else {
      const aNormal = this.areaNormal(iVertsFront);
      if (!aNormal)
        return;
      const aCenter = this._lockPosition ? picking.getIntersectionPoint() : this.areaCenter(iVertsFront);
      const off = Math.sqrt(r2) * 0.1;
      vec3.scaleAndAdd(aCenter, aCenter, aNormal, this._negative ? -off : off);
      Flatten.prototype.flatten.call(this, iVertsInRadius, aNormal, aCenter, picking.getIntersectionPoint(), r2, intensity, picking);
    }

    const mesh = this.getMesh();
    mesh.updateGeometry(mesh.getFacesFromVertices(iVertsInRadius), iVertsInRadius);
  }

  brush(iVertsInRadius, aNormal, center, radiusSquared, intensity, picking) {
    const mesh = this.getMesh();
    const vAr = mesh.getVertices();
    const mAr = mesh.getMaterials();
    const vProxy = this._accumulate || this._lockPosition ? vAr : mesh.getVerticesProxy();
    const radius = Math.sqrt(radiusSquared);
    let deformIntensityBrush = intensity * radius * 0.1;
    if (this._negative)
      deformIntensityBrush = -deformIntensityBrush;
    const cx = center[0];
    const cy = center[1];
    const cz = center[2];
    const anx = aNormal[0];
    const any = aNormal[1];
    const anz = aNormal[2];
    for (let i = 0, l = iVertsInRadius.length; i < l; ++i) {
      const ind = iVertsInRadius[i] * 3;
      const dx = vProxy[ind] - cx;
      const dy = vProxy[ind + 1] - cy;
      const dz = vProxy[ind + 2] - cz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) / radius;
      if (dist >= 1.0)
        continue;
      const vx = vAr[ind];
      const vy = vAr[ind + 1];
      const vz = vAr[ind + 2];
      let fallOff = dist * dist;
      fallOff = 3.0 * fallOff * fallOff - 4.0 * fallOff * dist + 1.0;
      fallOff *= mAr[ind + 2] * deformIntensityBrush * picking.getAlpha(vx, vy, vz);
      vAr[ind] = vx + anx * fallOff;
      vAr[ind + 1] = vy + any * fallOff;
      vAr[ind + 2] = vz + anz * fallOff;
    }
  }
}

export default Brush;
