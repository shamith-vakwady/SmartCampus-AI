import datetime
import random
import os
from app.database import SessionLocal, engine, Base
from app.models import Student, Attendance, UnknownLog

# Ensure database tables exist
Base.metadata.create_all(bind=engine)

def seed_database():
    db = SessionLocal()
    
    # 1. Check if students exist
    if db.query(Student).count() > 0:
        print("Database already has data. Skipping seeding.")
        db.close()
        return

    print("Seeding database with mock campus records...")

    # Mock Students List
    students_data = [
        {"student_id": "STU001", "name": "Shamith Vakwady", "email": "shamith@campus.edu", "phone": "+91 9876543210", "status": "Active"},
        {"student_id": "STU002", "name": "Preetham Shenoy", "email": "preetham@campus.edu", "phone": "+91 8765432109", "status": "Active"},
        {"student_id": "STU003", "name": "Ananya Bhat", "email": "ananya@campus.edu", "phone": "+91 7654321098", "status": "Active"},
        {"student_id": "STU004", "name": "Darshan K R", "email": "darshan@campus.edu", "phone": "+91 6543210987", "status": "Active"},
        {"student_id": "STU005", "name": "Kavya Hegde", "email": "kavya@campus.edu", "phone": "+91 5432109876", "status": "Active"},
        {"student_id": "STU006", "name": "Vikram Rathore", "email": "vikram@campus.edu", "phone": "+91 4321098765", "status": "Active"},
    ]

    students = []
    for s in students_data:
        enroll_date = datetime.date.today() - datetime.timedelta(days=20)
        db_student = Student(
            student_id=s["student_id"],
            name=s["name"],
            email=s["email"],
            phone=s["phone"],
            enrollment_date=enroll_date,
            status=s["status"]
        )
        db.add(db_student)
        students.append(db_student)
    db.commit()

    # 2. Seed 14 Days of Attendance Logs
    # School days (exclude weekends)
    today = datetime.date.today()
    school_days = []
    current_date = today - datetime.timedelta(days=14)
    
    while current_date <= today:
        if current_date.weekday() < 5:  # Mon-Fri
            school_days.append(current_date)
        current_date += datetime.timedelta(days=1)

    methods = ["LIVE_CAMERA", "MOBILE_CAMERA", "UPLOAD"]
    
    print(f"Generating attendance logs for {len(school_days)} school days...")

    for day in school_days:
        for student in students:
            # We vary attendance behavior by student to create interesting stats:
            # - STU001 (Shamith): 95% attendance
            # - STU002 (Preetham): 90% attendance
            # - STU003 (Ananya): 60% attendance (will trigger Low Attendance Alert!)
            # - STU004 (Darshan): 100% attendance
            # - STU005 (Kavya): Absent last 3 days (will trigger Consecutive Absence streak!)
            # - STU006 (Vikram): 80% attendance
            
            sid = student.student_id
            rand_val = random.random()
            
            # Determine status
            status = "PRESENT"
            is_absent = False
            
            if sid == "STU001":
                is_absent = rand_val < 0.05
            elif sid == "STU002":
                is_absent = rand_val < 0.10
            elif sid == "STU003":
                is_absent = rand_val < 0.40  # 60% rate
            elif sid == "STU004":
                is_absent = False
            elif sid == "STU005":
                # Absent for last 3 days
                days_from_today = (today - day).days
                if days_from_today <= 3:
                    is_absent = True
                else:
                    is_absent = rand_val < 0.10
            elif sid == "STU006":
                is_absent = rand_val < 0.20
                
            if is_absent:
                # In our schema, absents are marked implicitly by lack of records, 
                # or explicitly. Let's explicitly mark some as ABSENT or simply skip.
                # Explicit records are useful for stats. Let's mark as ABSENT.
                status = "ABSENT"
            else:
                # 15% chance of being marked LATE
                if random.random() < 0.15:
                    status = "LATE"
            
            # Generate random scan time (mostly in the morning 8:30 AM to 9:15 AM)
            hour = 8 if status == "PRESENT" else 9
            minute = random.randint(30, 59) if hour == 8 else random.randint(0, 15)
            
            # If late, scan is around 9:15 to 9:45
            if status == "LATE":
                hour = 9
                minute = random.randint(16, 45)
                
            second = random.randint(0, 59)
            
            timestamp = datetime.datetime(
                day.year, day.month, day.day,
                hour, minute, second
            )
            
            db_attendance = Attendance(
                student_id=sid,
                date=day,
                timestamp=timestamp,
                status=status,
                method=random.choice(methods) if status != "ABSENT" else "SYSTEM"
            )
            db.add(db_attendance)
            
    db.commit()

    # 3. Seed some Unknown Person intrusion logs
    print("Generating intruder security logs...")
    for i in range(3):
        # 2 to 10 days ago
        days_ago = random.randint(2, 10)
        day = today - datetime.timedelta(days=days_ago)
        
        hour = random.randint(10, 16)  # during classes
        minute = random.randint(0, 59)
        timestamp = datetime.datetime(day.year, day.month, day.day, hour, minute, random.randint(0, 59))
        
        # Save a mock path
        db_log = UnknownLog(
            image_path=f"data/unknown/mock_intruder_{i+1}.jpg",
            timestamp=timestamp,
            resolved=False
        )
        db.add(db_log)
        
    db.commit()
    db.close()
    print("Seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
