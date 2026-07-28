import { Component, computed, signal, inject, OnInit, OnDestroy, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import {
  ScheduleService,
  ScheduleSession,
  Teacher,
  Course,
  Room,
} from '../../services/schedule.service';
import { ScheduleDialog, ConfirmDialog } from '../dialogs';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

interface TourStep {
  elementId: string;
  title: string;
  description: string;
  position: 'bottom' | 'top' | 'left' | 'right' | 'center';
}

const TOUR_STEPS: TourStep[] = [
  {
    elementId: 'tour-dashboard-stats',
    title: '📊 Dashboard Overview',
    description: 'Get real-time insights into your schedule health. Here you will see the total number of scheduled classes, active overlaps, capacity warnings, and unassigned drafts.',
    position: 'bottom'
  },
  {
    elementId: 'tour-drafts-panel',
    title: '📝 Unscheduled Drafts Pool',
    description: 'Create draft slots using the Quick Draft Builder. Drag cards from this panel directly onto the calendar cells to schedule them, or drag them back to unschedule them.',
    position: 'right'
  },
  {
    elementId: 'tour-calendar-grid',
    title: '📅 Interactive Weekly Grid',
    description: 'Double-click any empty slot to schedule a new class. Drag cards to relocate them. You can also duplicate classes by holding Ctrl or Shift while dragging!',
    position: 'left'
  },
  {
    elementId: 'tour-conflicts-panel',
    title: '⚠️ Real-Time Conflicts & Alerts',
    description: 'View real-time alerts for teacher clashes, room double-bookings, or seating capacity mismatches. Click any alert to open the conflict resolver dialog.',
    position: 'left'
  },
  {
    elementId: 'tour-class-cards',
    title: '🖱️ Right-Click Quick Actions',
    description: 'Right-click any class card on the calendar to open a professional context menu. This lets you inspect details, edit settings, duplicate, or delete the class instantly.',
    position: 'bottom'
  }
];

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatSnackBarModule,
    DragDropModule,
  ],
  template: `
    <div class="flex flex-col h-full gap-4 text-slate-800">
      
      <!-- Top Overview Dashboard Stats -->
      <div id="tour-dashboard-stats" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
        <!-- Card 1: Scheduled Classes -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4 shadow-[0_2px_12px_-3px_rgba(15,23,42,0.03)] hover:shadow-md hover:border-slate-300 transition-all border-l-4 border-l-blue-500">
          <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/50 flex items-center justify-center shadow-[0_2px_8px_rgba(37,99,235,0.06)] flex-shrink-0">
            <mat-icon class="text-xl">calendar_month</mat-icon>
          </div>
          <div>
            <div class="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest leading-none">Scheduled Classes</div>
            <div class="text-3xl font-black text-blue-600 mt-1 leading-none tracking-tight">{{ scheduledSessions().length }}</div>
          </div>
        </div>

        <!-- Card 2: Schedule Overlaps -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4 shadow-[0_2px_12px_-3px_rgba(15,23,42,0.03)] hover:shadow-md hover:border-slate-300 transition-all border-l-4 border-l-red-500">
          <div class="w-12 h-12 rounded-xl bg-red-50 text-red-650 border border-red-100/50 flex items-center justify-center shadow-[0_2px_8px_rgba(220,38,38,0.06)] flex-shrink-0" [class.pulse-warning]="conflicts().length > 0">
            <mat-icon class="text-xl">warning</mat-icon>
          </div>
          <div>
            <div class="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest leading-none">Schedule Overlaps</div>
            <div class="text-3xl font-black text-red-650 mt-1 leading-none tracking-tight" *ngIf="conflicts().length > 0">{{ conflicts().length }}</div>
            <div class="text-3xl font-bold text-slate-300 mt-1 leading-none tracking-tight" *ngIf="conflicts().length === 0">0</div>
          </div>
        </div>

        <!-- Card 3: Capacity Alerts -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4 shadow-[0_2px_12px_-3px_rgba(15,23,42,0.03)] hover:shadow-md hover:border-slate-300 transition-all border-l-4 border-l-amber-500">
          <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100/50 flex items-center justify-center shadow-[0_2px_8px_rgba(217,119,6,0.06)] flex-shrink-0" [class.pulse-warning]="capacityWarnings().length > 0">
            <mat-icon class="text-xl">people_outline</mat-icon>
          </div>
          <div>
            <div class="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest leading-none">Capacity Alerts</div>
            <div class="text-3xl font-black text-amber-600 mt-1 leading-none tracking-tight" *ngIf="capacityWarnings().length > 0">{{ capacityWarnings().length }}</div>
            <div class="text-3xl font-bold text-slate-300 mt-1 leading-none tracking-tight" *ngIf="capacityWarnings().length === 0">0</div>
          </div>
        </div>

        <!-- Card 4: Unassigned Drafts -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4 shadow-[0_2px_12px_-3px_rgba(15,23,42,0.03)] hover:shadow-md hover:border-slate-300 transition-all border-l-4 border-l-emerald-500">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50 flex items-center justify-center shadow-[0_2px_8px_rgba(16,185,129,0.06)] flex-shrink-0">
            <mat-icon class="text-xl">dashboard</mat-icon>
          </div>
          <div>
            <div class="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest leading-none">Unassigned Drafts</div>
            <div class="text-3xl font-black text-emerald-600 mt-1 leading-none tracking-tight">{{ draftSessions().length }}</div>
          </div>
        </div>
      </div>

      <!-- Filters, Add button & Exports Toolbar -->
      <div class="bg-white/70 border border-white/60 backdrop-blur-xl p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-sm flex-shrink-0">
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-[10px] font-extrabold text-slate-450 flex items-center gap-1 mr-2 uppercase tracking-wider">
            <mat-icon class="text-slate-400 text-sm">filter_alt</mat-icon> Filters:
          </span>

          <!-- Search Box -->
          <div class="relative w-48">
            <input
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              type="text"
              placeholder="Search code, teacher, room..."
              class="text-xs bg-white border border-slate-200 rounded-lg py-2 pl-8 pr-3 w-full text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <mat-icon class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm w-4 h-4 flex items-center justify-center">search</mat-icon>
          </div>

          <!-- Day Filter -->
          <div class="relative w-36">
            <select
              [ngModel]="selectedDayFilter()"
              (ngModelChange)="selectedDayFilter.set($event)"
              class="text-xs bg-white border border-slate-200 rounded-lg py-2 px-3 pr-8 w-full text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option [ngValue]="null">All Days</option>
              <option *ngFor="let d of days" [value]="d">{{ d }}</option>
            </select>
            <mat-icon class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm w-4 h-4 flex items-center justify-center">keyboard_arrow_down</mat-icon>
          </div>

          <!-- Teacher Filter -->
          <div class="relative w-40">
            <select
              [ngModel]="selectedTeacherFilter()"
              (ngModelChange)="selectedTeacherFilter.set($event)"
              class="text-xs bg-white border border-slate-200 rounded-lg py-2 px-3 pr-8 w-full text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option [ngValue]="null">All Teachers</option>
              <option *ngFor="let t of teachers()" [value]="t.id">{{ t.name }}</option>
            </select>
            <mat-icon class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm w-4 h-4 flex items-center justify-center">keyboard_arrow_down</mat-icon>
          </div>

          <!-- Room Filter -->
          <div class="relative w-40">
            <select
              [ngModel]="selectedRoomFilter()"
              (ngModelChange)="selectedRoomFilter.set($event)"
              class="text-xs bg-white border border-slate-200 rounded-lg py-2 px-3 pr-8 w-full text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option [ngValue]="null">All Classrooms</option>
              <option *ngFor="let r of rooms()" [value]="r.id">{{ r.name }}</option>
            </select>
            <mat-icon class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm w-4 h-4 flex items-center justify-center">keyboard_arrow_down</mat-icon>
          </div>

          <!-- Course Filter -->
          <div class="relative w-40">
            <select
              [ngModel]="selectedCourseFilter()"
              (ngModelChange)="selectedCourseFilter.set($event)"
              class="text-xs bg-white border border-slate-200 rounded-lg py-2 px-3 pr-8 w-full text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option [ngValue]="null">All Courses</option>
              <option *ngFor="let c of courses()" [value]="c.id">{{ c.code }} - {{ c.name }}</option>
            </select>
            <mat-icon class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm w-4 h-4 flex items-center justify-center">keyboard_arrow_down</mat-icon>
          </div>

          <!-- Conflicts Toggle -->
          <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg py-1.5 px-3 select-none hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              [ngModel]="conflictsOnlyFilter()"
              (ngModelChange)="conflictsOnlyFilter.set($event)"
              class="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span>Conflicts Only</span>
          </label>

          <!-- Clear Filters -->
          <button *ngIf="hasActiveFilters()" (click)="clearFilters()" class="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer transition-colors px-2 py-1">
            Clear Filters
          </button>
        </div>

        <div class="flex items-center gap-1.5 flex-wrap">
          <!-- Reset and Clear option buttons -->
          <button (click)="resetDatabase()" class="text-xs border border-slate-200 text-slate-650 hover:bg-slate-50 font-bold px-3 py-2 rounded-lg flex items-center gap-1 cursor-pointer transition-colors" title="Reset system mock database">
            <mat-icon class="text-slate-500 text-sm">refresh</mat-icon> Reset DB
          </button>
          <button (click)="clearAllSchedules()" class="text-xs border border-red-200/50 text-red-650 hover:bg-red-50/50 font-bold px-3 py-2 rounded-lg flex items-center gap-1 cursor-pointer transition-colors" title="Move all scheduled classes back to drafts">
            <mat-icon class="text-red-500 text-sm">clear_all</mat-icon> Clear Grid
          </button>

          <span class="w-[1px] h-6 bg-slate-200 mx-1"></span>

          <!-- Export buttons -->
          <button (click)="exportToJSON()" class="text-xs border border-slate-200 text-slate-650 hover:bg-slate-50 font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors" title="Export JSON file">
            <mat-icon class="text-slate-500 text-sm">download</mat-icon> Export JSON
          </button>
          <button (click)="exportToCSV()" class="text-xs border border-slate-200 text-slate-650 hover:bg-slate-50 font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors" title="Export CSV spreadsheet">
            <mat-icon class="text-slate-500 text-sm">table_view</mat-icon> Export CSV
          </button>
          
          <button (click)="openScheduleDialog()" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer shadow transition-all hover:shadow-md ml-1">
            <mat-icon class="text-sm">add</mat-icon> Schedule Class
          </button>
        </div>
      </div>

      <!-- Main Drag and Drop Workspace Layout: Drafts Panel + Calendar Grid + Conflicts Panel -->
      <div class="flex flex-col xl:flex-row gap-4 items-stretch h-auto min-h-[600px]">
        
        <!-- Left Sidebar: Unscheduled Drafts Pool (CDK Drop Zone) -->
        <div id="tour-drafts-panel" class="xl:w-64 bg-white/70 border border-white/60 backdrop-blur-xl rounded-xl p-4 flex flex-col gap-4 shadow-sm">
          <div class="border-b border-slate-100 pb-3">
            <h3 class="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <mat-icon class="text-emerald-600">drafts</mat-icon>
              Unscheduled Drafts
            </h3>
            <p class="text-slate-500 text-[10px] mt-1 leading-normal">Drag draft cards onto calendar cells to schedule them directly.</p>
          </div>

          <!-- Quick Inline Draft Builder Form -->
          <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col gap-2">
            <div class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Quick Draft Builder</div>
            <select [(ngModel)]="newDraftCourseId" class="text-xs bg-white border border-slate-200 rounded-lg p-2 w-full text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="" disabled selected>Select Course</option>
              <option *ngFor="let c of courses()" [value]="c.id">{{ c.code }} - {{ c.name }}</option>
            </select>
            <select [(ngModel)]="newDraftTeacherId" class="text-xs bg-white border border-slate-200 rounded-lg p-2 w-full text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="" disabled selected>Select Teacher</option>
              <option *ngFor="let t of teachers()" [value]="t.id">{{ t.name }}</option>
            </select>
            <button (click)="createDraft()" [disabled]="!newDraftCourseId || !newDraftTeacherId" class="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-[10px] uppercase py-2 rounded-lg transition cursor-pointer">
              + Create Draft
            </button>
          </div>

          <!-- CDK Draft Drop Pool -->
          <div
            cdkDropList
            id="unscheduled-pool"
            [cdkDropListData]="{ type: 'pool' }"
            [cdkDropListConnectedTo]="allDropListIds"
            (cdkDropListDropped)="onDrop($event)"
            class="flex-grow overflow-y-auto max-h-[300px] xl:max-h-none flex flex-col gap-2.5 p-2 bg-slate-50 border border-dashed border-slate-250 rounded-xl min-h-[150px]"
          >
            <div *ngIf="draftSessions().length === 0" class="text-center p-6 text-[10px] text-slate-400 font-semibold leading-normal">
              Drafts list is empty.<br>Drag scheduled cards here to unschedule them.
            </div>

            <!-- Draggable Draft Item Card -->
            <div
              *ngFor="let session of draftSessions()"
              cdkDrag
              [cdkDragData]="session"
              class="bg-white border border-slate-200 hover:border-slate-350 p-3 rounded-xl shadow-sm cursor-grab active:cursor-grabbing flex flex-col gap-1.5 transition select-none group hover:shadow"
            >
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-mono">
                  {{ getCourseCode(session.courseId) }}
                </span>
                <button (click)="deleteSession(session.id)" class="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <mat-icon class="text-xs">delete</mat-icon>
                </button>
              </div>
              <div class="text-[11px] font-extrabold text-slate-800 truncate leading-snug">{{ getCourseName(session.courseId) }}</div>
              <div class="text-[9px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <div [style.background-color]="getTeacherColor(session.teacherId)" class="w-2 h-2 rounded-full flex-shrink-0 border border-white shadow-sm"></div>
                <span class="truncate font-semibold">{{ getTeacherName(session.teacherId) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Center: Week Calendar Grid (Aligned Rows and CDK Drop Zones) -->
        <div id="tour-calendar-grid" class="flex-grow bg-white/70 border border-white/60 backdrop-blur-xl rounded-xl overflow-hidden flex flex-col shadow-sm">
          <!-- Date Switcher Bar -->
          <div class="border-b border-slate-200/60 bg-white/40 p-3 flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1">
                <button (click)="prevWeek()" class="w-7 h-7 rounded-lg border border-slate-200 text-slate-650 hover:bg-slate-50 flex items-center justify-center cursor-pointer transition">
                  <mat-icon class="text-base">chevron_left</mat-icon>
                </button>
                <button (click)="todayWeek()" class="text-[10px] border border-slate-200 text-slate-650 hover:bg-slate-50 font-extrabold px-2.5 py-1 rounded-lg cursor-pointer transition">
                  Today
                </button>
                <button (click)="nextWeek()" class="w-7 h-7 rounded-lg border border-slate-200 text-slate-650 hover:bg-slate-50 flex items-center justify-center cursor-pointer transition">
                  <mat-icon class="text-base">chevron_right</mat-icon>
                </button>
              </div>

              <!-- Date Picker selector input -->
              <input
                type="date"
                [ngModel]="formatInputDate(currentDate())"
                (ngModelChange)="onDateSelected($event)"
                class="text-[10px] bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-slate-700 font-extrabold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer h-7"
              />
            </div>
            
            <div class="text-xs font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
              <mat-icon class="text-blue-600 text-base">event</mat-icon>
              <span>{{ weekRangeLabel() }}</span>
            </div>
            
            <div class="text-[8px] text-slate-450 font-bold uppercase tracking-wider bg-slate-100/60 border border-slate-200/60 rounded px-1.5 py-0.5">
              Template View
            </div>
          </div>

          <!-- Calendar Day Headers -->
          <div [style.grid-template-columns]="'70px repeat(' + visibleDays().length + ', 1fr)'" class="grid border-b border-slate-200/60 bg-slate-100/40 backdrop-blur-md py-2.5 text-center text-xs font-extrabold text-slate-600 tracking-wider">
            <div class="flex items-center justify-center gap-1"><mat-icon class="text-xs text-slate-400">schedule</mat-icon> Time</div>
            <div *ngFor="let day of visibleDays()" class="flex flex-col items-center justify-center leading-tight">
              <span class="uppercase text-[9px] text-slate-400 tracking-wider font-extrabold">{{ day }}</span>
              <span class="text-slate-800 text-[11px] font-black mt-0.5">{{ getDayDateLabel(day) }}</span>
            </div>
          </div>

          <!-- Time rows & columns scroll container -->
          <div class="divide-y divide-slate-100 h-[550px] overflow-y-auto relative pr-1">
            <!-- Hour Row -->
            <div *ngFor="let hour of hours" [style.grid-template-columns]="'70px repeat(' + visibleDays().length + ', 1fr)'" class="grid h-[60px] min-h-[60px] relative">
              <!-- Hour Row Label -->
              <div class="bg-slate-50/60 border-r border-slate-200 flex items-center justify-center text-[10px] text-slate-450 font-bold font-mono">
                {{ hour }}
              </div>

              <!-- Day Hour cells -->
              <div
                *ngFor="let day of visibleDays()"
                cdkDropList
                [id]="getCellId(day, hour)"
                [cdkDropListData]="{ type: 'cell', day: day, hour: hour }"
                [cdkDropListConnectedTo]="allDropListIds"
                (cdkDropListDropped)="onDrop($event)"
                class="border-r border-slate-100 relative flex items-center justify-center cursor-cell hover:bg-slate-50/40 transition-colors"
                (dblclick)="onSlotDoubleClick(day, hour)"
              >
                <!-- Ghost Slot Click Trigger -->
                <div class="absolute inset-0 opacity-0 hover:opacity-100 hover:bg-blue-50/50 transition-opacity flex items-center justify-center z-10">
                  <mat-icon class="text-blue-500/40 text-xs">add_circle</mat-icon>
                </div>

                <!-- Scheduled class cards inside their starting cell -->
                <div
                  *ngFor="let session of getSessionsForCell(day, hour)"
                  cdkDrag
                  [cdkDragData]="session"
                  [id]="session.id === firstScheduledSession()?.id ? 'tour-class-cards' : ''"
                  [style.top.px]="getSessionTopOffset(session)"
                  [style.height.px]="getSessionCardHeight(session)"
                  [style.border-left-color]="getTeacherColor(session.teacherId)"
                  [style.background]="getGlossyBg(session.teacherId)"
                  [style.border-color]="getGlossyBorder(session.teacherId)"
                  (click)="openScheduleDialog(session); $event.stopPropagation()"
                  (contextmenu)="onCardContextMenu($event, session); $event.stopPropagation()"
                  [style.left]="getSessionLayout(session).left"
                  [style.width]="getSessionLayout(session).width"
                  class="absolute rounded-xl p-2.5 text-xs select-none cursor-grab active:cursor-grabbing overflow-hidden transition-all border-l-4 border-slate-200 shadow-sm hover:shadow-md z-20 flex flex-col justify-between group backdrop-blur-md"
                  [class]="getSessionCardClass(session)"
                >
                  <!-- Drag Handle Bar status -->
                  <div class="absolute top-0 left-0 right-0 h-1 bg-slate-350/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"></div>

                  <!-- Conflict Overlap Indicator -->
                  <div *ngIf="hasConflict(session)" class="absolute top-0 right-0 p-1 bg-red-650 text-white rounded-bl-lg pulse-warning z-30" [matTooltip]="getConflictTooltip(session)">
                    <mat-icon class="text-[9px] w-2.5 h-2.5 flex items-center justify-center font-bold">warning</mat-icon>
                  </div>

                  <!-- Seating Capacity Mismatch Indicator -->
                  <div *ngIf="!hasConflict(session) && hasCapacityWarning(session)" class="absolute top-0 right-0 p-1 bg-amber-500 text-white rounded-bl-lg z-30" [matTooltip]="getCapacityTooltip(session)">
                    <mat-icon class="text-[9px] w-2.5 h-2.5 flex items-center justify-center font-bold font-mono">people</mat-icon>
                  </div>

                  <div>
                    <div class="font-extrabold truncate text-[11px] text-slate-800 leading-tight group-hover:text-blue-650 transition-colors">{{ getCourseCode(session.courseId) }}</div>
                    <div class="text-[10px] text-slate-500 font-semibold truncate leading-tight mt-0.5">{{ getCourseName(session.courseId) }}</div>
                  </div>

                  <div class="flex flex-col gap-0.5 mt-2">
                    <div class="text-[10px] text-slate-650 flex items-center gap-1.5 font-semibold">
                      <div class="w-4 h-4 rounded-full overflow-hidden flex-shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                        <img *ngIf="getTeacherAvatar(session.teacherId)" [src]="getTeacherAvatar(session.teacherId)" class="w-full h-full object-cover" />
                        <span *ngIf="!getTeacherAvatar(session.teacherId)" class="text-[7px] font-extrabold" [style.color]="getTeacherColor(session.teacherId)">
                          {{ getTeacherInitials(session.teacherId) }}
                        </span>
                      </div>
                      <span class="truncate text-[10px] text-slate-600">{{ getTeacherName(session.teacherId) }}</span>
                    </div>
                    <div class="text-[10px] text-slate-650 flex items-center gap-1.5 font-medium">
                      <mat-icon class="text-[11px] w-3 h-3 text-slate-400 flex items-center justify-center">room</mat-icon>
                      <span class="truncate">{{ getRoomName(session.roomId!) }}</span>
                    </div>
                  </div>

                  <div class="text-[8px] text-slate-450 font-bold font-mono mt-1.5 text-right leading-none">
                    {{ session.startTime }} - {{ session.endTime }}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        <!-- Right Sidebar: Active Conflicts & Resolution Dashboard -->
        <div id="tour-conflicts-panel" class="xl:w-72 bg-white/70 border border-white/60 backdrop-blur-xl rounded-xl p-4 flex flex-col gap-4 shadow-sm">
          <div class="border-b border-slate-100 pb-3">
            <h3 class="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <mat-icon class="text-red-600">warning_amber</mat-icon>
              Conflicts & Alerts
            </h3>
            <p class="text-slate-500 text-[10px] mt-1 leading-normal">Real-time room double-bookings, teacher availability clashing, or capacity mismatch.</p>
          </div>

          <!-- Collapsible Warnings Pool -->
          <div class="flex-grow overflow-y-auto max-h-[450px] flex flex-col gap-3 pr-1">
            <div *ngIf="conflicts().length === 0 && capacityWarnings().length === 0" class="p-8 text-center bg-slate-50 border border-slate-150 rounded-xl flex flex-col items-center justify-center text-slate-400">
              <mat-icon class="text-emerald-500 text-3xl mb-2">check_circle_outline</mat-icon>
              <span class="text-sm font-semibold text-slate-700">All Systems Clear</span>
              <span class="text-[10px] mt-0.5">No clashing slots detected.</span>
            </div>

            <!-- Overlap Conflict Cards -->
            <div
              *ngFor="let conflict of conflicts()"
              (click)="resolveConflict(conflict.session1)"
              class="bg-red-50 border border-red-200 rounded-xl p-3 hover:bg-red-100/55 transition cursor-pointer relative group flex gap-2 items-start shadow-sm hover:shadow"
              title="Click to resolve this conflict"
            >
              <mat-icon class="text-red-650 flex-shrink-0 text-base mt-0.5">error_outline</mat-icon>
              <div class="flex-col flex gap-0.5">
                <div class="text-[11px] font-extrabold text-red-700 flex items-center gap-1.5">
                  {{ conflict.type }} Clash 
                  <span class="text-[9px] bg-red-600 text-white font-normal px-1.5 py-0.5 rounded">Resolve</span>
                </div>
                <div class="text-[10px] text-slate-600 leading-normal mt-1.5 font-medium">{{ conflict.description }}</div>
              </div>
            </div>

            <!-- Seating Capacity warning Cards -->
            <div
              *ngFor="let warning of capacityWarnings()"
              (click)="resolveConflict(warning.session)"
              class="bg-amber-50 border border-amber-200 rounded-xl p-3 hover:bg-amber-100/55 transition cursor-pointer relative group flex gap-2 items-start shadow-sm hover:shadow"
              title="Click to change classroom size"
            >
              <mat-icon class="text-amber-600 flex-shrink-0 text-base mt-0.5 font-semibold">people</mat-icon>
              <div class="flex-col flex gap-0.5">
                <div class="text-[11px] font-extrabold text-amber-800 flex items-center gap-1.5">
                  Capacity Alert
                  <span class="text-[9px] bg-amber-600 text-white font-normal px-1.5 py-0.5 rounded">Resolve</span>
                </div>
                <div class="text-[10px] text-slate-650 leading-normal mt-1.5 font-medium">{{ warning.description }}</div>
              </div>
            </div>

          </div>
        </div>

      </div>

      <!-- Custom Premium Context Menu -->
      <div
        *ngIf="contextMenuVisible() && contextMenuSession() as session"
        [style.left.px]="contextMenuPosition().x"
        [style.top.px]="contextMenuPosition().y"
        class="fixed bg-white/98 border border-slate-200/60 backdrop-blur-xl rounded-2xl p-4 shadow-[0_15px_30px_-5px_rgba(15,23,42,0.12),0_4px_12px_-2px_rgba(15,23,42,0.06)] z-50 flex flex-col gap-3 min-w-[260px] max-w-[320px] select-none text-slate-800 transition-all scale-95 duration-100 animate-in fade-in zoom-in-95"
        (click)="$event.stopPropagation()"
      >
        <!-- Session Header Info -->
        <div class="flex flex-col gap-1.5 border-b border-slate-100 pb-3">
          <div class="flex items-center gap-1.5 justify-between">
            <span
              [style.background-color]="getTeacherColor(session.teacherId) + '15'"
              [style.color]="getTeacherColor(session.teacherId)"
              [style.border-color]="getTeacherColor(session.teacherId) + '25'"
              class="text-[9px] font-black border px-2 py-0.5 rounded font-mono"
            >
              {{ getCourseCode(session.courseId) }}
            </span>
            <span class="text-[8.5px] font-bold text-slate-450 font-mono tracking-tight">{{ session.startTime }} - {{ session.endTime }}</span>
          </div>
          <div class="text-xs font-black text-slate-800 leading-snug mt-1 truncate">{{ getCourseName(session.courseId) }}</div>
        </div>

        <!-- Detail rows -->
        <div class="flex flex-col gap-2.5 text-[10px] text-slate-650 bg-slate-50/60 border border-slate-100/40 p-3 rounded-2xl">
          <!-- Teacher -->
          <div class="flex items-center gap-2.5">
            <div class="w-6 h-6 rounded-full overflow-hidden border border-slate-200 bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <img *ngIf="getTeacherAvatar(session.teacherId)" [src]="getTeacherAvatar(session.teacherId)" class="w-full h-full object-cover" />
              <span *ngIf="!getTeacherAvatar(session.teacherId)" class="text-[8px] font-black" [style.color]="getTeacherColor(session.teacherId)">
                {{ getTeacherInitials(session.teacherId) }}
              </span>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[7.5px] text-slate-450 font-black leading-none uppercase tracking-wider">Teacher</span>
              <span class="font-extrabold text-slate-700 mt-0.5 truncate leading-none">{{ getTeacherName(session.teacherId) }}</span>
            </div>
          </div>

          <!-- Classroom -->
          <div class="flex items-center gap-2.5">
            <div [style.background-color]="getTeacherColor(session.teacherId) + '12'" class="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-100 bg-white shadow-sm">
              <mat-icon class="text-[11px] w-3 h-3 flex items-center justify-center" [style.color]="getTeacherColor(session.teacherId)">room</mat-icon>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[7.5px] text-slate-450 font-black leading-none uppercase tracking-wider">Classroom</span>
              <span class="font-extrabold text-slate-700 mt-0.5 truncate leading-none">{{ getRoomName(session.roomId!) }}</span>
            </div>
          </div>

          <!-- Day -->
          <div class="flex items-center gap-2.5">
            <div [style.background-color]="getTeacherColor(session.teacherId) + '12'" class="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-100 bg-white shadow-sm">
              <mat-icon class="text-[11px] w-3 h-3 flex items-center justify-center" [style.color]="getTeacherColor(session.teacherId)">today</mat-icon>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[7.5px] text-slate-450 font-black leading-none uppercase tracking-wider">Day</span>
              <span class="font-extrabold text-slate-700 mt-0.5 truncate leading-none">{{ session.day }}</span>
            </div>
          </div>
        </div>

        <!-- Action items list -->
        <div class="flex flex-col gap-1 border-t border-slate-100 pt-2.5">
          <button
            (click)="contextEdit(session)"
            class="flex items-center gap-3 w-full text-left text-[11px] font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50/50 p-1.5 rounded-xl transition duration-150 cursor-pointer group"
          >
            <div class="w-7 h-7 rounded-lg bg-blue-50/60 text-blue-650 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
              <mat-icon class="text-[14px] w-3.5 h-3.5 flex items-center justify-center">edit</mat-icon>
            </div>
            <span>Edit Class Settings</span>
          </button>

          <button
            (click)="contextCopy(session)"
            class="flex items-center gap-3 w-full text-left text-[11px] font-bold text-slate-700 hover:text-indigo-650 hover:bg-indigo-50/50 p-1.5 rounded-xl transition duration-150 cursor-pointer group"
          >
            <div class="w-7 h-7 rounded-lg bg-indigo-50/60 text-indigo-650 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
              <mat-icon class="text-[14px] w-3.5 h-3.5 flex items-center justify-center">content_copy</mat-icon>
            </div>
            <span>Duplicate Class</span>
          </button>

          <button
            (click)="contextUnschedule(session)"
            class="flex items-center gap-3 w-full text-left text-[11px] font-bold text-slate-700 hover:text-emerald-650 hover:bg-emerald-50/50 p-1.5 rounded-xl transition duration-150 cursor-pointer group"
          >
            <div class="w-7 h-7 rounded-lg bg-emerald-50/60 text-emerald-650 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
              <mat-icon class="text-[14px] w-3.5 h-3.5 flex items-center justify-center">archive</mat-icon>
            </div>
            <span>Move to Drafts</span>
          </button>

          <button
            (click)="contextDelete(session)"
            class="flex items-center gap-3 w-full text-left text-[11px] font-bold text-red-650 hover:bg-red-50 p-1.5 rounded-xl transition duration-150 cursor-pointer group"
          >
            <div class="w-7 h-7 rounded-lg bg-red-50/60 text-red-650 flex items-center justify-center flex-shrink-0 group-hover:bg-red-100 transition-colors">
              <mat-icon class="text-[14px] w-3.5 h-3.5 flex items-center justify-center">delete</mat-icon>
            </div>
            <span>Delete Session</span>
          </button>
        </div>
      </div>

      <!-- Tour Guide Overlay Backdrop (Spotlight Ring) -->
      <div
        *ngIf="tourActive()"
        [style.top]="tourStyle().top"
        [style.left]="tourStyle().left"
        [style.width]="tourStyle().width"
        [style.height]="tourStyle().height"
        [style.display]="tourStyle().display"
        class="fixed rounded-2xl border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] pointer-events-none select-none z-[100] tour-spotlight-box"
      ></div>
      
      <!-- Tour Guide Tooltip Card -->
      <div
        *ngIf="tourActive()"
        [style.top]="tourTooltipStyle().top"
        [style.left]="tourTooltipStyle().left"
        class="fixed bg-white/95 border border-slate-200/80 backdrop-blur-lg rounded-2xl p-5 shadow-2xl z-[101] flex flex-col gap-4 w-[320px] pointer-events-auto select-none"
      >
        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
          <span class="text-xs font-black text-slate-800 tracking-tight">{{ getActiveStep().title }}</span>
          <span class="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-mono">
            {{ tourStepIdx() + 1 }} of {{ totalSteps }}
          </span>
        </div>
        <p class="text-[11px] text-slate-650 leading-relaxed font-semibold">
          {{ getActiveStep().description }}
        </p>
        
        <!-- Progress Bar -->
        <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div class="bg-blue-600 h-1.5 transition-all duration-300" [style.width.%]="((tourStepIdx() + 1) / totalSteps) * 100"></div>
        </div>
        
        <div class="flex justify-between items-center mt-1 pt-3 border-t border-slate-100">
          <button (click)="skipTour()" class="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition cursor-pointer">
            Skip Tour
          </button>
          <div class="flex gap-2">
            <button
              *ngIf="tourStepIdx() > 0"
              (click)="prevTourStep()"
              class="text-[10px] border border-slate-200 text-slate-650 hover:bg-slate-50 font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              Back
            </button>
            <button
              (click)="nextTourStep()"
              class="text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-1.5 rounded-lg shadow-sm hover:shadow transition cursor-pointer"
            >
              {{ tourStepIdx() === totalSteps - 1 ? 'Finish' : 'Next' }}
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    ::ng-deep .theme-light-select .mat-mdc-text-field-wrapper {
      background-color: #F8FAFC !important; /* bg-slate-50 */
      border-radius: 8px !important;
      height: 40px !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
    }
    ::ng-deep .theme-light-select .mdc-text-field--outlined .mdc-notched-outline__leading,
    ::ng-deep .theme-light-select .mdc-text-field--outlined .mdc-notched-outline__notch,
    ::ng-deep .theme-light-select .mdc-text-field--outlined .mdc-notched-outline__trailing {
      border-color: #E2E8F0 !important; /* slate-200 */
    }
    ::ng-deep .theme-light-select .mat-mdc-form-field-flex {
      height: 40px !important;
      align-items: center !important;
    }
    ::ng-deep .theme-light-select .mat-mdc-form-field-infix {
      padding-top: 8px !important;
      padding-bottom: 8px !important;
    }
    ::ng-deep .theme-light-select .mat-mdc-select-value {
      color: #1E293B !important;
    }
    ::ng-deep .theme-light-select .mat-mdc-select-arrow svg {
      fill: #64748B !important;
    }
    .light-option {
      background-color: #FFFFFF !important;
      color: #1E293B !important;
    }
    .light-option:hover {
      background-color: #F1F5F9 !important;
    }
    .tour-spotlight-box {
      box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.65);
    }
  `],
})
export class CalendarComponent implements OnInit, OnDestroy {
  days = DAYS;
  hours = HOURS;

