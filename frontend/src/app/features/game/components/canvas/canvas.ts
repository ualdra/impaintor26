import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, Input, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { CanvasService } from '../../services/canvas';
import { BrushConfig } from '../../models/drawing';
import { DrawingEngine } from './engine/drawing-engine';

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
  @Input() playerId = 0;
  private destroy$ = new Subject<void>();
  private engine?: DrawingEngine;
  
  brushConfig: BrushConfig = {
    color: '#000000',
    thickness: 3,
    tool: 'pen'
  };

  // Paleta de colores
  readonly colors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', 
    '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', 
    '#FFA500', '#800080'
  ];

  readonly thicknesses = [1, 3, 5, 8];
/* hola */
  constructor(
    private canvasService: CanvasService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.subscribeToConfig();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Inicializar el motor puro de dibujo inyectándole el canvas del DOM
      this.engine = new DrawingEngine(
        this.canvasRef.nativeElement,
        (stroke) => this.canvasService.emitStroke(stroke)
      );
      // Aplicar estado inicial
      this.engine.setConfig(this.brushConfig);
    }
  }
ngOnDestroy(): void {
  this.engine?.destroy();
  this.destroy$.next();
  this.destroy$.complete();
}

  private subscribeToConfig(): void {
    this.canvasService.getBrushConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe((config: BrushConfig) => {
        this.brushConfig = config;
        // Sincronizar el motor cada vez que cambia la configuración
        if (this.engine) {
          this.engine.setConfig(config);
        }
      });
  }

  // ===== EVENTOS DE DIBUJO (DELEGACIÓN PURA - SRP) =====

  onMouseDown(event: MouseEvent): void {
    if (!this.isActive || !this.engine) return;
    this.engine.processPointerDown(event.clientX, event.clientY);
  }

  onTouchStart(event: TouchEvent): void {
    if (!this.isActive || !this.engine) return;
    if (event.cancelable) event.preventDefault(); // Evitar scroll móvil
    const touch = event.touches[0];
    this.engine.processPointerDown(touch.clientX, touch.clientY);
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isActive || !this.engine) return;
    this.engine.processPointerMove(event.clientX, event.clientY);
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isActive || !this.engine) return;
    if (event.cancelable) event.preventDefault();
    const touch = event.touches[0];
    this.engine.processPointerMove(touch.clientX, touch.clientY);
  }

  onMouseUp(): void {
    if (this.engine) {
      this.engine.processPointerUp();
    }
  }

  // ===== HERRAMIENTAS (UI) =====

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
    if (this.engine) {
      this.engine.clear();
      this.canvasService.clearCanvas();
    }
  }

  // ===== UTILIDADES =====

 saveSnapshot(): void {
  const dataUrl = this.canvasRef.nativeElement.toDataURL('image/png');
  this.canvasService.saveCanvasImage(this.playerId, dataUrl);
}
}