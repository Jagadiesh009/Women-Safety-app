from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, or_, cast
from sqlalchemy.types import Date
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import os
import bcrypt
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

from database.models import (
    User,
    Incident,
    AdminUser,
    PoliceOfficer,
    PoliceDutyStatus,
    PatrolLocation,
    PatrolAssignment,
    PatrolRecommendation,
    CommunitySafetyAlert,
    IncidentResponse,
    DispatchNotification
)
from api.deps import get_db, verify_admin_or_supervisor
from schemas.admin_schemas import (
    AdminDashboardResponse,
    RegistrationTrend,
    IncidentAdminResponse,
    UserAdminResponse,
    UserDetailsAdminResponse,
    BulkResolveIncidentsResponse,
    AdminOfficerCreate,
    AdminOfficerUpdate,
    AdminOfficerStatusToggle,
    AdminOfficerItem,
    AdminAdvisoryCreate,
    AdminReportVerify,
    LocalityCrimeRanking,
    AdminComprehensiveStats
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="admin/auth/login")
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"

router = APIRouter(prefix="/admin", tags=["Admin"])

def verify_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> AdminUser:
    """Verifies that the current user is an administrator via custom JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id: str = payload.get("sub")
        if admin_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    admin_user = db.query(AdminUser).filter(AdminUser.admin_id == admin_id).first()
    if admin_user is None:
        raise credentials_exception
        
    admin_emails = [email.strip() for email in os.getenv("ADMIN_EMAILS", "").split(",") if email.strip()]
    if admin_emails and admin_user.email not in admin_emails:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized as admin in ENV")
        
    return admin_user

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

@router.get("/me")
def get_current_admin(admin_user: AdminUser = Depends(verify_admin)):
    """Returns profile details for the authenticated administrator."""
    return {
        "id": admin_user.id,
        "admin_id": admin_user.admin_id,
        "email": admin_user.email,
        "role": "ADMIN"
    }

@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_dashboard_stats(db: Session = Depends(get_db), admin_user: AdminUser = Depends(verify_admin)):
    """Returns aggregated statistics for the admin dashboard."""
    total_users = db.query(User).count()
    active_incidents = db.query(Incident).filter(Incident.status == "ACTIVE").count()
    resolved_incidents = db.query(Incident).filter(Incident.status == "RESOLVED").count()
    
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    trends_query = (
        db.query(cast(User.created_at, Date).label("date"), func.count(User.id).label("count"))
        .filter(User.created_at >= seven_days_ago)
        .group_by(cast(User.created_at, Date))
        .order_by(cast(User.created_at, Date))
        .all()
    )
    
    registration_trends = [
        RegistrationTrend(date=str(trend.date), count=trend.count)
        for trend in trends_query
    ]
    
    recent_incidents = (
        db.query(Incident)
        .options(joinedload(Incident.locations), joinedload(Incident.user).joinedload(User.contacts))
        .order_by(Incident.start_time.desc())
        .limit(10)
        .all()
    )
    
    return AdminDashboardResponse(
        total_users=total_users,
        active_incidents=active_incidents,
        resolved_incidents=resolved_incidents,
        registration_trends=registration_trends,
        recent_incidents=recent_incidents
    )

@router.get("/stats", response_model=AdminComprehensiveStats)
def get_comprehensive_stats(db: Session = Depends(get_db), admin_user: AdminUser = Depends(verify_admin)):
    """Returns comprehensive cross-system statistics for the SafeHer Admin Command Center."""
    total_users = db.query(User).count()
    total_officers = db.query(PoliceOfficer).count()
    on_duty_officers = db.query(PoliceDutyStatus).filter(PoliceDutyStatus.is_on_duty == True).count()
    
    pending_incidents = db.query(Incident).filter(
        or_(Incident.status == "ACTIVE", Incident.status.is_(None)),
        or_(Incident.dispatch_status == "UNASSIGNED", Incident.dispatch_status.is_(None))
    ).count()
    
    active_responses = db.query(Incident).filter(
        Incident.status == "ACTIVE",
        Incident.dispatch_status != "UNASSIGNED",
        Incident.dispatch_status.isnot(None)
    ).count()
    
    resolved_incidents = db.query(Incident).filter(Incident.status == "RESOLVED").count()
    patrol_units_available = max(0, on_duty_officers - active_responses)
    
    total_crime_reports = db.query(Incident).count()
    verified_crime_reports = db.query(Incident).filter(Incident.is_verified == True).count()
    active_safety_alerts = db.query(CommunitySafetyAlert).filter(CommunitySafetyAlert.is_active == True).count()
    
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    weekly_crime_count = db.query(Incident).filter(Incident.start_time >= seven_days_ago).count()
    
    # Locality Crime Rankings
    rankings_query = (
        db.query(Incident.locality, func.count(Incident.id).label("count"))
        .filter(Incident.locality.isnot(None))
        .group_by(Incident.locality)
        .order_by(desc("count"))
        .limit(10)
        .all()
    )
    
    locality_crime_rankings = []
    for r in rankings_query:
        cnt = r.count
        risk = "HIGH" if cnt >= 4 else ("MODERATE" if cnt >= 2 else "LOW")
        locality_crime_rankings.append(LocalityCrimeRanking(locality=r.locality, count=cnt, risk_level=risk))
        
    trends_query = (
        db.query(cast(User.created_at, Date).label("date"), func.count(User.id).label("count"))
        .filter(User.created_at >= seven_days_ago)
        .group_by(cast(User.created_at, Date))
        .order_by(cast(User.created_at, Date))
        .all()
    )
    
    registration_trends = [
        RegistrationTrend(date=str(trend.date), count=trend.count)
        for trend in trends_query
    ]
    
    return AdminComprehensiveStats(
        total_users=total_users,
        total_officers=total_officers,
        on_duty_officers=on_duty_officers,
        pending_incidents=pending_incidents,
        active_responses=active_responses,
        resolved_incidents=resolved_incidents,
        patrol_units_available=patrol_units_available,
        total_crime_reports=total_crime_reports,
        verified_crime_reports=verified_crime_reports,
        active_safety_alerts=active_safety_alerts,
        weekly_crime_count=weekly_crime_count,
        locality_crime_rankings=locality_crime_rankings,
        registration_trends=registration_trends
    )

# ==========================================
# POLICE OFFICER MANAGEMENT
# ==========================================

@router.get("/officers", response_model=List[AdminOfficerItem])
def list_officers(db: Session = Depends(get_db), auth_user: dict = Depends(verify_admin_or_supervisor)):
    """Lists all police officers, their operational duty status, and latest patrol coordinates."""
    officers = db.query(PoliceOfficer).options(
        joinedload(PoliceOfficer.duty_status),
        joinedload(PoliceOfficer.locations)
    ).order_by(PoliceOfficer.id.asc()).all()
    
    result = []
    for off in officers:
        duty = off.duty_status
        is_on_duty = duty.is_on_duty if duty else False
        duty_zone = duty.current_patrol_zone if duty else off.assigned_zone
        vehicle_num = duty.vehicle_number if duty else None
        
        last_loc = None
        if off.locations:
            last_loc = max(off.locations, key=lambda l: l.timestamp or datetime.min)
            
        result.append(AdminOfficerItem(
            id=off.id,
            badge_number=off.badge_number,
            email=off.email,
            name=off.name,
            phone=off.phone,
            rank=off.rank or "Patrol Officer",
            role=off.role or "OFFICER",
            station_name=off.station_name or "Central Police Station",
            assigned_zone=off.assigned_zone or off.station_name or "Station not assigned",
            is_active=off.is_active,
            is_on_duty=is_on_duty,
            duty_zone=duty_zone,
            vehicle_number=vehicle_num,
            last_location_lat=last_loc.latitude if last_loc else None,
            last_location_lng=last_loc.longitude if last_loc else None,
            last_location_time=last_loc.timestamp if last_loc else None,
            created_at=off.created_at
        ))
    return result

@router.post("/officers", response_model=AdminOfficerItem, status_code=status.HTTP_201_CREATED)
def create_officer(req: AdminOfficerCreate, db: Session = Depends(get_db), admin_user: AdminUser = Depends(verify_admin)):
    """Provisions a new police officer account with encrypted credentials and sets up duty profile."""
    # Check duplicate badge
    if db.query(PoliceOfficer).filter(PoliceOfficer.badge_number == req.badge_number.strip().upper()).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Officer badge number '{req.badge_number}' already exists."
        )
    # Check duplicate email
    if db.query(PoliceOfficer).filter(PoliceOfficer.email == req.email.strip().lower()).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Officer email '{req.email}' is already registered."
        )
        
    new_officer = PoliceOfficer(
        badge_number=req.badge_number.strip().upper(),
        email=req.email.strip().lower(),
        password_hash=hash_password(req.password),
        name=req.name.strip(),
        phone=req.phone.strip() if req.phone else None,
        rank=req.rank or "Patrol Officer",
        role=req.role or "OFFICER",
        station_name=req.station_name or "Central Police Station",
        assigned_zone=req.assigned_zone or req.station_name or "Station not assigned",
        is_active=True
    )
    db.add(new_officer)
    db.flush()
    
    # Initialize duty status
    initial_duty = PoliceDutyStatus(
        officer_id=new_officer.id,
        is_on_duty=False,
        current_patrol_zone=new_officer.assigned_zone
    )
    db.add(initial_duty)
    db.commit()
    db.refresh(new_officer)
    
    return AdminOfficerItem(
        id=new_officer.id,
        badge_number=new_officer.badge_number,
        email=new_officer.email,
        name=new_officer.name,
        phone=new_officer.phone,
        rank=new_officer.rank,
        role=new_officer.role,
        station_name=new_officer.station_name,
        assigned_zone=new_officer.assigned_zone,
        is_active=new_officer.is_active,
        is_on_duty=False,
        duty_zone=new_officer.assigned_zone,
        vehicle_number=None,
        last_location_lat=None,
        last_location_lng=None,
        last_location_time=None,
        created_at=new_officer.created_at
    )

@router.put("/officers/{officer_id}/status")
def toggle_officer_status(officer_id: int, req: AdminOfficerStatusToggle, db: Session = Depends(get_db), admin_user: AdminUser = Depends(verify_admin)):
    """Activates or deactivates an officer account. If deactivated, automatically forces duty status to OFF DUTY."""
    officer = db.query(PoliceOfficer).filter(PoliceOfficer.id == officer_id).first()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
        
    officer.is_active = req.is_active
    if not req.is_active and officer.duty_status:
        officer.duty_status.is_on_duty = False
        officer.duty_status.duty_ended_at = datetime.now(timezone.utc)
        
    db.commit()
    return {
        "id": officer.id,
        "badge_number": officer.badge_number,
        "is_active": officer.is_active,
        "message": f"Officer {officer.badge_number} {'activated' if officer.is_active else 'deactivated'} successfully."
    }

@router.put("/officers/{officer_id}")
def update_officer_profile(officer_id: int, req: AdminOfficerUpdate, db: Session = Depends(get_db), admin_user: AdminUser = Depends(verify_admin)):
    """Updates profile information, rank, role or patrol zone for an existing officer."""
    officer = db.query(PoliceOfficer).filter(PoliceOfficer.id == officer_id).first()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
        
    if req.name is not None:
        officer.name = req.name.strip()
    if req.phone is not None:
        officer.phone = req.phone.strip()
    if req.rank is not None:
        officer.rank = req.rank.strip()
    if req.role is not None:
        officer.role = req.role.strip().upper()
    if req.station_name is not None:
        officer.station_name = req.station_name.strip()
    if req.assigned_zone is not None:
        officer.assigned_zone = req.assigned_zone.strip()
        
    db.commit()
    return {"message": "Officer profile updated successfully", "officer_id": officer.id}

# ==========================================
# INCIDENTS & CRIME REPORT MANAGEMENT
# ==========================================

@router.get("/incidents", response_model=List[IncidentAdminResponse])
def get_all_incidents(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    admin_user: AdminUser = Depends(verify_admin)
):
    """Returns all incidents with locations, user details, and emergency contacts."""
    query = (
        db.query(Incident)
        .options(joinedload(Incident.locations), joinedload(Incident.user).joinedload(User.contacts))
    )
    if status_filter:
        query = query.filter(Incident.status == status_filter.upper())
        
    incidents = query.order_by(Incident.start_time.desc()).all()
    return incidents

@router.get("/crime-reports")
def get_crime_reports(
    verified_only: bool = False,
    locality: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin_user: AdminUser = Depends(verify_admin)
):
    """Returns community crime and emergency incidents for administrative review and official verification."""
    query = db.query(Incident).options(joinedload(Incident.locations), joinedload(Incident.user))
    
    if verified_only:
        query = query.filter(Incident.is_verified == True)
    if locality:
        query = query.filter(Incident.locality.ilike(f"%{locality.strip()}%"))
        
    incidents = query.order_by(Incident.start_time.desc()).limit(limit).all()
    
    result = []
    for inc in incidents:
        first_loc = inc.locations[0] if inc.locations else None
        result.append({
            "id": inc.id,
            "status": inc.status or "ACTIVE",
            "dispatch_status": inc.dispatch_status or "UNASSIGNED",
            "category": inc.category or "SOS Emergency",
            "locality": inc.locality or "Central Bengaluru",
            "city": inc.city or "Bengaluru",
            "is_verified": inc.is_verified if inc.is_verified is not None else True,
            "start_time": inc.start_time,
            "end_time": inc.end_time,
            "resolved_by": inc.resolved_by,
            "trigger_source": inc.trigger_source or "MANUAL",
            "latitude": first_loc.latitude if first_loc else None,
            "longitude": first_loc.longitude if first_loc else None,
            "user_name": inc.user.name if inc.user else "Anonymous User",
            "user_phone": inc.user.phone if inc.user else None
        })
    return result

@router.put("/crime-reports/{incident_id}/verify")
def verify_crime_report(
    incident_id: int,
    req: AdminReportVerify,
    db: Session = Depends(get_db),
    admin_user: AdminUser = Depends(verify_admin)
):
    """Marks an incident as officially verified or unverified for public crime intelligence maps."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    incident.is_verified = req.is_verified
    db.commit()
    return {
        "id": incident.id,
        "is_verified": incident.is_verified,
        "message": f"Incident #{incident.id} marked as {'VERIFIED' if incident.is_verified else 'UNVERIFIED'}."
    }

