export interface Teacher {

    id: number;
  
    fullName: string;
  
    email: string;
  
    phone: string;
  
    subjects: string[];
  
    schoolLevels: string[];
  
    salary: number;
  
    groups: string[];
  
    hireDate: string;
  
    paymentStatus?: 'payé' | 'en attente';
  
    notes?: string;
  
    avatar?: string;
  }