import ExportOBJ from './ExportOBJ';
import ExportSGL from './ExportSGL';
import ExportPLY from './ExportPLY';
import ExportSTL from './ExportSTL';
import ExportSketchfab from './ExportSketchfab';
import ExportMaterialise from './ExportMaterialise';

const Export = {};
Export.exportOBJ = ExportOBJ.exportOBJ;
Export.exportSGL = ExportSGL.exportSGL;
Export.exportAsciiPLY = ExportPLY.exportAsciiPLY;
Export.exportBinaryPLY = ExportPLY.exportBinaryPLY;
Export.exportAsciiSTL = ExportSTL.exportAsciiSTL;
Export.exportBinarySTL = ExportSTL.exportBinarySTL;
Export.exportSketchfab = ExportSketchfab.exportSketchfab;
Export.exportMaterialise = ExportMaterialise.exportMaterialise;

export default Export;
