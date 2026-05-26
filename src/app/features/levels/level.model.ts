export interface SchoolLevel {

    id: number;
  
    name: string;
  
    category: 'primaire' | 'collège' | 'lycée';
  
    description?: string;
  }