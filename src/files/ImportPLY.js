import Utils from '../misc/Utils';
import MeshStatic from '../mesh/meshStatic/MeshStatic';

const Import = {};

const typeToOctet = function (type) {
  switch (type) {
  case 'uchar':
  case 'char':
  case 'int8':
  case 'uint8':
    return 1;
  case 'ushort':
  case 'short':
  case 'int16':
  case 'uint16':
    return 2;
  case 'uint':
  case 'int':
  case 'float':
  case 'int32':
  case 'uint32':
  case 'float32':
    return 4;
  case 'double':
  case 'float64':
    return 8;
  default:
    return 0;
  }
};

const getParseFunc = function (type, isFloat) {
  const fac = isFloat ? 1.0 / 255.0 : 1;
  switch (type) {
  case 'char':
  case 'uchar':
  case 'short':
  case 'ushort':
  case 'int':
  case 'uint':
  case 'int8':
  case 'uint8':
  case 'int16':
  case 'uint16':
  case 'int32':
  case 'uint32':
    return function (n) {
      return parseInt(n, 10) * fac;
    };
  case 'float':
  case 'double':
  case 'float32':
  case 'float64':
    return parseFloat;
  default:
    return function (n) {
      return n;
    };
  }
};

const getBinaryRead = function (dview, prop, isFloat) {
  const fac = isFloat ? 1.0 / 255.0 : 1;
  const offset = prop.offsetOctet;
  switch (prop.type) {
  case 'int8':
  case 'char':
    return function (off) {
      return dview.getInt8(off + offset) * fac;
    };
  case 'uint8':
  case 'uchar':
    return function (off) {
      return dview.getUint8(off + offset) * fac;
    };
  case 'int16':
  case 'short':
    return function (off) {
      return dview.getInt16(off + offset, true) * fac;
    };
  case 'uint16':
  case 'ushort':
    return function (off) {
      return dview.getUint16(off + offset, true) * fac;
    };
  case 'int32':
  case 'int':
    return function (off) {
      return dview.getInt32(off + offset, true) * fac;
    };
  case 'uint32':
  case 'uint':
    return function (off) {
      return dview.getUint32(off + offset, true) * fac;
    };
  case 'float32':
  case 'float':
    return function (off) {
      return dview.getFloat32(off + offset, true);
    };
  case 'float64':
  case 'double':
    return function (off) {
      return dview.getFloat64(off + offset, true);
    };
  }
};

const readHeader = function (buffer) {
  const data = Utils.ab2str(buffer);
  const lines = data.split('\n');

  const infos = {
    isBinary: false,
    start: 0,
    elements: [],
    lines: lines,
    buffer: buffer,
    vertices: null,
    faces: null,
    colors: null,
    offsetLine: 0,
    offsetOctet: 0
  };

  let i = 0;
  let split;

  while (true) {
    let line = lines[i++];
    infos.offsetOctet += line.length + 1;
    infos.offsetLine = i;

    line = line.trim();

    if (line.startsWith('format binary')) {
      infos.isBinary = true;

    } else if (line.startsWith('element')) {

      split = line.split(/\s+/);
      infos.elements.push({
        name: split[1],
        count: parseInt(split[2], 10),
        properties: []
      });

    } else if (line.startsWith('property')) {

      split = line.split(/\s+/);
      const isList = split[1] === 'list';
      infos.elements[infos.elements.length - 1].properties.push({
        type: split[isList ? 2 : 1],
        type2: isList ? split[3] : undefined,
        name: split[isList ? 4 : 2]
      });

    } else if (line.startsWith('end_header')) {

      break;
    }
  }

  return infos;
};

///////////////
// READ VERTEX
///////////////
const prepareElements = function (element, infos) {
  const props = element.properties;
  const objProperties = element.objProperties = {};
  element.offsetOctet = 0;

  for (let i = 0, nbProps = props.length; i < nbProps; ++i) {
    const prop = props[i];
    const objProp = objProperties[prop.name] = {};
    objProp.type = prop.type;
    objProp.type2 = prop.type2;
    if (infos.isBinary) {
      objProp.offsetOctet = element.offsetOctet;
      element.offsetOctet += typeToOctet(prop.type);
    } else {
      objProp.id = i;
    }
  }
};

///////////////
// READ VERTEX
///////////////

const readAsciiVertex = function (element, infos, vAr, cAr) {

  const count = element.count;
  const lines = infos.lines;
  const props = element.objProperties;
  const offsetLine = infos.offsetLine;

  const parseX = getParseFunc(props.x.type, true);
  const parseY = getParseFunc(props.y.type, true);
  const parseZ = getParseFunc(props.z.type, true);

  const xID = props.x.id;
  const yID = props.y.id;
  const zID = props.z.id;

  let parseR, parseG, parseB;
  if (props.red) parseR = getParseFunc(props.red.type, true);
  if (props.green) parseG = getParseFunc(props.green.type, true);
  if (props.blue) parseB = getParseFunc(props.blue.type, true);

  let rID, gID, bID;
  if (props.red) rID = props.red.id;
  if (props.green) gID = props.green.id;
  if (props.blue) bID = props.blue.id;

  for (let i = 0; i < count; ++i) {
    const id = i * 3;
    const split = lines[offsetLine + i].trim().split(/\s+/);
    vAr[id] = parseX(split[xID]);
    vAr[id + 1] = parseY(split[yID]);
    vAr[id + 2] = parseZ(split[zID]);
    if (parseR) cAr[id] = parseR(split[rID]);
    if (parseG) cAr[id + 1] = parseG(split[gID]);
    if (parseB) cAr[id + 2] = parseB(split[bID]);
  }

  infos.offsetLine += count;
};

