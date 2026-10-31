from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import math
import bcrypt
from jose import jwt

from database.database import SessionLocal
from database.models import (
    PoliceOfficer,
    PoliceDutyStatus,
    PatrolLocation,
    PatrolAssignment,
    PatrolRecommendation,
    Incident,
    Location,
    IncidentResponse,
    DispatchNotification
)
from schemas.api_schemas import (
    PoliceLoginRequest,
    PoliceTokenResponse,
    PoliceOfficerResponse,
    DutyToggleRequest,
    DutyStatusResponse,
    PatrolLocationCreate,
    PatrolUnitMarker,
    NearbyPoliceOfficerResponse,
    IncomingAlertItem,
    IncidentStatusUpdateRequest,
    PoliceIncidentDetail,
    PatrolRecommendationResponse,
    PatrolAssignRequest,
    PatrolAssignmentResponse
)
from api.deps import (
    get_db,
    get_current_police_officer,
    get_current_police_supervisor,
    get_civilian_or_authorized_user,
    POLICE_JWT_SECRET,
    POLICE_JWT_ALGORITHM
)

router = APIRouter(prefix="/police", tags=["Police"])

# Helper: calculate distance in kilometers between two GPS coordinates
def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# Auto-seed initial authorized officers if none exist
def seed_initial_officers_if_needed(db: Session):
    pol101 = db.query(PoliceOfficer).filter(PoliceOfficer.badge_number == "POL-101").first()
    if not pol101:
        default_pwd_hash = get_password_hash("PoliceSecure@2026")
        
        officers_data = [
            {
                "badge_number": "POL-101",
                "name": "Inspector Priya Sharma",
                "email": "priya.sharma@police.gov.in",
                "password_hash": default_pwd_hash,
                "phone": "+919876543210",
                "rank": "Inspector",
                "role": "SUPERVISOR",
                "station_name": "Indiranagar Police Station",
                "assigned_zone": "Indiranagar",
                "is_active": True
            },
            {
                "badge_number": "POL-102",
                "name": "Officer Ramesh Kumar",
                "email": "ramesh.kumar@police.gov.in",
                "password_hash": default_pwd_hash,
                "phone": "+919876543211",
                "rank": "Patrol Officer",
                "role": "OFFICER",
                "station_name": "Indiranagar Police Station",
                "assigned_zone": "Indiranagar",
                "is_active": True
            },
            {
                "badge_number": "POL-103",
                "name": "Officer Ananya Patel",
                "email": "ananya.patel@police.gov.in",
                "password_hash": default_pwd_hash,
                "phone": "+919876543212",
                "rank": "Sub-Inspector",
                "role": "OFFICER",
                "station_name": "Koramangala Police Station",
                "assigned_zone": "Koramangala",
                "is_active": True
            }
        ]
        
        for data in officers_data:
            officer = PoliceOfficer(**data)
            db.add(officer)
        db.commit()
        
        # Initialize duty status for each officer if needed
        officers = db.query(PoliceOfficer).all()
        for off in officers:
            existing_duty = db.query(PoliceDutyStatus).filter(PoliceDutyStatus.officer_id == off.id).first()
            if not existing_duty:
                duty = PoliceDutyStatus(
                    officer_id=off.id,
                    is_on_duty=False,
                    current_patrol_zone=off.assigned_zone,
                    vehicle_number=f"KA-01-G-{1000 + off.id}"
                )
                db.add(duty)
        db.commit()

# ============================================================================
# 1. POLICE AUTHENTICATION
# ============================================================================

