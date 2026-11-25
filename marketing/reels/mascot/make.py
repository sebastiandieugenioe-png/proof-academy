NAVY="#1E3A8A"; NAVY2="#152c6b"; GOLD="#E2C27A"; GOLD2="#c9a457"; INK="#1b1f2a"; SHIRT="#F5F2EA"; SHIRT2="#e3ddd0"
def char(skin="#E9B892",skin2="#d49a74",hair="#3a2a22",cap=NAVY,cap2=NAVY2,vest=NAVY,vest2=NAVY2,towel=True,expr="smile",arm="none"):
    s=[]
    # body
    s.append(f'<path d="M90 700 C95 560 150 505 300 500 C450 505 505 560 510 700 Z" fill="{SHIRT}" stroke="{SHIRT2}" stroke-width="3"/>')
    s.append(f'<path d="M150 700 C160 590 200 540 250 525 L300 600 L350 525 C400 540 440 590 450 700 Z" fill="{vest}"/>')
    s.append(f'<path d="M250 525 L300 600 L350 525 L332 520 L300 575 L268 520 Z" fill="{SHIRT2}"/>')
    for y in (620,655,690): s.append(f'<circle cx="300" cy="{y}" r="7" fill="{GOLD}"/>')
    # bar towel on shoulder
    if towel: s.append(f'<path d="M395 512 C430 515 470 535 488 575 L470 640 C455 600 430 560 392 545 Z" fill="{GOLD}"/><path d="M405 522 C440 530 465 552 478 580" stroke="{GOLD2}" stroke-width="5" fill="none"/>')
    # badge
    s.append(f'<rect x="186" y="600" width="58" height="24" rx="5" fill="{GOLD}"/><text x="215" y="617" font-family="Arial" font-weight="700" font-size="15" text-anchor="middle" fill="{NAVY2}">OSC</text>')
    # neck
    s.append(f'<path d="M262 455 L262 515 C280 530 320 530 338 515 L338 455 Z" fill="{skin2}"/>')
    # collar
    s.append(f'<path d="M248 505 L300 545 L282 560 L236 520 Z M352 505 L300 545 L318 560 L364 520 Z" fill="#ffffff"/>')
    # ears
    s.append(f'<ellipse cx="198" cy="350" rx="20" ry="30" fill="{skin2}"/><ellipse cx="402" cy="350" rx="20" ry="30" fill="{skin2}"/>')
    # head
    s.append(f'<path d="M205 300 C205 220 395 220 395 300 L395 380 C395 445 350 480 300 480 C250 480 205 445 205 380 Z" fill="{skin}"/>')
    # hair sides
    s.append(f'<path d="M203 270 C200 310 204 340 212 360 L222 300 Z M397 270 C400 310 396 340 388 360 L378 300 Z" fill="{hair}"/>')
    # flat cap: low wide crown that overhangs a short brim (Irish flat cap), slight tilt
    s.append(f'<g transform="rotate(-4 300 250)">')
    s.append(f'<path d="M176 262 C172 222 214 196 286 190 C360 186 424 204 428 246 C430 262 420 270 404 270 C330 262 250 264 196 276 C182 278 176 272 176 262 Z" fill="{cap}"/>')
    s.append(f'<path d="M196 276 C250 264 330 262 404 270 C398 290 370 300 300 300 C236 300 206 292 196 276 Z" fill="{cap2}"/>')
    s.append(f'<path d="M206 246 C260 232 340 230 410 240" stroke="{cap2}" stroke-width="4" fill="none" opacity=".8"/>')
    s.append(f'<circle cx="300" cy="200" r="7" fill="{cap2}"/>')
    s.append('</g>')
    # brows, eyes
    if expr=="wink":
        s.append(f'<path d="M248 342 C258 334 272 334 282 342" stroke="{INK}" stroke-width="6" fill="none" stroke-linecap="round"/>')
    else:
        s.append(f'<ellipse cx="265" cy="340" rx="10" ry="13" fill="{INK}"/><circle cx="269" cy="335" r="3.5" fill="#fff"/>')
    s.append(f'<ellipse cx="335" cy="340" rx="10" ry="13" fill="{INK}"/><circle cx="339" cy="335" r="3.5" fill="#fff"/>')
    s.append(f'<path d="M246 312 C256 304 272 304 282 310 M318 310 C328 304 344 304 354 312" stroke="{hair}" stroke-width="7" fill="none" stroke-linecap="round"/>')
    # nose
    s.append(f'<path d="M300 352 C296 372 292 382 302 386" stroke="{skin2}" stroke-width="5" fill="none" stroke-linecap="round"/>')
    # thin moustache
    s.append(f'<path d="M262 404 C280 394 296 396 300 402 C304 396 320 394 338 404 C320 402 306 406 300 410 C294 406 280 402 262 404 Z" fill="{hair}"/>')
    # mouth
    if expr in("smile","wink"): s.append(f'<path d="M276 420 C290 434 310 434 324 420" stroke="{INK}" stroke-width="5" fill="none" stroke-linecap="round"/>')
    else: s.append(f'<path d="M280 420 C292 438 308 438 320 420 Z" fill="{INK}"/>')
    # cheeks
    s.append(f'<circle cx="245" cy="385" r="13" fill="#e88f7a" opacity=".35"/><circle cx="355" cy="385" r="13" fill="#e88f7a" opacity=".35"/>')
    return "\n".join(s)
def svg(inner,bg="#ffffff"):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 700" width="600" height="700"><rect width="600" height="700" fill="{bg}"/>{inner}</svg>'
V={
 "A":dict(),
 "B":dict(cap=GOLD,cap2=GOLD2,towel=False,expr="wink"),
 "C":dict(skin="#C98E66",skin2="#ad7552",hair="#1e1714",vest=INK,vest2="#000",cap="#2b2f3a",cap2="#1b1f2a",expr="open"),
}
import os
for k,v in V.items(): open(f"m{k}.svg","w").write(svg(char(**v),"#EEF1F6"))