@router.put("/incidents/resolve-all", response_model=BulkResolveIncidentsResponse)
@router.post("/incidents/resolve-all", response_model=BulkResolveIncidentsResponse)
def resolve_all_incidents(db: Session = Depends(get_db), admin_user: AdminUser = Depends(verify_admin)):
    """Marks all currently unresolved incidents as RESOLVED within a single database transaction."""
    try:
        unresolved_incidents = (
            db.query(Incident)
            .filter((Incident.status != "RESOLVED") | (Incident.status.is_(None)))
            .all()
        )
        
        now = datetime.now(timezone.utc)
        resolved_count = 0
        for incident in unresolved_incidents:
            incident.status = "RESOLVED"
            incident.end_time = now
            incident.resolved_by = admin_user.email
            resolved_count += 1
            
        db.commit()
        
        return BulkResolveIncidentsResponse(
            message=f"Successfully resolved {resolved_count} incident(s)" if resolved_count > 0 else "No unresolved incidents to resolve",
            resolved_count=resolved_count,
            unresolved_remaining=0,
            timestamp=now
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to bulk resolve incidents: {str(e)}"
        )

@router.get("/incidents/{incident_id}", response_model=IncidentAdminResponse)
def get_incident_by_id(incident_id: int, db: Session = Depends(get_db), admin_user: AdminUser = Depends(verify_admin)):
    """Returns comprehensive details for a specific incident including user, contacts, and locations."""
    incident = (
        db.query(Incident)
        .options(joinedload(Incident.locations), joinedload(Incident.user).joinedload(User.contacts))
        .filter(Incident.id == incident_id)
        .first()
    )
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident #{incident_id} not found"
        )
    return incident

