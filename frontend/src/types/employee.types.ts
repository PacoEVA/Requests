export interface Employee {
  id: number;
  username: string;
  name: string;
  departmentId: number;
  departmentName?: string;
  employeeCode?: string | null;
  phoneOrExtension?: string | null;
  email?: string | null;
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
