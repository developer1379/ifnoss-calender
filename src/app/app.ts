import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CalendarComponent } from './components/calendar/calendar';
import { TeachersComponent } from './components/teachers/teachers';
import { CoursesComponent } from './components/courses/courses';
import { RoomsComponent } from './components/rooms/rooms';
import { ScheduleService } from './services/schedule.service';
import { TeacherDialog, CourseDialog, ScheduleDialog } from './components/dialogs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    CalendarComponent,
    TeachersComponent,
    CoursesComponent,
    RoomsComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly scheduleService = inject(ScheduleService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  activeTabSignal = this.scheduleService.activeTabSignal;
  readonly apiBaseUrl = this.scheduleService.API_BASE;

  startTour() {
    this.activeTabSignal.set(0); // Auto switch to scheduler grid
    setTimeout(() => {
      this.scheduleService.triggerTour();
    }, 300);
  }

  openAddClass() {
    const dialogRef = this.dialog.open(ScheduleDialog, {
      width: '420px',
      data: { session: null },
      disableClose: true,
      panelClass: 'custom-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const conflict = this.scheduleService.addSession(result);
        if (conflict) {
          this.snackBar.open(`⚠️ ${conflict}`, 'Dismiss', { duration: 5000 });
        } else {
          this.snackBar.open('Session scheduled successfully.', 'Dismiss', { duration: 3000 });
        }
      }
    });
  }

  openAddTeacher() {
    const dialogRef = this.dialog.open(TeacherDialog, {
      width: '440px',
      data: null,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.scheduleService.addTeacher(result);
        this.snackBar.open('Teacher added successfully.', 'Dismiss', { duration: 3000 });
      }
    });
  }

  openAddCourse() {
    const dialogRef = this.dialog.open(CourseDialog, {
      width: '400px',
      data: null,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.scheduleService.addCourse(result);
        this.snackBar.open('Course added successfully.', 'Dismiss', { duration: 3000 });
      }
    });
  }
}
