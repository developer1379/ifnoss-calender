import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';

export interface Teacher {
  id: string;
  name: string;
  email: string;
  department: string;
  color: string; // Hex code for primary accent color (e.g. #4F46E5)
  availability: string[];
  avatarUrl?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  department: string;
  enrolledStudents: number; // For capacity checks
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  type: 'Lecture Hall' | 'Lab' | 'Seminar Room';
}

export interface ScheduleSession {
  id: string;
  teacherId: string;
  courseId: string;
  roomId: string | null;
  day: string | null; // Monday - Saturday or null for unscheduled draft
  startTime: string | null; // HH:MM or null
  endTime: string | null; // HH:MM or null
}

export interface ScheduleConflict {
  id: string;
  type: 'teacher' | 'room' | 'course';
  session1: ScheduleSession;
  session2: ScheduleSession;
  description: string;
}

export interface CapacityWarning {
  id: string;
  session: ScheduleSession;
  description: string;
}

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  private readonly http = inject(HttpClient);
  private readonly API_BASE = 'https://blueviolet-pony-257143.hostingersite.com';

  // Shared UI signals
  activeTabSignal = signal<number>(0);
  tourTriggerSignal = signal<number>(0);

  triggerTour() {
    this.tourTriggerSignal.update(val => val + 1);
  }

  // Signals for state
  private readonly teachersSignal = signal<Teacher[]>([]);
  private readonly coursesSignal = signal<Course[]>([]);
  private readonly roomsSignal = signal<Room[]>([]);
  private readonly sessionsSignal = signal<ScheduleSession[]>([]);

  // Public read-only computed signals
  readonly teachers = computed(() => this.teachersSignal());
  readonly courses = computed(() => this.coursesSignal());
  readonly rooms = computed(() => this.roomsSignal());
  readonly sessions = computed(() => this.sessionsSignal());

  // Dynamic scheduled sessions
  readonly scheduledSessions = computed(() =>
    this.sessionsSignal().filter((s) => s.day && s.startTime && s.endTime && s.roomId)
  );

  // Dynamic unscheduled drafts pool
  readonly draftSessions = computed(() =>
    this.sessionsSignal().filter((s) => !s.day || !s.startTime || !s.endTime || !s.roomId)
  );

  // Real-time conflicts detection (only for active scheduled sessions)
  readonly conflicts = computed(() => {
    const list = this.scheduledSessions();
    const result: ScheduleConflict[] = [];

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const s1 = list[i];
        const s2 = list[j];

        // Check if day matches and times overlap
        if (s1.day === s2.day && s1.startTime! < s2.endTime! && s2.startTime! < s1.endTime!) {
          const t1 = this.getTeacherName(s1.teacherId);
          const c1 = this.getCourseCode(s1.courseId);
          const r1 = this.getRoomName(s1.roomId!);

          const t2 = this.getTeacherName(s2.teacherId);
          const c2 = this.getCourseCode(s2.courseId);
          const r2 = this.getRoomName(s2.roomId!);

          // 1. Teacher Conflict
          if (s1.teacherId === s2.teacherId) {
            result.push({
              id: `${s1.id}-${s2.id}-teacher`,
              type: 'teacher',
              session1: s1,
              session2: s2,
              description: `Teacher clash for ${t1}: Scheduled for "${c1}" and "${c2}" at overlapping times (${s1.day} ${this.formatOverlapTimes(s1, s2)}).`,
            });
          }

          // 2. Room Conflict
          if (s1.roomId === s2.roomId) {
            result.push({
              id: `${s1.id}-${s2.id}-room`,
              type: 'room',
              session1: s1,
              session2: s2,
              description: `Room clash in ${r1}: Booked for "${c1}" (${t1}) and "${c2}" (${t2}) at the same time (${s1.day} ${this.formatOverlapTimes(s1, s2)}).`,
            });
          }

          // 3. Course/Class Cohort Conflict
          if (s1.courseId === s2.courseId) {
            result.push({
              id: `${s1.id}-${s2.id}-course`,
              type: 'course',
              session1: s1,
              session2: s2,
              description: `Cohort clash for "${c1}": Scheduled with ${t1} (Room ${r1}) and ${t2} (Room ${r2}) at the same time.`,
            });
          }
        }
      }
    }
    return result;
  });

  // Real-time capacity warnings
  readonly capacityWarnings = computed(() => {
    const list = this.scheduledSessions();
    const result: CapacityWarning[] = [];

    for (const s of list) {
      if (s.roomId) {
        const room = this.roomsSignal().find((r) => r.id === s.roomId);
        const course = this.coursesSignal().find((c) => c.id === s.courseId);

        if (room && course && course.enrolledStudents > room.capacity) {
          result.push({
            id: `${s.id}-capacity`,
            session: s,
            description: `Seating Capacity Warning in ${room.name}: Seating capacity is ${room.capacity}, but course "${course.code}" has ${course.enrolledStudents} students.`,
          });
        }
      }
    }
    return result;
  });

  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadInitialData();
    }
  }

  private loadInitialData() {
    forkJoin({
      teachers: this.http.get<Teacher[]>(`${this.API_BASE}/api/teachers`),
      courses: this.http.get<Course[]>(`${this.API_BASE}/api/courses`),
      rooms: this.http.get<Room[]>(`${this.API_BASE}/api/rooms`),
      sessions: this.http.get<ScheduleSession[]>(`${this.API_BASE}/api/sessions`)
    }).subscribe({
      next: (data) => {
        this.teachersSignal.set(data.teachers);
        this.coursesSignal.set(data.courses);
        this.roomsSignal.set(data.rooms);
        this.sessionsSignal.set(data.sessions);
      },
      error: (err) => {
        console.error('Error loading initial schedule data:', err);
      }
    });
  }


  // --- Helpers for naming ---
  getTeacherName(id: string): string {
    return this.teachersSignal().find((t) => t.id === id)?.name || 'Unknown';
  }

  getTeacherColor(id: string): string {
    return this.teachersSignal().find((t) => t.id === id)?.color || '#6B7280';
  }

  getCourseCode(id: string): string {
    return this.coursesSignal().find((c) => c.id === id)?.code || 'Unknown';
  }

  getCourseName(id: string): string {
    return this.coursesSignal().find((c) => c.id === id)?.name || 'Unknown';
  }

  getCourseEnrolledCount(id: string): number {
    return this.coursesSignal().find((c) => c.id === id)?.enrolledStudents || 0;
  }

  getRoomName(id: string): string {
    return this.roomsSignal().find((r) => r.id === id)?.name || 'Unknown';
  }

  getRoomCapacity(id: string): number {
    return this.roomsSignal().find((r) => r.id === id)?.capacity || 0;
  }

  private formatOverlapTimes(s1: ScheduleSession, s2: ScheduleSession): string {
    const start = s1.startTime! > s2.startTime! ? s1.startTime! : s2.startTime!;
    const end = s1.endTime! < s2.endTime! ? s1.endTime! : s2.endTime!;
    return `${start}-${end}`;
  }

  // --- Teacher CRUD ---
  addTeacher(teacher: Omit<Teacher, 'id'>) {
    const newId = 'teacher_' + Date.now();
    const newTeacher = { ...teacher, id: newId };
    
    this.http.post(`${this.API_BASE}/api/teachers`, newTeacher).subscribe({
      next: () => {
        this.teachersSignal.update((list) => [...list, newTeacher]);
      },
      error: (err) => console.error('Error adding teacher:', err)
    });
  }

  updateTeacher(id: string, updated: Omit<Teacher, 'id'>) {
    const updatedTeacher = { ...updated, id };
    
    this.http.put(`${this.API_BASE}/api/teachers/${id}`, updatedTeacher).subscribe({
      next: () => {
        this.teachersSignal.update((list) =>
          list.map((t) => (t.id === id ? updatedTeacher : t))
        );
      },
      error: (err) => console.error('Error updating teacher:', err)
    });
  }

  deleteTeacher(id: string) {
    this.http.delete(`${this.API_BASE}/api/teachers/${id}`).subscribe({
      next: () => {
        this.teachersSignal.update((list) => list.filter((t) => t.id !== id));
        this.sessionsSignal.update((list) => list.filter((s) => s.teacherId !== id));
      },
      error: (err) => console.error('Error deleting teacher:', err)
    });
  }

  // --- Course CRUD ---
  addCourse(course: Omit<Course, 'id'>) {
    const newId = 'course_' + Date.now();
    const newCourse = { ...course, id: newId };
    
    this.http.post(`${this.API_BASE}/api/courses`, newCourse).subscribe({
      next: () => {
        this.coursesSignal.update((list) => [...list, newCourse]);
      },
      error: (err) => console.error('Error adding course:', err)
    });
  }

  updateCourse(id: string, updated: Omit<Course, 'id'>) {
    const updatedCourse = { ...updated, id };
    
    this.http.put(`${this.API_BASE}/api/courses/${id}`, updatedCourse).subscribe({
      next: () => {
        this.coursesSignal.update((list) =>
          list.map((c) => (c.id === id ? updatedCourse : c))
        );
      },
      error: (err) => console.error('Error updating course:', err)
    });
  }

  deleteCourse(id: string) {
    this.http.delete(`${this.API_BASE}/api/courses/${id}`).subscribe({
      next: () => {
        this.coursesSignal.update((list) => list.filter((c) => c.id !== id));
        this.sessionsSignal.update((list) => list.filter((s) => s.courseId !== id));
      },
      error: (err) => console.error('Error deleting course:', err)
    });
  }

  // --- Room CRUD ---
  addRoom(room: Omit<Room, 'id'>) {
    const newId = 'room_' + Date.now();
    const newRoom = { ...room, id: newId };
    
    this.http.post(`${this.API_BASE}/api/rooms`, newRoom).subscribe({
      next: () => {
        this.roomsSignal.update((list) => [...list, newRoom]);
      },
      error: (err) => console.error('Error adding room:', err)
    });
  }

  updateRoom(id: string, updated: Omit<Room, 'id'>) {
    const updatedRoom = { ...updated, id };
    
    this.http.put(`${this.API_BASE}/api/rooms/${id}`, updatedRoom).subscribe({
      next: () => {
        this.roomsSignal.update((list) =>
          list.map((r) => (r.id === id ? updatedRoom : r))
        );
      },
      error: (err) => console.error('Error updating room:', err)
    });
  }

  deleteRoom(id: string) {
    this.http.delete(`${this.API_BASE}/api/rooms/${id}`).subscribe({
      next: () => {
        this.roomsSignal.update((list) => list.filter((r) => r.id !== id));
        this.sessionsSignal.update((list) =>
          list.map((s) => (s.roomId === id ? { ...s, roomId: null, day: null, startTime: null, endTime: null } : s))
        );
      },
      error: (err) => console.error('Error deleting room:', err)
    });
  }

  // --- Session CRUD ---
  addSession(session: Omit<ScheduleSession, 'id'>): string | null {
    const newId = 'session_' + Date.now();
    const newSession = { ...session, id: newId };
    
    this.http.post(`${this.API_BASE}/api/sessions`, newSession).subscribe({
      next: () => {
        this.sessionsSignal.update((list) => [...list, newSession]);
      },
      error: (err) => console.error('Error adding session:', err)
    });

    // Check if the newly added session created any conflicts
    const recentConflicts = this.conflicts().filter(
      (c) => c.session1.id === newId || c.session2.id === newId
    );
    if (recentConflicts.length > 0) {
      return recentConflicts[0].description;
    }
    return null;
  }

  updateSession(id: string, updated: Omit<ScheduleSession, 'id'>): string | null {
    const updatedSession = { ...updated, id };
    
    this.http.put(`${this.API_BASE}/api/sessions/${id}`, updatedSession).subscribe({
      next: () => {
        this.sessionsSignal.update((list) =>
          list.map((s) => (s.id === id ? updatedSession : s))
        );
      },
      error: (err) => console.error('Error updating session:', err)
    });

    const recentConflicts = this.conflicts().filter(
      (c) => c.session1.id === id || c.session2.id === id
    );
    if (recentConflicts.length > 0) {
      return recentConflicts[0].description;
    }
    return null;
  }

  deleteSession(id: string) {
    this.http.delete(`${this.API_BASE}/api/sessions/${id}`).subscribe({
      next: () => {
        this.sessionsSignal.update((list) => list.filter((s) => s.id !== id));
      },
      error: (err) => console.error('Error deleting session:', err)
    });
  }

  // Move a session between scheduled timeslots or drafts
  moveSession(id: string, day: string | null, startTime: string | null, endTime: string | null, roomId: string | null) {
    this.sessionsSignal.update((list) =>
      list.map((s) => (s.id === id ? { ...s, day, startTime, endTime, roomId } : s))
    );
    
    const existingSession = this.sessionsSignal().find((s) => s.id === id);
    if (existingSession) {
      this.http.put(`${this.API_BASE}/api/sessions/${id}`, existingSession).subscribe({
        error: (err) => console.error('Error moving session:', err)
      });
    }
  }
}
