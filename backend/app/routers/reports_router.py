import time

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, require_founder
from app.database import get_db
from app.models import REPORT_REASONS, ReportCreate, ReportOut

router = APIRouter(tags=["reports"])


@router.get("/reports/reasons")
async def list_reasons():
    return {"reasons": REPORT_REASONS}


@router.post("/reports", status_code=status.HTTP_201_CREATED)
async def create_report(payload: ReportCreate, user: dict = Depends(get_current_user)):
    db = get_db()

    context = ""
    if payload.target_type == "story":
        target = await db.stories.find_one({"_id": payload.target_id})
        if target:
            # Title and caption are both optional, so join only the parts
            # that exist -- otherwise the excerpt the founder reads in the
            # moderation queue opens with a dangling em dash and looks like
            # lost data. A media-only post still needs to say something.
            title = (target.get("title") or "").strip()
            body = (target.get("body") or "").strip()[:200]
            parts = [p for p in (title, body) if p]
            if not parts and target.get("media_url"):
                parts = ["[video]" if target.get("media_type") == "video" else "[photo]"]
            context = " — ".join(parts)
    elif payload.target_type == "comment":
        target = await db.comments.find_one({"_id": payload.target_id})
        if target:
            context = target.get("body", "")[:200]
    else:  # user
        target = await db.users.find_one({"_id": payload.target_id})
        if target:
            context = target.get("display_name", "")

    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That content no longer exists.")

    await db.reports.insert_one({
        "target_type": payload.target_type,
        "target_id": payload.target_id,
        "reason": payload.reason,
        "note": payload.note,
        "reporter_id": user["_id"],
        "reporter_name": user["display_name"],
        "context": context,
        "status": "open",
        "created_at": time.time(),
    })
    return {"received": True}


@router.get("/admin/reports", response_model=list[ReportOut])
async def list_reports(include_resolved: bool = False, founder: dict = Depends(require_founder)):
    db = get_db()
    reports = await db.reports.find({}, sort_key="created_at", reverse=True)
    if not include_resolved:
        reports = [r for r in reports if r.get("status", "open") == "open"]
    return [
        ReportOut(
            id=r["_id"],
            target_type=r["target_type"],
            target_id=r["target_id"],
            reason=r["reason"],
            note=r.get("note"),
            reporter_id=r["reporter_id"],
            reporter_name=r["reporter_name"],
            context=r.get("context", ""),
            status=r.get("status", "open"),
            created_at=r["created_at"],
        )
        for r in reports
    ]


@router.post("/admin/reports/{report_id}/resolve", status_code=status.HTTP_204_NO_CONTENT)
async def resolve_report(report_id: str, founder: dict = Depends(require_founder)):
    db = get_db()
    updated = await db.reports.update_one({"_id": report_id}, {"$set": {"status": "resolved"}})
    if not updated:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found.")
