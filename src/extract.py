import re
import os

def extract_assets(worker_path):
    with open(worker_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Ekstrak CSS dari dalam string '...<style>...</style>...'
    css_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
    css_content = css_match.group(1).replace('\\n', '\n').replace('\\"', '"').replace('\\t', '\t') if css_match else ''

    # 2. Ekstrak JavaScript dari dalam string '<script>...</script>'
    script_match = re.search(r'<script>(.*?)</script>', content, re.DOTALL)
    js_content = script_match.group(1).replace('\\n', '\n').replace('\\"', '"').replace('\\t', '\t') if script_match else ''

    if not css_match and not script_match:
        print("Tidak ditemukan <style> atau <script> di worker.js")
        return

    # 3. Buat file CSS
    with open('dashboard.css', 'w', encoding='utf-8') as f:
        f.write(css_content)

    # 4. Buat file JS
    with open('dashboard.js', 'w', encoding='utf-8') as f:
        f.write(js_content)

    # 5. Buat HTML baru yang mereferensikan file eksternal
    html = f'''<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AlphaScreener IDX</title>
    <link rel="stylesheet" href="/dashboard.css">
    <link rel="manifest" href="/manifest.json">
</head>
<body>
    <div class="container" id="app"></div>
    <script src="/dashboard.js"></script>
</body>
</html>'''

    with open('dashboard.html', 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"✅ Berhasil: dashboard.css ({len(css_content)} karakter), dashboard.js ({len(js_content)} karakter), dashboard.html")

if __name__ == '__main__':
    extract_assets('worker.js')