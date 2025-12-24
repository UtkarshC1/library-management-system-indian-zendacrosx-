import { db } from '../db/db';

export const performBackup = async () => {
  try {
    // 1. Gather all data
    const allData = {
      students: await db.students.toArray(),
      rooms: await db.rooms.toArray(),
      finance: await db.finance.toArray(),
      attendance: await db.attendance.toArray(),
      settings: await db.settings.toArray(),
      backupDate: new Date()
    };
    
    // 2. Create Downloadable File
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `Granthalaya_Backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 3. Update 'lastBackupDate' in Settings
    const todayStr = new Date().toDateString(); // e.g. "Mon Jan 01 2024"
    
    // Find existing setting or add new
    const existing = await db.settings.where('key').equals('lastBackupDate').first();
    if (existing) {
        await db.settings.update(existing.id, { value: todayStr });
    } else {
        await db.settings.add({ key: 'lastBackupDate', value: todayStr });
    }

    return true;
  } catch (err) {
    console.error("Backup Failed", err);
    return false;
  }
};