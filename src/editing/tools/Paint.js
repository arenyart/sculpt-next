import { vec3 } from 'gl-matrix';
import Tablet from '../../misc/Tablet';
import SculptBase from './SculptBase';

class Paint extends SculptBase {

  constructor(main) {
    super(main);

    this._radius = 50;
    this._hardness = 0.75;
    this._intensity = 0.75;
    this._culling = false;
    this._color = vec3.fromValues(1.0, 0.766, 0.336); // albedo
    this._material = vec3.fromValues(0.3, 0.95, 0.0); // roughness/metallic/masking
    this._pickColor = false; // color picking
    this._pickCallback = null; // callback function after picking a color
    this._idAlpha = 0;
    this._lockPosition = false;

    this._writeAlbedo = true;
    this._writeRoughness = true;
    this._writeMetalness = true;
  }

  end() {
    this._pickColor = false;
    super.end();
  }

  pushState(force) {
    if (!this._pickColor || force)
      this._main.getStateManager().pushStateColorAndMaterial(this.getMesh());
  }

  startSculpt() {
    if (this._pickColor)
      return this.pickColor(this._main.getPicking());
    super.startSculpt();
  }

  update(contin) {
    if (this._pickColor === true)
      return this.updatePickColor();
    super.update(contin);
  }

  updateContinuous() {
    if (this._pickColor === true)
      return this.updatePickColor();
    super.updateContinuous();
  }

  updateMeshBuffers() {
    const mesh = this.getMesh();
    if (mesh.isDynamic) {
      mesh.updateBuffers();
    } else {
      mesh.updateColorBuffer();
      mesh.updateMaterialBuffer();
    }
  }

  updatePickColor() {
    const picking = this._main.getPicking();
    if (picking.intersectionMouseMesh())
      this.pickColor(picking);
  }

  setPickCallback(cb) {
    this._pickCallback = cb;
  }

  pickColor(picking) {
    const mesh = this.getMesh();
    const color = this._color;
    picking.polyLerp(mesh.getMaterials(), color);
    const roughness = color[0];
    const metallic = color[1];
    picking.polyLerp(mesh.getColors(), color);
    this._pickCallback(color, roughness, metallic);
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
    this.paint(iVertsInRadius, picking.getIntersectionPoint(), picking.getLocalRadius2(), intensity, this._hardness, picking);

    const mesh = this.getMesh();
    mesh.updateDuplicateColorsAndMaterials(iVertsInRadius);
    if (mesh.isUsingDrawArrays())
      mesh.updateDrawArrays(mesh.getFacesFromVertices(iVertsInRadius));
  }

  paint(iVerts, center, radiusSquared, intensity, hardness, picking) {
    const mesh = this.getMesh();
    const vAr = mesh.getVertices();
    const cAr = mesh.getColors();
    const mAr = mesh.getMaterials();
    const color = this._color;
    const roughness = this._material[0];
    const metallic = this._material[1];
    const radius = Math.sqrt(radiusSquared);
    const cr = color[0];
    const cg = color[1];
    const cb = color[2];
    const cx = center[0];
    const cy = center[1];
    const cz = center[2];
    const softness = 2 * (1 - hardness);
    for (let i = 0, l = iVerts.length; i < l; ++i) {
      const ind = iVerts[i] * 3;
      const vx = vAr[ind];
      const vy = vAr[ind + 1];
      const vz = vAr[ind + 2];
      const dx = vx - cx;
      const dy = vy - cy;
      const dz = vz - cz;
      let dist = Math.sqrt(dx * dx + dy * dy + dz * dz) / radius;
      if (dist > 1) dist = 1.0;

      let fallOff = Math.pow(1 - dist, softness);
      fallOff *= intensity * mAr[ind + 2] * picking.getAlpha(vx, vy, vz);
      const fallOffCompl = 1.0 - fallOff;

      if (this._writeAlbedo) {
        cAr[ind] = cAr[ind] * fallOffCompl + cr * fallOff;
        cAr[ind + 1] = cAr[ind + 1] * fallOffCompl + cg * fallOff;
        cAr[ind + 2] = cAr[ind + 2] * fallOffCompl + cb * fallOff;
      }

      if (this._writeRoughness) {
        mAr[ind] = mAr[ind] * fallOffCompl + roughness * fallOff;
      }

      if (this._writeMetalness) {
        mAr[ind + 1] = mAr[ind + 1] * fallOffCompl + metallic * fallOff;
      }
    }
  }

  paintAll() {
    const mesh = this.getMesh();
    const iVerts = this.getUnmaskedVertices();
    if (iVerts.length === 0)
      return;

    this.pushState(true);
    this._main.getStateManager().pushVertices(iVerts);

    const cAr = mesh.getColors();
    const mAr = mesh.getMaterials();
    const color = this._color;
    const roughness = this._material[0];
    const metallic = this._material[1];
    const cr = color[0];
    const cg = color[1];
    const cb = color[2];
    for (let i = 0, nb = iVerts.length; i < nb; ++i) {
      const ind = iVerts[i] * 3;
      const fallOff = mAr[ind + 2];
      const fallOffCompl = 1.0 - fallOff;

      if (this._writeAlbedo) {
        cAr[ind] = cAr[ind] * fallOffCompl + cr * fallOff;
        cAr[ind + 1] = cAr[ind + 1] * fallOffCompl + cg * fallOff;
        cAr[ind + 2] = cAr[ind + 2] * fallOffCompl + cb * fallOff;
      }

      if (this._writeRoughness) {
        mAr[ind] = mAr[ind] * fallOffCompl + roughness * fallOff;
      }

      if (this._writeMetalness) {
        mAr[ind + 1] = mAr[ind + 1] * fallOffCompl + metallic * fallOff;
      }
    }

    mesh.updateDuplicateColorsAndMaterials();
    mesh.updateDrawArrays();
    this.updateRender();
  }
}

export default Paint;
