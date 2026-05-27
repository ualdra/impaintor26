import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { HttpClient } from '@angular/common/http';
import { RoomService } from '../../../core/services/room.service';
import { Lobby } from './lobby';

describe('Lobby', () => {
  let component: Lobby;
  let fixture: ComponentFixture<Lobby>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Lobby],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'TEST' } } },
        },
        {
          provide: AuthService,
          useValue: { getToken: () => null, getCurrentUser: () => null }
        },
        {
          provide: WebSocketService,
          useValue: { connect: () => {}, subscribe: () => ({ subscribe: () => {} }) }
        },
        {
          provide: HttpClient,
          useValue: { get: () => ({ subscribe: () => {} }), post: () => ({ subscribe: () => {} }) }
        },
        {
          provide: RoomService,
          useValue: { leaveRoom: () => ({ subscribe: () => {} }) }
        }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Lobby);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    if (fixture) {
      fixture.destroy();
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
