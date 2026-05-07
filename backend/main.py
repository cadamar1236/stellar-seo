import os
import random
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import uuid4, UUID

import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class Client(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    industry: str
    plan: str
    api_key_id: Optional[UUID] = None
    created: datetime = Field(default_factory=datetime.utcnow)

class ApiKey(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    key: str
    provider: str = "claude"
    active: bool = True

class KeywordRanking(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    client_id: UUID
    keyword: str
    position: int
    change: int = 0  # yesterday's change
    search_volume: int
    difficulty: int = 50
    country: str = "es"
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ContentScore(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    client_id: UUID
    url: str
    title: str
    readability_score: float  # 0-100
    semantic_score: float
    ai_visibility_score: float
    claude_index_score: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class AuditLog(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    client_id: UUID
    event_type: str
    description: str
    payload: Optional[dict] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Report(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    client_id: UUID
    report_type: str  # "weekly", "monthly", "custom"
    name: str
    metrics: dict  # e.g., {"avg_position": 4.3, "total_impressions": 23000}
    generated: datetime = Field(default_factory=datetime.utcnow)

class FunnelStep(BaseModel):
    step_name: str
    value: int
    conversion: float  # percentage

# ---------------------------------------------------------------------------
# Mock data
# ---------------------------------------------------------------------------

clients: List[Client] = []
api_keys: List[ApiKey] = []
keyword_rankings: List[KeywordRanking] = []
content_scores: List[ContentScore] = []
audit_logs: List[AuditLog] = []
reports: List[Report] = []

# Seed data
def seed_data():
    global clients, api_keys, keyword_rankings, content_scores, audit_logs, reports

    # API keys
    key1 = ApiKey(id=uuid4(), key="sk-ant-api03-xxxxx1", provider="claude", active=True)
    key2 = ApiKey(id=uuid4(), key="sk-ant-api03-xxxxx2", provider="claude", active=True)
    api_keys = [key1, key2]

    # Clients
    client_names = [
        "Agencia Digital Creativa",
        "SEO Masters España",
        "Impulso Digital Agency",
        "Semantica Labs",
        "Posicionamiento Web Pro",
        "Contenido Inteligente SL",
        "Ranking Top Agencia",
        "Visibilidad 360",
    ]
    industries = ["Marketing", "Ecommerce", "Health", "Finance", "Travel", "Education", "Real Estate", "SaaS"]
    plans = ["starter", "growth", "enterprise", "growth", "enterprise", "starter", "growth", "starter"]
    for name, ind, plan in zip(client_names, industries, plans):
        clients.append(Client(name=name, industry=ind, plan=plan, api_key_id=key1.id if plan!="enterprise" else key2.id))

    # Keywords
    kw_base = [
        "agencia seo madrid",
        "mejor agencia seo españa",
        "marketing digital para pymes",
        "visibilidad en claude",
        "seo con inteligencia artificial",
        "optimización conversacional",
        "posicionamiento semántico",
        "agencia de contenidos ai",
        "consultoría seo técnica",
        "análisis de competencia",
        "roi contenido",
        "content score claude",
        "ranking claude seo",
        "visibilidad claude dashboard",
        "agencia especializada en claude",
    ]
    for client in clients:
        for _ in range(random.randint(4, 12)):
            kw = random.choice(kw_base)
            pos = random.randint(1, 50)
            sv = random.randint(100, 22000)
            keyword_rankings.append(KeywordRanking(
                client_id=client.id,
                keyword=kw,
                position=pos,
                change=random.randint(-5, 5),
                search_volume=sv,
                difficulty=random.randint(20, 80),
                country="es",
            ))
        # also add a few for top 3 and bottom to show variation
        keyword_rankings.append(KeywordRanking(
            client_id=client.id,
            keyword=f"marca {client.name.split()[0].lower()}",
            position=random.randint(1, 3),
            change=random.randint(-1, 2),
            search_volume=random.randint(3000, 50000),
            difficulty=random.randint(40, 60),
        ))

    # Content scores
    urls = [
        "https://aDigitalCreativa.com/blog/seo-ia",
        "https://master-seo.es/guia-claude",
        "https://impulso.digital/contenido",
        "https://semantica.ai/optimizacion",
        "https://webpro.es/posicionamiento",
        "https://contenidointeligente.es/semantica",
        "https://rankingtop.agency/claude",
        "https://visibilidad360.com/dashboard",
    ]
    titles = [
        "Guía definitiva SEO para Claude",
        "Cómo ser visible en Claude Search",
        "Estrategias de contenido semántico",
        "Optimización de entidades Claude",
        "SEO conversacional para 2025",
        "Claude Ranking Factors explicados",
        "Dashboard de visibilidad Claude",
        "Automatizaciones con API Claude",
    ]
    for i, client in enumerate(clients):
        for j in range(random.randint(3, 6)):
            idx = (i+j) % len(urls)
            content_scores.append(ContentScore(
                client_id=client.id,
                url=urls[idx],
                title=titles[idx],
                readability_score=random.uniform(60, 95),
                semantic_score=random.uniform(70, 98),
                ai_visibility_score=random.uniform(40, 92),
                claude_index_score=random.uniform(50, 99),
            ))

    # Audit logs (events)
    event_types = ["api_call", "ranking_change", "content_update", "alert", "report_generated"]
    descriptions = [
        "Claude API called to refresh ranking",
        "Keyword position change detected",
        "Content score recomputed",
        "Visibility drop alert for keyword X",
        "Monthly report generated for client",
    ]
    for client in clients:
        for _ in range(random.randint(5, 15)):
            evt = random.choice(event_types)
            desc = random.choice(descriptions)
            audit_logs.append(AuditLog(
                client_id=client.id,
                event_type=evt,
                description=desc,
                payload={"kw": random.choice(kw_base)} if "alert" in evt else None
            ))

    # Reports
    report_types = ["weekly", "monthly", "custom"]
    for client in clients:
        for rtype in report_types:
            reports.append(Report(
                client_id=client.id,
                report_type=rtype,
                name=f"{rtype.capitalize()} Visibility Report",
                metrics={
                    "avg_position": round(random.uniform(2.5, 15.0), 1),
                    "total_impressions": random.randint(5000, 120000),
                    "clicks": random.randint(300, 15000),
                    "ctr": round(random.uniform(1.5, 12.5), 2),
                    "content_score_avg": round(random.uniform(60, 97), 1),
                    "ai_visibility_index": round(random.uniform(50, 100), 1),
                    "claude_ranking_improvements": random.randint(2, 45),
                },
                generated=datetime.utcnow() - timedelta(days=random.randint(1, 30))
            ))

seed_data()

# ---------------------------------------------------------------------------
# Generic endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "app": "StellarSEO", "version": "1.0.0"}

@app.get("/api/info")
def info():
    return {
        "name": "Stellar SEO",
        "app_name": "StellarSEO",
        "tagline": "AI-powered visibility dashboard for Claude-first agencies",
        "founded": 2024,
        "team_size": 12,
        "industry": "SEO Analytics & AI Visibility",
        "mission": "Make every agency visible in Claude through real-time AI-driven SEO",
        "website": "https://stellar-seo.ai",
        "version": "1.0.0",
        "platform": "Claude-optimized analytics"
    }

@app.get("/api/metrics")
def metrics():
    return {
        "active_clients": len(clients),
        "total_keywords_tracked": len(keyword_rankings),
        "avg_keyword_position": round(sum(k.position for k in keyword_rankings)/len(keyword_rankings), 2) if keyword_rankings else 0,
        "content_scores_computed": len(content_scores),
        "reports_generated": len(reports),
        "audit_logs_count": len(audit_logs),
        "api_calls_last_24h": random.randint(850, 2300),
        "claude_response_time_avg_ms": random.randint(280, 650),
        "visibility_index": random.randint(68, 92),
        "optimization_opportunities": random.randint(15, 87),
        "roi_prediction_percent": round(random.uniform(120, 410), 1),
    }

# ---------------------------------------------------------------------------
# Analytics specific endpoints
# ---------------------------------------------------------------------------

@app.get("/api/reports")
def get_reports(client_id: Optional[UUID] = Query(None)):
    result = reports
    if client_id:
        result = [r for r in reports if r.client_id == client_id]
    return result

@app.get("/api/reports/{report_id}")
def get_report(report_id: UUID):
    rp = next((r for r in reports if r.id == report_id), None)
    if not rp:
        raise HTTPException(404, "Report not found")
    return rp

@app.post("/api/reports")
def create_report(report: Report):
    report.id = uuid4()
    report.generated = datetime.utcnow()
    reports.append(report)
    return report

@app.get("/api/events")
def get_events(client_id: Optional[UUID] = Query(None), event_type: Optional[str] = Query(None)):
    result = audit_logs
    if client_id:
        result = [e for e in result if e.client_id == client_id]
    if event_type:
        result = [e for e in result if e.event_type == event_type]
    return sorted(result, key=lambda x: x.timestamp, reverse=True)[:100]

@app.get("/api/events/{event_id}")
def get_event(event_id: UUID):
    ev = next((e for e in audit_logs if e.id == event_id), None)
    if not ev:
        raise HTTPException(404, "Event not found")
    return ev

@app.post("/api/events")
def create_event(event: AuditLog):
    event.id = uuid4()
    event.timestamp = datetime.utcnow()
    audit_logs.append(event)
    return event

@app.get("/api/funnel")
def get_funnel(client_id: Optional[UUID] = Query(None)):
    # Mock SEO visibility funnel: keywords tracked -> content optimized -> ranking improvements -> organic clicks -> conversions
    base = [
        FunnelStep(step_name="Keywords tracked", value=random.randint(300, 2500), conversion=100),
        FunnelStep(step_name="Content pages optimized", value=random.randint(100, 700), conversion=round(random.uniform(30, 50), 1)),
        FunnelStep(step_name="Top-10 ranking keywords", value=random.randint(60, 320), conversion=round(random.uniform(50, 70), 1)),
        FunnelStep(step_name="Organic clicks (monthly)", value=random.randint(2000, 18000), conversion=round(random.uniform(5, 15), 1)),
        FunnelStep(step_name="Conversions / Leads", value=random.randint(50, 450), conversion=round(random.uniform(2, 8), 1)),
    ]
    return base

# ---------------------------------------------------------------------------
# Resource endpoints (clients, api_keys, keyword_rankings, content_scores)
# ---------------------------------------------------------------------------

@app.get("/api/clients")
def get_clients():
    return clients

@app.get("/api/clients/{client_id}")
def get_client(client_id: UUID):
    cl = next((c for c in clients if c.id == client_id), None)
    if not cl:
        raise HTTPException(404, "Client not found")
    return cl

@app.post("/api/clients")
def create_client(client: Client):
    client.id = uuid4()
    client.created = datetime.utcnow()
    clients.append(client)
    return client

@app.get("/api/api_keys")
def get_api_keys():
    return api_keys

@app.post("/api/api_keys")
def create_api_key(api_key: ApiKey):
    api_key.id = uuid4()
    api_keys.append(api_key)
    return api_key

@app.get("/api/keyword_rankings")
def get_keyword_rankings(client_id: Optional[UUID] = Query(None)):
    result = keyword_rankings
    if client_id:
        result = [k for k in keyword_rankings if k.client_id == client_id]
    return result

@app.post("/api/keyword_rankings")
def add_keyword_ranking(kr: KeywordRanking):
    kr.id = uuid4()
    kr.timestamp = datetime.utcnow()
    keyword_rankings.append(kr)
    return kr

@app.get("/api/content_scores")
def get_content_scores(client_id: Optional[UUID] = Query(None)):
    result = content_scores
    if client_id:
        result = [c for c in content_scores if c.client_id == client_id]
    return result

@app.post("/api/content_scores")
def create_content_score(cs: ContentScore):
    cs.id = uuid4()
    cs.timestamp = datetime.utcnow()
    content_scores.append(cs)
    return cs

@app.get("/api/audit_logs")
def get_audit_logs(client_id: Optional[UUID] = Query(None)):
    result = audit_logs
    if client_id:
        result = [a for a in audit_logs if a.client_id == client_id]
    return sorted(result, key=lambda x: x.timestamp, reverse=True)[:200]

# Additional analytics dashboard endpoints
@app.get("/api/stats")
def get_stats():
    # Aggregated dashboard stats
    total_kw = len(keyword_rankings)
    avg_position = round(sum(k.position for k in keyword_rankings) / total_kw, 2) if total_kw else 0
    total_impressions = sum(k.search_volume for k in keyword_rankings)
    avg_content = round(sum(c.ai_visibility_score for c in content_scores) / len(content_scores), 2) if content_scores else 0
    return {
        "total_clients": len(clients),
        "total_keywords": total_kw,
        "average_position": avg_position,
        "total_impressions_estimate": total_impressions,
        "average_ai_visibility_score": avg_content,
        "events_last_24h": len(audit_logs),
        "active_api_keys": len([k for k in api_keys if k.active]),
    }

@app.get("/api/recent-activity")
def recent_activity(limit: int = 10):
    recent = sorted(audit_logs, key=lambda x: x.timestamp, reverse=True)[:limit]
    return recent

@app.get("/api/chart-data")
def chart_data(metric: str = "visibility"):
    if metric == "visibility":
        # fake time-series
        now = datetime.utcnow()
        data = []
        for i in range(12):
            data.append({
                "date": (now - timedelta(days=30*(11-i))).strftime("%Y-%m"),
                "value": random.randint(45, 98)
            })
        return data
    elif metric == "keyword_positions":
        now = datetime.utcnow()
        data = []
        for i in range(30):
            data.append({
                "date": (now - timedelta(days=29-i)).strftime("%Y-%m-%d"),
                "avg_position": round(random.uniform(3.5, 9.8), 1)
            })
        return data
    else:
        return []

# ---------------------------------------------------------------------------
# Start
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    PORT = int(os.environ.get("COMPANY_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=PORT)