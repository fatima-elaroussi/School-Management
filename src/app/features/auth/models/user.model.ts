export interface User {
    id: number;
    email: string;
    password: string;
    role: 'admin' | 'assistante';
    fullName: string;
  }