import os
import shutil
import hashlib
import docx
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
import pandas as pd

from app.database.session import engine, Base, SessionLocal
from app.core.security import get_password_hash
from app.models.entities import (
    User, UserPermission, DocumentCategory, DocumentTag, Document,
    DocumentChunk, DocumentVersion, SearchHistory, SearchAnalytics,
    Notification, SystemSetting
)
from app.services.document_processor import DocumentProcessor
from app.ai.vector_store import VectorStore
from app.ai.keyword_search import KeywordSearchEngine
from app.core.config import settings

def create_sample_files(sample_dir: str):
    os.makedirs(sample_dir, exist_ok=True)

    # 1. IT Security Policy (.docx)
    docx_path1 = os.path.join(sample_dir, "IT_Security_Policy.docx")
    doc1 = docx.Document()
    doc1.add_heading("NEXUS ENTERPRISE IT & CYBERSECURITY POLICY", 0)
    doc1.add_paragraph("Document Classification: Internal | Revision: 3.2 | Effective Date: January 1, 2026")
    doc1.add_heading("1. Purpose and Scope", level=1)
    doc1.add_paragraph(
        "This policy defines mandatory requirements for safeguarding NEXUS enterprise assets, "
        "cloud infrastructure, endpoint devices, customer data, and intellectual property. "
        "All full-time employees, contractors, and third-party vendors are strictly required to comply."
    )
    doc1.add_heading("2. Access Control and Authentication", level=1)
    doc1.add_paragraph(
        "All employee accounts must enforce Multi-Factor Authentication (MFA) using hardware security keys or authenticator apps. "
        "SMS-based verification is strictly prohibited. Passwords must be at least 14 characters in length and contain uppercase, "
        "lowercase, numbers, and symbols. Passwords must not be reused across enterprise and personal services. "
        "Session timeouts are enforced after 30 minutes of inactivity on all internal workstations and portals."
    )
    doc1.add_heading("3. Endpoint Security and Disk Encryption", level=1)
    doc1.add_paragraph(
        "All corporate laptops (MacBook, Windows, Linux) must have full-disk encryption enabled (FileVault on macOS, BitLocker on Windows). "
        "Installation of unauthorized third-party software, peer-to-peer file sharing clients, or unapproved VPN software is prohibited. "
        "Security patches must be applied within 72 hours of critical Common Vulnerabilities and Exposures (CVE) disclosure."
    )
    doc1.add_heading("4. Incident Response and Breach Notification", level=1)
    doc1.add_paragraph(
        "Any suspected security incident, lost laptop, phishing email, or credential compromise must be reported immediately "
        "to security@nexus.ai or via the Slack channel #security-alerts within 60 minutes. Failure to report security anomalies "
        "may lead to disciplinary action up to contract termination."
    )
    doc1.save(docx_path1)

    # 2. Work From Home Policy (.txt)
    txt_path1 = os.path.join(sample_dir, "Work_From_Home_Policy.txt")
    with open(txt_path1, "w", encoding="utf-8") as f:
        f.write("""NEXUS ENTERPRISE REMOTE WORK & WORK FROM HOME POLICY

1. Overview
NEXUS AI recognizes flexible working arrangements to enhance work-life balance and operational efficiency. This policy applies to all full-time salaried staff who have completed their initial 90-day onboarding period.

2. Core Collaboration Hours
To facilitate cross-functional teamwork across global time zones, all remote team members are expected to be available for synchronous communication on Slack, email, and Google Meet between 10:00 AM and 4:00 PM in their designated primary regional time zone.

3. Home Office Setup & Equipment Stipend
Full-time remote employees receive a one-time home office reimbursement of $1,500 for ergonomic chairs, standing desks, high-resolution monitors, and noise-canceling headsets. An ongoing monthly internet stipend of $80 is processed automatically with payroll.

4. Confidentiality & Physical Security in Remote Environments
When working from home, co-working spaces, or public locations, employees must ensure that computer screens are not visible to unauthorized persons. Using public, unencrypted Wi-Fi networks without activating the corporate WireGuard/Tailscale VPN is prohibited. Printing sensitive customer or financial data at home is strictly forbidden.

5. Time Tracking & Performance Measurement
Remote employees are evaluated based on sprint deliverables, objectives and key results (OKRs), and code/document output rather than continuous desk hours. Sick days and personal leaves must be logged through the HR portal at least 24 hours in advance, except in medical emergencies.
""")

    # 3. Employee Handbook (.docx)
    docx_path2 = os.path.join(sample_dir, "Employee_Handbook.docx")
    doc2 = docx.Document()
    doc2.add_heading("NEXUS GLOBAL EMPLOYEE HANDBOOK", 0)
    doc2.add_paragraph("Version 4.0 | Approved by Executive Leadership | Confidential & Proprietary")
    doc2.add_heading("1. Mission, Vision, and Core Values", level=1)
    doc2.add_paragraph(
        "At NEXUS AI, our mission is to turn scattered information into instant knowledge. We hold five core values: "
        "Radical Transparency, Customer Obsession, Continuous Learning, Intellectual Rigor, and Inclusivity. "
        "We expect every team member to treat colleagues and partners with empathy, dignity, and professional respect."
    )
    doc2.add_heading("2. Code of Conduct and Anti-Harassment", level=1)
    doc2.add_paragraph(
        "NEXUS maintains a zero-tolerance policy towards harassment, discrimination, bullying, retaliation, or unethical business practices. "
        "Employees can report grievances anonymously via the Ethics Helpline portal (ethics.nexus.ai) or directly to the Chief People Officer. "
        "Investigations are conducted impartially within 10 business days."
    )
    doc2.add_heading("3. Compensation, Benefits, and Wellness", level=1)
    doc2.add_paragraph(
        "NEXUS offers competitive market-benchmarked base salaries, equity incentive stock options, 100% employer-covered health, "
        "dental, and vision insurance premiums, 401(k) / Provident Fund matching up to 5%, annual learning budgets of $2,000 per employee, "
        "and comprehensive mental health counseling subscriptions."
    )
    doc2.save(docx_path2)

    # 4. HR Leave Policy (.pdf)
    pdf_path1 = os.path.join(sample_dir, "HR_Leave_Policy.pdf")
    c = canvas.Canvas(pdf_path1, pagesize=letter)
    c.setTitle("NEXUS HR Leave and Absence Policy")
    
    # Header
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(50, 740, "NEXUS ENTERPRISE HR LEAVE & TIME-OFF POLICY")
    
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.HexColor("#0284c7"))
    c.drawString(50, 720, "Category: Human Resources | Status: Effective 2026 | Document ID: HR-POL-089")

    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(50, 680, "1. Annual Paid Time Off (PTO)")
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#334155"))
    c.drawString(50, 660, "Every full-time employee is credited with 24 paid vacation days per calendar year, accrued monthly.")
    c.drawString(50, 645, "A maximum of 8 unused vacation days can be carried over into the next fiscal year. Any excess days")
    c.drawString(50, 630, "are encashed during the December payroll cycle.")

    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(50, 595, "2. Sick and Medical Leave")
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#334155"))
    c.drawString(50, 575, "Employees are granted 12 paid sick leave days annually. For consecutive absences exceeding 3 days,")
    c.drawString(50, 560, "a verified medical certificate from a licensed physician must be submitted upon return.")

    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(50, 525, "3. Parental & Family Care Leave")
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#334155"))
    c.drawString(50, 505, "Primary caregivers are entitled to 18 weeks of fully paid parental leave for birth or adoption.")
    c.drawString(50, 490, "Secondary caregivers receive 8 weeks of fully paid leave. Flexible return-to-work schedules are supported.")

    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(50, 455, "4. Compassionate & Bereavement Leave")
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#334155"))
    c.drawString(50, 435, "Up to 5 business days of paid compassionate leave are provided in the event of death of an immediate family member.")

    c.showPage()
    c.save()

    # 5. Company Financial Report (.csv)
    csv_path1 = os.path.join(sample_dir, "Company_Financial_Report.csv")
    df = pd.DataFrame([
        {"Quarter": "Q1 2025", "Department": "Cloud Infrastructure", "Budget_Allocated_USD": 450000, "Actual_Spend_USD": 428000, "ARR_Contribution_USD": 2800000, "Headcount": 28, "Cost_Variance": "-4.8%"},
        {"Quarter": "Q2 2025", "Department": "AI Research & RAG", "Budget_Allocated_USD": 620000, "Actual_Spend_USD": 590000, "ARR_Contribution_USD": 4100000, "Headcount": 35, "Cost_Variance": "-4.8%"},
        {"Quarter": "Q3 2025", "Department": "Enterprise Sales", "Budget_Allocated_USD": 850000, "Actual_Spend_USD": 880000, "ARR_Contribution_USD": 7500000, "Headcount": 42, "Cost_Variance": "+3.5%"},
        {"Quarter": "Q4 2025", "Department": "Customer Success", "Budget_Allocated_USD": 380000, "Actual_Spend_USD": 365000, "ARR_Contribution_USD": 8900000, "Headcount": 22, "Cost_Variance": "-3.9%"},
        {"Quarter": "Q1 2026", "Department": "Security & Compliance", "Budget_Allocated_USD": 320000, "Actual_Spend_USD": 310000, "ARR_Contribution_USD": 9800000, "Headcount": 18, "Cost_Variance": "-3.1%"},
        {"Quarter": "Q2 2026", "Department": "Product & Engineering", "Budget_Allocated_USD": 1150000, "Actual_Spend_USD": 1120000, "ARR_Contribution_USD": 12400000, "Headcount": 55, "Cost_Variance": "-2.6%"}
    ])
    df.to_csv(csv_path1, index=False)

    # 6. Project Management Guidelines (.docx)
    docx_path3 = os.path.join(sample_dir, "Project_Management_Guidelines.docx")
    doc3 = docx.Document()
    doc3.add_heading("NEXUS AGILE PROJECT MANAGEMENT FRAMEWORK", 0)
    doc3.add_paragraph("Engineering & Operations SOP | Version 2.4 | Owner: PMO Office")
    doc3.add_heading("1. Sprint Cadence and Planning Cycles", level=1)
    doc3.add_paragraph(
        "All engineering, product, and AI research squads operate on two-week sprint cycles beginning on Wednesdays. "
        "Sprint Planning occurs bi-weekly on Wednesday at 10:00 AM, backlog grooming every second Monday, "
        "and Sprint Retrospectives on alternate Tuesdays at 4:00 PM."
    )
    doc3.add_heading("2. Definition of Done (DoD)", level=1)
    doc3.add_paragraph(
        "A feature or ticket is classified as Done only when: (1) All acceptance criteria are satisfied, "
        "(2) Unit and integration test coverage is at or above 80%, (3) Static analysis and security scanning (SonarQube/Snyk) pass with zero critical vulnerabilities, "
        "(4) Peer review is approved by at least two senior engineers, (5) Technical documentation and API contracts in Swagger/Postman are updated."
    )
    doc3.add_heading("3. Incident Escalation & Post-Mortem Standards", level=1)
    doc3.add_paragraph(
        "Sev-1 and Sev-2 incidents trigger PagerDuty alerts to on-call squads within 5 minutes. "
        "A blameless post-mortem document must be authored within 48 hours of resolution, detailing timeline, root cause analysis (5 Whys), "
        "preventative action items, and Jira tracking tickets."
    )
    doc3.save(docx_path3)

    # 7. Data Privacy Policy (.txt)
    txt_path2 = os.path.join(sample_dir, "Data_Privacy_Policy.txt")
    with open(txt_path2, "w", encoding="utf-8") as f:
        f.write("""NEXUS ENTERPRISE GLOBAL DATA PRIVACY & COMPLIANCE POLICY

1. Legal & Regulatory Compliance
NEXUS AI is committed to maintaining compliance with the General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), and SOC 2 Type II criteria.

2. Personally Identifiable Information (PII) Classification
PII includes names, email addresses, phone numbers, IP addresses, financial account numbers, and biometric records. All PII collected during user interactions, search sessions, and enterprise document ingestion must be tokenized or pseudonymized before persistence.

3. Encryption & Data Protection Standards
All data in transit must be secured with TLS 1.3 cryptographic protocols. All customer databases, vector storage files, and document blobs must be encrypted at rest using AES-256 encryption. Encryption keys are rotated every 90 days via AWS KMS or HashiCorp Vault.

4. Right to Erasure & Data Subject Access Requests (DSAR)
Customers and enterprise employees have the right to request access to or permanent deletion of their indexed documents and search history. DSAR requests must be fulfilled by the Compliance Team within 30 calendar days of verification.

5. Data Retention & Destruction
Search query logs and telemetry are retained for 365 days for machine learning performance optimization and security auditing, after which they are automatically purged. When enterprise contracts terminate, tenant vector indexes and document stores are securely wiped within 14 days using DoD 5220.22-M sanitization standards.
""")

    # 8. Software Development Guidelines (.pdf)
    pdf_path2 = os.path.join(sample_dir, "Software_Development_Guidelines.pdf")
    c2 = canvas.Canvas(pdf_path2, pagesize=letter)
    c2.setTitle("NEXUS Software Development Guidelines")
    
    c2.setFont("Helvetica-Bold", 18)
    c2.setFillColor(colors.HexColor("#0f172a"))
    c2.drawString(50, 740, "NEXUS SOFTWARE DEVELOPMENT & CODE GUIDELINES")

    c2.setFont("Helvetica-Bold", 11)
    c2.setFillColor(colors.HexColor("#0284c7"))
    c2.drawString(50, 720, "Category: Engineering | Version: 3.1 | Architecture Board Approved")

    c2.setFont("Helvetica-Bold", 13)
    c2.setFillColor(colors.HexColor("#0f172a"))
    c2.drawString(50, 680, "1. Git Branching Strategy & Pull Request Workflow")
    c2.setFont("Helvetica", 10)
    c2.setFillColor(colors.HexColor("#334155"))
    c2.drawString(50, 660, "Engineers branch from 'main' using convention 'feat/TICKET-description' or 'fix/TICKET-description'.")
    c2.drawString(50, 645, "Direct commits to 'main' or 'staging' branches are locked and restricted by branch protection rules.")
    c2.drawString(50, 630, "Pull requests require green CI pipeline status, automated linting passing, and 2 approvals.")

    c2.setFont("Helvetica-Bold", 13)
    c2.setFillColor(colors.HexColor("#0f172a"))
    c2.drawString(50, 595, "2. API Design & Versioning Standards")
    c2.setFont("Helvetica", 10)
    c2.setFillColor(colors.HexColor("#334155"))
    c2.drawString(50, 575, "All new REST APIs must adhere to OpenAPI 3.0 specifications, return standard error envelopes,")
    c2.drawString(50, 560, "enforce token-bucket rate limiting (100 req/min per user), and support semantic versioning.")

    c2.setFont("Helvetica-Bold", 13)
    c2.setFillColor(colors.HexColor("#0f172a"))
    c2.drawString(50, 525, "3. Vector Search & Machine Learning Pipeline Guidelines")
    c2.setFont("Helvetica", 10)
    c2.setFillColor(colors.HexColor("#334155"))
    c2.drawString(50, 505, "All semantic vector embeddings must be normalized with L2 norm prior to FAISS index insertion.")
    c2.drawString(50, 490, "Chunk sizes must be between 300 and 800 characters with 15-20% overlap to preserve context.")
    c2.drawString(50, 475, "Search queries must record latency, similarity scores, and execution metrics for quality auditing.")

    c2.showPage()
    c2.save()

    print("Created 8 enterprise sample documents in sample_documents/ successfully.")