@router.put("/incidents/{incident_id}/resolve", response_model=IncidentAdminResponse)
@router.post("/incidents/{incident_id}/resolve", response_model=IncidentAdminResponse)
def resolve_incident(incident_id: int, db: Session = Depends(get_db), admin_user: AdminUser = Depends(verify_admin)):
    """Marks an incident as RESOLVED, recording the resolution timestamp and the resolving admin."""
    incident = (
        db.query(Incident)
        .options(joinedload(Incident.locations), joinedload(Incident.user).joinedload(User.contacts))
        .filter(Incident.id == incident_id)
        .first()
    )
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident #{incident_id} not found"
        )
        
    if incident.status == "RESOLVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Incident #{incident_id} is already resolved"
        )
        
    incident.status = "RESOLVED"
    incident.end_time = datetime.now(timezone.utc)
    incident.resolved_by = admin_user.email
    
    db.commit()
    db.refresh(incident)
    return incident

# ==========================================
# COMMUNITY SAFETY ADVISORIES
# ==========================================

@router.get("/advisories")
def list_advisories(db: Session = Depends(get_db), auth_user: dict = Depends(verify_admin_or_supervisor)):
    """Returns all official community safety advisories with admin and supervisor controls."""
    alerts = db.query(CommunitySafetyAlert).order_by(CommunitySafetyAlert.created_at.desc()).all()
    return alerts

