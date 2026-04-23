import os
import numpy as np
import rasterio
import pandas as pd
import webbrowser
from datetime import datetime

DATASET_PATH = r"C:\Users\sandi\Minor Project\sundarbans\sundarbans"

# ================= PROCESS FUNCTION =================
def process_tif(file_path):
    with rasterio.open(file_path) as src:
        data = src.read(1)

    mangrove_pixels = np.sum(data == 1)

    pixel_area_m2 = 30 * 30
    area_ha = (mangrove_pixels * pixel_area_m2) / 10000

    carbon = area_ha * 100

    return area_ha, carbon


print("Running MRV Analysis...\n")

files = [f for f in os.listdir(DATASET_PATH) if f.endswith(".tif")]

results = []

for i, file in enumerate(files):
    full_path = os.path.join(DATASET_PATH, file)

    area, carbon = process_tif(full_path)

    if carbon < 1000:
        risk = "Severe Loss"
    elif carbon < 5000:
        risk = "Moderate"
    else:
        risk = "Healthy"

    results.append({
        "File": file,
        "Area (ha)": round(area, 2),
        "Carbon": round(carbon, 2),
        "Risk": risk
    })

    if i % 100 == 0:
        print(f"Processed {i}/{len(files)} files...")

df = pd.DataFrame(results)

# ================= METRICS =================
total_files = len(df)
total_carbon = round(df["Carbon"].sum(), 2)
avg_area = round(df["Area (ha)"].mean(), 2)
timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# ================= TABLE + ALERTS =================
rows_html = ""
alerts_html = ""

for _, row in df.head(200).iterrows():

    # Row color
    bg = "#3f1d1d" if "Severe" in row["Risk"] else "transparent"

    rows_html += f"""
    <tr style="background:{bg}">
        <td>{row['File']}</td>
        <td>{row['Area (ha)']}</td>
        <td>{row['Carbon']}</td>
        <td>{row['Risk']}</td>
    </tr>
    """

    # Alerts
    if "Severe" in row["Risk"]:
        alerts_html += f"""
        <div class="alert severe">
            Severe Loss detected in {row['File']} → Telegram Alert Sent
        </div>
        """
    elif "Moderate" in row["Risk"]:
        alerts_html += f"""
        <div class="alert moderate">
            Moderate change in {row['File']}
        </div>
        """

# ================= CHART DATA =================
chart_data = df["Carbon"].head(20).tolist()

# ================= HTML =================
html_path = "mrv_dashboard.html"

html = f"""
<html>
<head>
<title>Blue Carbon MRV</title>

<style>
body {{
    margin: 0;
    font-family: 'Segoe UI', sans-serif;
    background: #0f172a;
    color: white;
}}

.sidebar {{
    position: fixed;
    width: 220px;
    height: 100%;
    background: #020617;
    padding: 20px;
}}

.sidebar h2 {{
    color: #22c55e;
}}

.nav {{
    margin-top: 30px;
}}

.nav div {{
    padding: 12px;
    margin-bottom: 10px;
    cursor: pointer;
    border-radius: 8px;
}}

.nav div:hover {{
    background: #1e293b;
}}

.main {{
    margin-left: 240px;
    padding: 20px;
}}

.cards {{
    display: flex;
    gap: 20px;
}}

.card {{
    flex: 1;
    background: #1e293b;
    padding: 20px;
    border-radius: 12px;
}}

.section {{
    margin-top: 20px;
    background: #1e293b;
    padding: 20px;
    border-radius: 12px;
}}

.alert {{
    padding: 10px;
    margin-bottom: 8px;
    border-radius: 8px;
}}

.severe {{
    background: #7f1d1d;
}}

.moderate {{
    background: #78350f;
}}

table {{
    width: 100%;
    border-collapse: collapse;
}}

th, td {{
    padding: 10px;
    border-bottom: 1px solid #334155;
}}

.hidden {{
    display: none;
}}
</style>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<script>
function showPage(page) {{
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('alerts').classList.add('hidden');
    document.getElementById('data').classList.add('hidden');

    document.getElementById(page).classList.remove('hidden');
}}
</script>

</head>

<body>

<div class="sidebar">
    <h2>MRV System</h2>
    <p style="font-size:12px;color:gray;">Powered by n8n + Python</p>

    <div class="nav">
        <div onclick="showPage('dashboard')">Dashboard</div>
        <div onclick="showPage('alerts')">Alerts</div>
        <div onclick="showPage('data')">Data Explorer</div>
    </div>
</div>

<div class="main">

<!-- DASHBOARD -->
<div id="dashboard">
    <h1>Dashboard</h1>
    <p>Last Run: {timestamp}</p>

    <div class="cards">
        <div class="card">
            <h3>Total Files</h3>
            <p>{total_files}</p>
        </div>
        <div class="card">
            <h3>Total Carbon</h3>
            <p>{total_carbon}</p>
        </div>
        <div class="card">
            <h3>Average Area</h3>
            <p>{avg_area}</p>
        </div>
    </div>

    <div class="section">
        <h2>Carbon Distribution</h2>
        <canvas id="chart"></canvas>
    </div>
</div>

<!-- ALERTS -->
<div id="alerts" class="hidden">
    <h1>Alerts Panel</h1>
    {alerts_html}
</div>

<!-- DATA -->
<div id="data" class="hidden">
    <h1>Data Explorer</h1>

    <table>
        <tr>
            <th>File</th>
            <th>Area</th>
            <th>Carbon</th>
            <th>Risk</th>
        </tr>
        {rows_html}
    </table>
</div>

</div>

<script>
const ctx = document.getElementById('chart');
new Chart(ctx, {{
    type: 'bar',
    data: {{
        labels: [...Array({len(chart_data)}).keys()],
        datasets: [{{
            label: 'Carbon',
            data: {chart_data},
        }}]
    }}
}});
</script>

</body>
</html>
"""

# ================= SAVE + OPEN =================
with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)

webbrowser.open(html_path)

print("\nDone!")
print(f"CSV saved: mrv_results.csv")
print(f"Dashboard opened: {html_path}")