@router.post("/auth/login", response_model=PoliceTokenResponse)
def police_login(payload: PoliceLoginRequest, db: Session = Depends(get_db)):
    """Authenticate authorized police officer using Badge Number and Password."""
    seed_initial_officers_if_needed(db)
    
    badge = payload.badge_number.strip().upper()
    officer = db.query(PoliceOfficer).filter(
        or_(
            func.upper(PoliceOfficer.badge_number) == badge,
            func.lower(PoliceOfficer.email) == payload.badge_number.strip().lower()
        )
    ).first()
    
    if not officer or not officer.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid officer credentials or inactive police account"
        )
        
    if not verify_password(payload.password, officer.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid officer credentials"
        )
        
    # Generate JWT Token with officer payload
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    token_claims = {
        "sub": str(officer.id),
        "badge": officer.badge_number,
        "name": officer.name,
        "rank": officer.rank,
        "role": officer.role,
        "zone": officer.assigned_zone,
        "exp": expire
    }
    access_token = jwt.encode(token_claims, POLICE_JWT_SECRET, algorithm=POLICE_JWT_ALGORITHM)
    
    # Retrieve duty status
    duty = db.query(PoliceDutyStatus).filter(PoliceDutyStatus.officer_id == officer.id).first()
    
    officer_resp = PoliceOfficerResponse(
        id=officer.id,
        badge_number=officer.badge_number,
        name=officer.name,
        email=officer.email,
        phone=officer.phone,
        rank=officer.rank,
        role=officer.role,
        station_name=officer.station_name,
        assigned_zone=officer.assigned_zone,
        is_active=officer.is_active,
        is_on_duty=duty.is_on_duty if duty else False,
        current_patrol_zone=duty.current_patrol_zone if duty else officer.assigned_zone,
        vehicle_number=duty.vehicle_number if duty else None
    )
    
    return PoliceTokenResponse(
        access_token=access_token,
        token_type="bearer",
        officer=officer_resp
    )

@router.get("/auth/me", response_model=PoliceOfficerResponse)
def get_police_me(
    officer: PoliceOfficer = Depends(get_current_police_officer),
    db: Session = Depends(get_db)
):
    """Retrieve authenticated officer profile and current duty status."""
    duty = db.query(PoliceDutyStatus).filter(PoliceDutyStatus.officer_id == officer.id).first()
    return PoliceOfficerResponse(
        id=officer.id,
        badge_number=officer.badge_number,
        name=officer.name,
        email=officer.email,
        phone=officer.phone,
        rank=officer.rank,
        role=officer.role,
        station_name=officer.station_name,
        assigned_zone=officer.assigned_zone,
        is_active=officer.is_active,
        is_on_duty=duty.is_on_duty if duty else False,
        current_patrol_zone=duty.current_patrol_zone if duty else officer.assigned_zone,
        vehicle_number=duty.vehicle_number if duty else None
    )

# ============================================================================
# 2. DUTY STATUS & PATROL LOCATION
# ============================================================================

@router.post("/duty/toggle", response_model=DutyStatusResponse)
def toggle_duty_status(
    payload: DutyToggleRequest,
    officer: PoliceOfficer = Depends(get_current_police_officer),
    db: Session = Depends(get_db)
):
    """Update police officer duty status (ON DUTY / OFF DUTY). Backend is source of truth."""
    duty = db.query(PoliceDutyStatus).filter(PoliceDutyStatus.officer_id == officer.id).first()
    now = datetime.now(timezone.utc)
    
    if not duty:
        duty = PoliceDutyStatus(officer_id=officer.id)
        db.add(duty)
        
    duty.is_on_duty = payload.is_on_duty
    if payload.is_on_duty:
        duty.duty_started_at = now
        duty.duty_ended_at = None
        assigned_zone_or_station = officer.station_name or officer.assigned_zone or "Station not assigned"
        duty.current_patrol_zone = payload.patrol_zone or assigned_zone_or_station

        if payload.vehicle_number:
            duty.vehicle_number = payload.vehicle_number
    else:
        duty.duty_ended_at = now
        # Expire any pending unaccepted notifications for this officer
        pending_notifications = db.query(DispatchNotification).filter(
            DispatchNotification.officer_id == officer.id,
            DispatchNotification.status == "PENDING"
        ).all()
        for notif in pending_notifications:
            notif.status = "EXPIRED"
            notif.responded_at = now
            
    duty.updated_at = now
    db.commit()
    db.refresh(duty)
    
    return DutyStatusResponse(
        is_on_duty=duty.is_on_duty,
        duty_started_at=duty.duty_started_at,
        duty_ended_at=duty.duty_ended_at,
        current_patrol_zone=duty.current_patrol_zone,
        vehicle_number=duty.vehicle_number,
        officer_id=officer.id,
        badge_number=officer.badge_number,
        officer_name=officer.name
    )

