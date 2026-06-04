import datetime
import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import crud
from app.models import Student, Attendance

class PDFReportGenerator:
    @staticmethod
    def generate_attendance_report(db: Session, date_range_days: int = 30) -> io.BytesIO:
        """
        Generates a professional PDF report using ReportLab and returns it as a binary stream.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        story = []
        styles = getSampleStyleSheet()

        # Define Custom Color Palette
        PRIMARY_COLOR = colors.HexColor("#1e1b4b")  # Dark Indigo
        SECONDARY_COLOR = colors.HexColor("#4f46e5")  # Accent Indigo
        TEXT_COLOR = colors.HexColor("#0f172a")  # Slate 900
        MUTED_TEXT = colors.HexColor("#64748b")  # Slate 500
        BG_LIGHT = colors.HexColor("#f8fafc")  # Slate 50
        BG_HEADER = colors.HexColor("#e2e8f0")  # Slate 200
        SUCCESS_COLOR = colors.HexColor("#059669")  # Emerald 600
        WARNING_COLOR = colors.HexColor("#d97706")  # Amber 600
        DANGER_COLOR = colors.HexColor("#dc2626")  # Red 600

        # Custom Paragraph Styles
        styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=24,
            leading=28,
            textColor=PRIMARY_COLOR,
            spaceAfter=6
        ))

        styles.add(ParagraphStyle(
            name='ReportSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=MUTED_TEXT,
            spaceAfter=20
        ))

        styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=14,
            leading=18,
            textColor=PRIMARY_COLOR,
            spaceBefore=15,
            spaceAfter=8,
            keepWithNext=True
        ))

        styles.add(ParagraphStyle(
            name='TableHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=12,
            textColor=colors.whitesmoke,
            alignment=1  # Centered
        ))

        styles.add(ParagraphStyle(
            name='TableCell',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            leading=10,
            textColor=TEXT_COLOR
        ))

        styles.add(ParagraphStyle(
            name='TableCellCenter',
            parent=styles['TableCell'],
            alignment=1  # Centered
        ))

        styles.add(ParagraphStyle(
            name='StatNumber',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=18,
            leading=22,
            textColor=SECONDARY_COLOR,
            alignment=1
        ))

        styles.add(ParagraphStyle(
            name='StatLabel',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=11,
            textColor=MUTED_TEXT,
            alignment=1
        ))

        # --- HEADER SECTION ---
        story.append(Paragraph("Smart Campus Attendance Platform", styles['ReportTitle']))
        
        start_date = datetime.date.today() - datetime.timedelta(days=date_range_days)
        end_date = datetime.date.today()
        date_str = f"Date Range: {start_date.strftime('%B %d, %Y')} to {end_date.strftime('%B %d, %Y')}"
        story.append(Paragraph(f"AI-Generated Academic Attendance Summary Report &bull; {date_str} &bull; Generated on {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}", styles['ReportSubtitle']))

        # --- STATS SUMMARY BAR ---
        total_students = db.query(Student).filter(Student.status == "Active").count()
        total_days = db.query(func.distinct(Attendance.date)).filter(Attendance.date >= start_date).count()
        
        # Calculate general present count
        total_logs = db.query(Attendance).filter(
            Attendance.date >= start_date,
            Attendance.status.in_(["PRESENT", "LATE"])
        ).count()
        
        avg_rate = 0.0
        if total_students > 0 and total_days > 0:
            avg_rate = round((total_logs / (total_students * total_days)) * 100.0, 1)
        else:
            avg_rate = 100.0

        # Stats Card Elements
        stats_data = [
            [
                Paragraph(f"{total_students}", styles['StatNumber']),
                Paragraph(f"{total_days}", styles['StatNumber']),
                Paragraph(f"{total_logs}", styles['StatNumber']),
                Paragraph(f"{avg_rate}%", styles['StatNumber'])
            ],
            [
                Paragraph("Total Students", styles['StatLabel']),
                Paragraph("School Days Tracked", styles['StatLabel']),
                Paragraph("Total Attendance Logs", styles['StatLabel']),
                Paragraph("Average Attendance Rate", styles['StatLabel'])
            ]
        ]
        
        # Widths: 540 pt total printable width on 612 pt wide page (letter)
        stats_table = Table(stats_data, colWidths=[135, 135, 135, 135])
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,0), 2),
            ('TOPPADDING', (0,0), (-1,0), 8),
            ('BOTTOMPADDING', (0,1), (-1,1), 8),
            ('TOPPADDING', (0,1), (-1,1), 2),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ]))
        story.append(stats_table)
        story.append(Spacer(1, 15))

        # --- SECTION 1: STUDENT SUMMARY TABLE ---
        story.append(Paragraph("Student Performance & Attendance Summary", styles['SectionHeader']))
        
        students_list = db.query(Student).filter(Student.status == "Active").all()
        
        student_table_data = [
            [
                Paragraph("Student ID", styles['TableHeader']),
                Paragraph("Student Name", styles['TableHeader']),
                Paragraph("Email Address", styles['TableHeader']),
                Paragraph("Enrollment Date", styles['TableHeader']),
                Paragraph("Present Days", styles['TableHeader']),
                Paragraph("Rate %", styles['TableHeader'])
            ]
        ]

        for s in students_list:
            # Stats for date range
            p_days = db.query(func.distinct(Attendance.date)).filter(
                Attendance.student_id == s.student_id,
                Attendance.status.in_(["PRESENT", "LATE"]),
                Attendance.date >= start_date
            ).count()
            
            t_days = db.query(func.distinct(Attendance.date)).filter(
                Attendance.date >= max(s.enrollment_date, start_date)
            ).count()
            
            rate = round((p_days / t_days) * 100.0, 1) if t_days > 0 else 100.0
            
            # Rate styling
            if rate >= 75.0:
                rate_text = f"<font color='{SUCCESS_COLOR.hexval()}'><b>{rate}%</b></font>"
            elif rate >= 50.0:
                rate_text = f"<font color='{WARNING_COLOR.hexval()}'><b>{rate}%</b></font>"
            else:
                rate_text = f"<font color='{DANGER_COLOR.hexval()}'><b>{rate}%</b></font>"

            student_table_data.append([
                Paragraph(s.student_id, styles['TableCell']),
                Paragraph(s.name, styles['TableCell']),
                Paragraph(s.email, styles['TableCell']),
                Paragraph(s.enrollment_date.strftime("%Y-%m-%d"), styles['TableCellCenter']),
                Paragraph(f"{p_days} / {t_days}", styles['TableCellCenter']),
                Paragraph(rate_text, styles['TableCellCenter'])
            ])

        # Grid widths
        stu_table = Table(student_table_data, colWidths=[70, 110, 150, 75, 75, 60])
        stu_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ]))
        story.append(stu_table)
        story.append(Spacer(1, 15))

        # --- SECTION 2: ATTENDANCE SCAN LOGS ---
        story.append(Paragraph("Detailed Scan & Authentication Logs (Recent)", styles['SectionHeader']))
        
        recent_logs = db.query(Attendance).filter(
            Attendance.date >= start_date
        ).order_by(Attendance.timestamp.desc()).limit(100).all()

        logs_table_data = [
            [
                Paragraph("Timestamp", styles['TableHeader']),
                Paragraph("Student ID", styles['TableHeader']),
                Paragraph("Student Name", styles['TableHeader']),
                Paragraph("Method", styles['TableHeader']),
                Paragraph("Status", styles['TableHeader'])
            ]
        ]

        for log in recent_logs:
            s_name = log.student.name if log.student else "Deleted Student"
            
            # Status styling
            if log.status == "PRESENT":
                status_text = f"<font color='{SUCCESS_COLOR.hexval()}'><b>PRESENT</b></font>"
            elif log.status == "LATE":
                status_text = f"<font color='{WARNING_COLOR.hexval()}'><b>LATE</b></font>"
            else:
                status_text = f"<font color='{DANGER_COLOR.hexval()}'><b>ABSENT</b></font>"

            logs_table_data.append([
                Paragraph(log.timestamp.strftime("%Y-%m-%d %H:%M:%S"), styles['TableCell']),
                Paragraph(log.student_id, styles['TableCell']),
                Paragraph(s_name, styles['TableCell']),
                Paragraph(log.method, styles['TableCellCenter']),
                Paragraph(status_text, styles['TableCellCenter'])
            ])

        if len(recent_logs) == 0:
            logs_table_data.append([
                Paragraph("No attendance logs found for this period.", styles['TableCellCenter']),
                Paragraph("", styles['TableCell']),
                Paragraph("", styles['TableCell']),
                Paragraph("", styles['TableCell']),
                Paragraph("", styles['TableCell'])
            ])
            # Merge cell across
            log_table_style = TableStyle([
                ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('TOPPADDING', (0,0), (-1,-1), 6),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                ('SPAN', (0,1), (-1,1)),
                ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ])
        else:
            log_table_style = TableStyle([
                ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
                ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ])

        logs_table = Table(logs_table_data, colWidths=[120, 80, 160, 100, 80])
        logs_table.setStyle(log_table_style)
        
        # We can put logs table inside a KeepTogether or let it flow
        story.append(logs_table)

        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer
