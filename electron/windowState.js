import { app, screen } from 'electron';
import fs from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

// Sizes are stored as content size (window frames vary between platforms and window managers).

const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');

const isVisibleOnSomeDisplay = ({ x, y }) => screen.getAllDisplays().some(({ workArea: a }) =>
  x >= a.x && y >= a.y && x < a.x + a.width && y < a.y + a.height);

export async function loadWindowState(defaultSize) {
  try {
    const saved = JSON.parse(await fs.readFile(stateFile(), 'utf8'));
    const { x, y, width, height } = saved.bounds;
    const bounds = { width: width || defaultSize.width, height: height || defaultSize.height };
    if (Number.isFinite(x) && Number.isFinite(y) && isVisibleOnSomeDisplay({ x, y })) Object.assign(bounds, { x, y });
    return { bounds, isMaximized: !!saved.isMaximized };
  } catch {
    return { bounds: defaultSize, isMaximized: false };
  }
}

export function trackWindowState(win) {
  let last = null;
  const snapshot = () => {
    if (win.isDestroyed()) return;
    const isMaximized = win.isMaximized();
    if (!isMaximized && !win.isMinimized() && !win.isFullScreen()) {
      const [x, y] = win.getPosition();
      const [width, height] = win.getContentSize();
      last = { bounds: { x, y, width, height }, isMaximized };
    } else if (last) {
      last = { ...last, isMaximized };
    }
  };
  const write = () => {
    if (!last) return;
    try {
      writeFileSync(stateFile(), JSON.stringify(last));
    } catch {
      // best effort
    }
  };

  let timer = null;
  const onChange = () => {
    snapshot();
    clearTimeout(timer);
    timer = setTimeout(write, 500);
  };
  for (const event of ['resize', 'move', 'maximize', 'unmaximize']) win.on(event, onChange);
  win.once('ready-to-show', snapshot);
  win.on('close', () => {
    clearTimeout(timer);
    snapshot();
    write();
  });
}
