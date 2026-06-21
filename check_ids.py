import re
with open('extension/popup/popup.js', 'r', encoding='utf-8') as f:
    js_content = f.read()
with open('extension/popup/popup.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

match = re.search(r'const els = \{(.*?)\};', js_content, re.DOTALL)
if match:
    els_block = match.group(1)
    ids = re.findall(r'\$\(\'(#.*?)\'\)', els_block)
    for id_selector in ids:
        id_val = id_selector[1:]
        if f'id="{id_val}"' not in html_content and f"id='{id_val}'" not in html_content:
            print('Missing id:', id_val)
