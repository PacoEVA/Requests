export interface Employee {
  id: number;
  publicToken: string;
  name: string;
  departmentId: number;
  departmentName?: string;
  employeeCode?: string | null;
  phoneOrExtension?: string | null;
}

export interface Department {
  Id?: number;
  id?: number;
  Name?: string;
  name?: string;
  Description?: string;
  description?: string;
  IsActive?: boolean;
  isActive?: boolean;
}
