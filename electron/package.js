import { packager } from '@electron/packager';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Ship only the built web app and the Electron entry points.
const keep = [/^\/dist(\/|$)/, /^\/electron(\/(main|windowState)\.js|\/preload\.cjs)?$/, /^\/package\.json$/];

const appPaths = await packager({
  dir: root,
  out: path.join(root, 'release'),
  name: 'SculptGL',
  overwrite: true,
  asar: true,
  prune: true,
  platform: process.env.SCULPTGL_PLATFORM || process.platform,
  arch: process.env.SCULPTGL_ARCH || process.arch,
  ignore: (file) => file !== '' && !keep.some((re) => re.test(file))
});

console.log('Packaged:\n' + appPaths.join('\n'));