  tourActive = signal(false);
  tourStepIdx = signal(0);
  totalSteps = TOUR_STEPS.length;
  tourStyle = signal<{ top: string; left: string; width: string; height: string; display: string }>({
    top: '0px',
    left: '0px',
    width: '0px',
    height: '0px',
    display: 'none'
  });
  tourTooltipStyle = signal<{ top: string; left: string }>({ top: '0px', left: '0px' });

  private tourInterval: any = null;

  @HostListener('window:resize')
  onWindowResize() {
    if (this.tourActive()) {
      this.updateTourPosition();
    }
  }

  startTour() {
    this.tourStepIdx.set(0);
    this.tourActive.set(true);
    this.startTourLoop();
  }

  skipTour() {
    this.tourActive.set(false);
    this.stopTourLoop();
    localStorage.setItem('scheduler_tour_completed', 'true');
    this.snackBar.open('You can restart the tour anytime using the Tour Guide button.', 'Dismiss', { duration: 4000 });
  }

  nextTourStep() {
    const nextIdx = this.tourStepIdx() + 1;
    if (nextIdx < this.totalSteps) {
      this.tourStepIdx.set(nextIdx);
      this.updateTourStep();
    } else {
      this.tourActive.set(false);
      this.stopTourLoop();
      localStorage.setItem('scheduler_tour_completed', 'true');
      this.snackBar.open('Tour completed! You are ready to schedule.', 'Dismiss', { duration: 4000 });
    }
  }

