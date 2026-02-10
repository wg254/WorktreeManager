import React, { ReactNode, useCallback } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { useStore } from '../../store';

interface ResizableLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
  rightPanel?: ReactNode;
}

export function ResizableLayout({ sidebar, main, rightPanel }: ResizableLayoutProps) {
  const { paneSizes, setPaneSizes, rightPanelVisible } = useStore();

  const handleChange = useCallback(
    (sizes: number[]) => {
      if (sizes.length >= 2) {
        setPaneSizes({
          sidebar: sizes[0],
          rightPanel: sizes.length > 2 ? sizes[2] : paneSizes.rightPanel,
        });
      }
    },
    [setPaneSizes, paneSizes.rightPanel]
  );

  const showRightPanel = rightPanel && rightPanelVisible;

  return (
    <Allotment onChange={handleChange} className="resizable-layout">
      <Allotment.Pane
        minSize={200}
        preferredSize={paneSizes.sidebar}
        className="sidebar-pane"
      >
        {sidebar}
      </Allotment.Pane>
      <Allotment.Pane minSize={400} className="main-pane">
        {main}
      </Allotment.Pane>
      {showRightPanel && (
        <Allotment.Pane
          minSize={200}
          preferredSize={paneSizes.rightPanel}
          className="right-pane"
        >
          {rightPanel}
        </Allotment.Pane>
      )}
    </Allotment>
  );
}
