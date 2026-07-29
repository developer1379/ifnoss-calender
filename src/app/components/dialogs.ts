import { Component, Inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  ScheduleService,
  Teacher,
  Course,
  Room,
  ScheduleSession,
} from '../services/schedule.service';

// --- Swatches for Teacher color choices in Light Mode ---
export const COLOR_SWATCHES = [
  '#4F46E5', // Indigo
  '#059669', // Emerald
  '#D97706', // Amber
  '#DB2777', // Pink
  '#2563EB', // Blue
  '#7C3AED', // Purple
  '#DC2626', // Red
  '#0D9488', // Teal
  '#EA580C', // Orange
  '#475569', // Slate
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ==========================================
// 1. TEACHER DIALOG
// ==========================================
@Component({
  selector: 'app-teacher-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="p-6 max-w-md w-full bg-white text-slate-800 rounded-xl shadow-lg border border-slate-100">
      <h2 mat-dialog-title class="text-xl font-bold flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-800">
        <mat-icon class="text-blue-600">person</mat-icon>
        {{ data ? 'Edit Teacher' : 'Add New Teacher' }}
      </h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="mt-4 flex flex-col gap-4">
        <mat-form-field appearance="outline" class="w-full theme-light-input">
          <mat-label class="text-slate-500">Full Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Dr. John Doe" class="text-slate-800" />
          <mat-error *ngIf="form.get('name')?.hasError('required')">Name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full theme-light-input">
          <mat-label class="text-slate-500">Email Address</mat-label>
          <input matInput type="email" formControlName="email" placeholder="e.g. j.doe@university.edu" class="text-slate-800" />
          <mat-error *ngIf="form.get('email')?.hasError('required')">Email is required</mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('email')">Invalid email format</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full theme-light-input">
          <mat-label class="text-slate-500">Department</mat-label>
          <input matInput formControlName="department" placeholder="e.g. Mathematics" class="text-slate-800" />
          <mat-error *ngIf="form.get('department')?.hasError('required')">Department is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full theme-light-input">
          <mat-label class="text-slate-500">Profile Image URL</mat-label>
          <input matInput formControlName="avatarUrl" placeholder="e.g. https://images.unsplash.com/... or leave blank" class="text-slate-800" />
          <mat-hint class="text-[9px] text-slate-400">Provide an image URL or leave blank for initials fallback.</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full theme-light-input">
          <mat-label class="text-slate-500">Weekly Availability</mat-label>
          <mat-select formControlName="availability" multiple class="text-slate-800">
            <mat-option *ngFor="let day of days" [value]="day" class="light-option">{{ day }}</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('availability')?.hasError('required')">Select at least one day</mat-error>
        </mat-form-field>

        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-2">Teacher Visual Code Color</label>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              *ngFor="let col of colors"
              [style.background-color]="col"
              (click)="selectColor(col)"
              class="w-7 h-7 rounded-full cursor-pointer transition transform hover:scale-110 relative border border-slate-200"
              [class.ring-2]="selectedColor === col"
              [class.ring-blue-600]="selectedColor === col"
              [class.ring-offset-2]="selectedColor === col"
              aria-label="Color choice"
            >
              <mat-icon *ngIf="selectedColor === col" class="text-white text-[10px] w-3 h-3 absolute inset-0 m-auto flex items-center justify-center font-bold">check</mat-icon>
            </button>
          </div>
        </div>

        <div mat-dialog-actions class="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button mat-button type="button" (click)="onCancel()" class="text-slate-500 hover:text-slate-700">Cancel</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid" class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg cursor-pointer">
            Save
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    ::ng-deep .theme-light-input .mat-mdc-text-field-wrapper {
      background-color: #F8FAFC !important;
      border-radius: 8px !important;
    }
    ::ng-deep .theme-light-input .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__leading,
    ::ng-deep .theme-light-input .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__notch,
    ::ng-deep .theme-light-input .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__trailing {
      border-color: #E2E8F0 !important;
    }
    .light-option {
      background-color: #FFFFFF !important;
      color: #1E293B !important;
    }
  `]
})
export class TeacherDialog implements OnInit {
  form!: FormGroup;
  days = DAYS_OF_WEEK;
  colors = COLOR_SWATCHES;
  selectedColor = COLOR_SWATCHES[0];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TeacherDialog>,
    @Inject(MAT_DIALOG_DATA) public data: Teacher | null
  ) {}

  ngOnInit() {
    this.selectedColor = this.data?.color || COLOR_SWATCHES[0];

    this.form = this.fb.group({
      name: [this.data?.name || '', Validators.required],
      email: [this.data?.email || '', [Validators.required, Validators.email]],
      department: [this.data?.department || '', Validators.required],
      availability: [this.data?.availability || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], Validators.required],
      avatarUrl: [this.data?.avatarUrl || ''],
    });
  }

  selectColor(color: string) {
    this.selectedColor = color;
  }

  onSubmit() {
    if (this.form.valid) {
      this.dialogRef.close({
        ...this.form.value,
        color: this.selectedColor,
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}

// ==========================================
// 2. COURSE DIALOG
// ==========================================
@Component({
  selector: 'app-course-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="p-6 max-w-md w-full bg-white text-slate-800 rounded-xl shadow-lg border border-slate-100">
      <h2 mat-dialog-title class="text-xl font-bold flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-800">
        <mat-icon class="text-emerald-600">school</mat-icon>
        {{ data ? 'Edit Course' : 'Add New Course' }}
      </h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="mt-4 flex flex-col gap-4">
        <mat-form-field appearance="outline" class="w-full theme-light-input">
          <mat-label class="text-slate-500">Course Code</mat-label>
          <input matInput formControlName="code" placeholder="e.g. CS-101" class="text-slate-800" />
          <mat-error *ngIf="form.get('code')?.hasError('required')">Code is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full theme-light-input">
          <mat-label class="text-slate-500">Course Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Data Structures" class="text-slate-800" />
          <mat-error *ngIf="form.get('name')?.hasError('required')">Name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full theme-light-input">
          <mat-label class="text-slate-500">Department</mat-label>
          <input matInput formControlName="department" placeholder="e.g. Computer Science" class="text-slate-800" />
          <mat-error *ngIf="form.get('department')?.hasError('required')">Department is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full theme-light-input">
          <mat-label class="text-slate-500">Enrolled Students Count</mat-label>
          <input matInput type="number" formControlName="enrolledStudents" placeholder="e.g. 45" class="text-slate-800" />
          <mat-error *ngIf="form.get('enrolledStudents')?.hasError('required')">Enrolled count is required</mat-error>
          <mat-error *ngIf="form.get('enrolledStudents')?.hasError('min')">Must be a positive number</mat-error>
        </mat-form-field>

        <div mat-dialog-actions class="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button mat-button type="button" (click)="onCancel()" class="text-slate-500 hover:text-slate-700">Cancel</button>
          <button mat-raised-button color="accent" type="submit" [disabled]="form.invalid" class="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg cursor-pointer">
            Save
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    ::ng-deep .theme-light-input .mat-mdc-text-field-wrapper {
      background-color: #F8FAFC !important;
      border-radius: 8px !important;
    }
    ::ng-deep .theme-light-input .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__leading,
    ::ng-deep .theme-light-input .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__notch,
    ::ng-deep .theme-light-input .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__trailing {
      border-color: #E2E8F0 !important;
    }
  `]
})
export class CourseDialog implements OnInit {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CourseDialog>,
    @Inject(MAT_DIALOG_DATA) public data: Course | null
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      code: [this.data?.code || '', Validators.required],
      name: [this.data?.name || '', Validators.required],
      department: [this.data?.department || '', Validators.required],
      enrolledStudents: [this.data?.enrolledStudents || 0, [Validators.required, Validators.min(0)]],
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}