@router.get("/duty/status", response_model=DutyStatusResponse)
def get_duty_status(
    officer: PoliceOfficer = Depends(get_current_police_officer),
    db: Session = Depends(get_db)
):
    """Get current officer's duty status."""
    duty = db.query(PoliceDutyStatus).filter(PoliceDutyStatus.officer_id == officer.id).first()
    if not duty:
        duty = PoliceDutyStatus(
            officer_id=officer.id,
            is_on_duty=False,
            current_patrol_zone=officer.assigned_zone
        )
        db.add(duty)
        db.commit()
        db.refresh(duty)
        
    return DutyStatusResponse(
        is_on_duty=duty.is_on_duty,
        duty_started_at=duty.duty_started_at,
        duty_ended_at=duty.duty_ended_at,
        current_patrol_zone=duty.current_patrol_zone,
        vehicle_number=duty.vehicle_number,
        officer_id=officer.id,
        badge_number=officer.badge_number,
        officer_name=officer.name
    )

@router.post("/patrol/location")
def update_patrol_location(
    payload: PatrolLocationCreate,
    officer: PoliceOfficer = Depends(get_current_police_officer),
    db: Session = Depends(get_db)
):
    """Update officer's live GPS coordinates while ON DUTY."""
    duty = db.query(PoliceDutyStatus).filter(PoliceDutyStatus.officer_id == officer.id).first()
    if not duty or not duty.is_on_duty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update patrol location while OFF DUTY"
        )
        
    new_loc = PatrolLocation(
        officer_id=officer.id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        accuracy=payload.accuracy,
        speed=payload.speed,
        heading=payload.heading,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(new_loc)
    db.commit()
    return {"status": "ok", "timestamp": new_loc.timestamp}

@router.get("/patrol/active-units", response_model=List[PatrolUnitMarker])
def get_active_patrol_units(
    officer: PoliceOfficer = Depends(get_current_police_officer),
    db: Session = Depends(get_db)
):
    """Retrieve other on-duty patrol units for the police patrol map."""
    on_duty_officers = db.query(PoliceOfficer).join(PoliceDutyStatus).filter(
        PoliceDutyStatus.is_on_duty == True,
        PoliceOfficer.is_active == True
    ).all()
    
    markers = []
    for off in on_duty_officers:
        # Get latest location
        latest_loc = db.query(PatrolLocation).filter(
            PatrolLocation.officer_id == off.id
        ).order_by(PatrolLocation.timestamp.desc()).first()
        
        if latest_loc:
            duty = off.duty_status
            markers.append(PatrolUnitMarker(
                officer_id=off.id,
                badge_number=off.badge_number,
                name=off.name,
                rank=off.rank,
                role=off.role,
                latitude=latest_loc.latitude,
                longitude=latest_loc.longitude,
                accuracy=latest_loc.accuracy,
                patrol_zone=duty.current_patrol_zone if duty else off.assigned_zone,
                vehicle_number=duty.vehicle_number if duty else None,
                updated_at=latest_loc.timestamp,
                is_self=(off.id == officer.id)
            ))
            
    return markers

@router.get("/nearby", response_model=List[NearbyPoliceOfficerResponse])
def get_nearby_officers(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Civilian latitude"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Civilian longitude"),
    radius_km: float = Query(3.0, gt=0.0, le=50.0, description="Search radius in kilometers"),
    _auth: dict = Depends(get_civilian_or_authorized_user),
    db: Session = Depends(get_db)
):
    """
    Find authorized police officers who:
    - Are currently ON DUTY
    - Have location sharing enabled (active PatrolLocation records)
    - Have a valid, recent GPS location (non-stale <= 30 mins)
    - Are within the requested radius (e.g. 1 km, 2 km, 3 km, 5 km)
    Privacy protections:
    - Only ON DUTY officers returned
    - No personal phone, email, or home address exposed
    - Immediately omits officers when they switch to OFF DUTY
    - Real authorized coordinates only (zero mock / fabricated entries)
    """
    now = datetime.now(timezone.utc)
    stale_cutoff = now - timedelta(minutes=30)

    # Query active officers who are currently on duty
    on_duty_officers = (
        db.query(PoliceOfficer)
        .join(PoliceDutyStatus, PoliceOfficer.id == PoliceDutyStatus.officer_id)
        .filter(
            PoliceOfficer.is_active == True,
            PoliceDutyStatus.is_on_duty == True
        )
        .all()
    )

    nearby_units = []
    for officer in on_duty_officers:
        latest_loc = (
            db.query(PatrolLocation)
            .filter(PatrolLocation.officer_id == officer.id)
            .order_by(PatrolLocation.timestamp.desc())
            .first()
        )
        if not latest_loc:
            continue

        # Check freshness: exclude locations older than 30 minutes
        loc_time = latest_loc.timestamp
        if loc_time.tzinfo is None:
            loc_time = loc_time.replace(tzinfo=timezone.utc)
        if loc_time < stale_cutoff:
            continue

        distance = haversine_km(latitude, longitude, latest_loc.latitude, latest_loc.longitude)
        if distance <= radius_km:
            rank_str = officer.rank or "Patrol Officer"
            display_name = f"{rank_str} {officer.name}".strip()
            station = officer.station_name or officer.assigned_zone or "Station not assigned"
            
            nearby_units.append(
                NearbyPoliceOfficerResponse(
                    officer_id=officer.id,
                    display_name=display_name,
                    badge_number=officer.badge_number,
                    rank=rank_str,
                    station_name=station,
                    latitude=latest_loc.latitude,
                    longitude=latest_loc.longitude,
                    distance_km=round(distance, 2),
                    duty_status="ON DUTY",
                    last_location_update=latest_loc.timestamp
                )
            )

    nearby_units.sort(key=lambda x: x.distance_km)
    return nearby_units

