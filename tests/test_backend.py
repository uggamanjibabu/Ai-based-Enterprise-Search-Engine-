def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "NEXUS AI" in data["service"]

def test_login_success(client):
    res = client.post("/api/auth/login", json={
        "email": "admin@nexus.ai",
        "password": "Admin@12345"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"

def test_login_invalid_password(client):
    res = client.post("/api/auth/login", json={
        "email": "admin@nexus.ai",
        "password": "WrongPassword!"
    })
    assert res.status_code == 401

def test_get_current_user_profile(client, admin_token):
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    user = res.json()
    assert user["email"] == "admin@nexus.ai"
    assert user["permissions"]["can_manage_users"] is True

def test_list_documents(client, admin_token):
    res = client.get("/api/documents", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    docs = res.json()
    assert len(docs) >= 8
    assert all("status" in d for d in docs)
    assert any(d["file_type"] == "pdf" for d in docs)
    assert any(d["file_type"] == "docx" for d in docs)
    assert any(d["file_type"] == "txt" for d in docs)
    assert any(d["file_type"] == "csv" for d in docs)

def test_document_detail_and_preview(client, admin_token):
    res = client.get("/api/documents", headers={"Authorization": f"Bearer {admin_token}"})
    first_id = res.json()[0]["id"]

    detail_res = client.get(f"/api/documents/{first_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["chunks"]) > 0

    preview_res = client.get(f"/api/documents/{first_id}/preview", headers={"Authorization": f"Bearer {admin_token}"})
    assert preview_res.status_code == 200
    assert len(preview_res.json()["preview_text"]) > 0

def test_keyword_search(client, admin_token):
    res = client.post(
        "/api/search",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "query": "multi-factor authentication",
            "search_type": "keyword",
            "limit": 5
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_results"] > 0
    assert len(data["results"]) > 0
    assert data["results"][0]["keyword_score"] > 0

def test_semantic_search(client, admin_token):
    res = client.post(
        "/api/search",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "query": "guidelines for working from home and buying desk",
            "search_type": "semantic",
            "limit": 5
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_results"] > 0
    # Top match should be remote work policy
    top_title = data["results"][0]["title"]
    assert "Remote" in top_title or "Work" in top_title or "Handbook" in top_title

def test_hybrid_search(client, admin_token):
    res = client.post(
        "/api/search",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "query": "annual paid leave and vacation allowance",
            "search_type": "hybrid",
            "keyword_weight": 0.4,
            "semantic_weight": 0.6,
            "limit": 5
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_results"] > 0
    top_doc = data["results"][0]
    assert "relevance_score" in top_doc
    assert top_doc["relevance_score"] > 0

def test_ask_this_document_rag(client, employee_token):
    res = client.post(
        "/api/ai/ask",
        headers={"Authorization": f"Bearer {employee_token}"},
        json={
            "question": "How many days of paid vacation leave do employees get?",
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert len(data["citations"]) > 0
    # The answer or citations must reference the 24 days or HR leave policy
    found_mention = "24" in data["answer"] or any("24" in c["passage"] for c in data["citations"])
    assert found_mention is True

def test_smart_recommendations(client, admin_token):
    res = client.get("/api/documents", headers={"Authorization": f"Bearer {admin_token}"})
    doc_id = res.json()[0]["id"]

    rec_res = client.get(f"/api/ai/recommendations/{doc_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert rec_res.status_code == 200
    recs = rec_res.json()["recommendations"]
    assert len(recs) > 0
    assert "similarity_score" in recs[0]

def test_analytics_dashboard(client, admin_token):
    res = client.get("/api/analytics/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_documents"] >= 8
    assert stats["total_users"] >= 3
    assert stats["total_searches"] > 0
    assert len(stats["categories"]) >= 5

def test_knowledge_gap_analysis(client, admin_token):
    res = client.get("/api/analytics/knowledge-gaps", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    gaps = res.json()
    assert len(gaps) > 0
    assert "suggested_action" in gaps[0]