  prevTourStep() {
    const prevIdx = this.tourStepIdx() - 1;
    if (prevIdx >= 0) {
      this.tourStepIdx.set(prevIdx);
      this.updateTourStep();
    }
  }

  getActiveStep() {
    return TOUR_STEPS[this.tourStepIdx()];
  }

  startTourLoop() {
    this.stopTourLoop();
    this.updateTourStep();
    this.tourInterval = setInterval(() => {
      if (this.tourActive()) {
        this.updateTourPosition();
      } else {
        this.stopTourLoop();
      }
    }, 100);
  }

  stopTourLoop() {
    if (this.tourInterval) {
      clearInterval(this.tourInterval);
      this.tourInterval = null;
    }
  }

  updateTourStep() {
    const idx = this.tourStepIdx();
    const step = TOUR_STEPS[idx];
    const el = document.getElementById(step.elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
    }
    // Update position immediately and start/continue loop
    this.updateTourPosition();
  }

  updateTourPosition() {
    const idx = this.tourStepIdx();
    if (idx < 0 || idx >= this.totalSteps) return;
    const step = TOUR_STEPS[idx];
    const el = document.getElementById(step.elementId);
    
    if (el) {
      const rect = el.getBoundingClientRect();
      
      // If element has zero size (e.g. not rendered/hidden), center the tooltip
      if (rect.width === 0 || rect.height === 0) {
        this.centerTooltip();
        return;
      }

      // Sticky header safety margin checks
      const headerHeight = 70;
      if (rect.top < headerHeight) {
        // If element is behind header, hide the highlight box so it doesn't overlap header
        this.tourStyle.set({
          top: '0px',
          left: '0px',
          width: '0px',
          height: '0px',
          display: 'none'
        });
      } else {
        // Spotlight rectangle styles
        this.tourStyle.set({
          top: `${rect.top - 6}px`,
          left: `${rect.left - 6}px`,
          width: `${rect.width + 12}px`,
          height: `${rect.height + 12}px`,
          display: 'block'
        });
      }
      
      // Tooltip balloon placement
      let tooltipTop = 0;
      let tooltipLeft = 0;
      const offset = 20;
      const tooltipWidth = 320;
      const tooltipHeight = 200;
      
      if (step.position === 'bottom') {
        tooltipTop = rect.bottom + offset;
        tooltipLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      } else if (step.position === 'top') {
        tooltipTop = rect.top - tooltipHeight - offset;
        tooltipLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      } else if (step.position === 'right') {
        tooltipTop = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        tooltipLeft = rect.right + offset;
      } else if (step.position === 'left') {
        tooltipTop = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        tooltipLeft = rect.left - tooltipWidth - offset;
      } else {
        tooltipTop = window.innerHeight / 2 - tooltipHeight / 2;
        tooltipLeft = window.innerWidth / 2 - tooltipWidth / 2;
      }
      
      // Bound checks to keep tooltip inside viewport
      if (tooltipLeft < 10) tooltipLeft = 10;
      if (tooltipLeft + tooltipWidth > window.innerWidth - 10) {
        tooltipLeft = window.innerWidth - tooltipWidth - 10;
      }
      
      // Clamp tooltip below header safety boundary
      if (tooltipTop < headerHeight + 5) tooltipTop = headerHeight + 5;
      if (tooltipTop + tooltipHeight > window.innerHeight - 10) {
        tooltipTop = window.innerHeight - tooltipHeight - 10;
      }
      
      this.tourTooltipStyle.set({
        top: `${tooltipTop}px`,
        left: `${tooltipLeft}px`
      });
    } else {
      this.centerTooltip();
    }
  }

