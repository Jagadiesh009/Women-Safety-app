from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from .api_schemas import IncidentResponse, LocationResponse, UserResponse, ContactResponse

class UserWithContactsResponse(UserResponse):
    contacts: List[ContactResponse] = []

    class Config:
        from_attributes = True

class IncidentAdminResponse(IncidentResponse):
    locations: List[LocationResponse] = []
    user: Optional[UserWithContactsResponse] = None

    class Config:
        from_attributes = True

class UserAdminResponse(BaseModel):
    id: int
    firebase_uid: str
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    created_at: Optional[datetime] = None
    total_incidents: int
    active_incidents: int
    resolved_incidents: int
    last_incident_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserDetailsAdminResponse(UserAdminResponse):
    incidents: List[IncidentAdminResponse] = []


class RegistrationTrend(BaseModel):
    date: str
    count: int

class AdminDashboardResponse(BaseModel):
    total_users: int
    active_incidents: int
    resolved_incidents: int
    registration_trends: List[RegistrationTrend]
    recent_incidents: List[IncidentAdminResponse]

class BulkResolveIncidentsResponse(BaseModel):
    message: str
    resolved_count: int
    unresolved_remaining: int
    timestamp: datetime

class AdminOfficerCreate(BaseModel):
    badge_number: str
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    rank: Optional[str] = "Patrol Officer"
    role: Optional[str] = "OFFICER"
    station_name: Optional[str] = "Central Police Station"
    assigned_zone: Optional[str] = "Indiranagar"

class AdminOfficerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    rank: Optional[str] = None
    role: Optional[str] = None
    station_name: Optional[str] = None
    assigned_zone: Optional[str] = None

class AdminOfficerStatusToggle(BaseModel):
    is_active: bool

class AdminOfficerItem(BaseModel):
    id: int
    badge_number: str
    email: str
    name: str
    phone: Optional[str] = None
    rank: str
    role: str
    station_name: str
    assigned_zone: str
    is_active: bool
    is_on_duty: bool = False
    duty_zone: Optional[str] = None
    vehicle_number: Optional[str] = None
    last_location_lat: Optional[float] = None
    last_location_lng: Optional[float] = None
    last_location_time: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AdminAdvisoryCreate(BaseModel):
    locality: str
    title: str
    advisory: str
    precautions: Optional[str] = None
    severity: Optional[str] = "WARNING"
    issuing_authority: Optional[str] = "Bengaluru City Police"
    expires_days: Optional[int] = 7

class AdminReportVerify(BaseModel):
    is_verified: bool

class LocalityCrimeRanking(BaseModel):
    locality: str
    count: int
    risk_level: str

class AdminComprehensiveStats(BaseModel):
    total_users: int
    total_officers: int
    on_duty_officers: int
    pending_incidents: int
    active_responses: int
    resolved_incidents: int
    patrol_units_available: int
    total_crime_reports: int
    verified_crime_reports: int
    active_safety_alerts: int
    weekly_crime_count: int
    locality_crime_rankings: List[LocalityCrimeRanking] = []
    registration_trends: List[RegistrationTrend] = []
