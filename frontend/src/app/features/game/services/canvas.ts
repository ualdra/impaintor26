import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { DrawingStroke, CanvasState, BrushConfig, BrushTool } from '../models/drawing';

@Injectable({
  providedIn: 'root'
})
export class CanvasService {

  private readonly brushConfig = new BehaviorSubject<BrushConfig>({
    color: '#000000',
    thickness: 3,
    tool: 'pen'
  });

  private strokeEmitter = new Subject<DrawingStroke>();

  private canvasState: CanvasState = {
    strokes: [],
    snapshots: new Map<number, string>()
  };

  // ===== OBSERVABLES PÚBLICOS =====

  getBrushConfig(): Observable<BrushConfig> {
    return this.brushConfig.asObservable();
  }

  getStrokeEmitter(): Observable<DrawingStroke> {
    return this.strokeEmitter.asObservable();
  }

  // ===== CONFIGURACIÓN DEL PINCEL =====

  setColor(color: string): void {
    const current = this.brushConfig.value;
    this.brushConfig.next({ ...current, color });
  }

  setThickness(thickness: number): void {
    const current = this.brushConfig.value;
    this.brushConfig.next({ ...current, thickness });
  }

  setTool(tool: BrushTool): void {
    const current = this.brushConfig.value;
    if (tool === 'eraser') {
      this.brushConfig.next({ ...current, tool, color: '#FFFFFF' });
    } else {
      this.brushConfig.next({ ...current, tool });
    }
  }

  // ===== EMISIÓN DE TRAZOS =====

  emitStroke(stroke: DrawingStroke): void {
    this.canvasState.strokes.push(stroke);
    this.strokeEmitter.next(stroke);
  }

  clearCanvas(): void {
    this.canvasState.strokes = [];
    this.strokeEmitter.next({
      type: 'CLEAR',
      points: [],
      color: '',
      thickness: 0
    });
  }

  // ===== SNAPSHOTS POR JUGADOR =====

  saveCanvasImage(playerId: number, dataUrl: string): void {
    this.canvasState.snapshots.set(playerId, dataUrl);
  }

  getCanvasImage(playerId: number): string | undefined {
    return this.canvasState.snapshots.get(playerId);
  }

  getAllSnapshots(): Map<number, string> {
    return this.canvasState.snapshots;
  }

  // ===== RESET =====

  resetCanvas(): void {
    this.canvasState = {
      strokes: [],
      snapshots: new Map<number, string>()
    };
  }
}