import { Component, OnInit, ViewChild, ElementRef, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { CanvasService } from '../../services/canvas';
import { DrawingStroke, Point, BrushConfig } from '../../models/drawing';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './canvas.html',
  styleUrl: './canvas.css'
})
export class CanvasComponent implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() isActive = true; // Si es mi turno o estoy viendo
  @Input() showWord = ''; // Palabra a dibujar (para pintores)

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private currentStroke: Point[] = [];
  private destroy$ = new Subject<void>();
  
  brushConfig: BrushConfig = {
    color: '#000000',
    thickness: 3,
    tool: 'pen'
  };

  // Paleta de colores
  readonly colors = [
    '#000000', // Negro
    '#FFFFFF', // Blanco
    '#FF0000', // Rojo
    '#00FF00', // Verde
    '#0000FF', // Azul
    '#FFFF00', // Amarillo
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFA500', // Naranja
    '#800080'  // Púrpura
  ];

  readonly thicknesses = [1, 3, 5, 8];

  constructor(private canvasService: CanvasService) {}

  ngOnInit(): void {
    this.setupCanvas();
    this.subscribeToConfig();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    
    // Tamaño del canvas
    canvas.width = 800;
    canvas.height = 600;
    
    // Configuración del contexto
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    // Fondo blanco
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  private subscribeToConfig(): void {
    this.canvasService.getBrushConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe((config: BrushConfig) => {
        this.brushConfig = config;
      });
  }

  // ===== EVENTOS DE DIBUJO =====

  onMouseDown(event: MouseEvent): void {
    if (!this.isActive) return;
    
    this.isDrawing = true;
    const point = this.getMousePos(event);
    this.currentStroke = [point];
    
    this.ctx.beginPath();
    this.ctx.moveTo(point.x, point.y);
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDrawing || !this.isActive) return;
    
    const point = this.getMousePos(event);
    this.currentStroke.push(point);
    
    // Dibujar en tiempo real
    this.ctx.strokeStyle = this.brushConfig.color;
    this.ctx.lineWidth = this.brushConfig.thickness;
    this.ctx.lineTo(point.x, point.y);
    this.ctx.stroke();
  }

  onMouseUp(): void {
    if (!this.isDrawing) return;
    
    if (this.currentStroke.length > 0) {
      // Emitir el trazo completo
      const stroke: DrawingStroke = {
        type: 'STROKE',
        points: this.currentStroke,
        color: this.brushConfig.color,
        thickness: this.brushConfig.thickness,
        timestamp: Date.now()
      };
      
      this.canvasService.emitStroke(stroke);
    }
    
    this.isDrawing = false;
    this.currentStroke = [];
  }

  private getMousePos(event: MouseEvent): Point {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  // ===== HERRAMIENTAS =====

  selectColor(color: string): void {
    this.canvasService.setColor(color);
  }

  selectThickness(thickness: number): void {
    this.canvasService.setThickness(thickness);
  }

  usePen(): void {
    this.canvasService.setTool('pen');
  }

  useEraser(): void {
    this.canvasService.setTool('eraser');
  }

  clearCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    this.canvasService.clearCanvas();
  }

  // ===== UTILIDADES =====

  saveSnapshot(): void {
    const dataUrl = this.canvasRef.nativeElement.toDataURL('image/png');
    this.canvasService.saveCanvasImage(dataUrl);
  }
}