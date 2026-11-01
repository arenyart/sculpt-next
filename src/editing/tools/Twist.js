import { vec2, vec3, quat } from 'gl-matrix';
import Geometry from '../../math3d/Geometry';
import SculptBase from './SculptBase';

class Twist extends SculptBase {

  constructor(main) {
    super(main);

    this._radius = 75;
    this._culling = false;
    this._twistData = {
      normal: [0.0, 0.0, 0.0], // normal of rotation plane
      center: [0.0, 0.0] // 2D center of rotation 
    };
    this._twistDataSym = {
      normal: [0.0, 0.0, 0.0], // normal of rotation plane
      center: [0.0, 0.0] // 2D center of rotation 
    };
    this._idAlpha = 0;
  }

  startSculpt() {
    const main = this._main;
    const mouseX = main._mouseX;
    const mouseY = main._mouseY;
    const picking = main.getPicking();
    this.initTwistData(picking, mouseX, mouseY, this._twistData);
    if (main.getSculptManager().getSymmetry()) {
      const pickingSym = main.getPickingSymmetry();
      pickingSym.intersectionMouseMesh();
      pickingSym.setLocalRadius2(picking.getLocalRadius2());
      if (pickingSym.getMesh())
        this.initTwistData(pickingSym, mouseX, mouseY, this._twistDataSym);
    }
  }

  /** Set a few infos that will be needed for the twist function afterwards */
  initTwistData(picking, mouseX, mouseY, twistData) {
    picking.pickVerticesInSphere(picking.getLocalRadius2());
    vec3.negate(twistData.normal, picking.getEyeDirection());
    vec2.set(twistData.center, mouseX, mouseY);
  }

  /** Make a brush twist stroke */
  sculptStroke() {
    const main = this._main;
    const mx = main._mouseX;
    const my = main._mouseY;
    const lx = main._lastMouseX;
    const ly = main._lastMouseY;
    const picking = main.getPicking();
    const rLocal2 = picking.getLocalRadius2();
    picking.pickVerticesInSphere(rLocal2);
    this.stroke(picking, mx, my, lx, ly, this._twistData);

    if (main.getSculptManager().getSymmetry()) {
      const pickingSym = main.getPickingSymmetry();
      if (pickingSym.getMesh()) {
        pickingSym.pickVerticesInSphere(rLocal2);
        this.stroke(pickingSym, lx, ly, mx, my, this._twistDataSym);
      }
    }
    this.updateRender();
    main.setCanvasCursor('default');
  }

  /** On stroke */
  stroke(picking, mx, my, lx, ly, twistData) {
    let iVertsInRadius = picking.getPickedVertices();

    // undo-redo
    this._main.getStateManager().pushVertices(iVertsInRadius);
    iVertsInRadius = this.dynamicTopology(picking);

    if (this._culling)
      iVertsInRadius = this.getFrontVertices(iVertsInRadius, picking.getEyeDirection());

    picking.updateAlpha(false);
    picking.setIdAlpha(this._idAlpha);
    this.twist(iVertsInRadius, picking.getIntersectionPoint(), picking.getLocalRadius2(), mx, my, lx, ly, twistData, picking);

    const mesh = this.getMesh();
    mesh.updateGeometry(mesh.getFacesFromVertices(iVertsInRadius), iVertsInRadius);
  }

  /** Twist the vertices around the mouse point intersection */
  twist(iVerts, center, radiusSquared, mouseX, mouseY, lastMouseX, lastMouseY, twistData, picking) {
    const mesh = this.getMesh();
    const mouseCenter = twistData.center;
    const vecMouse = [mouseX - mouseCenter[0], mouseY - mouseCenter[1]];
    if (vec2.len(vecMouse) < 30)
      return;
    vec2.normalize(vecMouse, vecMouse);
    const nPlane = twistData.normal;
    const rot = [0.0, 0.0, 0.0, 0.0];
    const vecOldMouse = [lastMouseX - mouseCenter[0], lastMouseY - mouseCenter[1]];
    vec2.normalize(vecOldMouse, vecOldMouse);
    const angle = Geometry.signedAngle2d(vecMouse, vecOldMouse);
    const vAr = mesh.getVertices();
    const mAr = mesh.getMaterials();
    const invRadius = 1.0 / Math.sqrt(radiusSquared);
    const cx = center[0];
    const cy = center[1];
    const cz = center[2];
    const coord = [0.0, 0.0, 0.0];
    for (let i = 0, l = iVerts.length; i < l; ++i) {
      const ind = iVerts[i] * 3;
      const vx = vAr[ind];
      const vy = vAr[ind + 1];
      const vz = vAr[ind + 2];
      const dx = vx - cx;
      const dy = vy - cy;
      const dz = vz - cz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) * invRadius;
      let fallOff = dist * dist;
      fallOff = 3.0 * fallOff * fallOff - 4.0 * fallOff * dist + 1.0;
      fallOff *= angle * mAr[ind + 2] * picking.getAlpha(vx, vy, vz);
      quat.setAxisAngle(rot, nPlane, fallOff);
      vec3.set(coord, vx, vy, vz);
      vec3.sub(coord, coord, center);
      vec3.transformQuat(coord, coord, rot);
      vec3.add(coord, coord, center);
      vAr[ind] = coord[0];
      vAr[ind + 1] = coord[1];
      vAr[ind + 2] = coord[2];
    }
  }
}

export default Twist;