# ============================================================================
# 3. REAL-TIME SOS ALERTS & DISPATCH (ACCEPT / DECLINE)
# ============================================================================

@router.get("/alerts", response_model=List[IncomingAlertItem])
def get_incoming_alerts(
    officer: PoliceOfficer = Depends(get_current_police_officer),
    db: Session = Depends(get_db)
):
    """Get pending incoming emergency SOS alerts for current on-duty officer."""
    duty = db.query(PoliceDutyStatus).filter(PoliceDutyStatus.officer_id == officer.id).first()
    if not duty or not duty.is_on_duty:
        return []
        
    # Get officer's latest location
    officer_loc = db.query(PatrolLocation).filter(
        PatrolLocation.officer_id == officer.id
    ).order_by(PatrolLocation.timestamp.desc()).first()
    
    # Notifications assigned to this officer that are PENDING
    notifications = db.query(DispatchNotification).filter(
        DispatchNotification.officer_id == officer.id,
        DispatchNotification.status == "PENDING"
    ).order_by(DispatchNotification.created_at.desc()).all()
    
    items = []
    for notif in notifications:
        inc = db.query(Incident).filter(Incident.id == notif.incident_id).first()
        if not inc or inc.status != "ACTIVE" or inc.dispatch_status in ("ACCEPTED", "EN_ROUTE", "ARRIVED", "RESOLVED"):
            # Expire stale notification
            notif.status = "EXPIRED"
            db.commit()
            continue
            
        latest_loc = db.query(Location).filter(Location.incident_id == inc.id).order_by(Location.timestamp.desc()).first()
        
        distance = None
        if officer_loc and latest_loc:
            distance = haversine_km(officer_loc.latitude, officer_loc.longitude, latest_loc.latitude, latest_loc.longitude)
        elif notif.distance_km:
            distance = notif.distance_km
            
        items.append(IncomingAlertItem(
            incident_id=inc.id,
            notification_id=notif.id,
            user_name=inc.user.name if inc.user else "SafeHer User",
            trigger_source=inc.trigger_source or "MANUAL",
            category=inc.category or "SOS Emergency",
            locality=inc.locality,
            city=inc.city or "Bengaluru",
            latitude=latest_loc.latitude if latest_loc else None,
            longitude=latest_loc.longitude if latest_loc else None,
            accuracy=latest_loc.accuracy if latest_loc else None,
            distance_km=distance,
            incident_time=inc.start_time,
            created_at=notif.created_at,
            status=notif.status
        ))
        
    return items

