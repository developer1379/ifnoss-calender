import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ScheduleService, Teacher } from '../../services/schedule.service';
import { TeacherDialog, ConfirmDialog } from '../dialogs';

@Component({
  selector: 'app-teachers',
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
            <mat-icon class="text-blue-600">people</mat-icon>
            Faculty & Teachers
          </h2>
          <p class="text-slate-500 text-xs mt-0.5">Manage academic staff details, color codes, and availability.</p>
        </div>
        <button mat-raised-button color="primary" (click)="openTeacherDialog()" class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer shadow-sm">
          <mat-icon>person_add</mat-icon> Add Teacher
        </button>
      </div>

      <!-- Filters Row -->
      <div class="flex flex-wrap items-center gap-2.5 bg-slate-50/50 border border-slate-200/50 p-2.5 rounded-xl flex-shrink-0">
        <div class="relative w-full sm:w-64">
          <input
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            type="text"
            placeholder="Search teacher name..."
            class="text-xs bg-white border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 w-full text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <mat-icon class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm w-4 h-4 flex items-center justify-center">search</mat-icon>
        </div>

        <div class="relative w-full sm:w-48">
          <select
            [ngModel]="selectedDept()"
            (ngModelChange)="selectedDept.set($event)"
            class="text-xs bg-white border border-slate-200 rounded-lg py-1.5 px-3 pr-8 w-full text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option [ngValue]="null">All Departments</option>
            <option *ngFor="let dept of departments()" [value]="dept">{{ dept }}</option>
          </select>
          <mat-icon class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm w-4 h-4 flex items-center justify-center">keyboard_arrow_down</mat-icon>
        </div>
      </div>

      <!-- Teachers Compact Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1">
        <div
          *ngFor="let teacher of filteredTeachers()"
          [style.border-left-color]="teacher.color"
          class="bg-white border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between transition group shadow-sm hover:shadow-md hover:border-slate-350 relative overflow-hidden border-l-4"
        >
          <div>
            <div class="flex items-start justify-between gap-2.5">
              <div class="flex items-center gap-2.5 min-w-0">
                <!-- Teacher Initials/Avatar Circle -->
                <div [style.background-color]="teacher.color + '15'" [style.border-color]="teacher.color + '40'" class="w-9 h-9 rounded-lg border flex items-center justify-center font-bold flex-shrink-0 shadow-sm overflow-hidden">
                  <img *ngIf="teacher.avatarUrl" [src]="teacher.avatarUrl" class="w-full h-full object-cover" [alt]="teacher.name" />
                  <span *ngIf="!teacher.avatarUrl" [style.color]="teacher.color" class="font-black text-xs tracking-tight">{{ getInitials(teacher.name) }}</span>
                </div>
                <div class="min-w-0">
                  <h3 class="font-bold text-slate-800 text-xs group-hover:text-blue-650 transition-colors leading-snug truncate">{{ teacher.name }}</h3>
                  <span class="text-[9px] text-slate-500 leading-none truncate block mt-0.5">{{ teacher.department }}</span>
                </div>
              </div>

              <!-- Action buttons -->
              <div class="flex gap-0.5 flex-shrink-0">
                <button (click)="openTeacherDialog(teacher)" class="w-6.5 h-6.5 flex items-center justify-center rounded hover:bg-slate-50 text-slate-450 hover:text-blue-600 transition cursor-pointer" title="Edit Teacher">
                  <mat-icon class="text-xs w-3.5 h-3.5 flex items-center justify-center">edit</mat-icon>
                </button>
                <button (click)="deleteTeacher(teacher)" class="w-6.5 h-6.5 flex items-center justify-center rounded hover:bg-red-50/50 text-slate-450 hover:text-red-650 transition cursor-pointer" title="Delete Teacher">
                  <mat-icon class="text-xs w-3.5 h-3.5 flex items-center justify-center">delete</mat-icon>
                </button>
              </div>
            </div>

            <!-- Detail row with email and compact availability badges -->
            <div class="mt-3 pt-2.5 border-t border-slate-100/80 flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-1 text-[10px] text-slate-500 font-mono truncate max-w-[150px]" [title]="teacher.email">
                <mat-icon class="text-[10px] text-slate-400 w-3 h-3 flex items-center justify-center">email</mat-icon>
                <span class="truncate">{{ teacher.email }}</span>
              </div>
              <div class="flex flex-wrap gap-1">
                <span
                  *ngFor="let day of teacher.availability"
                  class="text-[8px] bg-blue-50/60 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100/50 font-extrabold tracking-wide uppercase"
                >
                  {{ day.substring(0, 3) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="filteredTeachers().length === 0" class="p-12 text-center bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-455 shadow-sm">
        <mat-icon class="text-slate-300 text-5xl mb-3">people_outline</mat-icon>
        <h3 class="text-lg font-bold text-slate-700">No teachers found</h3>
        <p class="text-sm mt-1 max-w-xs text-slate-500 leading-normal">Add teachers or modify your filter settings to view staff.</p>
      </div>
    </div>
  `,
})
export class TeachersComponent {
  private readonly scheduleService = inject(ScheduleService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  teachers = this.scheduleService.teachers;

  // Filter signals
  searchQuery = signal<string>('');
  selectedDept = signal<string | null>(null);

  departments = computed(() => {
    const list = this.teachers().map((t) => t.department);
    return Array.from(new Set(list)).sort();
  });

  filteredTeachers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const dept = this.selectedDept();

    return this.teachers().filter((t) => {
      if (dept && t.department !== dept) return false;
      if (query) {
        return (
          t.name.toLowerCase().includes(query) ||
          t.department.toLowerCase().includes(query)
        );
      }
      return true;
    });
  });

  constructor() {}

  getInitials(name: string): string {
    const parts = name.replace(/^(Dr\.|Prof\.)\s+/i, '').split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name[0] + (name[1] || '')).toUpperCase();
  }

  openTeacherDialog(teacher: Teacher | null = null) {
    const dialogRef = this.dialog.open(TeacherDialog, {
      width: '400px',
      data: teacher,
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        if (teacher) {
          this.scheduleService.updateTeacher(teacher.id, res);
          this.snackBar.open('Teacher details updated.', 'Dismiss', { duration: 3000 });
        } else {
          this.scheduleService.addTeacher(res);
          this.snackBar.open('Teacher added successfully.', 'Dismiss', { duration: 3000 });
        }
      }
    });
  }

  deleteTeacher(teacher: Teacher) {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '360px',
      data: {
        title: 'Delete Teacher',
        message: `Are you sure you want to delete ${teacher.name}? This will also delete any class sessions scheduled with this teacher.`,
        confirmText: 'Delete',
        confirmBg: '#DC2626'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.scheduleService.deleteTeacher(teacher.id);
        this.snackBar.open('Teacher deleted and associated classes removed.', 'Dismiss', { duration: 3000 });
      }
    });
  }
}
