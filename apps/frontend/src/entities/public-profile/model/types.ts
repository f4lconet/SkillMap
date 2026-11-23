import type { ProfessionMap } from '@/entities/skill';
import type { UserLevel } from '@/entities/user';
import type {
  GapAnalysis,
  Trajectory,
} from '@/entities/skill';
import type { ProfessionDetail } from '@/entities/profession';

/** app/schemas/share.py::PublicGapSummary */
export interface PublicGapSummary {
  totalSkills: number;
  masteredCount: number;
  learningCount: number;
  missingCount: number;
  matchPercent: number;
  estimatedRemainingHours: number | null;
}

/** app/schemas/share.py::PublicPlanSummary */
export interface PublicPlanSummary {
  hoursPerWeek: number;
  totalWeeks: number;
  currentWeek: number;
  focus: string | null;
}

/** app/schemas/share.py::ShareState — GET/POST/DELETE /me/share */
export interface ShareState {
  enabled: boolean;
  username: string | null;
  token: string | null;
  /** {frontend}/u/{username} — актуальная ссылка на карту */
  profileUrl: string | null;
  /** {frontend}/public/{token} — ссылка по токену (legacy) */
  url: string | null;
  sharedAt: string | null;
}

/** app/schemas/share.py::PublicMapResponse — GET /public/u/{username} */
export interface PublicProfile {
  username: string | null;
  ownerName: string;
  ownerLevel: UserLevel | null;
  professionId: string | null;
  professionTitle: string | null;
  sharedAt: string | null;
  map: ProfessionMap | null;
  gap: PublicGapSummary;
  plan: PublicPlanSummary;
}

/** app/schemas/share.py::ExportPayload */
export interface ExportPayload {
  meta: {
    app: string;
    version: string;
    generatedAt: string;
    shareUrl: string | null;
  };
  user: {
    name: string;
    email: string;
    level: UserLevel | null;
    hoursPerWeek: number | null;
    targetProfessionTitle: string | null;
  };
  profession: ProfessionDetail;
  map: ProfessionMap;
  gap: GapAnalysis;
  plan: Trajectory;
  notes: string[];
}