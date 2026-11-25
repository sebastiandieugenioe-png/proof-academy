import sys
sys.path.insert(0,'.')
from make import char, SHIRT, SHIRT2, INK
SKIN="#C98E66"; SKIN2="#ad7552"; HAIR="#1e1714"
BASE=dict(skin=SKIN,skin2=SKIN2,hair=HAIR,vest=INK,vest2="#000",cap="#2b2f3a",cap2="#1b1f2a")
def limb(a,b,c,hand,extra=""):
    (x1,y1),(x2,y2),(x3,y3)=a,b,c
    return (f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{SHIRT2}" stroke-width="92" stroke-linecap="round"/>'
            f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{SHIRT}" stroke-width="84" stroke-linecap="round"/>'
            f'<path d="M{x2} {y2} L{x3} {y3}" stroke="{SKIN2}" stroke-width="52" stroke-linecap="round"/>'
            f'<path d="M{x2} {y2} L{x3} {y3}" stroke="{SKIN}" stroke-width="46" stroke-linecap="round"/>'
            +hand+extra)
def palm(x,y,r=36): return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{SKIN}" stroke="{SKIN2}" stroke-width="3"/>'
def finger(x1,y1,x2,y2,w=20): return f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{SKIN}" stroke-width="{w}" stroke-linecap="round"/>'
L=(240,610); R=(560,610)
POSES={
 "idle":"",
 "point":limb(R,(680,560),(670,430),palm(668,418)+finger(666,405,676,345)),
 "open":limb(L,(140,680),(85,590),f'<ellipse cx="80" cy="578" rx="40" ry="28" fill="{SKIN}" stroke="{SKIN2}" stroke-width="3"/>')+limb(R,(660,680),(715,590),f'<ellipse cx="720" cy="578" rx="40" ry="28" fill="{SKIN}" stroke="{SKIN2}" stroke-width="3"/>'),
 "thumbs":limb(R,(660,720),(575,620),palm(566,610)+finger(560,590,560,540,22)),
 "think":limb(R,(620,740),(460,575),palm(445,560,34)+finger(430,548,422,515,16)),
}
def finn(pose="idle",mouth="smile",bg=None,w=800,h=760):
    body=f'<g transform="translate(100,60)">{char(expr=mouth,**BASE)}</g>'
    bgr=f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{bgr}{body}{POSES[pose]}</svg>'
if __name__=="__main__":
    for p in POSES:
        for m in ("smile","open"):
            open(f"finn_{p}_{m}.svg","w").write(finn(p,m))
    open("preview.html","w").write('<html><body style="margin:0;background:#EEF1F6;display:grid;grid-template-columns:repeat(5,400px)">'+''.join(f'<div style="text-align:center;font:20px Arial"><img src="finn_{p}_smile.svg" width="400"><br>{p}</div>' for p in POSES)+'</body></html>')
