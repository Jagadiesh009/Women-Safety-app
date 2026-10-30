from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import math

from schemas.api_schemas import (
    IncidentCreate,
    IncidentUpdate,
    IncidentResponse,
    LocationResponse,
    UserIncidentDispatchStatus
)
from database.models import (
    User,
    Incident,
    Location,
    PoliceOfficer,
    PoliceDutyStatus,
    PatrolLocation,
    IncidentResponse as DBIncidentResponse,
    DispatchNotification
)
from api.deps import get_db, get_current_user

router = APIRouter(prefix="/incidents", tags=["Incidents"])

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def dispatch_incident_to_officers(incident: Incident, db: Session, user_lat: Optional[float] = None, user_lng: Optional[float] = None):
    """Identify ON-DUTY officers and create real-time dispatch notifications."""
    on_duty_records = db.query(PoliceDutyStatus).filter(PoliceDutyStatus.is_on_duty == True).all()
    if not on_duty_records:
        incident.dispatch_status = "UNASSIGNED"
        return

    incident.dispatch_status = "DISPATCH_PENDING"
    now = datetime.now(timezone.utc)

    for duty_rec in on_duty_records:
        officer = db.query(PoliceOfficer).filter(PoliceOfficer.id == duty_rec.officer_id, PoliceOfficer.is_active == True).first()
        if not officer:
            continue

        # Check if already notified
        existing_notif = db.query(DispatchNotification).filter(
            DispatchNotification.incident_id == incident.id,
            DispatchNotification.officer_id == officer.id
        ).first()

        if existing_notif:
            continue

        # Calculate distance if coordinates available
        distance = None
        if user_lat is not None and user_lng is not None:
            latest_patrol = db.query(PatrolLocation).filter(
                PatrolLocation.officer_id == officer.id
            ).order_by(PatrolLocation.timestamp.desc()).first()
            if latest_patrol:
                distance = haversine_km(latest_patrol.latitude, latest_patrol.longitude, user_lat, user_lng)

        notif = DispatchNotification(
            incident_id=incident.id,
            officer_id=officer.id,
            status="PENDING",
            distance_km=distance,
            created_at=now
        )
        db.add(notif)