  centerTooltip() {
    this.tourStyle.set({
      top: '0px',
      left: '0px',
      width: '0px',
      height: '0px',
      display: 'none'
    });
    this.tourTooltipStyle.set({
      top: `${window.innerHeight / 2 - 100}px`,
      left: `${window.innerWidth / 2 - 160}px`
    });
  }

  ngOnDestroy() {
    this.stopTourLoop();
  }

  readonly firstScheduledSession = computed(() => {
    const list = this.scheduledSessions().filter(s => s.day && s.startTime && s.roomId);
    return list.length > 0 ? list[0] : null;
  });

  // Inline draft builder states
  newDraftCourseId = '';
  newDraftTeacherId = '';

  // CDK Drag & Drop Connected Identifiers list
  allDropListIds: string[] = [];

  // Selected filters (signals)
  selectedTeacherFilter = signal<string | null>(null);
  selectedRoomFilter = signal<string | null>(null);
  selectedCourseFilter = signal<string | null>(null);
  selectedDayFilter = signal<string | null>(null);
  searchQuery = signal<string>('');
  conflictsOnlyFilter = signal<boolean>(false);

  readonly visibleDays = computed(() => {
    const day = this.selectedDayFilter();
    return day ? [day] : this.days;
  });

  // Date/Week switcher states
  currentDate = signal<Date>(new Date());

