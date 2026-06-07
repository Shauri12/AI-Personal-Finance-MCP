import urllib.request, json

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzgwOTA5ODg2fQ.OpYAlran4E98wbf9cb-i0oFpDAtQdB_EV93Ra-qG_Ng"
req = urllib.request.Request(
    'http://localhost:8000/api/finance/opportunities',
    headers={'Authorization': f'Bearer {TOKEN}'}
)
res = urllib.request.urlopen(req)
data = json.loads(res.read().decode('utf-8'))
print(f"Total: {data['count']} opportunities\n")
for o in data['opportunities']:
    name = o['name'][:50]
    print(f"  [{o['source_website']:<15}] {name:<50}  {o['price']:<22}  {o['change_pct']:+.2f}%")
