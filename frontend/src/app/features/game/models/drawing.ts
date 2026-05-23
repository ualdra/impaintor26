export interface Point {
  x: number;
  y: number;
}

export interface DrawingStroke {
  type: 'STROKE' | 'CLEAR';
  playerId?: number;
  strokeId?: string;   // ID único por trazo (de mousedown a mouseup)
  isLast?: boolean;    // true en el último segmento del trazo
  points: Point[];
  color: string;
  thickness: number;
  timestamp?: number;
}

export interface CanvasState {
  strokes: DrawingStroke[];
  snapshots: Map<number, string>; // playerId → dataUrl
}

export type BrushTool = 'pen' | 'eraser';

export interface BrushConfig {
  color: string;
  thickness: number;
  tool: BrushTool;
}