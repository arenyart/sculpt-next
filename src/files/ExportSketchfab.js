import TR from '../gui/GuiTR';
import ExportPLY from './ExportPLY';
import FileUtils from '../misc/FileUtils';
import SketchfabOAuth2 from './SketchfabOAuth2';

const API = 'https://api.sketchfab.com/v3/models';
const POLL_INTERVAL = 5000;

const Export = {};

const getAuthHeader = function (key) {
  if (key && typeof key === 'object' && key.token_type === 'Bearer')
    return 'Bearer ' + key.access_token;
  return 'Token ' + key;
};

const pollProcessing = async function (uid, key) {
  for (;;) {
    const response = await fetch(`${API}/${uid}`, { headers: { Authorization: getAuthHeader(key) } });
    const res = await response.json();
    const processing = res.status && res.status.processing;
    if (processing === 'FAILED') {
      window.alert(TR('sketchfabUploadError', res.status.error || 'processing failed'));
      return;
    }
    if (processing === 'SUCCEEDED') {
      window.prompt(TR('sketchfabUploadSuccess'), 'https://sketchfab.com/models/' + uid);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
};

const doExportSketchfab = async function (xhr, main, key, statusWidget) {
  // XMLHttpRequest (rather than fetch) because it reports upload progress.
  xhr.open('POST', API, true);
  xhr.setRequestHeader('Authorization', getAuthHeader(key));

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable && event.total) {
      const val = Math.round(event.loaded * 100.0 / event.total);
      statusWidget.setMessage('Sketchfab upload: ' + val + '%');
    }
  };
  const hideStatus = () => statusWidget.setMessage('');
  xhr.onerror = hideStatus;
  xhr.onabort = hideStatus;

  xhr.onload = () => {
    hideStatus();
    let res = {};
    try {
      res = JSON.parse(xhr.responseText);
    } catch {
      // non-JSON error page
    }
    const uid = res.uid;
    if (!uid) {
      window.alert(TR('sketchfabUploadError', res.detail || xhr.statusText));
      return;
    }
    window.prompt(TR('sketchfabUploadProcessing'), 'https://sketchfab.com/models/' + uid);
    pollProcessing(uid, key).catch((err) => console.error(err));
  };

  statusWidget.setMessage('Creating zip...');
  const data = ExportPLY.exportBinaryPLY(main.getMeshes(), { swapXY: true });
  const blob = await FileUtils.zipBlob('yourMesh.ply', data);
  if (xhr.isAborted) return;

  const fd = new FormData();
  fd.append('modelFile', blob, 'sculptglModel.zip');
  fd.append('name', 'My model');
  fd.append('tags', 'sculptgl');

  statusWidget.setMessage('Sketchfab upload...');
  xhr.send(fd);
};

Export.exportSketchfab = function (main, statusWidget) {
  if (!window.sketchfabOAuth2Config)
    return;

  const xhr = new XMLHttpRequest();
  const client = new SketchfabOAuth2(window.sketchfabOAuth2Config);
  client.connect()
    .then((key) => doExportSketchfab(xhr, main, key, statusWidget))
    .catch((error) => {
      statusWidget.setMessage('');
      console.error(error);
    });

  return xhr;
};

export default Export;
