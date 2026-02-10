import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import fs from 'fs';
import { GitService } from './services/git.service';
import { PtyManager } from './services/pty-manager';
import { FileWatcher } from './services/file-watcher';
import { Database } from './services/database';
import { JobScheduler } from './services/job-scheduler';
import { SettingsService } from './services/settings';
import { SessionService } from './services/session';
import { registerGitHandlers } from './ipc/git.ipc';
import { registerPtyHandlers } from './ipc/pty.ipc';
import { registerFileHandlers } from './ipc/files.ipc';
import { registerJobHandlers } from './ipc/jobs.ipc';
import { registerSettingsHandlers } from './ipc/settings.ipc';
import { registerSessionHandlers } from './ipc/session.ipc';
import { IPC_CHANNELS } from '../shared/ipc-types';

let mainWindow: BrowserWindow | null = null;
let basePath: string = process.cwd();

// Window state persistence
interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const windowStateFile = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState(): WindowState {
  const defaultState: WindowState = {
    width: 1400,
    height: 900,
    isMaximized: false,
  };

  try {
    if (fs.existsSync(windowStateFile)) {
      const data = fs.readFileSync(windowStateFile, 'utf-8');
      const state = JSON.parse(data) as WindowState;

      // Validate that the window is on a visible screen
      const displays = screen.getAllDisplays();
      const isOnScreen = displays.some((display) => {
        const { x, y, width, height } = display.bounds;
        return (
          state.x !== undefined &&
          state.y !== undefined &&
          state.x >= x &&
          state.x < x + width &&
          state.y >= y &&
          state.y < y + height
        );
      });

      if (isOnScreen) {
        return state;
      }
    }
  } catch (error) {
    console.error('Failed to load window state:', error);
  }

  return defaultState;
}

function saveWindowState(window: BrowserWindow): void {
  try {
    const bounds = window.getBounds();
    const state: WindowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: window.isMaximized(),
    };
    fs.writeFileSync(windowStateFile, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Failed to save window state:', error);
  }
}

// Services
let gitService: GitService;
let ptyManager: PtyManager;
let fileWatcher: FileWatcher;
let database: Database;
let jobScheduler: JobScheduler;
let settingsService: SettingsService;
let sessionService: SessionService;

function createWindow() {
  const preloadPath = path.join(__dirname, '..', 'preload', 'index.js');
  const windowState = loadWindowState();

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for node-pty
    },
  });

  // Restore maximized state
  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  // Save window state on close and resize
  mainWindow.on('close', () => {
    if (mainWindow) {
      saveWindowState(mainWindow);
    }
  });

  mainWindow.on('resize', () => {
    if (mainWindow && !mainWindow.isMaximized()) {
      // Debounce resize saves
      clearTimeout((mainWindow as any)._resizeTimer);
      (mainWindow as any)._resizeTimer = setTimeout(() => {
        if (mainWindow) saveWindowState(mainWindow);
      }, 500);
    }
  });

  mainWindow.on('move', () => {
    if (mainWindow && !mainWindow.isMaximized()) {
      // Debounce move saves
      clearTimeout((mainWindow as any)._moveTimer);
      (mainWindow as any)._moveTimer = setTimeout(() => {
        if (mainWindow) saveWindowState(mainWindow);
      }, 500);
    }
  });

  // Load renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const htmlPath = path.join(__dirname, '..', '..', 'renderer', 'index.html');
    mainWindow.loadFile(htmlPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initializeServices() {
  // Initialize services
  gitService = new GitService();
  ptyManager = new PtyManager();
  fileWatcher = new FileWatcher();
  database = new Database();
  jobScheduler = new JobScheduler(database);
  settingsService = new SettingsService();
  sessionService = new SessionService();

  // Register IPC handlers
  registerGitHandlers(gitService);
  registerPtyHandlers(ptyManager, () => mainWindow);
  registerFileHandlers(fileWatcher, () => mainWindow);
  registerJobHandlers(jobScheduler, () => mainWindow);
  registerSettingsHandlers(settingsService);
  registerSessionHandlers(sessionService);

  // App base path handler
  ipcMain.handle(IPC_CHANNELS.APP_GET_BASE_PATH, () => basePath);

  // Set up file watcher event forwarding
  fileWatcher.on('change', (change) => {
    mainWindow?.webContents.send(IPC_CHANNELS.FILE_CHANGE, change);
  });

  // Set up job status change forwarding
  jobScheduler.on('statusChange', (data) => {
    mainWindow?.webContents.send(IPC_CHANNELS.JOB_STATUS_CHANGE, data);
  });

  // Start job scheduler (rehydrate from DB)
  await jobScheduler.start();
}

async function cleanup() {
  // Cleanup all PTY sessions
  ptyManager.destroyAll();

  // Stop file watcher
  fileWatcher.stop();

  // Stop job scheduler
  jobScheduler.stop();

  // Close database
  database.close();
}

// Handle command line arguments for base path
const args = process.argv.slice(2);
const pathArg = args.find(arg => !arg.startsWith('-'));
if (pathArg) {
  basePath = path.resolve(pathArg);
}

app.whenReady().then(async () => {
  await initializeServices();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  await cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await cleanup();
});
