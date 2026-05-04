"""
Morphis Backend Orchestrator
FastAPI service that receives prompts + API schemas, returns LLM-generated UIs
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Morphis Backend Orchestrator")

# CORS middleware - allows SDK to connect from any domain (restrict in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Lock to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic models for request validation
# ---------------------------------------------------------------------------
class EndpointSchema(BaseModel):
    path: str
    method: str
    description: str

class ApiSchema(BaseModel):
    endpoints: List[EndpointSchema]

class GenerateRequest(BaseModel):
    prompt: str
    apiSchema: ApiSchema
    apiKey: str

# ---------------------------------------------------------------------------
# LLM system prompt constructor
# Instructs the "Antigravity engine" to output only raw HTML/CSS/JS
# ---------------------------------------------------------------------------
def build_system_prompt(api_schema: ApiSchema) -> str:
    # Format the allowed endpoints for the LLM
    endpoints_str = "\n".join(
        f"- {e.method} {e.path}: {e.description}" for e in api_schema.endpoints
    )
    return f"""You are an expert UI/Data Visualization developer. Generate raw, valid HTML, CSS, and vanilla JavaScript to fulfill the user's prompt.

RULES:
1. Output ONLY code - no markdown, no explanations, no ``` blocks
2. Use ONLY these API endpoints (via fetch()):
{endpoints_str}
3. Self-contained code: modern CSS (flexbox, clean padding, neutral colors)
4. All data must be fetched from provided endpoints - no hardcoding
5. Minimalist, high-end aesthetic with smooth transitions"""

# ---------------------------------------------------------------------------
# Mock LLM call - replace with actual litellm/openai SDK integration
# ---------------------------------------------------------------------------
def mock_llm_call(prompt: str, system_prompt: str) -> str:
    # TODO: Replace with actual LLM integration:
    # import litellm
    # response = litellm.completion(
    #     model="gpt-4o",
    #     messages=[
    #         {"role": "system", "content": system_prompt},
    #         {"role": "user", "content": prompt}
    #     ]
    # )
    # return response.choices[0].message.content

    # Dummy response: Product details card that fetches from dummyjson
    return """<!DOCTYPE html>
<html>
<head>
<style>
* { box-sizing: border-box; margin:0; padding:0; }
body {
    font-family: 'SF Mono', 'Fira Code', monospace;
    background: #f8f9fa;
    padding: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
}
.card {
    background: white;
    padding: 32px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    max-width: 480px;
    width: 100%;
    transition: transform 0.2s ease;
}
.card:hover { transform: translateY(-2px); }
h2 {
    font-size: 20px;
    color: #212529;
    margin-bottom: 16px;
    font-weight: 600;
}
.meta {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
}
.meta-item {
    background: #f1f3f5;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 13px;
    color: #495057;
}
p {
    color: #6c757d;
    line-height: 1.6;
    font-size: 14px;
}
.loading {
    color: #999;
    text-align: center;
    padding: 40px;
    font-family: monospace;
}
.error {
    color: #dc3545;
    text-align: center;
    padding: 40px;
    font-family: monospace;
}
</style>
</head>
<body>
<div id="app" class="loading">Loading product data...</div>

<script>
fetch('https://dummyjson.com/products/1')
.then(response => {
    if (!response.ok) throw new Error('Failed to fetch product data');
    return response.json();
})
.then(data => {
    const app = document.getElementById('app');
    app.className = '';
    app.innerHTML = `
        <div class="card">
            <h2>${data.title}</h2>
            <div class="meta">
                <span class="meta-item">Price: $${data.price}</span>
                <span class="meta-item">Category: ${data.category}</span>
                <span class="meta-item">Stock: ${data.stock}</span>
            </div>
            <p>${data.description}</p>
        </div>
    `;
})
.catch(err => {
    const app = document.getElementById('app');
    app.className = 'error';
    app.textContent = `Error: ${err.message}`;
});
</script>
</body>
</html>"""

# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------
@app.post("/api/generate")
async def generate_ui(request: GenerateRequest):
    # TODO: Validate apiKey here in production
    # if not validate_api_key(request.apiKey):
    #     raise HTTPException(status_code=401, detail="Invalid API key")

    system_prompt = build_system_prompt(request.apiSchema)

    # For MVP: use mock LLM call. Replace with actual integration later.
    generated_html = mock_llm_call(request.prompt, system_prompt)

    return {"html": generated_html}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
