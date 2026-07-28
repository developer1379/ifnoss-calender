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

      <!-- Classrooms Compact Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1">
        <div
          *ngFor="let room of filteredRooms()"
          class="bg-white border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between transition group shadow-sm hover:shadow-md hover:border-slate-350 relative overflow-hidden border-l-4 border-l-amber-500"
        >
          <div>
            <div class="flex items-start justify-between gap-2.5">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 border border-amber-100/50 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <mat-icon class="text-base">{{ getRoomIcon(room.type) }}</mat-icon>
                </div>
                <div class="min-w-0">
                  <h3 class="font-extrabold text-slate-800 text-xs group-hover:text-amber-605 transition-colors leading-snug truncate">{{ room.name }}</h3>
                  <span class="text-[9px] text-slate-500 leading-none truncate block mt-0.5">{{ room.type }}</span>
                </div>
              </div>

              <!-- Action buttons -->
              <div class="flex gap-0.5 flex-shrink-0">
                <button (click)="openRoomDialog(room)" class="w-6.5 h-6.5 flex items-center justify-center rounded hover:bg-slate-50 text-slate-455 hover:text-blue-600 transition cursor-pointer" title="Edit Room">
                  <mat-icon class="text-xs w-3.5 h-3.5 flex items-center justify-center">edit</mat-icon>
                </button>
                <button (click)="deleteRoom(room)" class="w-6.5 h-6.5 flex items-center justify-center rounded hover:bg-red-50/50 text-slate-455 hover:text-red-650 transition cursor-pointer" title="Delete Room">
                  <mat-icon class="text-xs w-3.5 h-3.5 flex items-center justify-center">delete</mat-icon>
                </button>
              </div>
            </div>

            <!-- Capacity details -->
            <div class="mt-3.5 flex items-center justify-between text-[10px] text-slate-650 border-t border-slate-100/60 pt-2.5">
              <div class="flex items-center gap-1.5 text-slate-500 font-semibold">
                <mat-icon class="text-[10px] text-slate-400 w-3.5 h-3.5 flex items-center justify-center">groups</mat-icon>
                <span>Max Capacity</span>
              </div>
              <span class="font-extrabold text-slate-700 bg-slate-105 border border-slate-200 px-2 py-0.5 rounded-full text-[9px] flex-shrink-0">{{ room.capacity }} Seats</span>
            </div>
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
