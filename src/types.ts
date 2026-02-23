export type Role = 'ADMIN' | 'DONOR' | 'RECIPIENT';

export interface User {
  id: number;
  username: string;
  name: string;
  role: Role;
  age: number;
  gender: string;
  blood_group: string;
  contact: string;
}

export interface Organ {
  id: number;
  organ_type: string;
  blood_group: string;
  donor_id: number;
  donor_name?: string;
  availability_status: 'AVAILABLE' | 'REQUESTED' | 'MATCHED';
  date_added: string;
}

export interface OrganRequest {
  id: number;
  recipient_id: number;
  recipient_name?: string;
  organ_type: string;
  blood_group: string;
  urgency_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  date_requested: string;
  admin_note?: string;
}

export interface Match {
  id: number;
  donor_id: number;
  donor_name: string;
  recipient_id: number;
  recipient_name: string;
  organ_id: number;
  request_id: number;
  organ_type: string;
  matched_on: string;
  status: string;
}
