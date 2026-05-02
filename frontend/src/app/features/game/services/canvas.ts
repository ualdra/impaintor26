import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { DrawingStroke, CanvasState, BrushConfig , BrushTool } from '../models/drawing';

@Injectable({
  providedIn: 'root'
})
export class CanvasService {
  // Configuración del pincel
  private brushConfig = new BehaviorSubject<BrushConfig>({
    color: '#000000',
    thickness: 3,
    tool: 'pen'
  });

  // Stream de trazos para enviar por WebSocket
  private strokeEmitter = new Subject<DrawingStroke>();

  // Estado del canvas
  private canvasState: CanvasState = {
    strokes: [],
    imageData: null
  };

  // Observables públicos
  getBrushConfig(): Observable<BrushConfig> {
    return this.brushConfig.asObservable();
  }

  getStrokeEmitter(): Observable<DrawingStroke> {
    return this.strokeEmitter.asObservable();
  }

  // Configurar pincel
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
    // La goma es un pincel blanco
    if (tool === 'eraser') {
      this.brushConfig.next({ ...current, tool, color: '#FFFFFF' });
    } else {
      this.brushConfig.next({ ...current, tool });
    }
  }

  // Emitir trazo para enviar por WebSocket
  emitStroke(stroke: DrawingStroke): void {
    this.canvasState.strokes.push(stroke);
    this.strokeEmitter.next(stroke);
  }

  // Limpiar canvas
  clearCanvas(): void {
    this.canvasState.strokes = [];
    const clearStroke: DrawingStroke = {
      type: 'CLEAR',
      points: [],
      color: '',
      thickness: 0
    };
    this.strokeEmitter.next(clearStroke);
  }

  // Guardar snapshot del canvas para la galería
  saveCanvasImage(dataUrl: string): void {
    this.canvasState.imageData = dataUrl;
  }

  getCanvasImage(): string | null {
    return this.canvasState.imageData;
  }

  // Resetear para nueva ronda
  resetCanvas(): void {
    this.canvasState = {
      strokes: [],
      imageData: null
    };
  }
}