// ==========================================
// 3. ROOM DIALOG
// ==========================================
@Component({
  selector: 'app-room-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="p-6 max-w-md w-full bg-white text-slate-800 rounded-xl shadow-lg border border-slate-100">
      <h2 mat-dialog-title class="text-xl font-bold flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-800">
        <mat-icon class="text-amber-600">meeting_room</mat-icon>
        {{ data ? 'Edit Room' : 'Add New Classroom' }}
      </h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="mt-4 flex flex-col gap-4">
        <mat-form-field appearance="outline" class="w-full theme-light-input">
          <mat-label class="text-slate-500">Room Name/Number</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Lab A or Room 302" class="text-slate-800" />
          <mat-error *ngIf="form.get('name')?.hasError('required')">Room name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full theme-light-input">
          <mat-label class="text-slate-500">Capacity</mat-label>
          <input matInput type="number" formControlName="capacity" placeholder="e.g. 50" class="text-slate-800" />
          <mat-error *ngIf="form.get('capacity')?.hasError('required')">Capacity is required</mat-error>
          <mat-error *ngIf="form.get('capacity')?.hasError('min')">Capacity must be positive</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full theme-light-input">
          <mat-label class="text-slate-500">Room Type</mat-label>
          <mat-select formControlName="type" class="text-slate-800">
            <mat-option value="Lecture Hall" class="light-option">Lecture Hall</mat-option>
            <mat-option value="Lab" class="light-option">Lab</mat-option>
            <mat-option value="Seminar Room" class="light-option">Seminar Room</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('type')?.hasError('required')">Room type is required</mat-error>
        </mat-form-field>

        <div mat-dialog-actions class="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button mat-button type="button" (click)="onCancel()" class="text-slate-500 hover:text-slate-700">Cancel</button>
          <button mat-raised-button color="warn" type="submit" [disabled]="form.invalid" class="bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 rounded-lg cursor-pointer">
            Save
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    ::ng-deep .theme-light-input .mat-mdc-text-field-wrapper {
      background-color: #F8FAFC !important;
      border-radius: 8px !important;
    }
    ::ng-deep .theme-light-input .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__leading,
    ::ng-deep .theme-light-input .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__notch,
    ::ng-deep .theme-light-input .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__trailing {
      border-color: #E2E8F0 !important;
    }
    .light-option {
      background-color: #FFFFFF !important;
      color: #1E293B !important;
    }
  `]
})
export class RoomDialog implements OnInit {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RoomDialog>,
    @Inject(MAT_DIALOG_DATA) public data: Room | null
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      name: [this.data?.name || '', Validators.required],
      capacity: [this.data?.capacity || '', [Validators.required, Validators.min(1)]],
      type: [this.data?.type || 'Lecture Hall', Validators.required],
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}

// ==========================================
// 4. SCHEDULE SESSION DIALOG
// ==========================================
@Component({
  selector: 'app-schedule-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="p-6 max-w-md w-full bg-white text-slate-800 rounded-xl shadow-lg border border-slate-100">
      <h2 mat-dialog-title class="text-xl font-bold flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-800">
        <mat-icon class="text-blue-600">calendar_today</mat-icon>
        {{ isEditMode ? 'Edit Scheduled Session' : 'Schedule Class Session' }}
      </h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="mt-4 flex flex-col gap-4">
        <!-- Course Selection -->
        <mat-form-field appearance="outline" class="w-full theme-light-input">
          <mat-label class="text-slate-500">Course / Class</mat-label>
          <mat-select formControlName="courseId" class="text-slate-800" (openedChange)="onCourseOpened($event)">
            <div class="px-3 py-2 border-b border-slate-100 sticky top-0 bg-white z-10">
              <input type="text"
                     [ngModel]="courseFilter()"
                     (ngModelChange)="courseFilter.set($event)"
                     [ngModelOptions]="{standalone: true}"
                     placeholder="Search Course..."
                     class="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-semibold"
                     (keydown)="$event.stopPropagation()" />
            </div>
            <mat-option *ngFor="let c of filteredCourses()" [value]="c.id" class="light-option">
              {{ c.code }} - {{ c.name }} (Enrolled: {{ c.enrolledStudents }})
            </mat-option>
            <mat-option *ngIf="filteredCourses().length === 0" disabled class="text-slate-400 text-xs text-center py-2">No courses found</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('courseId')?.hasError('required')">Course is required</mat-error>
        </mat-form-field>

        <!-- Teacher Selection -->
        <mat-form-field appearance="outline" class="w-full theme-light-input">
          <mat-label class="text-slate-500">Teacher</mat-label>
          <mat-select formControlName="teacherId" class="text-slate-800" (openedChange)="onTeacherOpened($event)">
            <div class="px-3 py-2 border-b border-slate-100 sticky top-0 bg-white z-10">
              <input type="text"
                     [ngModel]="teacherFilter()"
                     (ngModelChange)="teacherFilter.set($event)"
                     [ngModelOptions]="{standalone: true}"
                     placeholder="Search Teacher..."
                     class="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-semibold"
                     (keydown)="$event.stopPropagation()" />
            </div>
            <mat-option *ngFor="let t of filteredTeachers()" [value]="t.id" class="light-option">
              {{ t.name }} ({{ t.department }})
            </mat-option>
            <mat-option *ngIf="filteredTeachers().length === 0" disabled class="text-slate-400 text-xs text-center py-2">No teachers found</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('teacherId')?.hasError('required')">Teacher is required</mat-error>
        </mat-form-field>

        <!-- Classroom Selection -->
        <mat-form-field appearance="outline" class="w-full theme-light-input">
          <mat-label class="text-slate-500">Room</mat-label>
          <mat-select formControlName="roomId" class="text-slate-800" (openedChange)="onRoomOpened($event)">
            <div class="px-3 py-2 border-b border-slate-100 sticky top-0 bg-white z-10">
              <input type="text"
                     [ngModel]="roomFilter()"
                     (ngModelChange)="roomFilter.set($event)"
                     [ngModelOptions]="{standalone: true}"
                     placeholder="Search Room..."
                     class="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-semibold"
                     (keydown)="$event.stopPropagation()" />
            </div>
            <mat-option *ngFor="let r of filteredRooms()" [value]="r.id" class="light-option">
              {{ r.name }} (Cap: {{ r.capacity }} - {{ r.type }})
            </mat-option>
            <mat-option *ngIf="filteredRooms().length === 0" disabled class="text-slate-400 text-xs text-center py-2">No classrooms found</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('roomId')?.hasError('required')">Room is required</mat-error>
        </mat-form-field>

        <!-- Scheduling Time Fields -->
        <div class="grid grid-cols-3 gap-2">
          <mat-form-field appearance="outline" class="theme-light-input">
            <mat-label class="text-slate-500">Day</mat-label>
            <mat-select formControlName="day" class="text-slate-800">
              <mat-option *ngFor="let d of days" [value]="d" class="light-option">{{ d }}</mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('day')?.hasError('required')">Required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="theme-light-input">
            <mat-label class="text-slate-500">Start Time</mat-label>
            <input matInput type="time" formControlName="startTime" step="900" class="text-slate-800" />
            <mat-error *ngIf="form.get('startTime')?.hasError('required')">Required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="theme-light-input">
            <mat-label class="text-slate-500">End Time</mat-label>
            <input matInput type="time" formControlName="endTime" step="900" class="text-slate-800" />
            <mat-error *ngIf="form.get('endTime')?.hasError('required')">Required</mat-error>
          </mat-form-field>
        </div>

        <!-- Real-Time Conflict Warning Preview -->
        <div *ngIf="conflictWarning" class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex gap-2 items-start pulse-warning">
          <mat-icon class="text-red-500 flex-shrink-0 text-sm">warning</mat-icon>
          <div>
            <span class="font-bold">Proposed Overlap Conflict:</span>
            <p class="mt-1 leading-relaxed">{{ conflictWarning }}</p>
          </div>
        </div>

        <!-- Real-Time Capacity Warning Preview -->
        <div *ngIf="capacityWarning" class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex gap-2 items-start">
          <mat-icon class="text-amber-600 flex-shrink-0 text-sm font-semibold">error_outline</mat-icon>
          <div>
            <span class="font-bold">Capacity Limitation:</span>
            <p class="mt-1 leading-relaxed">{{ capacityWarning }}</p>
          </div>
        </div>

        <div mat-dialog-actions class="flex justify-between items-center pt-4 border-t border-slate-100 w-full">
          <div>
            <button *ngIf="isEditMode" mat-button type="button" (click)="onDelete()" class="text-red-650 hover:text-red-800 font-semibold flex items-center gap-1 cursor-pointer">
              <mat-icon class="text-red-650 text-base">delete</mat-icon> Unschedule
            </button>
          </div>
          <div class="flex gap-2">
            <button mat-button type="button" (click)="onCancel()" class="text-slate-500 hover:text-slate-700">Cancel</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid" class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg cursor-pointer">
              {{ isEditMode ? 'Update' : 'Schedule' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    ::ng-deep .theme-light-input .mat-mdc-text-field-wrapper {
      background-color: #F8FAFC !important;
      border-radius: 8px !important;
    }
    ::ng-deep .theme-light-input .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__leading,
    ::ng-deep .theme-light-input .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__notch,
    ::ng-deep .theme-light-input .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__trailing {
      border-color: #E2E8F0 !important;
    }
    .light-option {
      background-color: #FFFFFF !important;
      color: #1E293B !important;
    }
  `]
})
export class ScheduleDialog implements OnInit {
  form!: FormGroup;
  teachers: Teacher[] = [];
  courses: Course[] = [];
  rooms: Room[] = [];
  days = DAYS_OF_WEEK;
  conflictWarning: string | null = null;
  capacityWarning: string | null = null;
  isEditMode = false;

