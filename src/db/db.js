import Dexie from 'dexie';

export const db = new Dexie('GranthalayaMate_v2');

db.version(2).stores({
  // 1. STUDENTS: Basic info + Room assignment
  students: '++id, name, mobile, status, roomId, seat_no, shift, admissionDate, photo', 
  
  // 2. ROOMS: Your Library Zones (e.g., "Main Hall", "Balcony")
  rooms: '++id, name, capacity, rows, cols',

  // 3. ATTENDANCE: Detailed logs with Time
  attendance: '++id, studentId, date, status, inTime, outTime',

  // 4. FINANCE: Both Income (Fees) and Expenses
  finance: '++id, type, category, amount, date, studentId, description',
  
  // 5. SETTINGS: Library Name, Owner details
  settings: '++id, key, value'
});

// Helper function to initialize default room if none exists
db.on('populate', () => {
  db.rooms.add({
    name: 'Main Hall',
    capacity: 50,
    rows: 10,
    cols: 5
  });
});