  readonly currentWeekStart = computed(() => {
    const d = new Date(this.currentDate());
    const day = d.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    return new Date(d.setDate(diff));
  });

  readonly dayDates = computed(() => {
    const start = this.currentWeekStart();
    return this.days.map((dayName, idx) => {
      const date = new Date(start);
      date.setDate(start.getDate() + idx);
      return {
        name: dayName,
        dateLabel: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        dayOfMonth: date.getDate()
      };
    });
  });

  readonly weekRangeLabel = computed(() => {
    const start = this.currentWeekStart();
    const end = new Date(start);
    end.setDate(start.getDate() + 5); // Saturday is +5
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  });

  isCtrlPressed = false;
  isShiftPressed = false;

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Control') {
      this.isCtrlPressed = true;
    }
    if (event.key === 'Shift') {
      this.isShiftPressed = true;
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    if (event.key === 'Control') {
      this.isCtrlPressed = false;
    }
    if (event.key === 'Shift') {
      this.isShiftPressed = false;
    }
  }

  @HostListener('window:blur')
  onBlur() {
    this.isCtrlPressed = false;
    this.isShiftPressed = false;
  }

  contextMenuVisible = signal(false);
  contextMenuPosition = signal({ x: 0, y: 0 });
  contextMenuSession = signal<ScheduleSession | null>(null);

  @HostListener('window:click')
  closeContextMenu() {
    this.contextMenuVisible.set(false);
  }

  @HostListener('window:contextmenu')
  closeContextMenuOnRightClick() {
    this.contextMenuVisible.set(false);
  }

  onCardContextMenu(event: MouseEvent, session: ScheduleSession) {
    event.preventDefault();
    this.contextMenuSession.set(session);
    
    let x = event.clientX;
    let y = event.clientY;
    
    const menuWidth = 280;
    const menuHeight = 320;
    
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }
    
    this.contextMenuPosition.set({ x, y });
    this.contextMenuVisible.set(true);
  }

  contextEdit(session: ScheduleSession) {
    this.closeContextMenu();
    this.openScheduleDialog(session);
  }

  contextCopy(session: ScheduleSession) {
    this.closeContextMenu();
    const clashMsg = this.scheduleService.addSession({
      courseId: session.courseId,
      teacherId: session.teacherId,
      roomId: session.roomId,
      day: session.day,
      startTime: session.startTime,
      endTime: session.endTime,
    });
    if (clashMsg) {
      this.triggerClashNotification(clashMsg);
    } else {
      this.snackBar.open('Class duplicated successfully.', 'Dismiss', { duration: 3000 });
    }
  }

  contextUnschedule(session: ScheduleSession) {
    this.closeContextMenu();
    this.scheduleService.moveSession(session.id, null, null, null, null);
    this.snackBar.open(`"${this.getCourseCode(session.courseId)}" moved to Unscheduled Drafts.`, 'Dismiss', { duration: 3000 });
  }

  contextDelete(session: ScheduleSession) {
    this.closeContextMenu();
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '360px',
      data: {
        title: 'Delete Class Session',
        message: 'Are you sure you want to delete this scheduled class session?',
        confirmText: 'Delete',
        confirmBg: '#DC2626'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.scheduleService.deleteSession(session.id);
        this.snackBar.open('Session deleted.', 'Dismiss', { duration: 3000 });
      }
    });
  }

  private readonly scheduleService = inject(ScheduleService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  // Read signals from service
  teachers = this.scheduleService.teachers;
  rooms = this.scheduleService.rooms;
  courses = this.scheduleService.courses;
  sessions = this.scheduleService.sessions;
  conflicts = this.scheduleService.conflicts;
  capacityWarnings = this.scheduleService.capacityWarnings;

  // Filtered computed session lists
  scheduledSessions = this.scheduleService.scheduledSessions;
  draftSessions = this.scheduleService.draftSessions;

  readonly sessionLayouts = computed(() => {
    const sessions = this.scheduledSessions();
    const layouts: { [id: string]: { left: string; width: string } } = {};

    for (const day of this.visibleDays()) {
      const daySessions = sessions
        .filter((s) => s.day === day && s.startTime && s.endTime && s.roomId)
        .filter((s) => {
          if (this.selectedTeacherFilter() && s.teacherId !== this.selectedTeacherFilter()) return false;
          if (this.selectedRoomFilter() && s.roomId !== this.selectedRoomFilter()) return false;
          if (this.selectedCourseFilter() && s.courseId !== this.selectedCourseFilter()) return false;
          
          // Search query match
          const query = this.searchQuery().trim().toLowerCase();
          if (query) {
            const cCode = this.getCourseCode(s.courseId).toLowerCase();
            const cName = this.getCourseName(s.courseId).toLowerCase();
            const tName = this.getTeacherName(s.teacherId).toLowerCase();
            const rName = this.getRoomName(s.roomId!).toLowerCase();
            if (!cCode.includes(query) && !cName.includes(query) && !tName.includes(query) && !rName.includes(query)) {
              return false;
            }
          }

          // Conflicts filter match
          if (this.conflictsOnlyFilter() && !this.hasConflict(s) && !this.hasCapacityWarning(s)) {
            return false;
          }

          return true;
        });

      for (const s of daySessions) {
        // Find all other sessions on the same day that overlap in time
        const overlaps = daySessions.filter(
          (other) =>
            other.id !== s.id &&
            other.startTime! < s.endTime! &&
            s.startTime! < other.endTime!
        );

        if (overlaps.length === 0) {
          layouts[s.id] = { left: '4%', width: '92%' };
        } else {
          // Sort the current session and all its overlaps by start time, then by ID to ensure stable columns
          const allOverlapping = [s, ...overlaps].sort((a, b) => {
            const timeDiff = a.startTime!.localeCompare(b.startTime!);
            if (timeDiff !== 0) return timeDiff;
            return a.id.localeCompare(b.id);
          });
          const colIdx = allOverlapping.indexOf(s);
          const totalCols = allOverlapping.length;
          
          const widthVal = 92 / totalCols;
          const leftVal = 4 + colIdx * (92 / totalCols);
          
          layouts[s.id] = {
            left: `${leftVal}%`,
            width: `${widthVal}%`,
          };
        }
      }
    }
    return layouts;
  });

  constructor() {
    effect(() => {
      const trigger = this.scheduleService.tourTriggerSignal();
      if (trigger > 0) {
        this.startTour();
      }
    });
  }

  ngOnInit() {
    this.rebuildDropListIds();
    // Auto-start tour on first visit after a slight delay
    setTimeout(() => {
      const tourCompleted = localStorage.getItem('scheduler_tour_completed');
      if (tourCompleted !== 'true') {
        this.scheduleService.activeTabSignal.set(0); // Ensure they are on Scheduler tab
        this.startTour();
      }
    }, 1000);
  }

  // Generates the drop list ID selectors for CDK Drag and Drop
  rebuildDropListIds() {
    const list = ['unscheduled-pool'];
    for (const day of this.days) {
      for (const hour of this.hours) {
        list.push(this.getCellId(day, hour));
      }
    }
    this.allDropListIds = list;
  }

  getCellId(day: string, hour: string): string {
    return `cell-${day}-${hour}`;
  }

  getSessionLayout(session: ScheduleSession): { left: string; width: string } {
    return this.sessionLayouts()[session.id] || { left: '4%', width: '92%' };
  }

  // Filter matches
  hasActiveFilters(): boolean {
    return (
      this.selectedTeacherFilter() !== null ||
      this.selectedRoomFilter() !== null ||
      this.selectedCourseFilter() !== null ||
      this.selectedDayFilter() !== null ||
      this.searchQuery().trim() !== '' ||
      this.conflictsOnlyFilter() === true
    );
  }

  clearFilters() {
    this.selectedTeacherFilter.set(null);
    this.selectedRoomFilter.set(null);
    this.selectedCourseFilter.set(null);
    this.selectedDayFilter.set(null);
    this.searchQuery.set('');
    this.conflictsOnlyFilter.set(false);
  }

  // Position offset mappings
  getHourTopOffset(hourStr: string): number {
    const [h] = hourStr.split(':').map(Number);
    return (h - 8) * 50;
  }

  private timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(mins: number): string {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private getCellHour(startTime: string): string {
    const [h] = startTime.split(':');
    return `${h.padStart(2, '0')}:00`;
  }

  // Calculate top padding displacement if a class starts at xx:30
  getSessionTopOffset(session: ScheduleSession): number {
    if (!session.startTime) return 0;
    const [_, m] = session.startTime.split(':').map(Number);
    return m; // 1px per minute offset (e.g. 30 mins = 30px offset)
  }

  // Calculate card height based on duration
  getSessionCardHeight(session: ScheduleSession): number {
    if (!session.startTime || !session.endTime) return 60;
    const start = this.timeToMinutes(session.startTime);
    const end = this.timeToMinutes(session.endTime);
    return end - start; // 1px per minute height (e.g. 90 mins duration = 90px height)
  }

  // Card pastel backgrounds color converter
  getPastelBgColor(teacherId: string): string {
    const hexColor = this.getTeacherColor(teacherId);
    // Add '17' for 9% opacity hex to make it pastel-toned
    return hexColor + '17';
  }

  getGlossyBg(teacherId: string): string {
    const color = this.getTeacherColor(teacherId);
    return `linear-gradient(135deg, color-mix(in srgb, ${color} 11%, rgba(255, 255, 255, 0.75)), color-mix(in srgb, ${color} 5%, rgba(255, 255, 255, 0.85)))`;
  }

  getGlossyBorder(teacherId: string): string {
    const color = this.getTeacherColor(teacherId);
    return `color-mix(in srgb, ${color} 30%, rgba(255, 255, 255, 0.45))`;
  }

  getSessionCardClass(session: ScheduleSession): string {
    const hasClash = this.hasConflict(session);
    const hasCapAlert = this.hasCapacityWarning(session);
    const baseBorder = 'border-t border-r border-b';
    if (hasClash) {
      return `${baseBorder} text-red-950`;
    }
    if (hasCapAlert) {
      return `${baseBorder} text-amber-950`;
    }
    return `${baseBorder} text-slate-800`;
  }

  // Get sessions mapped to day column + hour cell
  getSessionsForCell(day: string, hour: string): ScheduleSession[] {
    return this.sessions().filter((s) => {
      if (s.day !== day || !s.startTime || !s.endTime || !s.roomId) return false;
      
      // Filter matches
      if (this.selectedTeacherFilter() && s.teacherId !== this.selectedTeacherFilter()) return false;
      if (this.selectedRoomFilter() && s.roomId !== this.selectedRoomFilter()) return false;
      if (this.selectedCourseFilter() && s.courseId !== this.selectedCourseFilter()) return false;

      // Search query match
      const query = this.searchQuery().trim().toLowerCase();
      if (query) {
        const cCode = this.getCourseCode(s.courseId).toLowerCase();
        const cName = this.getCourseName(s.courseId).toLowerCase();
        const tName = this.getTeacherName(s.teacherId).toLowerCase();
        const rName = this.getRoomName(s.roomId!).toLowerCase();
        if (!cCode.includes(query) && !cName.includes(query) && !tName.includes(query) && !rName.includes(query)) {
          return false;
        }
      }

      // Conflicts filter match
      if (this.conflictsOnlyFilter() && !this.hasConflict(s) && !this.hasCapacityWarning(s)) {
        return false;
      }

      return this.getCellHour(s.startTime) === hour;
    });
  }

  // Naming helper utilities
  getTeacherName(id: string): string {
    return this.scheduleService.getTeacherName(id);
  }

  getTeacherColor(id: string): string {
    return this.scheduleService.getTeacherColor(id);
  }

  getTeacherAvatar(id: string): string | undefined {
    return this.scheduleService.teachers().find((t) => t.id === id)?.avatarUrl;
  }

  getTeacherInitials(id: string): string {
    const teacher = this.scheduleService.teachers().find((t) => t.id === id);
    if (!teacher) return '?';
    const parts = teacher.name.replace(/^(Dr\.|Prof\.)\s+/i, '').split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return teacher.name[0].toUpperCase();
  }

  getCourseCode(id: string): string {
    return this.scheduleService.getCourseCode(id);
  }

  getCourseName(id: string): string {
    return this.scheduleService.getCourseName(id);
  }

  getCourseEnrolledCount(id: string): number {
    return this.scheduleService.getCourseEnrolledCount(id);
  }

  getRoomName(id: string): string {
    return this.scheduleService.getRoomName(id);
  }

  getRoomCapacity(id: string): number {
    return this.scheduleService.getRoomCapacity(id);
  }

  // Conflict state checks
  hasConflict(session: ScheduleSession): boolean {
    return this.conflicts().some(
      (c) => c.session1.id === session.id || c.session2.id === session.id
    );
  }

  hasCapacityWarning(session: ScheduleSession): boolean {
    return this.capacityWarnings().some((w) => w.session.id === session.id);
  }

  getConflictTooltip(session: ScheduleSession): string {
    const list = this.conflicts().filter(
      (c) => c.session1.id === session.id || c.session2.id === session.id
    );
    return list.map((c) => c.description).join('\n');
  }

  getCapacityTooltip(session: ScheduleSession): string {
    const list = this.capacityWarnings().filter((w) => w.session.id === session.id);
    return list.map((w) => w.description).join('\n');
  }

  // Inline draft creator actions
  createDraft() {
    if (this.newDraftCourseId && this.newDraftTeacherId) {
      this.scheduleService.addSession({
        courseId: this.newDraftCourseId,
        teacherId: this.newDraftTeacherId,
        roomId: null,
        day: null,
        startTime: null,
        endTime: null,
      });
      this.newDraftCourseId = '';
      this.newDraftTeacherId = '';
      this.snackBar.open('Draft session created. Drag it into the grid!', 'Dismiss', { duration: 3000 });
    }
  }

  deleteSession(id: string) {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '360px',
      data: {
        title: 'Delete Session Draft',
        message: 'Are you sure you want to delete this draft class session?',
        confirmText: 'Delete',
        confirmBg: '#DC2626'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.scheduleService.deleteSession(id);
        this.snackBar.open('Draft session deleted.', 'Dismiss', { duration: 3000 });
      }
    });
  }

  resetDatabase() {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '380px',
      data: {
        title: 'Reset Demo Database',
        message: 'This will reset all courses, classrooms, teachers, and session listings back to default mock seeds. All your custom changes will be lost.',
        confirmText: 'Reset DB',
        confirmBg: '#DC2626'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        localStorage.removeItem('scheduler_teachers');
        localStorage.removeItem('scheduler_courses');
        localStorage.removeItem('scheduler_rooms');
        localStorage.removeItem('scheduler_sessions');
        window.location.reload();
      }
    });
  }

  clearAllSchedules() {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '380px',
      data: {
        title: 'Clear Calendar Grid',
        message: 'Are you sure you want to empty the entire calendar? All scheduled classes will be returned to the unscheduled drafts list.',
        confirmText: 'Clear Grid',
        confirmBg: '#DC2626'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        const scheduled = this.sessions().filter((s) => s.day || s.roomId);
        for (const s of scheduled) {
          this.scheduleService.moveSession(s.id, null, null, null, null);
        }
        this.snackBar.open('All classes moved back to drafts.', 'Dismiss', { duration: 3000 });
      }
    });
  }

  prevWeek() {
    const d = new Date(this.currentDate());
    d.setDate(d.getDate() - 7);
    this.currentDate.set(d);
  }

  nextWeek() {
    const d = new Date(this.currentDate());
    d.setDate(d.getDate() + 7);
    this.currentDate.set(d);
  }

  todayWeek() {
    this.currentDate.set(new Date());
  }

  getDayDateLabel(dayName: string): string {
    const item = this.dayDates().find((d) => d.name === dayName);
    return item ? item.dateLabel : '';
  }

  formatInputDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  onDateSelected(dateStr: string) {
    if (dateStr) {
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      this.currentDate.set(new Date(year, month, day));
    }
  }

  // Drag and Drop dropped listener
  onDrop(event: CdkDragDrop<any>) {
    const session = event.item.data as ScheduleSession;
    const target = event.container.data as { type: string; day?: string; hour?: string };

    if (target.type === 'pool') {
      // Un-schedule the card: Move back to draft pool
      if (session.day) {
        this.scheduleService.moveSession(session.id, null, null, null, null);
        this.snackBar.open(`"${this.getCourseCode(session.courseId)}" moved to Unscheduled Drafts.`, 'Dismiss', { duration: 3000 });
      }
    } else if (target.type === 'cell') {
      const { day, hour } = target;
      if (!day || !hour) return;

      if (session.day && session.startTime && session.endTime && session.roomId) {
        // Mode 1: Dragging a scheduled card to another slot
        const duration = this.timeToMinutes(session.endTime) - this.timeToMinutes(session.startTime);
        const startMins = this.timeToMinutes(hour);
        const endMins = startMins + duration;
        const newEndTime = this.minutesToTime(endMins);

        if (this.isCtrlPressed || this.isShiftPressed) {
          // Copy session to new slot instead of relocating
          const clashMsg = this.scheduleService.addSession({
            courseId: session.courseId,
            teacherId: session.teacherId,
            roomId: session.roomId,
            day: day,
            startTime: hour,
            endTime: newEndTime,
          });

          if (clashMsg) {
            this.triggerClashNotification(clashMsg);
          } else {
            this.snackBar.open('Class copied successfully.', 'Dismiss', { duration: 3000 });
          }
        } else {
          // Relocate existing
          const clashMsg = this.scheduleService.updateSession(session.id, {
            courseId: session.courseId,
            teacherId: session.teacherId,
            roomId: session.roomId,
            day: day,
            startTime: hour,
            endTime: newEndTime,
          });

          if (clashMsg) {
            this.triggerClashNotification(clashMsg);
          } else {
            // Play capacity warning checks
            const updatedSession = this.sessions().find(s => s.id === session.id);
            if (updatedSession && this.hasCapacityWarning(updatedSession)) {
              this.snackBar.open('Class moved, but seating capacity is insufficient.', 'Review', { duration: 4000 });
            } else {
              this.snackBar.open('Class relocated successfully.', 'Dismiss', { duration: 3000 });
            }
          }
        }
      } else {
        // Mode 2: Dragging a draft session into a cell slot (requires classroom setup)
        // We open the dialog pre-filled with day/time, allowing the user to select the room.
        const dialogRef = this.dialog.open(ScheduleDialog, {
          width: '450px',
          data: { session: session, defaultDay: day, defaultTime: hour },
        });

        dialogRef.afterClosed().subscribe((res) => {
          if (res) {
            // Delete draft pool item if not copying
            if (!(this.isCtrlPressed || this.isShiftPressed)) {
              this.scheduleService.deleteSession(session.id);
            }
            // Insert scheduled session card
            const clashMsg = this.scheduleService.addSession(res);
            if (clashMsg) {
              this.triggerClashNotification(clashMsg);
            } else {
              this.snackBar.open(this.isCtrlPressed || this.isShiftPressed ? 'Session copied and scheduled successfully.' : 'Session scheduled successfully.', 'Dismiss', { duration: 3000 });
            }
          }
        });
      }
    }
  }

  // Dialog actions
  openScheduleDialog(session: ScheduleSession | null = null) {
    const dialogRef = this.dialog.open(ScheduleDialog, {
      width: '450px',
      data: { session },
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        if (res === 'delete') {
          this.snackBar.open('Session unscheduled.', 'Dismiss', { duration: 3000 });
          return;
        }
        if (session) {
          const clashMsg = this.scheduleService.updateSession(session.id, res);
          if (clashMsg) {
            this.triggerClashNotification(clashMsg);
          } else {
            this.snackBar.open('Session updated successfully.', 'Dismiss', { duration: 3000 });
          }
        } else {
          const clashMsg = this.scheduleService.addSession(res);
          if (clashMsg) {
            this.triggerClashNotification(clashMsg);
          } else {
            this.snackBar.open('Session scheduled successfully.', 'Dismiss', { duration: 3000 });
          }
        }
      }
    });
  }

  onSlotDoubleClick(day: string, hour: string) {
    const dialogRef = this.dialog.open(ScheduleDialog, {
      width: '450px',
      data: { session: null, defaultDay: day, defaultTime: hour },
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        const clashMsg = this.scheduleService.addSession(res);
        if (clashMsg) {
          this.triggerClashNotification(clashMsg);
        } else {
          this.snackBar.open('Session scheduled successfully.', 'Dismiss', { duration: 3000 });
        }
      }
    });
  }

  resolveConflict(session: ScheduleSession) {
    this.openScheduleDialog(session);
  }

  triggerClashNotification(msg: string) {
    this.snackBar.open(`⚠️ ${msg}`, 'Dismiss', {
      duration: 6000,
      panelClass: ['bg-red-50', 'text-red-700', 'border', 'border-red-200'],
    });
  }

  // --- Exports ---
  exportToJSON() {
    const data = {
      teachers: this.scheduleService.teachers(),
      courses: this.scheduleService.courses(),
      rooms: this.scheduleService.rooms(),
      sessions: this.scheduleService.sessions(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eduschedule_config_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.snackBar.open('Config exported as JSON.', 'Dismiss', { duration: 3000 });
  }

  exportToCSV() {
    const headers = [
      'Day',
      'Start Time',
      'End Time',
      'Course Code',
      'Course Name',
      'Teacher Name',
      'Classroom',
      'Capacity',
      'Enrolled Students',
    ];

    const rows = this.scheduledSessions().map((s) => [
      s.day || '',
      s.startTime || '',
      s.endTime || '',
      this.getCourseCode(s.courseId),
      this.getCourseName(s.courseId),
      this.getTeacherName(s.teacherId),
      this.getRoomName(s.roomId!),
      String(this.getRoomCapacity(s.roomId!)),
      String(this.getCourseEnrolledCount(s.courseId)),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eduschedule_report_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.snackBar.open('Schedule exported as CSV.', 'Dismiss', { duration: 3000 });
  }
}