  courseFilter = signal('');
  teacherFilter = signal('');
  roomFilter = signal('');

  filteredCourses = computed(() => {
    const q = this.courseFilter().toLowerCase().trim();
    if (!q) return this.courses;
    return this.courses.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  });

  filteredTeachers = computed(() => {
    const q = this.teacherFilter().toLowerCase().trim();
    if (!q) return this.teachers;
    return this.teachers.filter(
      (t) => t.name.toLowerCase().includes(q) || t.department.toLowerCase().includes(q)
    );
  });

  filteredRooms = computed(() => {
    const q = this.roomFilter().toLowerCase().trim();
    if (!q) return this.rooms;
    return this.rooms.filter(
      (r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)
    );
  });

  onCourseOpened(opened: boolean) {
    if (!opened) this.courseFilter.set('');
  }

  onTeacherOpened(opened: boolean) {
    if (!opened) this.teacherFilter.set('');
  }

  onRoomOpened(opened: boolean) {
    if (!opened) this.roomFilter.set('');
  }

  constructor(
    private fb: FormBuilder,
    private scheduleService: ScheduleService,
    private dialogRef: MatDialogRef<ScheduleDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { session: ScheduleSession | null; defaultDay?: string; defaultTime?: string }
  ) {}

  ngOnInit() {
    const safeData = this.data || { session: null, defaultDay: undefined, defaultTime: undefined };
    this.isEditMode = !!(safeData.session && safeData.session.day && safeData.session.roomId);
    this.teachers = this.scheduleService.teachers();
    this.courses = this.scheduleService.courses();
    this.rooms = this.scheduleService.rooms();

    let start = '09:00';
    let end = '10:30';
    if (safeData.defaultTime) {
      start = safeData.defaultTime;
      const [h, m] = start.split(':').map(Number);
      const endH = h + 1;
      const endM = m + 30;
      const formattedH = endH >= 24 ? '00' : String(endH).padStart(2, '0');
      const formattedM = endM >= 60 ? '00' : String(endM).padStart(2, '0');
      end = `${formattedH}:${formattedM}`;
    }

    this.form = this.fb.group({
      courseId: [safeData.session?.courseId || '', Validators.required],
      teacherId: [safeData.session?.teacherId || '', Validators.required],
      roomId: [safeData.session?.roomId || '', Validators.required],
      day: [safeData.session?.day || safeData.defaultDay || 'Monday', Validators.required],
      startTime: [safeData.session?.startTime || start, Validators.required],
      endTime: [safeData.session?.endTime || end, Validators.required],
    });

    this.form.valueChanges.subscribe((val) => {
      this.checkLocalConflicts(val);
      this.checkRoomCapacity(val);
    });

    if (safeData.session) {
      this.checkLocalConflicts(this.form.value);
      this.checkRoomCapacity(this.form.value);
    }
  }