@router.post("/alerts/{incident_id}/accept")
def accept_alert(
    incident_id: int,
    officer: PoliceOfficer = Depends(get_current_police_officer),
    db: Session = Depends(get_db)
):
    """Atomically lock and accept an SOS incident dispatch assignment."""
    duty = db.query(PoliceDutyStatus).filter(PoliceDutyStatus.officer_id == officer.id).first()
    if not duty or not duty.is_on_duty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot accept emergency dispatch while OFF DUTY"
        )
        
    # Transactional check: ensure incident is still active and unassigned
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    if incident.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Incident is no longer active")
        
    if incident.assigned_officer_id and incident.assigned_officer_id != officer.id:
        assigned_off = db.query(PoliceOfficer).filter(PoliceOfficer.id == incident.assigned_officer_id).first()
        assigned_name = assigned_off.name if assigned_off else "Another officer"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This incident has already been assigned to {assigned_name} ({assigned_off.badge_number if assigned_off else ''})"
        )
        
    now = datetime.now(timezone.utc)
    
    # Assign incident to this officer
    incident.assigned_officer_id = officer.id
    incident.dispatch_status = "ACCEPTED"
    
    # Create or update IncidentResponse record
    response_rec = db.query(IncidentResponse).filter(
        IncidentResponse.incident_id == incident.id,
        IncidentResponse.officer_id == officer.id
    ).first()
    
    if not response_rec:
        response_rec = IncidentResponse(
            incident_id=incident.id,
            officer_id=officer.id,
            status="ACCEPTED",
            accepted_at=now
        )
        db.add(response_rec)
    else:
        response_rec.status = "ACCEPTED"
        response_rec.accepted_at = now
        
    # Mark this officer's notification as ACCEPTED
    my_notif = db.query(DispatchNotification).filter(
        DispatchNotification.incident_id == incident.id,
        DispatchNotification.officer_id == officer.id
    ).first()
    if my_notif:
        my_notif.status = "ACCEPTED"
        my_notif.responded_at = now
        
    # Expire notifications for all other officers for this incident
    other_notifs = db.query(DispatchNotification).filter(
        DispatchNotification.incident_id == incident.id,
        DispatchNotification.officer_id != officer.id,
        DispatchNotification.status == "PENDING"
    ).all()
    for notif in other_notifs:
        notif.status = "EXPIRED"
        notif.responded_at = now
        
    db.commit()
    db.refresh(incident)
    
    return {
        "status": "ok",
        "message": f"Incident {incident.id} successfully assigned to Officer {officer.name}",
        "incident_id": incident.id,
        "dispatch_status": incident.dispatch_status,
        "accepted_at": now
    }

@router.post("/alerts/{incident_id}/decline")
def decline_alert(
    incident_id: int,
    officer: PoliceOfficer = Depends(get_current_police_officer),
    db: Session = Depends(get_db)
):
    """Decline an incoming emergency alert. Keeps incident available for other on-duty officers."""
    now = datetime.now(timezone.utc)
    notif = db.query(DispatchNotification).filter(
        DispatchNotification.incident_id == incident_id,
        DispatchNotification.officer_id == officer.id
    ).first()
    
    if notif:
        notif.status = "DECLINED"
        notif.responded_at = now
        db.commit()
        
    return {"status": "ok", "message": "Alert declined"}

