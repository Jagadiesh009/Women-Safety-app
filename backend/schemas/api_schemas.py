from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# USER SCHEMAS
class UserBase(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None

class UserCreate(UserBase):
    email: EmailStr

class UserResponse(UserBase):
    id: int
    firebase_uid: str
    email: EmailStr
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# EMERGENCY CONTACT SCHEMAS
class ContactBase(BaseModel):
    name: str
    phone: str
    relation: Optional[str] = None
    is_primary: bool = False

class ContactCreate(ContactBase):
    pass

class ContactUpdate(ContactBase):
    name: Optional[str] = None
    phone: Optional[str] = None

class ContactResponse(ContactBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# INCIDENT SCHEMAS
class IncidentBase(BaseModel):
    type: str
    locality: Optional[str] = None
    city: Optional[str] = "Bengaluru"
    category: Optional[str] = "SOS Emergency"

class IncidentCreate(IncidentBase):
    trigger_source: Optional[str] = "MANUAL"
    idempotency_key: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None

class IncidentUpdate(BaseModel):
    status: str
    end_time: Optional[datetime] = None

class IncidentResponse(IncidentBase):
    id: int
    user_id: int
    status: str
    trigger_source: Optional[str] = "MANUAL"
    idempotency_key: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    resolved_by: Optional[str] = None
    locality: Optional[str] = None
    city: Optional[str] = "Bengaluru"
    category: Optional[str] = "SOS Emergency"
    dispatch_status: Optional[str] = "UNASSIGNED"
    assigned_officer_id: Optional[int] = None

    class Config:
        from_attributes = True

# LOCATION SCHEMAS
class LocationBase(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None

class LocationCreate(LocationBase):
    pass

class LocationResponse(LocationBase):
    id: int
    incident_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

# LIVE LOCATION SHARING SCHEMAS
class LocationShareStartRequest(BaseModel):
    session_token: Optional[str] = None

class LocationShareStartResponse(BaseModel):
    session_token: str
    tracking_url: str
    expires_at: datetime
    is_active: bool

class LocationShareUpdateRequest(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None

class LocationSharePublicResponse(BaseModel):
    is_active: bool
    session_token: str
    user_name: Optional[str] = "SafeHer User"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None
    last_updated_at: Optional[datetime] = None
    is_stale: bool = False
    expires_at: datetime

# LOCATION SAFETY SCORE SCHEMAS
class SafetyFactor(BaseModel):
    name: str
    score_impact: float
    status: str # "POSITIVE", "NEUTRAL", "CAUTION", "ALERT", "MISSING"
    source: str
    description: str

class SafetyScoreResponse(BaseModel):
    score: float # 0.0 to 10.0
    confidence: str # "HIGH", "MEDIUM", "LOW", "UNAVAILABLE"
    factors: List[SafetyFactor]
    missing_factors: List[str]
    explanation: str
    guidance: str
    data_updated_at: datetime


# ============================================================================
# POLICE & DISPATCH SCHEMAS
# ============================================================================

class PoliceLoginRequest(BaseModel):
    badge_number: str
    password: str

class PoliceOfficerResponse(BaseModel):
    id: int
    badge_number: str
    name: str
    email: EmailStr
    phone: Optional[str] = None
    rank: str
    role: str # "OFFICER" or "SUPERVISOR"
    station_name: str
    assigned_zone: str
    is_active: bool
    is_on_duty: bool = False
    current_patrol_zone: Optional[str] = None
    vehicle_number: Optional[str] = None

    class Config:
        from_attributes = True

class PoliceTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    officer: PoliceOfficerResponse

class DutyToggleRequest(BaseModel):
    is_on_duty: bool
    patrol_zone: Optional[str] = None
    vehicle_number: Optional[str] = None

class DutyStatusResponse(BaseModel):
    is_on_duty: bool
    duty_started_at: Optional[datetime] = None
    duty_ended_at: Optional[datetime] = None
    current_patrol_zone: Optional[str] = None
    vehicle_number: Optional[str] = None
    officer_id: int
    badge_number: str
    officer_name: str

class PatrolLocationCreate(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None

class PatrolUnitMarker(BaseModel):
    officer_id: int
    badge_number: str
    name: str
    rank: str
    role: str
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    patrol_zone: Optional[str] = None
    vehicle_number: Optional[str] = None
    updated_at: datetime
    is_self: bool = False

class NearbyPoliceOfficerResponse(BaseModel):
    officer_id: int
    display_name: str
    badge_number: str
    rank: str
    station_name: str
    latitude: float
    longitude: float
    distance_km: float
    duty_status: str # "ON DUTY"
    last_location_update: datetime

    class Config:
        from_attributes = True

class IncomingAlertItem(BaseModel):
    incident_id: int
    notification_id: int
    user_name: Optional[str] = "SafeHer User"
    trigger_source: str
    category: str
    locality: Optional[str] = None
    city: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None
    distance_km: Optional[float] = None
    incident_time: datetime
    created_at: datetime
    status: str # "PENDING", "ACCEPTED", "DECLINED"

class IncidentStatusUpdateRequest(BaseModel):
    status: str # "EN_ROUTE", "ARRIVED", "ASSISTANCE_PROVIDED", "RESOLVED"
    notes: Optional[str] = None

class PoliceIncidentDetail(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = "SafeHer User"
    user_phone: Optional[str] = None
    type: str
    category: str
    status: str
    dispatch_status: str
    trigger_source: str
    start_time: datetime
    end_time: Optional[datetime] = None
    locality: Optional[str] = None
    city: str
    latest_latitude: Optional[float] = None
    latest_longitude: Optional[float] = None
    latest_accuracy: Optional[float] = None
    distance_km: Optional[float] = None
    assigned_officer_id: Optional[int] = None
    response_status: Optional[str] = None
    accepted_at: Optional[datetime] = None
    en_route_at: Optional[datetime] = None
    arrived_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    notes: Optional[str] = None

class UserIncidentDispatchStatus(BaseModel):
    incident_id: int
    incident_status: str
    dispatch_status: str # "UNASSIGNED", "DISPATCH_PENDING", "ACCEPTED", "EN_ROUTE", "ARRIVED", "ASSISTANCE_PROVIDED", "RESOLVED"
    is_patrol_available: bool
    assigned_officer_name: Optional[str] = None
    assigned_officer_badge: Optional[str] = None
    assigned_officer_rank: Optional[str] = None
    assigned_officer_station: Optional[str] = None
    assigned_officer_vehicle: Optional[str] = None
    officer_distance_km: Optional[float] = None
    accepted_at: Optional[datetime] = None
    en_route_at: Optional[datetime] = None
    arrived_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    message: str


# ============================================================================
# CRIME SEARCH & WEEKLY REPORTS SCHEMAS
# ============================================================================

class CrimeIncidentSummary(BaseModel):
    id: int
    category: str
    locality: str
    city: str
    timestamp: datetime
    is_verified: bool
    risk_level: str
    # Coordinates intentionally fuzzed/truncated to protect privacy (0.01 deg ~= 1.1km)
    approx_latitude: Optional[float] = None
    approx_longitude: Optional[float] = None

class LocalityCrimeSummary(BaseModel):
    locality: str
    city: str
    total_incidents: int
    verified_incidents: int
    risk_level: str # "LOW", "MODERATE", "HIGH"
    top_categories: List[dict] # [{"category": "Harassment", "count": 5}]
    weekly_change_pct: float
    patrol_coverage_status: str # "ADEQUATE", "NEEDS_ATTENTION", "INSUFFICIENT"
    approx_latitude: float
    approx_longitude: float

class CrimeSearchResponse(BaseModel):
    query: str
    total_found: int
    total_verified: int
    localities: List[LocalityCrimeSummary]
    incidents: List[CrimeIncidentSummary]

class RankedAreaItem(BaseModel):
    rank: int
    locality: str
    city: str
    verified_count: int
    previous_week_count: int
    percentage_change: float
    trend: str # "INCREASED", "DECREASED", "STABLE"
    risk_level: str
    primary_category: str
    patrol_status: str
    avg_response_time_minutes: Optional[float] = None

class TimeOfDayDistribution(BaseModel):
    night_22_04: int
    early_morning_04_08: int
    morning_08_12: int
    afternoon_12_17: int
    evening_17_22: int
    peak_period: str

class WeeklyCrimeReport(BaseModel):
    report_week: str
    start_date: datetime
    end_date: datetime
    insufficient_data: bool = False
    total_verified_incidents: int
    previous_week_total: int
    week_on_week_change_pct: float
    highest_risk_area: Optional[str] = None
    ranked_areas: List[RankedAreaItem]
    category_distribution: List[dict]
    time_of_day_distribution: TimeOfDayDistribution
    areas_needing_patrol: List[str]
    patrol_performance_summary: str
    generated_at: datetime


# ============================================================================
# COMMUNITY SAFETY & PATROL COORDINATION SCHEMAS
# ============================================================================

class CommunitySafetyMapLocality(BaseModel):
    locality: str
    city: str
    latitude: float
    longitude: float
    risk_color: str # "RED", "ORANGE", "GREEN"
    verified_incident_count: int
    recent_alerts_count: int
    has_active_patrol: bool
    patrol_units_active: int
    needs_additional_patrol: bool
    data_source: str = "SafeHer Verified Incident Registry"
    last_updated: datetime

class CommunityAlertCreate(BaseModel):
    locality: str
    title: str
    advisory: str
    precautions: Optional[str] = None
    severity: Optional[str] = "WARNING"
    expires_in_hours: Optional[int] = 48

class CommunityAlertResponse(BaseModel):
    id: int
    locality: str
    title: str
    advisory: str
    precautions: Optional[str] = None
    severity: str
    issuing_authority: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool

class PatrolRecommendationResponse(BaseModel):
    id: int
    locality: str
    verified_incidents_count: int
    previous_week_count: int
    percentage_change: float
    risk_level: str
    primary_categories: Optional[str] = None
    suggested_patrol_period: str
    reason: str
    status: str
    available_units_count: int = 0
    existing_patrol_coverage: str
    created_at: datetime

class PatrolAssignRequest(BaseModel):
    officer_id: int
    instructions: Optional[str] = None
    shift_period: Optional[str] = "Night Patrol (20:00 - 04:00)"

class PatrolAssignmentResponse(BaseModel):
    id: int
    locality: str
    zone: str
    shift_period: str
    instructions: Optional[str] = None
    status: str
    assigned_at: datetime
    officer_name: str
    officer_badge: str
    supervisor_name: Optional[str] = None

