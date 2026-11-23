#!/usr/bin/env python3
"""Render neutral product relationships through the bound native release.

Reuse Base's neutral workspace/physics fixture rather than copy its assembly.
The retained temporary workspace receives this world's neutral authored page.
No preview server, publication, configured output or production source is changed.
"""
import argparse,json,re,subprocess,sys
from pathlib import Path

THEME=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--gazette',required=True)
p.add_argument('--resource-bindings',type=Path,required=True)
a=p.parse_args()
base=THEME.parent/'gazette-theme-base/fixtures/reading.py'
r=subprocess.run([sys.executable,str(base),'--gazette',a.gazette,'--theme',str(THEME),'--resource-bindings',str(a.resource_bindings),'--keep'],capture_output=True,text=True)
if r.returncode:raise RuntimeError('Base fixture failed: '+(r.stdout+r.stderr)[-1500:])
m=re.search(r'fixture retained: (.+)',r.stdout);assert m
work=Path(m[1]);page=work/'content/relationships.landing.yaml'
original=(THEME/'fixtures/relationships.landing.yaml').read_text();page.write_text(original)
source=(work/'workspace.toml').read_text()

def run(args):
 return subprocess.run([a.gazette,*args],input=source,text=True,capture_output=True)
args=['render-site','--local','--site','site:reading','--model-output','model.json','--graph-output','graph/index.html','--output-parent',str(work/'stages')]
r=run(args)
if r.returncode:raise RuntimeError('Native render failed: '+r.stderr[-1500:])
result=json.loads(r.stdout);output=Path(result['directory']);files=list(output.rglob('product-relations/index.html'));assert len(files)==1
text=files[0].read_text()
for word in ['product-handoff','product-use','product-perspective']:assert word in text,word
assert text.count('class="project-explanation"')==3
assert 'class="product-explanation"' not in text
assert 'Conditions &lt;and&gt; context' in text
assert text.count('<h1')==1
assert text.index('A sensor report')<text.index('Maintenance review')<text.index('Accept the repair work')
mutations={
 'unknown_handoff_field':original.replace('review: {title: Maintenance review','unknown: Unexpected\n      review: {title: Maintenance review'),
 'missing_use_record':original.replace('      record: {title: A shared account, body: Identify the selected version and the attempted operation.}\n',''),
 'untyped_input':original.replace('body: The instrument supplies an observation to examine.','body: [An unexpected list]')}
try:
 for name,bad in mutations.items():
  page.write_text(bad);v=run(['render-site','--local','--site','site:reading']);assert v.returncode!=0,name
finally:page.write_text(original)
again=run(args);assert again.returncode==0,again.stderr
assert result['inventory']['identity']==json.loads(again.stdout)['inventory']['identity']
print('relationships fixture passed:',files[0])
