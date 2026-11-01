import Utils from '../../misc/Utils';
import Tablet from '../../misc/Tablet';
import SculptBase from './SculptBase';

class Smooth extends SculptBase {

  constructor(main) {
    super(main);

    this._radius = 50;
    this._intensity = 0.75;
    this._culling = false;
    this._tangent = false;
    this._idAlpha = 0;
    this._lockPosition = false;
  }

  stroke(picking) {
    let iVertsInRadius = picking.getPickedVertices();
    const intensity = this._intensity * Tablet.getPressureIntensity();

    // undo-redo
    this._main.getStateManager().pushVertices(iVertsInRadius);

    if (this._culling)
      iVertsInRadius = this.getFrontVertices(iVertsInRadius, picking.getEyeDirection());

    picking.updateAlpha(this._lockPosition);
    picking.setIdAlpha(this._idAlpha);
    if (this._tangent) this.smoothTangent(iVertsInRadius, intensity, picking);
    else this.smooth(iVertsInRadius, intensity, picking);

    const mesh = this.getMesh();
    mesh.updateGeometry(mesh.getFacesFromVertices(iVertsInRadius), iVertsInRadius);
  }

  /** Smooth a group of vertices. New position is given by simple averaging */
  smooth(iVerts, intensity, picking) {
    const mesh = this.getMesh();
    const vAr = mesh.getVertices();
    const mAr = mesh.getMaterials();
    const nbVerts = iVerts.length;

    const smoothVerts = new Float32Array(Utils.getMemory(nbVerts * 4 * 3), 0, nbVerts * 3);
    this.laplacianSmooth(iVerts, smoothVerts);

    for (let i = 0; i < nbVerts; ++i) {
      const ind = iVerts[i] * 3;
      const vx = vAr[ind];
      const vy = vAr[ind + 1];
      const vz = vAr[ind + 2];
      const i3 = i * 3;
      let mIntensity = intensity * mAr[ind + 2];
      if (picking)
        mIntensity *= picking.getAlpha(vx, vy, vz);
      const intComp = 1.0 - mIntensity;
      vAr[ind] = vx * intComp + smoothVerts[i3] * mIntensity;
      vAr[ind + 1] = vy * intComp + smoothVerts[i3 + 1] * mIntensity;
      vAr[ind + 2] = vz * intComp + smoothVerts[i3 + 2] * mIntensity;
    }
  }

  /** Smooth a group of vertices. Reproject the position on each vertex normals plane */
  smoothTangent(iVerts, intensity, picking) {
    const mesh = this.getMesh();
    const vAr = mesh.getVertices();
    const mAr = mesh.getMaterials();
    const nAr = mesh.getNormals();
    const nbVerts = iVerts.length;

    const smoothVerts = new Float32Array(Utils.getMemory(nbVerts * 4 * 3), 0, nbVerts * 3);
    this.laplacianSmooth(iVerts, smoothVerts);

    for (let i = 0; i < nbVerts; ++i) {
      const ind = iVerts[i] * 3;
      const vx = vAr[ind];
      const vy = vAr[ind + 1];
      const vz = vAr[ind + 2];
      let nx = nAr[ind];
      let ny = nAr[ind + 1];
      let nz = nAr[ind + 2];
      let len = nx * nx + ny * ny + nz * nz;
      if (len === 0.0)
        continue;
      len = 1.0 / Math.sqrt(len);
      nx *= len;
      ny *= len;
      nz *= len;
      const i3 = i * 3;
      const smx = smoothVerts[i3];
      const smy = smoothVerts[i3 + 1];
      const smz = smoothVerts[i3 + 2];
      const dot = nx * (smx - vx) + ny * (smy - vy) + nz * (smz - vz);
      let mIntensity = intensity * mAr[ind + 2];
      if (picking)
        mIntensity *= picking.getAlpha(vx, vy, vz);
      vAr[ind] = vx + (smx - nx * dot - vx) * mIntensity;
      vAr[ind + 1] = vy + (smy - ny * dot - vy) * mIntensity;
      vAr[ind + 2] = vz + (smz - nz * dot - vz) * mIntensity;
    }
  }

  /** Smooth a group of vertices along their normals */
  smoothAlongNormals(iVerts, intensity, picking) {
    const mesh = this.getMesh();
    const vAr = mesh.getVertices();
    const mAr = mesh.getMaterials();
    const nAr = mesh.getNormals();
    const nbVerts = iVerts.length;

    const smoothVerts = new Float32Array(Utils.getMemory(nbVerts * 4 * 3), 0, nbVerts * 3);
    this.laplacianSmooth(iVerts, smoothVerts);

    for (let i = 0; i < nbVerts; ++i) {
      const ind = iVerts[i] * 3;
      const vx = vAr[ind];
      const vy = vAr[ind + 1];
      const vz = vAr[ind + 2];
      const nx = nAr[ind];
      const ny = nAr[ind + 1];
      const nz = nAr[ind + 2];
      const i3 = i * 3;
      const len = 1.0 / ((nx * nx + ny * ny + nz * nz));
      let dot = nx * (smoothVerts[i3] - vx) + ny * (smoothVerts[i3 + 1] - vy) + nz * (smoothVerts[i3 + 2] - vz);
      dot *= len * intensity * mAr[ind + 2];
      if (picking)
        dot *= picking.getAlpha(vx, vy, vz);
      vAr[ind] = vx + nx * dot;
      vAr[ind + 1] = vy + ny * dot;
      vAr[ind + 2] = vz + nz * dot;
    }
  }
}

export default Smooth;
