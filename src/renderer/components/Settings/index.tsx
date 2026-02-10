import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { api } from '../../lib/ipc-client';
import { toast } from '../Toast';
import type { Settings } from '../../../shared/types';
import './Settings.css';

export function SettingsPanel() {
  const { settings, setSettings, settingsVisible, setSettingsVisible } = useStore();
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings, settingsVisible]);

  const handleChange = <K extends keyof Settings>(
    section: K,
    key: keyof Settings[K],
    value: Settings[K][typeof key]
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await api.settings.save(localSettings);
      setSettings(localSettings);
      toast.success('Settings saved');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (!confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }
    setSettingsVisible(false);
  };

  if (!settingsVisible) {
    return null;
  }

  return (
    <div className="settings-overlay" onClick={handleClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={handleClose}>
            &times;
          </button>
        </div>

        <div className="settings-content">
          <section className="settings-section">
            <h3>Terminal</h3>
            <div className="setting-row">
              <label>Font Size</label>
              <input
                type="number"
                min={8}
                max={24}
                value={localSettings.terminal.fontSize}
                onChange={(e) =>
                  handleChange('terminal', 'fontSize', parseInt(e.target.value) || 14)
                }
              />
            </div>
            <div className="setting-row">
              <label>Font Family</label>
              <input
                type="text"
                value={localSettings.terminal.fontFamily}
                onChange={(e) => handleChange('terminal', 'fontFamily', e.target.value)}
              />
            </div>
          </section>

          <section className="settings-section">
            <h3>Editor</h3>
            <div className="setting-row">
              <label>Font Size</label>
              <input
                type="number"
                min={8}
                max={24}
                value={localSettings.editor.fontSize}
                onChange={(e) =>
                  handleChange('editor', 'fontSize', parseInt(e.target.value) || 14)
                }
              />
            </div>
            <div className="setting-row">
              <label>Tab Size</label>
              <input
                type="number"
                min={2}
                max={8}
                value={localSettings.editor.tabSize}
                onChange={(e) =>
                  handleChange('editor', 'tabSize', parseInt(e.target.value) || 2)
                }
              />
            </div>
          </section>

          <section className="settings-section">
            <h3>Behavior</h3>
            <div className="setting-row">
              <label>Confirm on close</label>
              <input
                type="checkbox"
                checked={localSettings.behavior.confirmOnClose}
                onChange={(e) => handleChange('behavior', 'confirmOnClose', e.target.checked)}
              />
            </div>
            <div className="setting-row">
              <label>Auto-save files</label>
              <input
                type="checkbox"
                checked={localSettings.behavior.autoSave}
                onChange={(e) => handleChange('behavior', 'autoSave', e.target.checked)}
              />
            </div>
          </section>
        </div>

        <div className="settings-footer">
          <button className="cancel-btn" onClick={handleClose}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSave} disabled={!hasChanges}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