  checkLocalConflicts(formVal: any) {
    const { teacherId, roomId, courseId, day, startTime, endTime } = formVal;
    if (!teacherId || !roomId || !courseId || !day || !startTime || !endTime) {
      this.conflictWarning = null;
      return;
    }

    if (startTime >= endTime) {
      this.conflictWarning = 'Start time must be before end time.';
      return;
    }

    const currentSessions = this.scheduleService.scheduledSessions();
    const overlaps = currentSessions.filter((s) => {
      if (this.data.session && s.id === this.data.session.id) return false;
      return s.day === day && s.startTime! < endTime && startTime < s.endTime!;
    });

    for (const s of overlaps) {
      if (s.teacherId === teacherId) {
        this.conflictWarning = `Teacher overlap: ${this.scheduleService.getTeacherName(teacherId)} is already teaching "${this.scheduleService.getCourseCode(s.courseId)}" in ${this.scheduleService.getRoomName(s.roomId!)} at this time (${s.startTime}-${s.endTime}).`;
        return;
      }
      if (s.roomId === roomId) {
        this.conflictWarning = `Room overlap: ${this.scheduleService.getRoomName(roomId)} is already booked for "${this.scheduleService.getCourseCode(s.courseId)}" by ${this.scheduleService.getTeacherName(s.teacherId)} at this time (${s.startTime}-${s.endTime}).`;
        return;
      }
      if (s.courseId === courseId) {
        this.conflictWarning = `Cohort overlap: Class cohort "${this.scheduleService.getCourseCode(courseId)}" has another lecture scheduled at this time with ${this.scheduleService.getTeacherName(s.teacherId)}.`;
        return;
      }
    }

    this.conflictWarning = null;
  }

