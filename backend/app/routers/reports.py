import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.pdf_generator import PDFReportGenerator

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/download")
def download_pdf_report(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """
    Generates and downloads a campus attendance PDF report for the past N days.
    """
    try:
        pdf_stream = PDFReportGenerator.generate_attendance_report(db, date_range_days=days)
        
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"campus_attendance_report_{days}days_{timestamp}.pdf"
        
        return StreamingResponse(
            pdf_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        print(f"Error generating report: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while generating the PDF report: {str(e)}"
        )
