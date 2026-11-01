import ExportSTL from './ExportSTL';
import FileUtils from '../misc/FileUtils';

const Export = {};

const doExportMaterialise = async function (xhr, main, statusWidget) {
  // XMLHttpRequest (rather than fetch) because it reports upload progress.
  xhr.open('POST', 'https://i.materialise.com/web-api/tool/20cc0fd6-3cef-4111-a201-0b87026d892c/model', true);

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable && event.total) {
      const val = Math.round(event.loaded * 100.0 / event.total);
      statusWidget.setMessage('Materialise upload: ' + val + '%');
    }
  };

  const hideStatus = () => statusWidget.setMessage('');
  xhr.onerror = hideStatus;
  xhr.onabort = hideStatus;

  xhr.onload = () => {
    hideStatus();
    if (xhr.status === 200) {
      const json = JSON.parse(xhr.responseText);
      window.open('https://i.materialise.com/en/3dprint#modelId=' + json.modelID, '_blank', 'noopener');
    }
  };

  const data = ExportSTL.exportBinarySTL(main.getMeshes(), { colorMagic: true, swapXY: true });

  statusWidget.setMessage('Creating zip...');
  const blob = await FileUtils.zipBlob('yourMesh.stl', data);
  if (xhr.isAborted) return;

  const fd = new FormData();
  fd.append('file', blob, 'yourMesh.zip');

  statusWidget.setMessage('Materialise upload...');
  xhr.send(fd);
};

Export.exportMaterialise = function (main, statusWidget) {
  const xhr = new XMLHttpRequest();
  doExportMaterialise(xhr, main, statusWidget).catch((err) => {
    statusWidget.setMessage('');
    console.error(err);
  });
  return xhr;
};

export default Export;
