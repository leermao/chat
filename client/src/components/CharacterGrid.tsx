import { useEffect, useRef, useState } from 'react';
import { Grid } from 'react-window';
import type { Character } from '../api';
import { CharacterCard } from './CharacterCard';

export interface CharacterCellData {
  characters: Character[];
  columnCount: number;
  onOpen: (character: Character) => void;
}

function CharacterCell({
  columnIndex,
  rowIndex,
  style,
  characters,
  columnCount,
  onOpen,
}: {
  ariaAttributes?: Record<string, unknown>;
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
} & CharacterCellData) {
  const index = rowIndex * columnCount + columnIndex;
  if (index >= characters.length) return null;
  const character = characters[index];
  return (
    <div style={{ ...style, padding: 8, overflow: 'hidden' }}>
      <CharacterCard character={character} key={character.id} onOpen={onOpen} />
    </div>
  );
}

export function CharacterGrid({
  characters,
  hasMore,
  isLoading,
  onLoadMore,
  onOpen,
}: {
  characters: Character[];
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  onOpen: (character: Character) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const loadTriggeredRef = useRef(false);

  // Reset load trigger when characters array changes (new data loaded)
  useEffect(() => {
    loadTriggeredRef.current = false;
  }, [characters]);

  // Reset load trigger when loading finishes (handles error case where characters might not change)
  const prevLoadingRef = useRef(isLoading);
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading) {
      loadTriggeredRef.current = false;
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const minCardWidth = 260;
  const columnCount = Math.max(1, Math.min(3, Math.floor(size.width / minCardWidth)));
  const columnWidth = size.width / columnCount;
  const rowHeight = 260; // card min-height 206 + padding + gap buffer
  const rowCount = Math.ceil(characters.length / columnCount);

  function handleCellsRendered(visibleCells: {
    columnStartIndex: number;
    columnStopIndex: number;
    rowStartIndex: number;
    rowStopIndex: number;
  }) {
    if (
      !isLoading &&
      hasMore &&
      visibleCells.rowStopIndex >= rowCount - 2 &&
      !loadTriggeredRef.current
    ) {
      loadTriggeredRef.current = true;
      onLoadMore();
    }
  }

  if (characters.length === 0 || size.width === 0 || size.height === 0) {
    return <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} aria-label="角色列表" />;
  }

  return (
    <div ref={containerRef} style={{ flex: 1, minHeight: 0 }}>
      <Grid<CharacterCellData>
        aria-label="角色列表"
        cellComponent={CharacterCell}
        cellProps={{ characters, columnCount, onOpen }}
        columnCount={columnCount}
        columnWidth={columnWidth}
        defaultHeight={size.height}
        defaultWidth={size.width}
        onCellsRendered={handleCellsRendered}
        overscanCount={2}
        rowCount={rowCount}
        rowHeight={rowHeight}
        style={{
          width: size.width,
          height: size.height,
          overflowX: 'hidden',
        }}
      />
    </div>
  );
}
