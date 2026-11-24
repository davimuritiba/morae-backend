import type { VerificationStatus } from '../../../../../shared/domain/enums/verification-status.enum.js';
import type { StudentCompatibilityAnswersInput } from '../../../domain/entities/student-compatibility-answers.entity.js';
import type { AccountType } from '../../../domain/enums/account-type.enum.js';
import type {
  CampusDistance,
  DesiredRoommates,
  Gender,
  PreferredHousingType,
  RoommateGender,
} from '../../../domain/enums/profile-details.enum.js';

export interface StudentProfileView {
  course: string;
  period: number;
  university: string | null;
  campus: string | null;
  verificationStatus: VerificationStatus;
  compatibilityAnswers: Omit<StudentCompatibilityAnswersInput, 'updatedAt'> | null;
}

export interface HousingPreferencesView {
  housingType: PreferredHousingType | null;
  maxBudget: number | null;
  campusDistance: CampusDistance | null;
  preferredNeighborhoods: string | null;
  desiredRoommates: DesiredRoommates | null;
  roommateGender: RoommateGender | null;
}

// Dados que só a própria pessoa vê.
export interface PrivateProfileView {
  email: string;
  phone: string | null;
  birthDate: string | null; // AAAA-MM-DD
  gender: Gender | null;
  neighborhood: string | null;
  postalCode: string | null;
  address: string | null;
}

export interface UserProfileView {
  userId: string;
  name: string;
  photoUrl: string | null;
  accountType: AccountType;
  age: number | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  student: StudentProfileView | null;
  housingPreferences: HousingPreferencesView | null;
  private: PrivateProfileView | null;
}
