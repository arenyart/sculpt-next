import { describe, expect, test } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import Primitives from '../src/drawables/Primitives';
import Export from '../src/files/Export';
import Import from '../src/files/Import';
import FileUtils from '../src/misc/FileUtils';

const createCube = () => Primitives.createCube(null);
const createTorus = () => Primitives.createTorus(null);

const sortedPositions = (mesh) => {
  const v = mesh.getVertices();
  const pts = [];
  for (let i = 0; i < mesh.getNbVertices(); ++i) pts.push([v[i * 3], v[i * 3 + 1], v[i * 3 + 2]].map((x) => Math.round(x * 1e4) / 1e4));
  return pts.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
};

const expectSameGeometry = (imported, original, { faces = original.getNbFaces() } = {}) => {
  expect(imported.getNbVertices()).toBe(original.getNbVertices());
  expect(imported.getNbFaces()).toBe(faces);
  expect(sortedPositions(imported)).toEqual(sortedPositions(original));
};

describe('mesh file round-trips', () => {
  test('OBJ keeps vertices, quads and UVs', async () => {
    const cube = createCube();
    const blob = Export.exportOBJ([cube]);
    const [mesh] = Import.importOBJ(await blob.text(), null);
    mesh.init();
    expectSameGeometry(mesh, cube);
    expect(mesh.hasUV()).toBe(true);
  });

  test('binary STL keeps welded vertices (triangulated)', async () => {
    const torus = createTorus();
    const blob = Export.exportBinarySTL([torus]);
    const buffer = await blob.arrayBuffer();
    expect(buffer.byteLength).toBe(84 + torus.getNbTriangles() * 50);

    const [mesh] = Import.importSTL(buffer, null);
    mesh.init();
    expectSameGeometry(mesh, torus, { faces: torus.getNbTriangles() });
  });

  test('ASCII STL can be parsed back', async () => {
    const cube = createCube();
    const buffer = await Export.exportAsciiSTL([cube]).arrayBuffer();
    const [mesh] = Import.importSTL(buffer, null);
    mesh.init();
    expectSameGeometry(mesh, cube, { faces: cube.getNbTriangles() });
  });

  test('binary PLY keeps vertices and quads', async () => {
    const torus = createTorus();
    const buffer = await Export.exportBinaryPLY([torus]).arrayBuffer();
    const [mesh] = Import.importPLY(buffer, null);
    mesh.init();
    expectSameGeometry(mesh, torus);
  });

  test('ASCII PLY keeps vertices and quads', async () => {
    const cube = createCube();
    const buffer = await Export.exportAsciiPLY([cube]).arrayBuffer();
    const [mesh] = Import.importPLY(buffer, null);
    mesh.init();
    expectSameGeometry(mesh, cube);
  });
});

describe('FileUtils', () => {
  test('detects supported file types, ignoring case and query strings', () => {
    expect(FileUtils.getFileType('Head.OBJ')).toBe('obj');
    expect(FileUtils.getFileType('https://example.com/a/model.stl?raw=1')).toBe('stl');
    expect(FileUtils.getFileType('scene.sgl')).toBe('sgl');
    expect(FileUtils.getFileType('scan.ply#x')).toBe('ply');
    expect(FileUtils.getFileType('texture.png')).toBeUndefined();
  });

  test('zipBlob produces a valid archive containing the file', async () => {
    const blob = Export.exportOBJ([createCube()]);
    const zipped = await FileUtils.zipBlob('yourMesh.obj', blob);
    expect(zipped.type).toBe('application/zip');

    const files = unzipSync(new Uint8Array(await zipped.arrayBuffer()));
    expect(Object.keys(files)).toEqual(['yourMesh.obj']);
    expect(strFromU8(files['yourMesh.obj'])).toBe(await blob.text());
  });
});
