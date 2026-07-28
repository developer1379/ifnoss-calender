import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ScheduleService, Course } from '../../services/schedule.service';
import { CourseDialog, ConfirmDialog } from '../dialogs';

@Component({
  selector: 'app-courses',
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
            <mat-icon class="text-emerald-600">school</mat-icon>
            Courses & Classes
          </h2>
          <p class="text-slate-500 text-xs mt-0.5">Manage curricular courses, subject areas, enrolled student counts, and codes.</p>
        </div>
        <button mat-raised-button color="accent" (click)="openCourseDialog()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer shadow-sm">
          <mat-icon>add_box</mat-icon> Add Course
        </button>
      </div>

      <!-- Filters Row -->
      <div class="flex flex-wrap items-center gap-2.5 bg-slate-50/50 border border-slate-200/50 p-2.5 rounded-xl flex-shrink-0">
        <div class="relative w-full sm:w-64">
          <input
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            type="text"
            placeholder="Search course code or name..."
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
            <option [ngValue]="null">All Subject Areas</option>
            <option *ngFor="let dept of departments()" [value]="dept">{{ dept }}</option>
          </select>
          <mat-icon class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm w-4 h-4 flex items-center justify-center">keyboard_arrow_down</mat-icon>
        </div>
      </div>

      <!-- Courses Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-1">
        <div
          *ngFor="let course of filteredCourses()"
          class="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 group shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_20px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-slate-300 relative overflow-hidden border-l-[5px] border-l-indigo-600"
          style="background: linear-gradient(135deg, #ffffff 0%, rgba(79, 70, 229, 0.02) 100%)"
        >
          <!-- Top Accent Light Glow -->
          <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500/0 via-indigo-500/20 to-indigo-500/0"></div>

          <div class="flex flex-col gap-3">
            <div class="flex items-start justify-between gap-2.5">
              <div class="min-w-0">
                <span class="text-[9px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100/60 px-2.5 py-0.5 rounded-lg uppercase tracking-wider font-mono inline-block shadow-[0_1px_2px_rgba(79,70,229,0.05)]">
                  {{ course.code }}
                </span>
                <h3 class="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors mt-3 leading-snug truncate" [title]="course.name">
                  {{ course.name }}
                </h3>
              </div>

              <!-- Action buttons -->
              <div class="flex gap-1 flex-shrink-0">
                <button (click)="openCourseDialog(course)" class="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-450 hover:text-indigo-600 transition-all duration-200 cursor-pointer shadow-sm border border-slate-100" title="Edit Course">
                  <mat-icon class="text-xs w-3.5 h-3.5 flex items-center justify-center">edit</mat-icon>
                </button>
                <button (click)="deleteCourse(course)" class="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-red-50 text-slate-455 hover:text-red-650 transition-all duration-200 cursor-pointer shadow-sm border border-slate-100" title="Delete Course">
                  <mat-icon class="text-xs w-3.5 h-3.5 flex items-center justify-center">delete</mat-icon>
                </button>
              </div>
            </div>

            <!-- Subject Area Badge -->
            <div class="flex items-center gap-1.5 text-[9.5px] text-slate-500 font-semibold bg-slate-50/50 border border-slate-100/60 p-2 rounded-xl">
              <mat-icon class="text-[10px] text-slate-400 w-3.5 h-3.5 flex items-center justify-center">lan</mat-icon>
              <span class="truncate">Area: {{ course.department }}</span>
            </div>
          </div>

          <!-- Enrollment Details section -->
          <div class="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between gap-1.5">
            <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Enrolled Students</span>
            <div class="flex items-center gap-1.5 font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0">
              <span class="relative flex h-1.5 w-1.5">
                <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span class="text-[9px]">{{ course.enrolledStudents }} Enrolled</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="filteredCourses().length === 0" class="p-12 text-center bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-455 shadow-sm">
        <mat-icon class="text-slate-300 text-5xl mb-3">class</mat-icon>
        <h3 class="text-lg font-bold text-slate-700">No courses found</h3>
        <p class="text-sm mt-1 max-w-xs text-slate-500 leading-normal">Add courses or adjust filters to view curriculum data.</p>
      </div>
    </div>
  `,
})
export class CoursesComponent {
  private readonly scheduleService = inject(ScheduleService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  courses = this.scheduleService.courses;

  // Filter signals
  searchQuery = signal<string>('');
  selectedDept = signal<string | null>(null);

  departments = computed(() => {
    const list = this.courses().map((c) => c.department);
    return Array.from(new Set(list)).sort();
  });

  filteredCourses = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const dept = this.selectedDept();

    return this.courses().filter((c) => {
      if (dept && c.department !== dept) return false;
      if (query) {
        return (
          c.code.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query) ||
          c.department.toLowerCase().includes(query)
        );
      }
      return true;
    });
  });

  constructor() {}

  openCourseDialog(course: Course | null = null) {
    const dialogRef = this.dialog.open(CourseDialog, {
      width: '400px',
      data: course,
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        if (course) {
          this.scheduleService.updateCourse(course.id, res);
          this.snackBar.open('Course details updated.', 'Dismiss', { duration: 3000 });
        } else {
          this.scheduleService.addCourse(res);
          this.snackBar.open('Course added successfully.', 'Dismiss', { duration: 3000 });
        }
      }
    });
  }

  deleteCourse(course: Course) {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '360px',
      data: {
        title: 'Delete Course',
        message: `Are you sure you want to delete ${course.name} (${course.code})? This will delete all calendar classes scheduled for this course.`,
        confirmText: 'Delete',
        confirmBg: '#DC2626'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.scheduleService.deleteCourse(course.id);
        this.snackBar.open('Course and its schedule slots deleted.', 'Dismiss', { duration: 3000 });
      }
    });
  }
}
