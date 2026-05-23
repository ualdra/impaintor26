import { Point, BrushConfig, DrawingStroke } from '../../../models/drawing';
import { IDrawingTool, DrawingEngineContext } from './tools/drawing-tool.interface';
import { PenTool } from './tools/pen.tool';
import { EraserTool } from './tools/eraser.tool';

export class DrawingEngine {
  private isDrawing = false;
  private currentStroke: Point[] = [];
  
  private config: BrushConfig = { color: '#000000', thickness: 3, tool: 'pen' };
  private activeTool: IDrawingTool = new PenTool();
  
  private tools: Record<string, IDrawingTool> = {
    'pen': new PenTool(),
    'eraser': new EraserTool()
  };

  private boundPointerUp = () => this.processPointerUp();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onStrokeComplete: (stroke: DrawingStroke) => void
  ) {
    this.ensureCanvasReady();
    document.addEventListener('mouseup', this.boundPointerUp);
  }

  destroy(): void {
    document.removeEventListener('mouseup', this.boundPointerUp);
  }

  setConfig(config: BrushConfig): void {
    this.config = config;
    if (this.tools[config.tool]) {
      this.activeTool = this.tools[config.tool];
    }
  }

  processPointerDown(clientX: number, clientY: number): void {
    this.ensureCanvasReady();
    this.isDrawing = true;
    this.currentStroke = [];
    const point = this.getCanvasPoint(clientX, clientY);
    this.activeTool.onStart(point, this.createContext(), this.config);
  }

  processPointerMove(clientX: number, clientY: number): void {
    if (!this.isDrawing) return;
    const point = this.getCanvasPoint(clientX, clientY);
    this.activeTool.onMove(point, this.createContext(), this.config);
  }

  processPointerUp(): void {
    if (!this.isDrawing) return;
    this.activeTool.onEnd(this.createContext());
    this.isDrawing = false;
    if (this.currentStroke.length > 0) {
      this.emitStroke();
    }
  }

  clear(): void {
    const ctx = this.getCtx();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // ===== MÉTODOS INTERNOS =====

  private createContext(): DrawingEngineContext {
    return {
      ctx: this.getCtx(),
      canvas: this.canvas,
      addPointToStroke: (point: Point) => {
        this.currentStroke.push(point);
      }
    };
  }

  private getCtx(): CanvasRenderingContext2D {
    return this.canvas.getContext('2d')!;
  }

  private ensureCanvasReady(): void {
    if (this.canvas.width !== 800 || this.canvas.height !== 600) {
      this.canvas.width = 800;
      this.canvas.height = 600;
      this.clear();
    }
  }

  private getCanvasPoint(clientX: number, clientY: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return { x: 0, y: 0 };
    }
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  private emitStroke(): void {
    this.onStrokeComplete({
      type: 'STROKE',
      points: this.currentStroke,
      color: this.config.color,
      thickness: this.config.thickness,
      timestamp: Date.now()
    });
    this.currentStroke = [];
  }
}