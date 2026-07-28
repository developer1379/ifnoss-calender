import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ScheduleService, Room } from '../../services/schedule.service';
import { RoomDialog, ConfirmDialog } from '../dialogs';

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    FormsModule,
  ],
  template: `
    <div class="flex flex-col gap-4 text-slate-800 h-full">
      <div class="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
        <div>
          <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2">
            <mat-icon class="text-amber-600">meeting_room</mat-icon>
            Classrooms & Labs
          </h2>
          <p class="text-slate-500 text-xs mt-0.5">Manage physical classrooms, lab spaces, capacity, and types.</p>
        </div>
        <button mat-raised-button color="warn" (click)="openRoomDialog()" class="bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer shadow-sm">
          <mat-icon>add_circle</mat-icon> Add Classroom
        </button>
      </div>

      <!-- Filters Row -->
      <div class="flex flex-wrap items-center gap-2.5 bg-slate-50/50 border border-slate-200/50 p-2.5 rounded-xl flex-shrink-0">
        <div class="relative w-full sm:w-64">
          <input
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            type="text"
            placeholder="Search room name or type..."
            class="text-xs bg-white border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 w-full text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <mat-icon class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm w-4 h-4 flex items-center justify-center">search</mat-icon>
        </div>

        <div class="relative w-full sm:w-48">
          <select
            [ngModel]="selectedType()"
            (ngModelChange)="selectedType.set($event)"
            class="text-xs bg-white border border-slate-200 rounded-lg py-1.5 px-3 pr-8 w-full text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option [ngValue]="null">All Room Types</option>
            <option *ngFor="let t of roomTypes()" [value]="t">{{ t }}</option>
          </select>
          <mat-icon class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm w-4 h-4 flex items-center justify-center">keyboard_arrow_down</mat-icon>
        </div>
      </div>

      <!-- Classrooms Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-1">
        <div
          *ngFor="let room of filteredRooms()"
          [style.border-left-color]="getRoomTheme(room.type).color"
          [style.background]="'linear-gradient(135deg, #ffffff 0%, ' + getRoomTheme(room.type).color + '05 100%)'"
          class="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 group shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_20px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-slate-300 relative overflow-hidden border-l-[5px]"
        >
          <!-- Top Accent Light Glow -->
          <div [style.background]="'linear-gradient(90deg, ' + getRoomTheme(room.type).color + '00, ' + getRoomTheme(room.type).color + '15, ' + getRoomTheme(room.type).color + '00)'" class="absolute top-0 left-0 right-0 h-[2px]"></div>

          <div class="flex flex-col gap-3">
            <div class="flex items-start justify-between gap-2.5">
              <div class="flex items-center gap-3 min-w-0">
                <!-- Room Icon Container -->
                <div [style.background-color]="getRoomTheme(room.type).iconBg" [style.border-color]="getRoomTheme(room.type).color + '30'" class="w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
                  <mat-icon [style.color]="getRoomTheme(room.type).color" class="text-lg w-5 h-5 flex items-center justify-center">{{ getRoomTheme(room.type).icon }}</mat-icon>
                </div>
                <div class="min-w-0">
                  <h3 class="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-blue-650 transition-colors leading-snug truncate">{{ room.name }}</h3>
                  <span [style.color]="getRoomTheme(room.type).color" [style.background-color]="getRoomTheme(room.type).color + '08'" [style.border-color]="getRoomTheme(room.type).color + '20'" class="text-[9px] font-black border px-2 py-0.5 rounded-full uppercase tracking-wider inline-block mt-1 leading-none">{{ room.type }}</span>
                </div>
              </div>

              <!-- Action buttons -->
              <div class="flex gap-1 flex-shrink-0">
                <button (click)="openRoomDialog(room)" class="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-amber-50 text-slate-455 hover:text-amber-600 transition-all duration-200 cursor-pointer shadow-sm border border-slate-100" title="Edit Room">
                  <mat-icon class="text-xs w-3.5 h-3.5 flex items-center justify-center">edit</mat-icon>
                </button>
                <button (click)="deleteRoom(room)" class="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-red-50 text-slate-455 hover:text-red-650 transition-all duration-200 cursor-pointer shadow-sm border border-slate-100" title="Delete Room">
                  <mat-icon class="text-xs w-3.5 h-3.5 flex items-center justify-center">delete</mat-icon>
                </button>
              </div>
            </div>

            <!-- Type Description Row -->
            <div class="flex items-center gap-1.5 text-[9.5px] text-slate-500 font-semibold bg-slate-50/50 border border-slate-100/60 p-2 rounded-xl">
              <mat-icon class="text-[10px] text-slate-400 w-3.5 h-3.5 flex items-center justify-center">info_outline</mat-icon>
              <span class="truncate">Type: {{ room.type }} Configuration</span>
            </div>
          </div>

          <!-- Capacity details section -->
          <div class="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between gap-1.5">
            <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Max Seating Capacity</span>
            <span class="font-extrabold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-[9px] flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">{{ room.capacity }} Seats</span>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="filteredRooms().length === 0" class="p-12 text-center bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-455 shadow-sm">
        <mat-icon class="text-slate-300 text-5xl mb-3">room_preferences</mat-icon>
        <h3 class="text-lg font-bold text-slate-700">No rooms found</h3>
        <p class="text-sm mt-1 max-w-xs text-slate-500 leading-normal">Add classrooms or adjust filters to view physical spaces.</p>
      </div>
    </div>
  `,
})
export class RoomsComponent {
  private readonly scheduleService = inject(ScheduleService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  rooms = this.scheduleService.rooms;

  // Filter signals
  searchQuery = signal<string>('');
  selectedType = signal<string | null>(null);

  roomTypes = computed(() => {
    const list = this.rooms().map((r) => r.type);
    return Array.from(new Set(list)).sort();
  });

  filteredRooms = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const type = this.selectedType();

    return this.rooms().filter((r) => {
      if (type && r.type !== type) return false;
      if (query) {
        return (
          r.name.toLowerCase().includes(query) ||
          r.type.toLowerCase().includes(query)
        );
      }
      return true;
    });
  });

  constructor() {}

  getRoomIcon(type: string): string {
    switch (type) {
      case 'Lab':
        return 'computer';
      case 'Seminar Room':
        return 'co_present';
      default:
        return 'corporate_fare';
    }
  }

  getRoomTheme(type: string) {
    switch (type) {
      case 'Lab':
        return {
          color: '#6366f1',
          bg: '#eef2ff',
          border: '#e0e7ff',
          iconBg: '#6366f115',
          icon: 'computer'
        };
      case 'Seminar Room':
        return {
          color: '#a855f7',
          bg: '#f3e8ff',
          border: '#e9d5ff',
          iconBg: '#a855f715',
          icon: 'co_present'
        };
      default: // Lecture Hall
        return {
          color: '#f59e0b',
          bg: '#fef3c7',
          border: '#fde68a',
          iconBg: '#f59e0b15',
          icon: 'corporate_fare'
        };
    }
  }

  openRoomDialog(room: Room | null = null) {
    const dialogRef = this.dialog.open(RoomDialog, {
      width: '400px',
      data: room,
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        if (room) {
          this.scheduleService.updateRoom(room.id, res);
          this.snackBar.open('Classroom details updated.', 'Dismiss', { duration: 3000 });
        } else {
          this.scheduleService.addRoom(res);
          this.snackBar.open('Classroom added successfully.', 'Dismiss', { duration: 3000 });
        }
      }
    });
  }

  deleteRoom(room: Room) {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '360px',
      data: {
        title: 'Delete Classroom',
        message: `Are you sure you want to delete ${room.name}? This will move all classes scheduled in this classroom back to the unscheduled drafts pool.`,
        confirmText: 'Delete',
        confirmBg: '#DC2626'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.scheduleService.deleteRoom(room.id);
        this.snackBar.open('Classroom deleted. Scheduled sessions moved back to drafts.', 'Dismiss', { duration: 3000 });
      }
    });
  }
}