  checkRoomCapacity(formVal: any) {
    const { courseId, roomId } = formVal;
    if (!courseId || !roomId) {
      this.capacityWarning = null;
      return;
    }

    const room = this.rooms.find((r) => r.id === roomId);
    const course = this.courses.find((c) => c.id === courseId);

    if (room && course && course.enrolledStudents > room.capacity) {
      this.capacityWarning = `Course requires seating for ${course.enrolledStudents} students, but room capacity is only ${room.capacity}.`;
    } else {
      this.capacityWarning = null;
    }
  }

  onDelete() {
    if (this.data.session) {
      this.scheduleService.deleteSession(this.data.session.id);
      this.dialogRef.close('delete');
    }
  }

  onSubmit() {
    if (this.form.valid && this.form.value.startTime < this.form.value.endTime) {
      this.dialogRef.close(this.form.value);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}

// ==========================================
// 5. CONFIRM DIALOG
// ==========================================
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="p-5 max-w-sm w-full bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col gap-4 select-none">
      <!-- Header: Title and Icon -->
      <div class="flex items-center gap-2.5 pb-3 border-b border-slate-100">
        <div [style.background-color]="(data.confirmBg || '#DC2626') + '15'" class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
          <mat-icon [style.color]="data.confirmBg || '#DC2626'" class="text-base w-4.5 h-4.5 flex items-center justify-center">{{ data.icon || 'warning' }}</mat-icon>
        </div>
        <h2 class="text-xs font-black text-slate-805 tracking-tight leading-none">{{ data.title || 'Confirm Action' }}</h2>
      </div>
      
      <!-- Message Content -->
      <p class="text-[11px] font-semibold text-slate-500 leading-relaxed py-0.5">
        {{ data.message }}
      </p>

      <!-- Footer Actions -->
      <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          (click)="onCancel()"
          class="text-[10px] font-extrabold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-3.5 py-2 rounded-lg cursor-pointer transition-colors"
        >
          {{ data.cancelText || 'Cancel' }}
        </button>
        <button
          (click)="onConfirm()"
          [style.background-color]="data.confirmBg || '#DC2626'"
          class="text-[10px] font-extrabold text-white px-4 py-2 rounded-lg cursor-pointer hover:brightness-95 active:brightness-90 transition-all shadow-sm border border-transparent"
          style="color: white !important;"
        >
          {{ data.confirmText || 'Confirm' }}
        </button>
      </div>
    </div>
  `
})
export class ConfirmDialog {
  constructor(
    private dialogRef: MatDialogRef<ConfirmDialog>,
    @Inject(MAT_DIALOG_DATA) public data: {
      title?: string;
      message: string;
      icon?: string;
      titleColor?: string;
      confirmBg?: string;
      confirmText?: string;
      cancelText?: string;
    }
  ) {}

  onCancel() {
    this.dialogRef.close(false);
  }

  onConfirm() {
    this.dialogRef.close(true);
  }
}
