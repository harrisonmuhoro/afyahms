export interface Patient {
  id: string;
  internal_id: number;
  patient_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  full_name: string;
  gender: 'male' | 'female' | 'other' | null;
  marital_status: string | null;
  date_of_birth: string | null;
  age: number | null;
  blood_group: string | null;
  phone: string | null;
  email: string | null;
  national_id: string | null;
  sha_number: string | null;
  county: string | null;
  sub_county: string | null;
  address: string | null;
  occupation: string | null;
  photo_path: string | null;
  deceased: boolean;
  deceased_at: string | null;
  branch_id: number;
  is_active: boolean;
  merged_into: string | null;
  merged_at: string | null;
  registered_by: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PatientSearchHit {
  id: string;
  patient_number: string;
  full_name: string;
  phone: string | null;
  dob: string | null;
  age: number | null;
  gender: Patient['gender'];
}

export interface PaginatedPatients {
  data: Patient[];
  links?: {
    first?: string;
    last?: string;
    prev?: string | null;
    next?: string | null;
  };
  meta: {
    pagination: {
      mode: 'page';
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
      from: number | null;
      to: number | null;
    };
  };
}