def seed_database():
    print("Initializing Database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Create categories
        categories = [
            {"name": "Cybersecurity & IT", "description": "Information security policies, infrastructure SOPs, and device management", "color": "#38bdf8"},
            {"name": "Human Resources", "description": "Employee benefits, PTO leaves, workplace ethics, and onboarding guides", "color": "#ec4899"},
            {"name": "Corporate Governance", "description": "Data privacy laws, legal compliance, GDPR, and executive policies", "color": "#8b5cf6"},
            {"name": "Finance & Operations", "description": "Financial budgets, ARR metrics, expense reporting, and procurement", "color": "#10b981"},
            {"name": "Engineering & Architecture", "description": "Software architecture, sprint frameworks, API contracts, and CI/CD", "color": "#f59e0b"},
        ]

        cat_map = {}
        for c_data in categories:
            cat = db.query(DocumentCategory).filter(DocumentCategory.name == c_data["name"]).first()
            if not cat:
                cat = DocumentCategory(**c_data)
                db.add(cat)
                db.commit()
                db.refresh(cat)
            cat_map[cat.name] = cat.id

        # Create Demo Users
        users_data = [
            {
                "email": "admin@nexus.ai",
                "full_name": "Dr. Sarah Mitchell (Lead Architect)",
                "password": "Admin@12345",
                "role": "admin",
                "department": "Executive Leadership",
                "can_upload": True,
                "can_delete": True,
                "can_view_all_analytics": True,
                "can_manage_users": True,
                "can_manage_settings": True,
            },
            {
                "email": "manager@nexus.ai",
                "full_name": "Marcus Vance (Engineering Manager)",
                "password": "Manager@12345",
                "role": "manager",
                "department": "Engineering & Architecture",
                "can_upload": True,
                "can_delete": False,
                "can_view_all_analytics": True,
                "can_manage_users": False,
                "can_manage_settings": False,
            },
            {
                "email": "employee@nexus.ai",
                "full_name": "Emily Chen (Senior Developer)",
                "password": "Employee@12345",
                "role": "employee",
                "department": "Software Engineering",
                "can_upload": True,
                "can_delete": False,
                "can_view_all_analytics": False,
                "can_manage_users": False,
                "can_manage_settings": False,
            }
        ]

        user_map = {}
        for u in users_data:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                new_u = User(
                    email=u["email"],
                    full_name=u["full_name"],
                    hashed_password=get_password_hash(u["password"]),
                    role=u["role"],
                    department=u["department"],
                    is_active=True
                )
                db.add(new_u)
                db.commit()
                db.refresh(new_u)

                perms = UserPermission(
                    user_id=new_u.id,
                    can_upload=u["can_upload"],
                    can_delete=u["can_delete"],
                    can_view_all_analytics=u["can_view_all_analytics"],
                    can_manage_users=u["can_manage_users"],
                    can_manage_settings=u["can_manage_settings"]
                )
                db.add(perms)
                db.commit()
                user_map[u["role"]] = new_u
            else:
                user_map[u["role"]] = existing

        # Ingest and Index Sample Documents
        sample_docs = [
            {
                "file": "IT_Security_Policy.docx",
                "title": "Enterprise IT Security & Cybersecurity Policy",
                "category": "Cybersecurity & IT",
                "access": "internal",
                "uploader": user_map["admin"],
                "tags": ["security", "mfa", "encryption", "compliance"]
            },
            {
                "file": "Work_From_Home_Policy.txt",
                "title": "Remote Work & Work From Home Guidelines",
                "category": "Human Resources",
                "access": "public",
                "uploader": user_map["manager"],
                "tags": ["wfh", "remote", "stipend", "hours"]
            },
            {
                "file": "Employee_Handbook.docx",
                "title": "NEXUS Global Employee Handbook",
                "category": "Human Resources",
                "access": "public",
                "uploader": user_map["admin"],
                "tags": ["handbook", "culture", "benefits", "conduct"]
            },
            {
                "file": "HR_Leave_Policy.pdf",
                "title": "HR Leave, Absence & PTO Policy",
                "category": "Human Resources",
                "access": "internal",
                "uploader": user_map["admin"],
                "tags": ["pto", "leave", "vacation", "sick leave"]
            },
            {
                "file": "Company_Financial_Report.csv",
                "title": "Quarterly Financial Budget & ARR Performance",
                "category": "Finance & Operations",
                "access": "restricted",
                "uploader": user_map["admin"],
                "tags": ["finance", "budget", "arr", "revenue"]
            },
            {
                "file": "Project_Management_Guidelines.docx",
                "title": "Agile Sprint Cycles & Project Management Framework",
                "category": "Engineering & Architecture",
                "access": "internal",
                "uploader": user_map["manager"],
                "tags": ["agile", "sprint", "jira", "dod"]
            },
            {
                "file": "Data_Privacy_Policy.txt",
                "title": "Data Privacy, GDPR & Encryption Policy",
                "category": "Corporate Governance",
                "access": "internal",
                "uploader": user_map["admin"],
                "tags": ["gdpr", "privacy", "pii", "retention"]
            },
            {
                "file": "Software_Development_Guidelines.pdf",
                "title": "Software Engineering Guidelines & Code Protocols",
                "category": "Engineering & Architecture",
                "access": "internal",
                "uploader": user_map["manager"],
                "tags": ["engineering", "git", "ci/cd", "review"]
            }
        ]

        sample_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_documents"))
        vector_store = VectorStore()

        for doc_item in sample_docs:
            src_path = os.path.join(sample_dir, doc_item["file"])
            if not os.path.exists(src_path):
                print(f"Skipping missing sample file {src_path}")
                continue

            file_size = os.path.getsize(src_path)
            file_type = doc_item["file"].rsplit(".", 1)[-1].lower()
            file_hash = DocumentProcessor.calculate_sha256(src_path)

            existing_doc = db.query(Document).filter(Document.file_hash_sha256 == file_hash).first()
            if existing_doc:
                print(f"Document '{doc_item['title']}' already seeded and indexed.")
                continue

            # Copy to uploads dir
            dest_filename = f"sample_{doc_item['file']}"
            dest_path = os.path.join(settings.UPLOAD_DIR, dest_filename)
            shutil.copy2(src_path, dest_path)

            doc_rec = Document(
                title=doc_item["title"],
                filename=dest_filename,
                original_filename=doc_item["file"],
                file_path=dest_path,
                file_type=file_type,
                file_size=file_size,
                file_hash_sha256=file_hash,
                category_id=cat_map.get(doc_item["category"]),
                uploader_id=doc_item["uploader"].id,
                status="processing",
                access_level=doc_item["access"],
                version=1
            )
            db.add(doc_rec)
            db.commit()
            db.refresh(doc_rec)

            # Extract text & chunk
            raw_text = DocumentProcessor.extract_text(dest_path, file_type)
            cleaned_text = DocumentProcessor.clean_text(raw_text)
            chunks_data = DocumentProcessor.chunk_text(cleaned_text, chunk_size=500, overlap=100)
            summary = DocumentProcessor.generate_summary(cleaned_text)

            db_chunks = []
            for c in chunks_data:
                c_rec = DocumentChunk(
                    document_id=doc_rec.id,
                    chunk_index=c["chunk_index"],
                    content=c["content"],
                    token_count=c["token_count"]
                )
                db.add(c_rec)
                db_chunks.append(c_rec)
            db.commit()

            # Add vectors to FAISS
            faiss_chunks = [{"chunk_id": rec.id, "chunk_index": rec.chunk_index, "content": rec.content} for rec in db_chunks]
            assigned_ids = vector_store.add_chunks(doc_rec.id, faiss_chunks)

            for rec, v_id in zip(db_chunks, assigned_ids):
                rec.embedding_id = v_id

            doc_rec.status = "indexed"
            doc_rec.summary = summary
            doc_rec.chunk_count = len(db_chunks)
            doc_rec.word_count = len(cleaned_text.split())
            db.commit()

            # Notification
            db.add(Notification(
                user_id=doc_item["uploader"].id,
                title="Document Indexed",
                message=f"'{doc_rec.title}' has been processed and indexed into FAISS vector store.",
                type="success",
                related_document_id=doc_rec.id
            ))
            db.commit()

            print(f"Indexed: '{doc_rec.title}' ({len(db_chunks)} chunks)")

        # Rebuild Keyword BM25 Index
        chunks = db.query(DocumentChunk).join(Document).filter(Document.status == "indexed").all()
        chunk_list = [
            {"document_id": c.document_id, "chunk_id": c.id, "chunk_index": c.chunk_index, "content": c.content}
            for c in chunks
        ]
        KeywordSearchEngine().rebuild_index(chunk_list)

        # Seed realistic search history and search analytics
        print("Seeding initial search analytics and queries...")
        sample_searches = [
            {"query": "password policy and mfa requirements", "type": "hybrid", "count": 6, "gap": False},
            {"query": "how many paid vacation days per year?", "type": "semantic", "count": 8, "gap": False},
            {"query": "remote work ergonomic stipend amount", "type": "hybrid", "count": 5, "gap": False},
            {"query": "definition of done sprint review criteria", "type": "keyword", "count": 4, "gap": False},
            {"query": "gdpr encryption standards tls aes-256", "type": "hybrid", "count": 7, "gap": False},
            {"query": "q2 cloud infrastructure actual spend", "type": "hybrid", "count": 3, "gap": False},
            {"query": "corporate gym membership reimbursement", "type": "semantic", "count": 4, "gap": True},
            {"query": "relocation assistance and visa sponsorship", "type": "hybrid", "count": 3, "gap": True},
            {"query": "kubernetes cluster production credentials", "type": "keyword", "count": 2, "gap": True},
        ]

        admin_id = user_map["admin"].id
        for s in sample_searches:
            for _ in range(s["count"]):
                db.add(SearchHistory(
                    user_id=admin_id,
                    query=s["query"],
                    search_type=s["type"],
                    total_results=0 if s["gap"] else 2,
                    execution_time_ms=34.2
                ))
                db.add(SearchAnalytics(
                    query=s["query"],
                    user_id=admin_id,
                    results_count=0 if s["gap"] else 2,
                    is_knowledge_gap=s["gap"],
                    search_latency_ms=34.2
                ))
        db.commit()

        print("Data seeding completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    sample_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_documents"))
    create_sample_files(sample_dir)
    seed_database()

