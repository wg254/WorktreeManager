import React from 'react';
import type { Tab as TabType } from '../../../shared/types';

interface TabProps {
  tab: TabType;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}

const tabIcons: Record<TabType['type'], string> = {
  terminal: '>_',
  diff: '+-',
  editor: '</> ',
  jobs: '[]',
};

export function Tab({ tab, isActive, onSelect, onClose }: TabProps) {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <button
      className={`tab-item ${isActive ? 'active' : ''} ${tab.isDirty ? 'dirty' : ''}`}
      onClick={onSelect}
      title={tab.filePath || tab.title}
    >
      <span className="tab-icon">{tabIcons[tab.type]}</span>
      <span className="tab-title">{tab.title}</span>
      {tab.isDirty && <span className="tab-dirty-indicator" />}
      <button className="tab-close" onClick={handleClose} title="Close tab">
        &times;
      </button>
    </button>
  );
}
