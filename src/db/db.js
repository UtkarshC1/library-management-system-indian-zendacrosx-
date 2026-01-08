import Dexie from 'dexie';

// Renamed DB to match the generic project name
export const db = new Dexie('LibraryMS_DB');

db.version(1).stores({
  // 1. STUDENTS: Basic info + Room assignment
  // Note: 'photo' can be large; ensure it's compressed before saving.
  students: '++id, name, mobile, status, roomId, seat_no, shift, admissionDate, photo', 
  
  // 2. ROOMS: Library Zones
  rooms: '++id, name, capacity, rows, cols',

  // 3. ATTENDANCE: Indexing 'date' and 'studentId' for fast queries
  attendance: '++id, studentId, date, status, inTime, outTime',

  // 4. FINANCE: Indexing 'type' and 'date' for reports
  finance: '++id, type, category, amount, date, studentId, description',
  
  // 5. SETTINGS: Key-value store
  settings: '++id, key, value'
});

// Populate default data only if the DB is empty
db.on('populate', () => {
  db.rooms.add({
    name: 'Main Hall',
    capacity: 50,
    rows: 10,
    cols: 5
  });
});