@router.post("/advisories", status_code=status.HTTP_201_CREATED)
def publish_advisory(req: AdminAdvisoryCreate, db: Session = Depends(get_db), auth_user: dict = Depends(verify_admin_or_supervisor)):
    """Publishes an official city-wide or locality safety advisory to the community map."""
    expires_at = datetime.now(timezone.utc) + timedelta(days=req.expires_days or 7)
    approver_name = auth_user.get("name") or auth_user.get("admin_id") or "Command"
    issuing_authority = req.issuing_authority or f"SafeHer HQ / Bengaluru Police ({auth_user.get('role', 'Admin')}: {approver_name})"
    
    new_alert = CommunitySafetyAlert(
        locality=req.locality.strip(),
        title=req.title.strip(),
        advisory=req.advisory.strip(),
        precautions=req.precautions.strip() if req.precautions else None,
        severity=req.severity.upper() if req.severity else "WARNING",
        issuing_authority=issuing_authority,
        issued_by_officer_id=auth_user.get("officer_id") if auth_user.get("role") == "SUPERVISOR" else None,
        expires_at=expires_at,
        is_active=True
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return new_alert

@router.put("/advisories/{advisory_id}/toggle")
def toggle_advisory(advisory_id: int, db: Session = Depends(get_db), auth_user: dict = Depends(verify_admin_or_supervisor)):
    """Toggles active/inactive visibility of a safety advisory on the public map."""
    alert = db.query(CommunitySafetyAlert).filter(CommunitySafetyAlert.id == advisory_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Advisory not found")
        
    alert.is_active = not alert.is_active
    db.commit()
    return {"id": alert.id, "is_active": alert.is_active, "message": f"Advisory is now {'ACTIVE' if alert.is_active else 'INACTIVE'}."}

@router.delete("/advisories/{advisory_id}")
def delete_advisory(advisory_id: int, db: Session = Depends(get_db), auth_user: dict = Depends(verify_admin_or_supervisor)):
    """Deletes an official safety advisory."""
    alert = db.query(CommunitySafetyAlert).filter(CommunitySafetyAlert.id == advisory_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Advisory not found")
        
    db.delete(alert)
    db.commit()
    return {"message": "Advisory deleted successfully"}

# ==========================================
# PATROL RECOMMENDATIONS & DEPLOYMENT APPROVAL
# ==========================================

@router.get("/patrol-recommendations")
def list_patrol_recommendations(db: Session = Depends(get_db), auth_user: dict = Depends(verify_admin_or_supervisor)):
    """Returns AI-driven patrol recommendations for supervisor and administrator review."""
    recommendations = db.query(PatrolRecommendation).options(
        joinedload(PatrolRecommendation.assigned_officer)
    ).order_by(PatrolRecommendation.created_at.desc()).all()
    
    return recommendations

@router.post("/patrol-recommendations/{rec_id}/approve")
def approve_patrol_recommendation(
    rec_id: int,
    officer_id: Optional[int] = Query(None),
    instructions: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    auth_user: dict = Depends(verify_admin_or_supervisor)
):
    """Approves an area patrol recommendation and dispatches an assignment."""
    rec = db.query(PatrolRecommendation).filter(PatrolRecommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
        
    rec.status = "APPROVED"
    if officer_id:
        officer = db.query(PoliceOfficer).filter(PoliceOfficer.id == officer_id).first()
        if officer:
            rec.assigned_officer_id = officer.id
            rec.status = "DEPLOYED"
            approver_name = auth_user.get("name") or auth_user.get("admin_id") or "Command"
            # Create a patrol assignment
            assignment = PatrolAssignment(
                officer_id=officer.id,
                locality=rec.locality,
                zone=officer.assigned_zone or rec.locality,
                shift_period=rec.suggested_patrol_period or "Night Patrol (20:00 - 04:00)",
                instructions=instructions or f"Approved by {auth_user.get('role', 'Supervisor')} {approver_name}: {rec.reason}",
                status="ASSIGNED"
            )
            db.add(assignment)
            
    db.commit()
    return {"message": f"Recommendation #{rec_id} approved successfully", "status": rec.status}

# ==========================================
# USER MANAGEMENT
# ==========================================

@router.get("/users", response_model=List[UserAdminResponse])
def get_all_users(db: Session = Depends(get_db), admin_user: AdminUser = Depends(verify_admin)):
    """Returns all users with their incident statistics."""
    users = db.query(User).options(joinedload(User.incidents)).all()
    
    response = []
    for user in users:
        total_incidents = len(user.incidents)
        active_incidents = sum(1 for i in user.incidents if i.status == "ACTIVE")
        resolved_incidents = sum(1 for i in user.incidents if i.status == "RESOLVED")
        last_incident = max([i.start_time for i in user.incidents], default=None) if user.incidents else None
        
        response.append(
            UserAdminResponse(
                id=user.id,
                firebase_uid=user.firebase_uid,
                email=user.email,
                name=user.name,
                phone=user.phone,
                blood_group=user.blood_group,
                created_at=user.created_at,
                total_incidents=total_incidents,
                active_incidents=active_incidents,
                resolved_incidents=resolved_incidents,
                last_incident_date=last_incident
            )
        )
    return response

@router.get("/users/{user_id}", response_model=UserDetailsAdminResponse)
def get_user_details(user_id: int, db: Session = Depends(get_db), admin_user: AdminUser = Depends(verify_admin)):
    """Returns details for a specific user, including incident history."""
    user = (
        db.query(User)
        .options(
            joinedload(User.incidents).joinedload(Incident.locations)
        )
        .filter(User.id == user_id)
        .first()
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    total_incidents = len(user.incidents)
    active_incidents = sum(1 for i in user.incidents if i.status == "ACTIVE")
    resolved_incidents = sum(1 for i in user.incidents if i.status == "RESOLVED")
    last_incident = max([i.start_time for i in user.incidents], default=None) if user.incidents else None
    
    sorted_incidents = sorted(user.incidents, key=lambda x: x.start_time, reverse=True)
    
    return UserDetailsAdminResponse(
        id=user.id,
        firebase_uid=user.firebase_uid,
        email=user.email,
        name=user.name,
        phone=user.phone,
        blood_group=user.blood_group,
        created_at=user.created_at,
        total_incidents=total_incidents,
        active_incidents=active_incidents,
        resolved_incidents=resolved_incidents,
        last_incident_date=last_incident,
        incidents=sorted_incidents
    )
