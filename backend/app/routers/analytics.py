import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Dict

from app.database import get_db
from app import crud
from app.models import Student, Attendance, UnknownLog

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Returns general today statistics for the campus.
    """
    today = datetime.date.today()
    
    # Active students count
    total_students = db.query(Student).filter(Student.status == "Active").count()
    
    # Present today count (Status PRESENT or LATE)
    present_today = db.query(func.distinct(Attendance.student_id)).filter(
        Attendance.date == today,
        Attendance.status.in_(["PRESENT", "LATE"])
    ).count()
    
    # Absent today
    absent_today = max(0, total_students - present_today)
    
    # Today attendance rate
    attendance_percentage = round((present_today / total_students) * 100.0, 1) if total_students > 0 else 100.0
    
    return {
        "total_students": total_students,
        "present_today": present_today,
        "absent_today": absent_today,
        "attendance_percentage": attendance_percentage
    }

@router.get("/alerts")
def get_attendance_alerts(db: Session = Depends(get_db)):
    """
    Identifies students with < 75% attendance or consecutive absences.
    """
    active_students = db.query(Student).filter(Student.status == "Active").all()
    
    low_attendance = []
    frequent_absentees = []
    
    # Get the last 3 dates when attendance was taken (distinct school days)
    last_school_days = db.query(func.distinct(Attendance.date)).order_by(
        desc(func.distinct(Attendance.date))
    ).limit(3).all()
    
    school_dates = [d[0] for d in last_school_days] if last_school_days else []
    
    for s in active_students:
        pct = crud.get_student_attendance_percentage(db, s.student_id, s.enrollment_date)
        if pct < 75.0:
            low_attendance.append({
                "student_id": s.student_id,
                "name": s.name,
                "email": s.email,
                "percentage": pct
            })
            
        # Check for consecutive absences in the last 3 school days
        if len(school_dates) >= 3:
            # Check if student was present on any of these 3 days
            presents = db.query(Attendance).filter(
                Attendance.student_id == s.student_id,
                Attendance.date.in_(school_dates),
                Attendance.status.in_(["PRESENT", "LATE"])
            ).count()
            
            # If student was present 0 times on these 3 active school days, flag as frequent absentee
            if presents == 0:
                frequent_absentees.append({
                    "student_id": s.student_id,
                    "name": s.name,
                    "consecutive_absent_days": 3,
                    "percentage": pct
                })
                
    return {
        "low_attendance_alerts": low_attendance,
        "frequent_absentees": frequent_absentees
    }

@router.get("/trends")
def get_attendance_trends(days: int = 7, db: Session = Depends(get_db)):
    """
    Returns daily attendance trend for the last N school days.
    """
    # Get distinct school days where attendance was logged
    school_days = db.query(func.distinct(Attendance.date)).order_by(
        desc(func.distinct(Attendance.date))
    ).limit(days).all()
    
    school_dates = sorted([d[0] for d in school_days])
    
    trends = []
    total_students = db.query(Student).filter(Student.status == "Active").count()
    
    for date in school_dates:
        present_count = db.query(func.distinct(Attendance.student_id)).filter(
            Attendance.date == date,
            Attendance.status.in_(["PRESENT", "LATE"])
        ).count()
        
        absent_count = max(0, total_students - present_count)
        rate = round((present_count / total_students) * 100.0, 1) if total_students > 0 else 0.0
        
        trends.append({
            "date": date.strftime("%Y-%m-%d"),
            "present": present_count,
            "absent": absent_count,
            "rate": rate
        })
        
    return trends

@router.get("/heatmap")
def get_attendance_heatmap(db: Session = Depends(get_db)):
    """
    Returns matrix data of attendance density by:
    - Hour of day (8:00 to 17:00)
    - Day of week (Monday to Friday)
    """
    records = db.query(Attendance.timestamp).filter(
        Attendance.status.in_(["PRESENT", "LATE"])
    ).all()
    
    # Grid initialization: 5 weekdays (0=Mon, 4=Fri) x 10 hours (8 AM to 5 PM)
    # format: { "day": int (0-4), "hour": int (8-17), "value": int }
    # Let's group them in a key-value format for easy UI mapping: "day_hour"
    heatmap_dict = {}
    for day in range(5):  # Mon-Fri
        for hour in range(8, 18):  # 8 AM to 5 PM
            heatmap_dict[f"{day}_{hour}"] = 0
            
    for r in records:
        ts = r[0]
        # Skip timezone issues, convert UTC to local standard day/hour if needed
        weekday = ts.weekday()
        hour = ts.hour
        
        # Only track Monday to Friday, 8 AM to 5 PM
        if weekday < 5 and 8 <= hour <= 17:
            key = f"{weekday}_{hour}"
            heatmap_dict[key] = heatmap_dict.get(key, 0) + 1
            
    heatmap_list = []
    days_names = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    
    for weekday in range(5):
        for hour in range(8, 18):
            key = f"{weekday}_{hour}"
            heatmap_list.append({
                "day": days_names[weekday],
                "hour": f"{hour}:00",
                "count": heatmap_dict[key]
            })
            
    return heatmap_list

@router.get("/unknown-logs")
def get_unknown_person_logs(db: Session = Depends(get_db)):
    """
    Returns unauthorized person alerts.
    """
    logs = db.query(UnknownLog).order_by(desc(UnknownLog.timestamp)).all()
    return logs

@router.post("/unknown-logs/clear")
def clear_unknown_person_logs(db: Session = Depends(get_db)):
    """
    Clears all unauthorized person alerts.
    """
    crud.clear_unknown_logs(db)
    return {"detail": "Unknown person logs cleared successfully"}