@router.get("/", response_model=List[IncidentResponse])
def get_incidents(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all incidents for the current user."""
    return db.query(Incident).filter(Incident.user_id == current_user.id).order_by(Incident.start_time.desc()).all()

@router.post("/", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(incident: IncidentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new emergency incident idempotently and trigger police dispatch."""
    # Check idempotency key if provided
    if incident.idempotency_key:
        existing = db.query(Incident).filter(
            Incident.user_id == current_user.id,
            Incident.idempotency_key == incident.idempotency_key
        ).first()
        if existing:
            return existing
    else:
        # Safety duplicate prevention: If an active incident was created in the last 10 seconds with same type, reuse it
        recent_active = db.query(Incident).filter(
            Incident.user_id == current_user.id,
            Incident.type == incident.type,
            Incident.status == "ACTIVE"
        ).order_by(Incident.start_time.desc()).first()
        
        if recent_active and recent_active.start_time:
            now_utc = datetime.now(timezone.utc)
            start_utc = recent_active.start_time if recent_active.start_time.tzinfo else recent_active.start_time.replace(tzinfo=timezone.utc)
            if (now_utc - start_utc).total_seconds() < 10:
                return recent_active

    new_incident = Incident(
        user_id=current_user.id,
        type=incident.type,
        category=incident.category or "SOS Emergency",
        locality=incident.locality or "Indiranagar",
        city=incident.city or "Bengaluru",
        trigger_source=incident.trigger_source or "MANUAL",
        idempotency_key=incident.idempotency_key,
        status="ACTIVE",
        dispatch_status="UNASSIGNED",
        is_verified=True
    )
    db.add(new_incident)
    db.commit()
    db.refresh(new_incident)

    # If coordinates provided, record initial location
    if incident.latitude is not None and incident.longitude is not None:
        init_loc = Location(
            incident_id=new_incident.id,
            latitude=incident.latitude,
            longitude=incident.longitude,
            accuracy=incident.accuracy
        )
        db.add(init_loc)
        db.commit()

    # Trigger police dispatch
    dispatch_incident_to_officers(new_incident, db, user_lat=incident.latitude, user_lng=incident.longitude)
    db.commit()
    db.refresh(new_incident)

    return new_incident

@router.put("/{incident_id}", response_model=IncidentResponse)
def update_incident(incident_id: int, incident: IncidentUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update an incident (e.g., mark as RESOLVED)."""
    db_incident = db.query(Incident).filter(
        Incident.id == incident_id, 
        Incident.user_id == current_user.id
    ).first()
    
    if not db_incident:
        raise HTTPException(status_code=404, detail="Incident not found or not authorized")
        
    db_incident.status = incident.status
    if incident.end_time:
        db_incident.end_time = incident.end_time
    elif incident.status == "RESOLVED" and not db_incident.end_time:
        db_incident.end_time = datetime.now(timezone.utc)
        
    db.commit()
    db.refresh(db_incident)
    return db_incident

@router.get("/{incident_id}/locations", response_model=List[LocationResponse])
def get_incident_locations(incident_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all location updates for a specific incident."""
    db_incident = db.query(Incident).filter(
        Incident.id == incident_id, 
        Incident.user_id == current_user.id
    ).first()
    
    if not db_incident:
        raise HTTPException(status_code=404, detail="Incident not found or not authorized")
        
    return db.query(Location).filter(Location.incident_id == incident_id).order_by(Location.timestamp.asc()).all()

@router.get("/{incident_id}/dispatch-status", response_model=UserIncidentDispatchStatus)
def get_incident_dispatch_status(
    incident_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get live police dispatch status for the user's active emergency screen.
    Never falsely displays that police have been dispatched before an officer accepts!
    If no officers are available, clearly informs the user that no registered patrol is available.
    """
    incident = db.query(Incident).filter(
        Incident.id == incident_id,
        Incident.user_id == current_user.id
    ).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    on_duty_count = db.query(PoliceDutyStatus).filter(PoliceDutyStatus.is_on_duty == True).count()
    is_available = on_duty_count > 0

    assigned_officer = None
    response_rec = None
    officer_distance = None

    if incident.assigned_officer_id:
        assigned_officer = db.query(PoliceOfficer).filter(PoliceOfficer.id == incident.assigned_officer_id).first()
        response_rec = db.query(DBIncidentResponse).filter(
            DBIncidentResponse.incident_id == incident.id,
            DBIncidentResponse.officer_id == incident.assigned_officer_id
        ).first()

        # Distance calculation
        user_loc = db.query(Location).filter(Location.incident_id == incident.id).order_by(Location.timestamp.desc()).first()
        officer_loc = db.query(PatrolLocation).filter(PatrolLocation.officer_id == incident.assigned_officer_id).order_by(PatrolLocation.timestamp.desc()).first()
        if user_loc and officer_loc:
            officer_distance = haversine_km(officer_loc.latitude, officer_loc.longitude, user_loc.latitude, user_loc.longitude)

    # Build human-readable status message
    st = incident.dispatch_status
    duty = assigned_officer.duty_status if assigned_officer else None
    vehicle = duty.vehicle_number if duty else None

    if st == "UNASSIGNED":
        if is_available:
            message = "Emergency recorded. Contacting area patrol units..."
        else:
            message = "No registered police patrol is currently available in your sector."
    elif st == "DISPATCH_PENDING":
        message = "Alerting active police patrol units in your vicinity..."
    elif st == "ACCEPTED":
        message = f"Officer {assigned_officer.name} ({assigned_officer.badge_number}) has accepted the dispatch."
    elif st == "EN_ROUTE":
        dist_str = f" (~{officer_distance} km away)" if officer_distance else ""
        message = f"Patrol unit {vehicle or assigned_officer.badge_number} is EN ROUTE to your location{dist_str}."
    elif st == "ARRIVED":
        message = f"Officer {assigned_officer.name} has ARRIVED at your location."
    elif st == "ASSISTANCE_PROVIDED":
        message = "Police assistance is currently being provided on-scene."
    elif st == "RESOLVED":
        message = "Incident has been resolved by police response."
    else:
        message = f"Status: {st}"

    return UserIncidentDispatchStatus(
        incident_id=incident.id,
        incident_status=incident.status,
        dispatch_status=st,
        is_patrol_available=is_available,
        assigned_officer_name=assigned_officer.name if assigned_officer else None,
        assigned_officer_badge=assigned_officer.badge_number if assigned_officer else None,
        assigned_officer_rank=assigned_officer.rank if assigned_officer else None,
        assigned_officer_station=assigned_officer.station_name if assigned_officer else None,
        assigned_officer_vehicle=vehicle,
        officer_distance_km=officer_distance,
        accepted_at=response_rec.accepted_at if response_rec else None,
        en_route_at=response_rec.en_route_at if response_rec else None,
        arrived_at=response_rec.arrived_at if response_rec else None,
        resolved_at=response_rec.resolved_at if response_rec else None,
        message=message
    )
