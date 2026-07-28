import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { CalendarComponent } from './components/calendar/calendar';
import { TeachersComponent } from './components/teachers/teachers';
import { CoursesComponent } from './components/courses/courses';
import { RoomsComponent } from './components/rooms/rooms';
import { ScheduleService } from './services/schedule.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
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
  activeTabSignal = this.scheduleService.activeTabSignal;

  startTour() {
    this.activeTabSignal.set(0); // Auto switch to scheduler grid
    setTimeout(() => {
      this.scheduleService.triggerTour();
    }, 300);
  }
}