# ============================================================================
# 4. INCIDENT RESPONSE LIFECYCLE & STATUS UPDATES
# ============================================================================

@router.post("/incidents/{incident_id}/status")
def update_response_status(
    incident_id: int,
    payload: IncidentStatusUpdateRequest,
    officer: PoliceOfficer = Depends(get_current_police_officer),
    db: Session = Depends(get_db)
):
    """
    Update incident response progression:
    ACCEPTED -> EN_ROUTE -> ARRIVED -> ASSISTANCE_PROVIDED -> RESOLVED
    Every update is persisted with officer ID and timestamp.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    if incident.assigned_officer_id != officer.id:
        raise HTTPException(status_code=403, detail="Not authorized for this incident")
        
    now = datetime.now(timezone.utc)
    valid_statuses = ["ACCEPTED", "EN_ROUTE", "ARRIVED", "ASSISTANCE_PROVIDED", "RESOLVED"]
    status_upper = payload.status.upper().strip()
    if status_upper not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")
        
    incident.dispatch_status = status_upper
    
    response_rec = db.query(IncidentResponse).filter(
        IncidentResponse.incident_id == incident.id,
        IncidentResponse.officer_id == officer.id
    ).first()
    
    if not response_rec:
        response_rec = IncidentResponse(
            incident_id=incident.id,
            officer_id=officer.id,
            status=status_upper
        )
        db.add(response_rec)
        
    response_rec.status = status_upper
    if payload.notes:
        response_rec.notes = payload.notes
        
    if status_upper == "EN_ROUTE" and not response_rec.en_route_at:
        response_rec.en_route_at = now
    elif status_upper == "ARRIVED" and not response_rec.arrived_at:
        response_rec.arrived_at = now
        if response_rec.accepted_at:
            acc_time = response_rec.accepted_at if response_rec.accepted_at.tzinfo else response_rec.accepted_at.replace(tzinfo=timezone.utc)
            delta = (now - acc_time).total_seconds()
            response_rec.response_time_seconds = int(delta)
    elif status_upper == "ASSISTANCE_PROVIDED" and not response_rec.assistance_at:
        response_rec.assistance_at = now
    elif status_upper == "RESOLVED":
        response_rec.resolved_at = now
        incident.status = "RESOLVED"
        incident.end_time = now
        incident.resolved_by = f"Officer {officer.name} ({officer.badge_number})"
        
    db.commit()
    db.refresh(incident)
    
    return {
        "status": "ok",
        "incident_id": incident.id,
        "dispatch_status": incident.dispatch_status,
        "timestamp": now,
        "notes": response_rec.notes
    }

@router.get("/incidents/active", response_model=Optional[PoliceIncidentDetail])
def get_active_incident(
    officer: PoliceOfficer = Depends(get_current_police_officer),
    db: Session = Depends(get_db)
):
    """Get the currently assigned active incident for the logged-in officer."""
    inc = db.query(Incident).filter(
        Incident.assigned_officer_id == officer.id,
        Incident.status == "ACTIVE"
    ).order_by(Incident.start_time.desc()).first()
    
    if not inc:
        return None
        
    latest_loc = db.query(Location).filter(Location.incident_id == inc.id).order_by(Location.timestamp.desc()).first()
    resp = db.query(IncidentResponse).filter(IncidentResponse.incident_id == inc.id, IncidentResponse.officer_id == officer.id).first()
    officer_loc = db.query(PatrolLocation).filter(PatrolLocation.officer_id == officer.id).order_by(PatrolLocation.timestamp.desc()).first()
    
    distance = None
    if officer_loc and latest_loc:
        distance = haversine_km(officer_loc.latitude, officer_loc.longitude, latest_loc.latitude, latest_loc.longitude)
        
    return PoliceIncidentDetail(
        id=inc.id,
        user_id=inc.user_id,
        user_name=inc.user.name if inc.user else "SafeHer User",
        user_phone=inc.user.phone if inc.user else None,
        type=inc.type,
        category=inc.category or "SOS Emergency",
        status=inc.status,
        dispatch_status=inc.dispatch_status,
        trigger_source=inc.trigger_source or "MANUAL",
        start_time=inc.start_time,
        end_time=inc.end_time,
        locality=inc.locality,
        city=inc.city or "Bengaluru",
        latest_latitude=latest_loc.latitude if latest_loc else None,
        latest_longitude=latest_loc.longitude if latest_loc else None,
        latest_accuracy=latest_loc.accuracy if latest_loc else None,
        distance_km=distance,
        assigned_officer_id=officer.id,
        response_status=resp.status if resp else inc.dispatch_status,
        accepted_at=resp.accepted_at if resp else None,
        en_route_at=resp.en_route_at if resp else None,
        arrived_at=resp.arrived_at if resp else None,
        resolved_at=resp.resolved_at if resp else None,
        notes=resp.notes if resp else None
    )

@router.get("/incidents/history", response_model=List[PoliceIncidentDetail])
def get_police_incident_history(
    officer: PoliceOfficer = Depends(get_current_police_officer),
    db: Session = Depends(get_db)
):
    """Retrieve history of all incidents assigned to or resolved by this officer."""
    responses = db.query(IncidentResponse).filter(
        IncidentResponse.officer_id == officer.id
    ).order_by(IncidentResponse.accepted_at.desc()).all()
    
    result = []
    for resp in responses:
        inc = resp.incident
        if not inc:
            continue
        latest_loc = db.query(Location).filter(Location.incident_id == inc.id).order_by(Location.timestamp.desc()).first()
        result.append(PoliceIncidentDetail(
            id=inc.id,
            user_id=inc.user_id,
            user_name=inc.user.name if inc.user else "SafeHer User",
            user_phone=inc.user.phone if inc.user else None,
            type=inc.type,
            category=inc.category or "SOS Emergency",
            status=inc.status,
            dispatch_status=inc.dispatch_status,
            trigger_source=inc.trigger_source or "MANUAL",
            start_time=inc.start_time,
            end_time=inc.end_time,
            locality=inc.locality,
            city=inc.city or "Bengaluru",
            latest_latitude=latest_loc.latitude if latest_loc else None,
            latest_longitude=latest_loc.longitude if latest_loc else None,
            latest_accuracy=latest_loc.accuracy if latest_loc else None,
            distance_km=None,
            assigned_officer_id=officer.id,
            response_status=resp.status,
            accepted_at=resp.accepted_at,
            en_route_at=resp.en_route_at,
            arrived_at=resp.arrived_at,
            resolved_at=resp.resolved_at,
            notes=resp.notes
        ))
    return result

# ============================================================================
# 5. PATROL RECOMMENDATIONS & ASSIGNMENTS (COMMUNITY COORDINATION)
# ============================================================================

@router.get("/patrol/recommendations", response_model=List[PatrolRecommendationResponse])
def get_patrol_recommendations(
    officer: PoliceOfficer = Depends(get_current_police_officer),
    db: Session = Depends(get_db)
):
    """Retrieve automated patrol recommendations generated from weekly incident concentrations."""
    recs = db.query(PatrolRecommendation).order_by(PatrolRecommendation.created_at.desc()).all()
    if not recs:
        from api.crime import seed_initial_patrol_recommendations_if_needed
        seed_initial_patrol_recommendations_if_needed(db)
        recs = db.query(PatrolRecommendation).order_by(PatrolRecommendation.created_at.desc()).all()
    
    # Count available units currently on duty
    available_units = db.query(PoliceDutyStatus).filter(PoliceDutyStatus.is_on_duty == True).count()
    
    result = []
    for r in recs:
        result.append(PatrolRecommendationResponse(
            id=r.id,
            locality=r.locality,
            verified_incidents_count=r.verified_incidents_count,
            previous_week_count=r.previous_week_count,
            percentage_change=r.percentage_change,
            risk_level=r.risk_level,
            primary_categories=r.primary_categories,
            suggested_patrol_period=r.suggested_patrol_period,
            reason=r.reason,
            status=r.status,
            available_units_count=available_units,
            existing_patrol_coverage="Active Beats" if r.status == "DEPLOYED" else "Standard Patrol",
            created_at=r.created_at
        ))
    return result

@router.post("/patrol/recommendations/{recommendation_id}/assign", response_model=PatrolAssignmentResponse)
def assign_patrol_recommendation(
    recommendation_id: int,
    payload: PatrolAssignRequest,
    supervisor: PoliceOfficer = Depends(get_current_police_supervisor),
    db: Session = Depends(get_db)
):
    """Authorize and assign a patrol unit to a recommended locality (Supervisors only)."""
    rec = db.query(PatrolRecommendation).filter(PatrolRecommendation.id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
        
    target_officer = db.query(PoliceOfficer).filter(PoliceOfficer.id == payload.officer_id).first()
    if not target_officer:
        raise HTTPException(status_code=404, detail="Target officer not found")
        
    assignment = PatrolAssignment(
        officer_id=target_officer.id,
        supervisor_id=supervisor.id,
        locality=rec.locality,
        zone=target_officer.assigned_zone or rec.locality,
        shift_period=payload.shift_period or rec.suggested_patrol_period,
        instructions=payload.instructions or f"High attention required in {rec.locality}. Priority patrol duty.",
        status="ASSIGNED",
        assigned_at=datetime.now(timezone.utc)
    )
    db.add(assignment)
    
    rec.status = "DEPLOYED"
    rec.assigned_officer_id = target_officer.id
    db.commit()
    db.refresh(assignment)
    
    return PatrolAssignmentResponse(
        id=assignment.id,
        locality=assignment.locality,
        zone=assignment.zone,
        shift_period=assignment.shift_period,
        instructions=assignment.instructions,
        status=assignment.status,
        assigned_at=assignment.assigned_at,
        officer_name=target_officer.name,
        officer_badge=target_officer.badge_number,
        supervisor_name=supervisor.name
    )

@router.get("/patrol/my-assignments", response_model=List[PatrolAssignmentResponse])
def get_my_patrol_assignments(
    officer: PoliceOfficer = Depends(get_current_police_officer),
    db: Session = Depends(get_db)
):
    """Get patrol assignments assigned to the logged-in officer."""
    assignments = db.query(PatrolAssignment).filter(
        PatrolAssignment.officer_id == officer.id
    ).order_by(PatrolAssignment.assigned_at.desc()).all()
    
    res = []
    for a in assignments:
        res.append(PatrolAssignmentResponse(
            id=a.id,
            locality=a.locality,
            zone=a.zone,
            shift_period=a.shift_period,
            instructions=a.instructions,
            status=a.status,
            assigned_at=a.assigned_at,
            officer_name=officer.name,
            officer_badge=officer.badge_number,
            supervisor_name=a.supervisor.name if a.supervisor else None
        ))
    return res

@router.post("/patrol/assignments/{assignment_id}/status")
def update_patrol_assignment_status(
    assignment_id: int,
    status_payload: IncidentStatusUpdateRequest,
    officer: PoliceOfficer = Depends(get_current_police_officer),
    db: Session = Depends(get_db)
):
    """Update officer patrol coverage status (e.g. IN_PROGRESS, COMPLETED)."""
    assignment = db.query(PatrolAssignment).filter(
        PatrolAssignment.id == assignment_id,
        PatrolAssignment.officer_id == officer.id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Patrol assignment not found")
        
    st = status_payload.status.upper()
    if st not in ("ASSIGNED", "IN_PROGRESS", "COMPLETED"):
        raise HTTPException(status_code=400, detail="Invalid assignment status")
        
    assignment.status = st
    if st == "COMPLETED":
        assignment.completed_at = datetime.now(timezone.utc)
        
    db.commit()
    return {"status": "ok", "assignment_id": assignment.id, "current_status": assignment.status}
