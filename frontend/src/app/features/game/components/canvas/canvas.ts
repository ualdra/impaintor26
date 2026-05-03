import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, Input, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
export class CanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() isActive = true; // Si es mi turno o estoy viendo
  @Input() showWord = ''; // Palabra a dibujar (para pintores)

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

  constructor(
    private canvasService: CanvasService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.subscribeToConfig();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.setupCanvas();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getCtx(): CanvasRenderingContext2D {
    return this.canvasRef.nativeElement.getContext('2d')!;
  }

  private setupCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = this.getCtx();
    
    // Tamaño intrínseco del canvas garantizado
    if (canvas.width !== 800) canvas.width = 800;
    if (canvas.height !== 600) canvas.height = 600;
    
    // Configuración inicial del contexto
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Fondo blanco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    this.startDrawing(event.clientX, event.clientY);
  }

  onTouchStart(event: TouchEvent): void {
    if (!this.isActive) return;
    // Prevenir el scroll en dispositivos móviles mientras se dibuja
    if (event.cancelable) event.preventDefault();
    const touch = event.touches[0];
    this.startDrawing(touch.clientX, touch.clientY);
  }

  private startDrawing(clientX: number, clientY: number): void {
    const canvas = this.canvasRef.nativeElement;
    
    // 1. JIT Autocorrección de dimensiones
    if (canvas.width !== 800 || canvas.height !== 600) {
      this.setupCanvas();
    }
    
    this.isDrawing = true;
    const point = this.getCanvasPoint(clientX, clientY);
    this.currentStroke = [point];
    
    const ctx = this.getCtx();
    
    // 2. Rehidratación incondicional de estado
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.brushConfig.color;
    ctx.lineWidth = this.brushConfig.thickness;
    ctx.fillStyle = this.brushConfig.color;
    
    // 3. Dibujar punto gordo inicial para clic rápido
    ctx.beginPath();
    ctx.arc(point.x, point.y, this.brushConfig.thickness / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Empezar trazado para el movimiento
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDrawing || !this.isActive) return;
    this.continueDrawing(event.clientX, event.clientY);
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDrawing || !this.isActive) return;
    if (event.cancelable) event.preventDefault();
    const touch = event.touches[0];
    this.continueDrawing(touch.clientX, touch.clientY);
  }

  private continueDrawing(clientX: number, clientY: number): void {
    const point = this.getCanvasPoint(clientX, clientY);
    this.currentStroke.push(point);
    
    const ctx = this.getCtx();
    
    // Rehidratación explícita del estado del contexto antes de trazar
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.brushConfig.color;
    ctx.lineWidth = this.brushConfig.thickness;
    
    // Dibujar en tiempo real
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
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

  private getCanvasPoint(clientX: number, clientY: number): Point {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    
    // Protección contra divisiones por cero (canvas oculto o no renderizado)
    if (rect.width === 0 || rect.height === 0) {
      return { x: 0, y: 0 };
    }
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
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
    const ctx = this.getCtx();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    this.canvasService.clearCanvas();
  }

  // ===== UTILIDADES =====

  saveSnapshot(): void {
    const dataUrl = this.canvasRef.nativeElement.toDataURL('image/png');
    this.canvasService.saveCanvasImage(dataUrl);
  }
}