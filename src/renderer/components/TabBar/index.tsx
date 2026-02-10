import React, { useRef, useEffect } from 'react';
import { useStore } from '../../store';
import { Tab } from './Tab';
import type { Tab as TabType, TabType as TabTypeEnum } from '../../../shared/types';
import './TabBar.css';

interface TabBarProps {
  onNewTab?: (type: TabTypeEnum) => void;
}

export function TabBar({ onNewTab }: TabBarProps) {
  const { tabs, activeTabId, setActiveTab, removeTab, settings } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeTabId && scrollRef.current) {
      const activeElement = scrollRef.current.querySelector('.tab-item.active');
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [activeTabId]);

  const handleClose = (tab: TabType) => {
    if (tab.isDirty && settings.behavior.confirmOnClose) {
      if (!confirm(`${tab.title} has unsaved changes. Close anyway?`)) {
        return;
      }
    }
    removeTab(tab.id);
  };

  return (
    <div className="tab-bar">
      <div className="tab-bar-scroll" ref={scrollRef}>
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={() => setActiveTab(tab.id)}
            onClose={() => handleClose(tab)}
          />
        ))}
      </div>
      {onNewTab && (
        <button
          className="new-tab-btn"
          onClick={() => onNewTab('terminal')}
          title="New Terminal (Cmd+T)"
        >
          +
        </button>
      )}
    </div>
  );
}
