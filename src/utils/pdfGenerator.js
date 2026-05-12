import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

export const generateIDCard = async (student, libName, libAddress) => {
  console.log("Generating ID Card for:", student.name);
  try {
    const doc = new jsPDF({
      orientation: 'l',
      unit: 'mm',
      format: [85.6, 54]
    });
    
    // Background & Border
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 85.6, 54, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.rect(1, 1, 83.6, 52, 'S');

    // Corporate Header Gradient-ish
    doc.setFillColor(15, 23, 42); // Navy Dark
    doc.rect(1, 1, 83.6, 12, 'F');
    
    doc.setFillColor(37, 99, 235); // Accent Blue
    doc.rect(1, 1, 2, 12, 'F');

    // Header Text
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(libName.toUpperCase().substring(0, 35), 4, 8);
    
    doc.setFontSize(4);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 200);
    doc.text(libAddress.substring(0, 60), 4, 11);

    // Photo Section
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.8);
    doc.rect(4, 16, 22, 26, 'S');
    
    if (student.photo) {
      try {
        doc.addImage(student.photo, 'JPEG', 4.5, 16.5, 21, 25);
      } catch (e) {
        doc.setFillColor(248, 250, 252);
        doc.rect(4.5, 16.5, 21, 25, 'F');
      }
    }

    // ID Badge Label
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(4, 43.5, 22, 4.5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5);
    doc.setFont("helvetica", "bold");
    doc.text(`ID: #${student.id.toString().padStart(4, '0')}`, 15, 46.5, null, null, "center");

    // Student Info
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(student.name.toUpperCase().substring(0, 22), 30, 22);

    const addField = (label, val, y) => {
      doc.setFontSize(5);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.text(label.toUpperCase(), 30, y);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.text(String(val || "N/A"), 30, y + 3.5);
    };

    addField("Father's Name", student.fathersName, 29);
    addField("Contact Number", student.mobile, 38);
    addField("Membership", student.seatType, 47);

    // QR Code
    try {
      const qrPayload = JSON.stringify({id: student.id, name: student.name});
      const qrUrl = await QRCode.toDataURL(qrPayload, { margin: 1, color: { dark: '#0f172a' } });
      doc.addImage(qrUrl, 'PNG', 66, 16, 15, 15);
    } catch(err) {}

    // Seat Info Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(66, 33, 15, 15, 1, 1, 'FD');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(4);
    doc.text("SEAT", 73.5, 36, null, null, "center");
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(String(student.seat_no || "-"), 73.5, 42, null, null, "center");

    // Footer
    doc.setFillColor(37, 99, 235);
    doc.rect(1, 51, 83.6, 2, 'F');

    doc.save(`${student.name.replace(/\s+/g, '_')}_ID.pdf`);
  } catch (err) {
    console.error(err);
  }
};

export const generateAdmissionForm = async (student, libName, libAddress) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Aesthetic Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    // Decorative lines
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(2);
    doc.line(0, 50, pageWidth, 50);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(32);
    doc.setFont("helvetica", "bold");
    doc.text(libName.toUpperCase(), pageWidth / 2, 25, null, null, "center");
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 200);
    doc.text(libAddress, pageWidth / 2, 35, null, null, "center");
    
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("OFFICIAL REGISTRATION DOSSIER", pageWidth / 2, 45, null, null, "center");

    // Photo Frame
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1);
    doc.rect(150, 60, 45, 55, 'S');
    if (student.photo) {
      try { doc.addImage(student.photo, 'JPEG', 151, 61, 43, 53); } catch(e) {}
    } else {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("PASTE PHOTO\nHERE", 172.5, 85, null, null, "center");
    }

    let y = 70;
    const section = (title, top) => {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, top - 6, 125, 8, 'F');
      doc.setFontSize(10);
      doc.setTextColor(37, 99, 235);
      doc.setFont("helvetica", "bold");
      doc.text(title, 18, top);
      return top + 12;
    };

    y = section("MEMBER IDENTIFICATION", y);
    doc.setTextColor(15, 23, 42);
    
    const field = (label, val, top) => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, 18, top);
      doc.setFont("helvetica", "normal");
      doc.text(String(val || "____________________"), 60, top);
      return top + 9;
    };

    y = field("Full Legal Name", student.name, y);
    y = field("Father's Name", student.fathersName, y);
    y = field("National ID (Aadhar)", student.aadharNo, y);
    y = field("Primary Contact", student.mobile, y);
    y = field("Emergency Contact", student.emergencyContact, y);
    y = field("Residential Address", student.address, y);

    y += 10;
    y = section("FACILITY ALLOCATION", y);
    y = field("Registration ID", `#${student.id.toString().padStart(4, '0')}`, y);
    y = field("Admission Date", student.admissionDate ? new Date(student.admissionDate).toLocaleDateString('en-GB') : "-", y);
    y = field("Facility Shift", student.shift, y);
    y = field("Timing Window", `${student.startTime} - ${student.endTime}`, y);
    y = field("Assigned Seat No", student.seat_no ? `STATION-${student.seat_no}` : "GENERAL", y);
    y = field("Monthly Subscription", `INR ${student.monthlyFee}/-`, y);

    // Documents Section
    if (student.aadhar) {
      y += 5;
      y = section("DOCUMENTATION PROOF (AADHAR)", y);
      try {
        doc.addImage(student.aadhar, 'JPEG', 18, y, 120, 70);
        y += 75;
      } catch(e) {}
    }

    // Footer & Signatures
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(15, pageHeight - 50, pageWidth - 15, pageHeight - 50);
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("I hereby certify that the information provided is accurate to the best of my knowledge and I agree to abide by all library regulations.", 15, pageHeight - 42);
    
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    
    doc.text("__________________________", 15, pageHeight - 20);
    doc.text("Signature of Applicant", 15, pageHeight - 15);
    
    doc.text("__________________________", 135, pageHeight - 20);
    doc.text("Authorized Registrar", 135, pageHeight - 15);

    doc.save(`${student.name.replace(/\s+/g, '_')}_FORM.pdf`);
  } catch (err) {
    console.error(err);
  }
};
