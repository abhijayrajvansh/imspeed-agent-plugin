const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
})[character]);

const option = (value, selected) => `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(value)}</option>`;

export function renderConfigPage({ agents, models, reasoningEfforts }) {
  const rows = agents.map((agent) => `<tr data-agent="${escapeHtml(agent.name)}">
    <td><strong>${escapeHtml(agent.description)}</strong><br><code>${escapeHtml(agent.name)}</code></td>
    <td><code>${escapeHtml(agent.profileName)}</code></td>
    <td><select name="model" aria-label="Model for ${escapeHtml(agent.name)}">${models.map((value) => option(value, agent.model)).join("")}</select></td>
    <td><select name="model_reasoning_effort" aria-label="Reasoning effort for ${escapeHtml(agent.name)}">${reasoningEfforts.map((value) => option(value, agent.model_reasoning_effort)).join("")}</select></td>
    <td>${escapeHtml(agent.accessMode)}</td>
  </tr>`).join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>IMSpeed agent configuration</title><style>
body{font-family:system-ui,sans-serif;margin:2rem;color:#172033;background:#f7f8fa}main{max-width:1200px;margin:auto}table{width:100%;border-collapse:collapse;background:#fff}th,td{padding:.75rem;text-align:left;border-bottom:1px solid #dde2ea}select,button{font:inherit;padding:.4rem}button{background:#1155cc;color:#fff;border:0;border-radius:4px}button:disabled{opacity:.6}.notice{background:#e8f0fe;padding:1rem;border-radius:5px}#status{min-height:1.5rem;margin-left:1rem}code{font-size:.85em}
</style></head><body><main><h1>IMSpeed agent configuration</h1><p class="notice">Existing agent threads retain their initial model; fresh spawns in a new Codex thread use applied profiles.</p>
<table><thead><tr><th>Role</th><th>Profile</th><th>Model</th><th>Effort</th><th>Access</th></tr></thead><tbody>${rows}</tbody></table>
<p><button id="save" type="button">Save &amp; apply to Codex</button><span id="status" role="status"></span></p>
<script>
const save=document.querySelector('#save'),status=document.querySelector('#status');
save.addEventListener('click',async()=>{save.disabled=true;status.textContent='Saving…';const agents=[...document.querySelectorAll('tbody tr')].map(row=>({name:row.dataset.agent,model:row.querySelector('[name=model]').value,model_reasoning_effort:row.querySelector('[name=model_reasoning_effort]').value}));try{const response=await fetch('/api/config',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({agents})});const body=await response.json();if(!response.ok)throw new Error(body.error||'Save failed');status.textContent='Saved and applied to '+body.applied.destination+'.'}catch(error){status.textContent='Error: '+error.message}finally{save.disabled=false}});
</script></main></body></html>`;
}
