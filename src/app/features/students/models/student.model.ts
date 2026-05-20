export interface Student {
    id: number;
  
    fullName: string;
  
    phone: string;
  
    parentPhone: string;
  
    address: string;
  
    schoolLevel: string;
  
    subjects: string[];
  
    groups: string[];
  
    registrationDate: string;
  
    monthlyPayment: number;
  
    paymentStatus: 'payé' | 'en retard';
  
    notes?: string;
  
    photo?: string;
  
    attendanceRate?: number;
  }