import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

const SeatGrid = ({ totalSeats = 50 }) => {
  const students = useLiveQuery(() => db.students.toArray());

  // Create a map: { 1: "Utkarsh", 5: "Ravi" }
  const seatMap = {};
  students?.forEach(student => {
    if (student.seat_no) {
      seatMap[student.seat_no] = student.name;
    }
  });

  const seats = Array.from({ length: totalSeats }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-5 gap-3 p-4">
      {seats.map((seatNum) => {
        const occupantName = seatMap[seatNum];
        const isOccupied = !!occupantName;

        return (
          <div
            key={seatNum}
            onClick={() => isOccupied && alert(`Seat ${seatNum} is taken by ${occupantName}`)}
            className={`aspect-square rounded-xl flex flex-col items-center justify-center border transition-all ${
              isOccupied 
                ? 'bg-red-100 border-red-300 text-red-700 shadow-sm' 
                : 'bg-white border-green-200 text-green-700 shadow-sm'
            }`}
          >
            <span className="font-bold text-lg">{seatNum}</span>
            <span className="text-[9px] truncate w-full text-center px-1 opacity-80">
              {isOccupied ? occupantName : 'Free'}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default SeatGrid;