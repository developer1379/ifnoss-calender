import { Injectable, signal, computed } from '@angular/core';

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

  constructor() {
    this.loadInitialData();
  }

  // Load from localStorage or set mock data
  private loadInitialData() {
    const storedTeachers = localStorage.getItem('scheduler_teachers');
    const storedCourses = localStorage.getItem('scheduler_courses');
    const storedRooms = localStorage.getItem('scheduler_rooms');
    const storedSessions = localStorage.getItem('scheduler_sessions');

    if (storedTeachers && storedCourses && storedRooms && storedSessions) {
      this.teachersSignal.set(JSON.parse(storedTeachers));
      this.coursesSignal.set(JSON.parse(storedCourses));
      this.roomsSignal.set(JSON.parse(storedRooms));
      this.sessionsSignal.set(JSON.parse(storedSessions));
    } else {
      this.loadMockData();
    }
  }

  private saveToLocalStorage() {
    localStorage.setItem('scheduler_teachers', JSON.stringify(this.teachersSignal()));
    localStorage.setItem('scheduler_courses', JSON.stringify(this.coursesSignal()));
    localStorage.setItem('scheduler_rooms', JSON.stringify(this.roomsSignal()));
    localStorage.setItem('scheduler_sessions', JSON.stringify(this.sessionsSignal()));
  }

  private loadMockData() {
    // Professional bright swatches for light mode borders
    const mockTeachers: Teacher[] = [
      { id: 't1', name: 'Dr. Sarah Connor', email: 's.connor@university.edu', department: 'Computer Science', color: '#1a73e8', availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150' }, 
      { id: 't2', name: 'Prof. Alan Turing', email: 'a.turing@university.edu', department: 'Mathematics', color: '#0f9d58', availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150' }, 
      { id: 't3', name: 'Dr. Marie Curie', email: 'm.curie@university.edu', department: 'Physics', color: '#f4b400', availability: ['Monday', 'Wednesday', 'Friday'], avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150' }, 
      { id: 't4', name: 'Prof. Richard Feynman', email: 'r.feynman@university.edu', department: 'Physics', color: '#db4437', availability: ['Tuesday', 'Thursday', 'Friday'], avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150' }, 
    ];

    const mockCourses: Course[] = [
      { id: 'c1', code: 'CS-101', name: 'Introduction to Programming', department: 'Computer Science', enrolledStudents: 130 }, // High students count for capacity warnings
      { id: 'c2', code: 'MATH-201', name: 'Linear Algebra', department: 'Mathematics', enrolledStudents: 25 },
      { id: 'c3', code: 'PHY-301', name: 'Quantum Mechanics', department: 'Physics', enrolledStudents: 15 },
      { id: 'c4', code: 'CS-202', name: 'Data Structures & Algorithms', department: 'Computer Science', enrolledStudents: 40 },
    ];

    const mockRooms: Room[] = [
      { id: 'r1', name: 'Lecture Hall 101', capacity: 120, type: 'Lecture Hall' }, // Will clash with CS-101 (130 students)
      { id: 'r2', name: 'Seminar Room 202', capacity: 30, type: 'Seminar Room' },
      { id: 'r3', name: 'Computing Lab A', capacity: 45, type: 'Lab' },
    ];

    const mockSessions: ScheduleSession[] = [
      // Normal scheduled sessions
      { id: 's_1', teacherId: 't1', courseId: 'c1', roomId: 'r1', day: 'Monday', startTime: '09:00', endTime: '10:30' },
      { id: 's_2', teacherId: 't2', courseId: 'c2', roomId: 'r2', day: 'Tuesday', startTime: '11:00', endTime: '12:30' },
      { id: 's_3', teacherId: 't4', courseId: 'c4', roomId: 'r3', day: 'Tuesday', startTime: '14:00', endTime: '15:30' },

      // INTENTIONAL CONFLICTS
      // Conflict 1: Room clash in Lecture Hall 101 (Monday 09:30 - 11:00 overlaps with s_1)
      { id: 's_4', teacherId: 't3', courseId: 'c3', roomId: 'r1', day: 'Monday', startTime: '09:30', endTime: '11:00' },
      // Conflict 2: Teacher clash for Prof. Turing (Tuesday 11:30 - 13:00 overlaps with s_2)
      { id: 's_5', teacherId: 't2', courseId: 'c1', roomId: 'r3', day: 'Tuesday', startTime: '11:30', endTime: '13:00' },

      // Unscheduled drafts in the sidebar pool
      { id: 'd_1', teacherId: 't1', courseId: 'c4', roomId: null, day: null, startTime: null, endTime: null },
      { id: 'd_2', teacherId: 't3', courseId: 'c3', roomId: null, day: null, startTime: null, endTime: null }
    ];

    this.teachersSignal.set(mockTeachers);
    this.coursesSignal.set(mockCourses);
    this.roomsSignal.set(mockRooms);
    this.sessionsSignal.set(mockSessions);
    this.saveToLocalStorage();
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
    const newTeacher = { ...teacher, id: 'teacher_' + Date.now() };
    this.teachersSignal.update((list) => [...list, newTeacher]);
    this.saveToLocalStorage();
  }

  updateTeacher(id: string, updated: Omit<Teacher, 'id'>) {
    this.teachersSignal.update((list) =>
      list.map((t) => (t.id === id ? { ...updated, id } : t))
    );
    this.saveToLocalStorage();
  }

  deleteTeacher(id: string) {
    this.teachersSignal.update((list) => list.filter((t) => t.id !== id));
    // Cascade delete sessions
    this.sessionsSignal.update((list) => list.filter((s) => s.teacherId !== id));
    this.saveToLocalStorage();
  }

  // --- Course CRUD ---
  addCourse(course: Omit<Course, 'id'>) {
    const newCourse = { ...course, id: 'course_' + Date.now() };
    this.coursesSignal.update((list) => [...list, newCourse]);
    this.saveToLocalStorage();
  }

  updateCourse(id: string, updated: Omit<Course, 'id'>) {
    this.coursesSignal.update((list) =>
      list.map((c) => (c.id === id ? { ...updated, id } : c))
    );
    this.saveToLocalStorage();
  }

  deleteCourse(id: string) {
    this.coursesSignal.update((list) => list.filter((c) => c.id !== id));
    // Cascade delete sessions
    this.sessionsSignal.update((list) => list.filter((s) => s.courseId !== id));
    this.saveToLocalStorage();
  }

  // --- Room CRUD ---
  addRoom(room: Omit<Room, 'id'>) {
    const newRoom = { ...room, id: 'room_' + Date.now() };
    this.roomsSignal.update((list) => [...list, newRoom]);
    this.saveToLocalStorage();
  }

  updateRoom(id: string, updated: Omit<Room, 'id'>) {
    this.roomsSignal.update((list) =>
      list.map((r) => (r.id === id ? { ...updated, id } : r))
    );
    this.saveToLocalStorage();
  }

  deleteRoom(id: string) {
    this.roomsSignal.update((list) => list.filter((r) => r.id !== id));
    // Cascade un-schedule sessions associated with this room (moving back to drafts)
    this.sessionsSignal.update((list) =>
      list.map((s) => (s.roomId === id ? { ...s, roomId: null, day: null, startTime: null, endTime: null } : s))
    );
    this.saveToLocalStorage();
  }

  // --- Session CRUD ---
  addSession(session: Omit<ScheduleSession, 'id'>): string | null {
    const newSession = { ...session, id: 'session_' + Date.now() };
    this.sessionsSignal.update((list) => [...list, newSession]);
    this.saveToLocalStorage();

    // Check if the newly added session created any conflicts
    const recentConflicts = this.conflicts().filter(
      (c) => c.session1.id === newSession.id || c.session2.id === newSession.id
    );
    if (recentConflicts.length > 0) {
      return recentConflicts[0].description;
    }
    return null;
  }

  updateSession(id: string, updated: Omit<ScheduleSession, 'id'>): string | null {
    this.sessionsSignal.update((list) =>
      list.map((s) => (s.id === id ? { ...updated, id } : s))
    );
    this.saveToLocalStorage();

    const recentConflicts = this.conflicts().filter(
      (c) => c.session1.id === id || c.session2.id === id
    );
    if (recentConflicts.length > 0) {
      return recentConflicts[0].description;
    }
    return null;
  }

  deleteSession(id: string) {
    this.sessionsSignal.update((list) => list.filter((s) => s.id !== id));
    this.saveToLocalStorage();
  }

  // Move a session between scheduled timeslots or drafts
  moveSession(id: string, day: string | null, startTime: string | null, endTime: string | null, roomId: string | null) {
    this.sessionsSignal.update((list) =>
      list.map((s) => (s.id === id ? { ...s, day, startTime, endTime, roomId } : s))
    );
    this.saveToLocalStorage();
  }
}
