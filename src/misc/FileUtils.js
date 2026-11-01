import { zip } from 'fflate';

const FileUtils = {};

FileUtils.saveAs = function (blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

/** Compress a single blob into a zip archive (deflate runs off the main thread). */
FileUtils.zipBlob = async function (fileName, blob) {
  const data = new Uint8Array(await blob.arrayBuffer());
  const zipped = await new Promise((resolve, reject) => {
    zip({ [fileName]: data }, { level: 6 }, (err, out) => (err ? reject(err) : resolve(out)));
  });
  return new Blob([zipped], { type: 'application/zip' });
};

FileUtils.getFileType = function (name) {
  const lower = name.toLowerCase().split(/[?#]/)[0];
  if (lower.endsWith('.obj')) return 'obj';
  if (lower.endsWith('.sgl')) return 'sgl';
  if (lower.endsWith('.stl')) return 'stl';
  if (lower.endsWith('.ply')) return 'ply';
  return undefined;
};

export default FileUtils;
