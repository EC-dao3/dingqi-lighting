import json
import urllib.request

sql_path = r"C:\Users\Administrator\WorkBuddy\2026-06-29-15-32-00\dingqi-lighting\supabase\migrations\003_seed_data.sql"
with open(sql_path, 'r', encoding='utf-8') as f:
    sql = f.read()

url = "https://api.supabase.com/v1/projects/yhfjnvpdaxqoyltsbzhs/database/query"
headers = {
    "Authorization": "Bearer sbp_6dc52cf921bbfb185b17c7c4cad8950aef8f59fd",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
data = json.dumps({"query": sql}).encode('utf-8')

req = urllib.request.Request(url, data=data, headers=headers, method='POST')
try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        print(resp.status)
        print(resp.read().decode('utf-8')[:500])
except Exception as e:
    print(f"ERROR: {e}")
    if hasattr(e, 'read'):
        try:
            print(e.read().decode('utf-8')[:1000])
        except:
            pass
