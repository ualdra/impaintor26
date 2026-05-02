export interface Point {
  x: number;
  y: number;
}

export interface DrawingStroke {
  type: 'STROKE' | 'CLEAR';
  playerId?: number;
  points: Point[];
  color: string;
  thickness: number;
  timestamp?: number;
}

export interface CanvasState {
  strokes: DrawingStroke[];
  imageData: string | null;
}

export type BrushTool = 'pen' | 'eraser';

export interface BrushConfig {
  color: string;
  thickness: number;
  tool: BrushTool;
}