const readBinaryVertex = function (element, infos, vAr, cAr) {
  const count = element.count;
  const props = element.objProperties;
  const offsetOctet = element.offsetOctet;
  const lenOctet = offsetOctet * count;

  const dview = new DataView(infos.buffer, infos.offsetOctet, lenOctet);
  const readX = getBinaryRead(dview, props.x, true);
  const readY = getBinaryRead(dview, props.y, true);
  const readZ = getBinaryRead(dview, props.z, true);

  let readR, readG, readB;
  if (props.red) readR = getBinaryRead(dview, props.red, true);
  if (props.green) readG = getBinaryRead(dview, props.green, true);
  if (props.blue) readB = getBinaryRead(dview, props.blue, true);

  for (let i = 0; i < count; ++i) {
    const id = i * 3;
    const offset = i * offsetOctet;

    vAr[id] = readX(offset);
    vAr[id + 1] = readY(offset);
    vAr[id + 2] = readZ(offset);
    if (readR) cAr[id] = readR(offset);
    if (readG) cAr[id + 1] = readG(offset);
    if (readB) cAr[id + 2] = readB(offset);
  }

  infos.offsetOctet += lenOctet;
};

const readElementVertex = function (element, infos) {

  prepareElements(element, infos);

  const vAr = infos.vertices = new Float32Array(element.count * 3);
  let cAr;
  const props = element.objProperties;
  if (props.red || props.green || props.blue)
    cAr = infos.colors = new Float32Array(element.count * 3);

  if (!infos.isBinary)
    readAsciiVertex(element, infos, vAr, cAr);
  else
    readBinaryVertex(element, infos, vAr, cAr);
};

/////////////
// READ INDEX
/////////////
const readAsciiIndex = function (element, infos, fAr) {

  const count = element.count;
  const lines = infos.lines;
  const props = element.objProperties;
  const offsetLine = infos.offsetLine;

  const propIndex = props.vertex_index || props.vertex_indices;

  const parseCount = getParseFunc(propIndex.type);
  const parseIndex = getParseFunc(propIndex.type2);

  const id = propIndex.id;

  let idFace = 0;
  for (let i = 0; i < count; ++i) {
    const split = lines[offsetLine + i].trim().split(/\s+/);
    const nbVert = parseCount(split[0]);
    if (nbVert !== 3 && nbVert !== 4)
      continue;

    fAr[idFace] = parseIndex(split[id + 1]);
    fAr[idFace + 1] = parseIndex(split[id + 2]);
    fAr[idFace + 2] = parseIndex(split[id + 3]);
    fAr[idFace + 3] = nbVert === 4 ? parseIndex(split[id + 4]) : Utils.TRI_INDEX;
    idFace += 4;
  }

  infos.offsetLine += count;
};

const readBinaryIndex = function (element, infos, fAr, dummy) {
  const count = element.count;
  const props = element.objProperties;
  const pidx = props && (props.vertex_index || props.vertex_indices);
  const propIndex = pidx || element.properties[0];

  const dview = new DataView(infos.buffer, infos.offsetOctet);
  const readCount = getBinaryRead(dview, propIndex);

  const readIndex = getBinaryRead(dview, {
    type: propIndex.type2,
    offsetOctet: propIndex.offsetOctet + typeToOctet(propIndex.type)
  });

  const nbOctetIndex = typeToOctet(propIndex.type2);
  const offsetOctet = element.offsetOctet;
  let offsetCurrent = 0;

  let idf = 0;
  for (let i = 0; i < count; ++i) {
    const nbVert = readCount(offsetCurrent);

    if (nbVert === 3 || nbVert === 4) {
      fAr[idf++] = readIndex(offsetCurrent);
      fAr[idf++] = readIndex(offsetCurrent + nbOctetIndex);
      fAr[idf++] = readIndex(offsetCurrent + 2 * nbOctetIndex);
      fAr[idf++] = nbVert === 3 ? Utils.TRI_INDEX : readIndex(offsetCurrent + 3 * nbOctetIndex);
    }

    offsetCurrent += nbVert * nbOctetIndex + offsetOctet;
  }

  if (!dummy)
    infos.faces = fAr.subarray(0, idf);
  infos.offsetOctet += offsetCurrent;
};

const readElementIndex = function (element, infos) {

  prepareElements(element, infos);

  const fAr = infos.faces = new Uint32Array(element.count * 4);
  if (!infos.isBinary)
    readAsciiIndex(element, infos, fAr);
  else
    readBinaryIndex(element, infos, fAr);
};

const skipElement = function (element, infos) {

  const count = element.count;

  if (!infos.isBinary) {

    infos.offsetLine += count;

  } else {

    readBinaryIndex(element, infos, [], true);
  }

};

Import.importPLY = function (buffer, gl) {

  const infos = readHeader(buffer);
  const elements = infos.elements;

  for (let i = 0, nbElts = elements.length; i < nbElts; ++i) {

    const element = elements[i];

    if (element.name === 'vertex') {
      readElementVertex(element, infos);
    } else if (element.name === 'face') {
      readElementIndex(element, infos);
    } else {
      skipElement(element, infos);
    }
  }

  const mesh = new MeshStatic(gl);
  mesh.setVertices(infos.vertices);
  mesh.setFaces(infos.faces);
  mesh.setColors(infos.colors);
  return [mesh];
};

export default Import;
