export interface PoliceDetails {
  id: string
  station: string
  address?: string
  contactNumber?: string
}

export interface MissingPerson {
  id: string
  fullName: string
  age: number
  gender: string
  photo: string
  lastSeenLocation: string
  lastSeenDate: string
  lastSeenTime: string
  status: string
  createdAt: string
  notificationCount?: number
  police?: PoliceDetails
  isSeen?: boolean
  additionalPhotos?: string[]
  behavioralTraits?: string
  healthConditions?: string
  height?: number
  heightUnit?: string
  weight?: number
  weightUnit?: string
  hairColor?: string
  eyeColor?: string
  clothingWorn?: string
  identifyingMarks?: string
  reporterName?: string
  relationship?: string
  mobileNumber?: string
  emailAddress?: string
  lat?: number
  lng?: number
  userId?: string
}

export interface Reporter {
  name: string
  phone?: string
  email?: string
}

export interface FamilyInteractions {
  response: string
  notes?: string
  createdAt: string
}

export interface PoliceActions {
  actionTaken: string
  remarks?: string
  createdAt: string
}

export interface SightingReport {
  id: string
  missingPersonId: string
  sightingDate: string
  sightingTime: string
  appearanceNotes: string
  behaviorNotes?: string
  identifyingMarks?: string
  reporterPhoto?: string
  status: string
  createdAt: string
  showUser: boolean
  notificationCount?: number
  latestNotification?: string
  verifiedByFamily?: string | null
  policeDetails?: PoliceDetails
  missingPerson?: MissingPerson
  locationDetails?: string
  sightingLat: number
  sightingLng: number
  sightingName?: string
  seenWith?: string
  reporter?: Reporter
  originalPhoto?: string
  originalHeat?: string
  reporterHeat?: string
  matchPercentage?: number
  analysis?: string
  familyInteractions?: FamilyInteractions
  policeActions?: PoliceActions
}

export interface Notification {
  id: string
  type: string
  message: string
  isRead: boolean
  createdAt: string
  sightingReportId: string
}

