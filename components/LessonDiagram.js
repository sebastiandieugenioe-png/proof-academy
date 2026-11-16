// Original explanatory diagrams for lessons (our own SVG — no licensing issues).
// Each diagram only shows facts that the lesson itself teaches (rule: what we show
// must be taught in the lesson). Keyed by lesson slug; lessons without a diagram
// render nothing. Server- and client-safe (no hooks).
//
// Design: 400-unit-wide viewBox so text stays readable on phones; slate ink,
// blue for process, amber for liquid/wood, green = keep, red = discard.

const C = {
  ink: '#0f172a', mute: '#64748b', line: '#cbd5e1', paper: '#f8fafc',
  blue: '#1d4ed8', blueBg: '#eff6ff', blueLine: '#93c5fd',
  amber: '#b45309', amberBg: '#fef3c7', amberLine: '#f59e0b',
  green: '#047857', greenBg: '#ecfdf5', greenLine: '#6ee7b7',
  red: '#b91c1c', redBg: '#fef2f2', redLine: '#fca5a5',
}

// ---------- primitives ----------
const Txt = ({ x, y, children, size = 13, weight = 500, fill = C.ink, anchor = 'middle', italic }) => (
  <text x={x} y={y} fontSize={size} fontWeight={weight} fill={fill} textAnchor={anchor} fontStyle={italic ? 'italic' : 'normal'}>{children}</text>
)
// Multi-line text: lines = ['a', 'b'], lh = line height
const Lines = ({ x, y, lines, size = 12, lh = 15, weight = 400, fill = C.ink, anchor = 'middle' }) => (
  <text x={x} y={y} fontSize={size} fontWeight={weight} fill={fill} textAnchor={anchor}>
    {lines.map((l, i) => <tspan key={i} x={x} dy={i === 0 ? 0 : lh}>{l}</tspan>)}
  </text>
)
const Box = ({ x, y, w, h, fill = C.paper, stroke = C.line, r = 10, dash }) => (
  <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={stroke} strokeWidth={1.5} strokeDasharray={dash ? '5 4' : undefined} />
)
const Arrow = ({ x1, y1, x2, y2, color = C.mute }) => (
  <g>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.8} markerEnd={`url(#osc-arrow-${color.slice(1)})`} />
  </g>
)
const Defs = () => (
  <defs>
    {[C.mute, C.blue, C.amber, C.green, C.red].map((c) => (
      <marker key={c} id={`osc-arrow-${c.slice(1)}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={c} />
      </marker>
    ))}
  </defs>
)
// Labeled card: title + lines
const Card = ({ x, y, w, h, title, lines = [], tone = 'paper', titleSize = 13, lineSize = 11.5 }) => {
  const t = {
    paper: [C.paper, C.line, C.ink], blue: [C.blueBg, C.blueLine, C.blue], amber: [C.amberBg, C.amberLine, C.amber],
    green: [C.greenBg, C.greenLine, C.green], red: [C.redBg, C.redLine, C.red],
  }[tone]
  return (
    <g>
      <Box x={x} y={y} w={w} h={h} fill={t[0]} stroke={t[1]} />
      <Txt x={x + w / 2} y={y + 20} size={titleSize} weight={700} fill={t[2]}>{title}</Txt>
      {lines.length > 0 && <Lines x={x + w / 2} y={y + 38} lines={lines} size={lineSize} lh={14} fill={C.ink} />}
    </g>
  )
}

// ---------- diagrams ----------
const D = {}

// 1. ABV ↔ proof
D['what-is-alcohol'] = {
  title: 'ABV and US proof: proof = ABV × 2',
  h: 220,
  body: () => {
    const x0 = 30, x1 = 370, s = (v) => x0 + ((x1 - x0) * v) / 100
    return (
      <g>
        <Txt x={200} y={26} size={12} fill={C.mute} weight={600}>ABV — % of the liquid that is pure ethanol (20 °C)</Txt>
        <rect x={x0} y={40} width={x1 - x0} height={18} rx={9} fill={C.blueBg} stroke={C.blueLine} />
        <rect x={x0} y={40} width={s(40) - x0} height={18} rx={9} fill={C.blue} opacity={0.85} />
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={s(v)} y1={60} x2={s(v)} y2={66} stroke={C.mute} />
            <Txt x={s(v)} y={78} size={11} fill={C.mute}>{v}%</Txt>
          </g>
        ))}
        <Card x={20} y={96} w={170} h={58} title="40% ABV" lines={['= 80 proof', '40 mL ethanol per 100 mL']} tone="blue" />
        <Card x={210} y={96} w={170} h={58} title="43% ABV" lines={['= 86 proof']} tone="blue" />
        <Box x={60} y={170} w={280} h={38} fill={C.paper} />
        <Txt x={200} y={194} size={14} weight={700}>proof = ABV × 2 · ABV = proof ÷ 2</Txt>
      </g>
    )
  },
}

// 2. Fermentation
D['fermentation-basics'] = {
  title: 'Fermentation: yeast turns sugar into alcohol',
  h: 330,
  body: () => (
    <g>
      <Card x={10} y={14} w={110} h={52} title="Sugar" lines={['raw material']} tone="amber" />
      <Txt x={135} y={46} size={20} weight={700} fill={C.mute}>+</Txt>
      <Card x={150} y={14} w={100} h={52} title="Yeast" lines={['S. cerevisiae']} tone="blue" />
      <Arrow x1={256} y1={40} x2={282} y2={40} color={C.blue} />
      <Card x={286} y={8} w={104} h={64} title="Ethanol" lines={['+ CO₂', '+ flavour']} tone="green" />
      <Txt x={200} y={100} size={12} weight={700} fill={C.mute}>WHERE THE SUGAR COMES FROM</Txt>
      {[
        ['Grains', 'barley, corn, rye, wheat', 'whisky · beer · vodka · gin'],
        ['Grapes & fruit', '', 'wine · brandy'],
        ['Sugarcane / molasses', '', 'rum'],
        ['Agave', '', 'tequila · mezcal'],
      ].map(([a, b, c], i) => (
        <g key={a}>
          <Box x={10} y={112 + i * 44} w={168} h={36} fill={C.amberBg} stroke={C.amberLine} />
          <Txt x={94} y={b ? 127 + i * 44 : 135 + i * 44} size={12.5} weight={700} fill={C.amber}>{a}</Txt>
          {b && <Txt x={94} y={141 + i * 44} size={10.5} fill={C.ink}>{b}</Txt>}
          <Arrow x1={182} y1={130 + i * 44} x2={206} y2={130 + i * 44} />
          <Box x={210} y={112 + i * 44} w={180} h={36} fill={C.paper} />
          <Txt x={300} y={135 + i * 44} size={11} weight={600}>{c}</Txt>
        </g>
      ))}
      <Box x={10} y={292} w={380} h={30} fill={C.blueBg} stroke={C.blueLine} />
      <Txt x={200} y={312} size={11.5} weight={600} fill={C.blue}>Yeast stops at ~12–16% ABV → spirits need distillation</Txt>
    </g>
  ),
}

// 3. Distillation (pot still + cuts)
D['distillation-explained'] = {
  title: 'Pot still: ethanol boils first, the distiller makes the cut',
  h: 360,
  body: () => (
    <g>
      {/* still: neck + lyne arm, then the pot */}
      <path d="M95,150 L95,82 Q95,60 117,60 L190,60" fill="none" stroke={C.amber} strokeWidth={3} />
      <ellipse cx={95} cy={190} rx={58} ry={46} fill={C.amberBg} stroke={C.amber} strokeWidth={3} />
      <Txt x={95} y={188} size={11.5} weight={700} fill={C.amber}>Wash</Txt>
      <Txt x={95} y={203} size={10.5} fill={C.ink}>heated gently</Txt>
      {[70, 95, 120].map((x) => <path key={x} d={`M${x - 8},258 q8,-14 16,0`} fill="none" stroke={C.red} strokeWidth={2} />)}
      <Txt x={95} y={276} size={10.5} fill={C.red} weight={600}>heat</Txt>
      <Txt x={140} y={52} size={10.5} fill={C.mute}>vapour</Txt>
      {/* condenser */}
      <Box x={190} y={50} w={46} h={110} fill={C.blueBg} stroke={C.blueLine} />
      <path d="M190,60 L236,75 L190,90 L236,105 L190,120 L236,135 L213,150 L213,172" fill="none" stroke={C.amber} strokeWidth={2.5} />
      <Txt x={213} y={44} size={10.5} weight={700} fill={C.blue}>condenser</Txt>
      <Card x={262} y={48} w={128} h={76} title="Boiling points" lines={['Ethanol 78.4 °C', 'Water 100 °C', '→ ethanol rises first']} tone="paper" titleSize={12} lineSize={11} />
      <Arrow x1={213} y1={174} x2={213} y2={200} color={C.amber} />
      <Txt x={278} y={192} size={10.5} fill={C.mute}>liquid spirit</Txt>
      {/* cuts */}
      <Txt x={200} y={300} size={11.5} weight={700} fill={C.mute}>THE RUN IS CUT INTO THREE PARTS</Txt>
      <Card x={150} y={206} w={78} h={78} title="Heads" lines={['first vapours,', 'harsh', '→ discard']} tone="red" titleSize={12} lineSize={10} />
      <Card x={233} y={206} w={78} h={78} title="Hearts" lines={['clean core', '', '→ keep']} tone="green" titleSize={12} lineSize={10} />
      <Card x={316} y={206} w={78} h={78} title="Tails" lines={['oily, weak', '→ discard', 'or recycle']} tone="red" titleSize={12} lineSize={10} />
      <Txt x={200} y={322} size={10.5} fill={C.mute}>Heads are rich in acetaldehyde and ethyl acetate</Txt>
      <Txt x={200} y={342} size={10.5} fill={C.mute}>Column stills run continuously and reach ~95% ABV</Txt>
    </g>
  ),
}

// 4. Aging
D['aging-and-maturation'] = {
  title: 'Inside the barrel: three things happen',
  h: 300,
  body: () => (
    <g>
      {/* barrel */}
      <ellipse cx={200} cy={150} rx={78} ry={96} fill={C.amberBg} stroke={C.amber} strokeWidth={3} />
      {[-48, 0, 48].map((dy) => <path key={dy} d={`M128,${150 + dy} Q200,${158 + dy} 272,${150 + dy}`} fill="none" stroke={C.amber} strokeWidth={2} opacity={0.7} />)}
      <Txt x={200} y={146} size={13} weight={700} fill={C.amber}>Oak</Txt>
      <Txt x={200} y={162} size={11} fill={C.ink}>spirit inside</Txt>
      {/* extraction */}
      <Card x={6} y={20} w={118} h={84} title="1 Extraction" lines={['vanillin, lactones', '(coconut), tannins,', 'colour → spirit']} tone="amber" titleSize={12.5} lineSize={10.5} />
      <Arrow x1={124} y1={80} x2={146} y2={100} color={C.amber} />
      {/* oxidation */}
      <Card x={276} y={20} w={118} h={84} title="2 Oxidation" lines={['O₂ seeps in:', 'mellows, adds dried', 'fruit, nuts, leather']} tone="blue" titleSize={12.5} lineSize={10.5} />
      <Arrow x1={276} y1={80} x2={256} y2={100} color={C.blue} />
      {/* evaporation */}
      <Card x={100} y={254} w={200} h={40} title="" tone="paper" />
      <Txt x={200} y={270} size={12} weight={700}>3 Evaporation — angel’s share</Txt>
      <Txt x={200} y={286} size={10.5} fill={C.ink}>~2% a year in Scotland, more in hot climates</Txt>
      <Arrow x1={200} y1={246} x2={200} y2={252} />
      <Card x={6} y={172} w={104} h={62} title="New oak" lines={['intense: vanilla,', 'spice, deep colour']} tone="paper" titleSize={11.5} lineSize={10} />
      <Card x={290} y={172} w={104} h={62} title="Used casks" lines={['gentler: the base', 'spirit shows']} tone="paper" titleSize={11.5} lineSize={10} />
    </g>
  ),
}

// 5. Reading a label (fictional label, no real brand)
D['reading-spirit-labels'] = {
  title: 'How to read a spirit label (example label)',
  h: 350,
  body: () => (
    <g>
      <path d="M140,20 h120 v28 q18,10 18,40 v220 q0,10 -10,10 h-136 q-10,0 -10,-10 v-220 q0,-30 18,-40 z" fill={C.amberBg} stroke={C.amber} strokeWidth={2.5} />
      <Box x={128} y={110} w={144} h={170} fill="#fffdf7" stroke={C.amberLine} r={6} />
      <Txt x={200} y={132} size={10} fill={C.mute} weight={600}>EXAMPLE DISTILLERY</Txt>
      <Txt x={200} y={156} size={14} weight={800}>Scotch Whisky</Txt>
      <Txt x={200} y={176} size={11} fill={C.ink}>Single Malt</Txt>
      <Txt x={200} y={204} size={18} weight={800} fill={C.amber}>12</Txt>
      <Txt x={200} y={219} size={10} fill={C.ink}>YEARS OLD</Txt>
      <Txt x={200} y={244} size={10} fill={C.ink}>Product of Scotland</Txt>
      <Txt x={200} y={266} size={11} weight={700}>70 cl · 46% vol</Txt>
      {/* callouts left */}
      <Card x={4} y={130} w={106} h={58} title="Category" lines={['legally defined:', 'raw material & rules']} tone="blue" titleSize={11.5} lineSize={9.8} />
      <Arrow x1={110} y1={156} x2={150} y2={156} color={C.blue} />
      <Card x={4} y={200} w={106} h={58} title="Age statement" lines={['= youngest spirit', 'in the bottle']} tone="blue" titleSize={11.5} lineSize={9.8} />
      <Arrow x1={110} y1={214} x2={182} y2={208} color={C.blue} />
      {/* callouts right */}
      <Card x={290} y={150} w={106} h={58} title="Single malt" lines={['malted barley +', 'one distillery']} tone="blue" titleSize={11.5} lineSize={9.8} />
      <Arrow x1={290} y1={174} x2={238} y2={174} color={C.blue} />
      <Card x={290} y={220} w={106} h={58} title="Origin + ABV" lines={['protected origin;', 'strength in %']} tone="blue" titleSize={11.5} lineSize={9.8} />
      <Arrow x1={290} y1={250} x2={258} y2={256} color={C.blue} />
      <Txt x={200} y={344} size={10.5} fill={C.mute}>“Small batch”, “reserve”, “premium”: usually no legal meaning</Txt>
    </g>
  ),
}

// 6. What is whiskey
D['what-is-whiskey'] = {
  title: 'Whiskey in four steps — and four classic styles',
  h: 310,
  body: () => (
    <g>
      {[
        ['Grain mash', 'barley, corn,', 'rye, wheat'],
        ['Ferment', 'yeast makes', 'alcohol'],
        ['Distil', 'below ~95%', 'ABV'],
        ['Age in oak', 'then bottle', 'at ≥ 40%'],
      ].map(([t, a, b], i) => (
        <g key={t}>
          <Card x={6 + i * 99} y={14} w={88} h={70} title={t} lines={[a, b]} tone={i === 3 ? 'amber' : 'blue'} titleSize={11.5} lineSize={10.5} />
          {i < 3 && <Arrow x1={96 + i * 99} y1={49} x2={104 + i * 99} y2={49} color={C.blue} />}
        </g>
      ))}
      <Txt x={200} y={116} size={11.5} weight={700} fill={C.mute}>FOUR BEGINNER STYLES</Txt>
      {[
        ['Scotch', '“whisky”', 'Scotland · often malted', 'barley · can be smoky'],
        ['Irish', '“whiskey”', 'Ireland · usually triple-', 'distilled · smooth'],
        ['Bourbon', '“whiskey”', 'USA · corn-forward ·', 'vanilla, caramel'],
        ['Rye', '“whiskey”', 'USA/Canada · rye-forward', '· spicier, drier'],
      ].map(([t, sp, a, b], i) => {
        const x = 6 + (i % 2) * 196, y = 128 + Math.floor(i / 2) * 88
        return (
          <g key={t}>
            <Box x={x} y={y} w={190} h={78} fill={C.amberBg} stroke={C.amberLine} />
            <Txt x={x + 95} y={y + 22} size={14} weight={800} fill={C.amber}>{t}</Txt>
            <Txt x={x + 95} y={y + 38} size={10.5} fill={C.mute} italic>{sp}</Txt>
            <Lines x={x + 95} y={y + 55} lines={[a, b]} size={10.5} lh={13} />
          </g>
        )
      })}
    </g>
  ),
}

// 7. Irish whiskey — Single Pot Still mash + triple distillation
D['irish-whiskey'] = {
  title: 'Irish Single Pot Still: the mash and the three distillations',
  h: 300,
  body: () => (
    <g>
      <Txt x={200} y={24} size={11.5} weight={700} fill={C.mute}>SINGLE POT STILL MASH (BY LAW)</Txt>
      <rect x={10} y={36} width={114} height={40} fill={C.amber} rx={6} />
      <rect x={124} y={36} width={114} height={40} fill={C.amberLine} />
      <rect x={238} y={36} width={133} height={40} fill={C.amberBg} stroke={C.amberLine} />
      <rect x={371} y={36} width={19} height={40} fill={C.line} rx={4} />
      <Txt x={67} y={61} size={11} weight={700} fill="#fff">≥30% malted</Txt>
      <Txt x={181} y={61} size={11} weight={700} fill={C.ink}>≥30% unmalted</Txt>
      <Txt x={304} y={61} size={10.5} fill={C.ink}>rest: either barley</Txt>
      <Txt x={390} y={94} size={10} fill={C.mute} anchor="end">grey: up to 5% other cereals</Txt>
      <Txt x={200} y={116} size={10.5} fill={C.mute}>…distilled in pot stills at one distillery</Txt>
      <Txt x={200} y={146} size={11.5} weight={700} fill={C.mute}>TRIPLE DISTILLATION (MOST IRISH WHISKEY)</Txt>
      {['1st still', '2nd still', '3rd still'].map((t, i) => (
        <g key={t}>
          <path d={`M${36 + i * 120},230 q0,-50 38,-58 v-14 h8 v14 q38,8 38,58 z`} fill={C.amberBg} stroke={C.amber} strokeWidth={2} />
          <Txt x={78 + i * 120} y={220} size={11} weight={700} fill={C.amber}>{t}</Txt>
          {i < 2 && <Arrow x1={118 + i * 120} y1={200} x2={150 + i * 120} y2={200} color={C.amber} />}
        </g>
      ))}
      <Box x={10} y={248} w={380} h={40} fill={C.greenBg} stroke={C.greenLine} />
      <Txt x={200} y={273} size={11.5} weight={600} fill={C.green}>Each pass strips heavier compounds → smooth, light</Txt>
    </g>
  ),
}

// 8. Scotch regions (schematic, not a map)
D['scotch-whisky'] = {
  title: 'Scotch: five protected regions (+ the Islands, legally Highland)',
  h: 300,
  body: () => {
    const regions = [
      ['Speyside', 'fruity, elegant', 'blue'],
      ['Highland', 'wide range, often richer', 'blue'],
      ['Lowland', 'light, floral', 'blue'],
      ['Islay', 'smoky, peaty, medicinal', 'amber'],
      ['Campbeltown', 'briny, oily', 'blue'],
    ]
    return (
      <g>
        {regions.map(([n, s, tone], i) => {
          const x = 6 + (i % 2) * 196, y = 12 + Math.floor(i / 2) * 66
          return <Card key={n} x={x} y={y} w={190} h={56} title={n} lines={[s]} tone={tone} titleSize={13} lineSize={11} />
        })}
        <g>
          <Box x={202} y={144} w={190} h={56} fill="#fff" stroke={C.blueLine} dash />
          <Txt x={297} y={164} size={13} weight={700} fill={C.blue}>Islands</Txt>
          <Lines x={297} y={182} lines={['varied, often coastal', '(legally part of Highland)']} size={10} lh={12} />
        </g>
        <Box x={6} y={214} w={386} h={78} fill={C.paper} />
        <Txt x={199} y={236} size={12} weight={700}>Scotch by law</Txt>
        <Lines x={199} y={254} lines={['made & matured in Scotland · ≥3 years in oak (≤700 L)', '≥40% ABV · only water and caramel (E150a) may be added']} size={10.5} lh={15} />
      </g>
    )
  },
}

// 9. Bourbon — the strength ladder
D['bourbon'] = {
  title: 'Bourbon by US law: the rules in order',
  h: 320,
  body: () => {
    const steps = [
      ['Mash', '≥ 51% corn', 'rest: rye (spice) or wheat (soft)', 'amber'],
      ['Distil', '≤ 80% ABV', '160 proof', 'blue'],
      ['Into barrel', '≤ 62.5% ABV', '125 proof', 'blue'],
      ['Age', 'new, charred oak', 'Straight: ≥ 2 years', 'amber'],
      ['Bottle', '≥ 40% ABV', 'no colouring or flavouring', 'green'],
    ]
    return (
      <g>
        {steps.map(([t, a, b, tone], i) => (
          <g key={t}>
            <Box x={20} y={10 + i * 60} w={360} h={48} fill={{ amber: C.amberBg, blue: C.blueBg, green: C.greenBg }[tone]} stroke={{ amber: C.amberLine, blue: C.blueLine, green: C.greenLine }[tone]} />
            <circle cx={46} cy={34 + i * 60} r={13} fill={{ amber: C.amber, blue: C.blue, green: C.green }[tone]} />
            <Txt x={46} y={39 + i * 60} size={12} weight={800} fill="#fff">{i + 1}</Txt>
            <Txt x={70} y={30 + i * 60} size={12} weight={700} anchor="start">{t}</Txt>
            <Txt x={70} y={46 + i * 60} size={10.5} fill={C.mute} anchor="start">{b}</Txt>
            <Txt x={368} y={39 + i * 60} size={14} weight={800} anchor="end" fill={{ amber: C.amber, blue: C.blue, green: C.green }[tone]}>{a}</Txt>
          </g>
        ))}
        <Txt x={200} y={312} size={10.5} fill={C.mute}>Made anywhere in the USA — not only Kentucky</Txt>
      </g>
    )
  },
}

// 10. Rye — how much rye
D['rye-whiskey'] = {
  title: 'Rye whiskey: the more rye, the drier and spicier',
  h: 250,
  body: () => (
    <g>
      <Txt x={200} y={22} size={11.5} weight={700} fill={C.mute}>SHARE OF RYE IN THE MASH (US)</Txt>
      {[
        ['“Barely legal” rye', 51, 'closer to bourbon'],
        ['High-rye whiskey', 95, 'much more assertive'],
      ].map(([t, v, s], i) => (
        <g key={t}>
          <Txt x={10} y={52 + i * 62} size={12} weight={700} anchor="start">{t}</Txt>
          <rect x={10} y={60 + i * 62} width={380} height={22} rx={6} fill={C.paper} stroke={C.line} />
          <rect x={10} y={60 + i * 62} width={(380 * v) / 100} height={22} rx={6} fill={C.amber} opacity={0.85} />
          <Txt x={18} y={76 + i * 62} size={11.5} weight={800} fill="#fff" anchor="start">{v}% rye</Txt>
          <Txt x={390} y={52 + i * 62} size={10.5} fill={C.mute} anchor="end">{s}</Txt>
        </g>
      ))}
      <line x1={10 + 380 * 0.51} y1={36} x2={10 + 380 * 0.51} y2={156} stroke={C.red} strokeDasharray="4 3" />
      <Txt x={10 + 380 * 0.51} y={170} size={10.5} fill={C.red} weight={600}>legal minimum 51%</Txt>
      <Box x={10} y={186} w={380} h={54} fill={C.blueBg} stroke={C.blueLine} />
      <Txt x={200} y={207} size={12} weight={700} fill={C.blue}>Classic rye cocktails</Txt>
      <Txt x={200} y={226} size={11.5}>Old Fashioned · Manhattan · Sazerac</Txt>
    </g>
  ),
}

// 11. What is beer — brewing flow
D['what-is-beer'] = {
  title: 'From grain to beer',
  h: 382,
  body: () => {
    const steps = [
      ['Mash', 'malted grain + hot water:', 'starch → sugars', 'amber'],
      ['Wort', 'the sweet liquid', '', 'amber'],
      ['Boil with hops', 'bitterness, flavour, aroma', '+ natural preservative', 'green'],
      ['Cool + add yeast', '', '', 'blue'],
      ['Ferment', 'yeast eats sugar →', 'alcohol + CO₂ = beer', 'blue'],
    ]
    // stack cards with a constant 26-unit gap for the arrows
    let y = 6
    const placed = steps.map(([t, a, b, tone]) => {
      const h = b ? 62 : a ? 48 : 32
      const row = { t, a, b, tone, y, h }
      y += h + 26
      return row
    })
    return (
      <g>
        {placed.map(({ t, a, b, tone, y, h }, i) => (
          <g key={t}>
            <Card x={70} y={y} w={260} h={h} title={t} lines={b ? [a, b] : a ? [a] : []} tone={tone} titleSize={12.5} lineSize={10.5} />
            {i < placed.length - 1 && <Arrow x1={200} y1={y + h + 3} x2={200} y2={y + h + 23} />}
          </g>
        ))}
      </g>
    )
  },
}

// 12. Beer ingredients
D['beer-ingredients'] = {
  title: 'The four ingredients and what each one does',
  h: 270,
  body: () => (
    <g>
      <Card x={6} y={8} w={190} h={120} title="Water" lines={['90–95% of the beer', 'its minerals shaped', 'regional styles', '(soft Pilsen, hard Burton)']} tone="blue" />
      <Card x={204} y={8} w={190} h={120} title="Malt" lines={['germinated, kilned grain', 'fermentable sugars,', 'colour, body, flavour', 'base + specialty malts']} tone="amber" />
      <Card x={6} y={138} w={190} h={124} title="Hops" lines={['flowers of Humulus lupulus', 'alpha acids → bitterness', 'oils → aroma', 'natural preservative']} tone="green" />
      <Card x={204} y={138} w={190} h={124} title="Yeast" lines={['sugar → alcohol + CO₂', 'Ale: S. cerevisiae', '15–24 °C, fruity, spicy', 'Lager: S. pastorianus 7–13 °C']} tone="paper" />
    </g>
  ),
}

// 13. Ale vs lager
D['ale-vs-lager'] = {
  title: 'Ale vs lager: it’s the yeast and the temperature',
  h: 330,
  body: () => {
    const Tank = ({ x, top, label, tone }) => (
      <g>
        <path d={`M${x},60 h120 v150 q0,30 -60,40 q-60,-10 -60,-40 z`} fill={tone === 'ale' ? C.amberBg : C.blueBg} stroke={tone === 'ale' ? C.amber : C.blue} strokeWidth={2.5} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle key={i} cx={x + 18 + i * 17} cy={top ? 76 + (i % 2) * 8 : 214 - (i % 2) * 8} r={6} fill={tone === 'ale' ? C.amber : C.blue} opacity={0.75} />
        ))}
        <Txt x={x + 60} y={140} size={11} weight={700} fill={tone === 'ale' ? C.amber : C.blue}>{label}</Txt>
      </g>
    )
    return (
      <g>
        <Txt x={100} y={28} size={16} weight={800} fill={C.amber}>ALE</Txt>
        <Txt x={300} y={28} size={16} weight={800} fill={C.blue}>LAGER</Txt>
        <Txt x={100} y={46} size={10.5} fill={C.mute}>S. cerevisiae</Txt>
        <Txt x={300} y={46} size={10.5} fill={C.mute}>S. pastorianus</Txt>
        <Tank x={40} top label="yeast rises" tone="ale" />
        <Tank x={240} label="yeast sinks" tone="lager" />
        <Card x={10} y={262} w={180} h={62} title="15–24 °C · fast" lines={['fruity esters, spicy', 'phenols · ~1 week']} tone="amber" titleSize={12} lineSize={10.5} />
        <Card x={210} y={262} w={180} h={62} title="7–13 °C · slow" lines={['clean, crisp · then', 'lagered near 0 °C']} tone="blue" titleSize={12} lineSize={10.5} />
      </g>
    )
  },
}

// 14. IBU vs ABV ranges
D['understanding-ibu-and-abv'] = {
  title: 'Typical bitterness (IBU) and strength (ABV) by style',
  h: 320,
  body: () => {
    const X0 = 46, X1 = 388, Y0 = 262, Y1 = 22
    const sx = (v) => X0 + ((X1 - X0) * v) / 80
    const sy = (v) => Y0 - ((Y0 - Y1) * (v - 3)) / 6
    const styles = [
      ['Light lager', 8, 12, 4, 5, C.blue],
      ['Pale ale', 30, 50, 4.5, 6, C.green],
      ['IPA', 40, 70, 5.5, 7.5, C.amber],
      ['Stout', 25, 60, 4, 8, C.ink],
    ]
    return (
      <g>
        <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke={C.mute} />
        <line x1={X0} y1={Y0} x2={X0} y2={Y1} stroke={C.mute} />
        {[0, 20, 40, 60, 80].map((v) => <Txt key={v} x={sx(v)} y={Y0 + 16} size={10} fill={C.mute}>{v}</Txt>)}
        {[3, 5, 7, 9].map((v) => <Txt key={v} x={X0 - 8} y={sy(v) + 4} size={10} fill={C.mute} anchor="end">{v}%</Txt>)}
        <Txt x={(X0 + X1) / 2} y={Y0 + 34} size={11} weight={700} fill={C.mute}>IBU (bitterness) →</Txt>
        <text x={14} y={(Y0 + Y1) / 2} fontSize={11} fontWeight={700} fill={C.mute} textAnchor="middle" transform={`rotate(-90 14 ${(Y0 + Y1) / 2})`}>ABV →</text>
        {styles.map(([n, i0, i1, a0, a1, col]) => (
          <g key={n}>
            <rect x={sx(i0)} y={sy(a1)} width={sx(i1) - sx(i0)} height={sy(a0) - sy(a1)} rx={6} fill={col} opacity={0.14} stroke={col} strokeWidth={1.5} />
            <Txt x={(sx(i0) + sx(i1)) / 2} y={n === 'Stout' ? sy(a1) + 14 : sy(a0) - 6} size={11} weight={700} fill={col}>{n}</Txt>
          </g>
        ))}
        <Txt x={200} y={314} size={10.5} fill={C.mute}>Same IBU ≠ same taste: malt sweetness masks bitterness</Txt>
      </g>
    )
  },
}

// 15. Beer styles family tree
D['beer-styles-overview'] = {
  title: 'The main beer families',
  h: 360,
  body: () => {
    const col = (x, title, sub, tone, items) => (
      <g>
        <Card x={x} y={70} w={190} h={46} title={title} lines={[sub]} tone={tone} titleSize={13} lineSize={10.5} />
        {items.map(([n, abv], i) => (
          <g key={n}>
            <Box x={x} y={126 + i * 36} w={190} h={30} fill="#fff" stroke={C.line} />
            <Txt x={x + 10} y={146 + i * 36} size={11.5} weight={600} anchor="start">{n}</Txt>
            <Txt x={x + 182} y={146 + i * 36} size={10.5} fill={C.mute} anchor="end">{abv}</Txt>
          </g>
        ))}
      </g>
    )
    return (
      <g>
        <Card x={140} y={6} w={120} h={36} title="Beer" tone="paper" />
        <Arrow x1={180} y1={42} x2={110} y2={66} />
        <Arrow x1={220} y1={42} x2={290} y2={66} />
        {col(6, 'Ales', 'warm 15–24 °C · S. cerevisiae', 'amber', [
          ['Pale Ale', '4.5–6.5%'], ['IPA', '5.5–7.5%'], ['Stout & Porter', '4–7%'], ['Wheat beer', '4.5–5.5%'], ['Belgian ale', '6–9%'],
        ])}
        {col(204, 'Lagers', 'cold 7–13 °C · S. pastorianus', 'blue', [
          ['Pilsner', '4.5–5.5%'], ['Helles / Munich', '4.5–5.5%'], ['Bock', '6–9%'], ['Märzen', '5.5–6%'],
        ])}
        <Box x={204} y={274} w={190} h={78} fill={C.paper} stroke={C.line} dash />
        <Txt x={299} y={293} size={11.5} weight={700}>Hybrids</Txt>
        <Txt x={299} y={308} size={10} fill={C.ink}>Kölsch · Altbier · California Common</Txt>
        <Txt x={299} y={328} size={11.5} weight={700}>Sour & wild</Txt>
        <Txt x={299} y={343} size={10} fill={C.ink}>Berliner Weisse · Gose · Lambic</Txt>
      </g>
    )
  },
}


// ---------- data-driven templates (used by the diagrams below) ----------
// Rough word-wrap for SVG text: ~0.56 × font-size per character.
function wrap(text, width, size) {
  const max = Math.max(6, Math.floor(width / (size * 0.56)))
  const words = String(text).split(' ')
  const out = []
  let cur = ''
  for (const w of words) {
    if (!cur) cur = w
    else if ((cur + ' ' + w).length <= max) cur += ' ' + w
    else { out.push(cur); cur = w }
  }
  if (cur) out.push(cur)
  return out
}
const TONES = {
  paper: [C.paper, C.line, C.ink], blue: [C.blueBg, C.blueLine, C.blue], amber: [C.amberBg, C.amberLine, C.amber],
  green: [C.greenBg, C.greenLine, C.green], red: [C.redBg, C.redLine, C.red],
}
// Card whose height fits its wrapped text. Returns { el, h }.
function fitCard({ x, y, w, title, text, tone = 'paper', titleSize = 13, size = 11 }) {
  const t = TONES[tone]
  const lines = text ? (Array.isArray(text) ? text.flatMap((s) => wrap(s, w - 16, size)) : wrap(text, w - 16, size)) : []
  const h = 30 + lines.length * (size + 3) + (lines.length ? 6 : 0)
  const el = (
    <g key={`${x}-${y}-${title}`}>
      <Box x={x} y={y} w={w} h={h} fill={t[0]} stroke={t[1]} />
      <Txt x={x + w / 2} y={y + 20} size={titleSize} weight={700} fill={t[2]}>{title}</Txt>
      {lines.length > 0 && <Lines x={x + w / 2} y={y + 38} lines={lines} size={size} lh={size + 3} />}
    </g>
  )
  return { el, h }
}
// Vertical flow of steps with arrows. steps: [{ t, text, tone }]
function flow(steps, { note } = {}) {
  let y = 6
  const els = []
  steps.forEach((s, i) => {
    const { el, h } = fitCard({ x: 50, y, w: 300, title: s.t, text: s.text, tone: s.tone || 'blue' })
    els.push(el)
    y += h
    if (i < steps.length - 1) { els.push(<Arrow key={`a${i}`} x1={200} y1={y + 3} x2={200} y2={y + 21} />); y += 24 }
  })
  if (note) { els.push(<Txt key="note" x={200} y={y + 22} size={10.5} fill={C.mute}>{note}</Txt>); y += 30 }
  return { h: y + 8, body: () => <g>{els}</g> }
}
// Grid of cards (2 columns by default), rows sized to the tallest card.
function grid(cards, { cols = 2, footer, header } = {}) {
  const gap = 8, w = (400 - 12 - gap * (cols - 1)) / cols
  let y = header ? 34 : 6
  const els = []
  if (header) els.push(<Txt key="hdr" x={200} y={22} size={11.5} weight={700} fill={C.mute}>{header}</Txt>)
  for (let r = 0; r < cards.length; r += cols) {
    const row = cards.slice(r, r + cols)
    const built = row.map((c, i) => fitCard({ x: 6 + i * (w + gap), y, w, title: c.t, text: c.text, tone: c.tone || 'paper' }))
    const rowH = Math.max(...built.map((b) => b.h))
    // re-build at uniform height so the row lines up
    row.forEach((c, i) => {
      const t = TONES[c.tone || 'paper']
      const lines = c.text ? (Array.isArray(c.text) ? c.text.flatMap((s) => wrap(s, w - 16, 11)) : wrap(c.text, w - 16, 11)) : []
      const x = 6 + i * (w + gap)
      els.push(
        <g key={`${r}-${i}`}>
          <Box x={x} y={y} w={w} h={rowH} fill={t[0]} stroke={t[1]} />
          <Txt x={x + w / 2} y={y + 20} size={13} weight={700} fill={t[2]}>{c.t}</Txt>
          {lines.length > 0 && <Lines x={x + w / 2} y={y + 38} lines={lines} size={11} lh={14} />}
        </g>
      )
    })
    y += rowH + gap
  }
  if (footer) {
    const { el, h } = fitCard({ x: 6, y, w: 388, title: footer.t, text: footer.text, tone: footer.tone || 'blue' })
    els.push(el); y += h + gap
  }
  return { h: y, body: () => <g>{els}</g> }
}
// Two-column comparison. rows: [[label, left, right]]
function compare(left, right, rows, { note } = {}) {
  const els = []
  const colW = 150, lx = 96, rx = 248
  els.push(<g key="hl"><Box x={lx} y={6} w={colW - 4} h={44} fill={TONES[left.tone][0]} stroke={TONES[left.tone][1]} /><Txt x={lx + (colW - 4) / 2} y={28} size={13.5} weight={800} fill={TONES[left.tone][2]}>{left.t}</Txt>{left.sub && <Txt x={lx + (colW - 4) / 2} y={43} size={10} fill={C.mute}>{left.sub}</Txt>}</g>)
  els.push(<g key="hr"><Box x={rx} y={6} w={colW - 4} h={44} fill={TONES[right.tone][0]} stroke={TONES[right.tone][1]} /><Txt x={rx + (colW - 4) / 2} y={28} size={13.5} weight={800} fill={TONES[right.tone][2]}>{right.t}</Txt>{right.sub && <Txt x={rx + (colW - 4) / 2} y={43} size={10} fill={C.mute}>{right.sub}</Txt>}</g>)
  let y = 58
  rows.forEach(([label, l, r], i) => {
    const ll = wrap(l, colW - 14, 10.5), rl = wrap(r, colW - 14, 10.5), lab = wrap(label, 84, 10.5)
    const h = Math.max(ll.length, rl.length, lab.length) * 13.5 + 14
    els.push(
      <g key={`r${i}`}>
        <rect x={6} y={y} width={388} height={h} fill={i % 2 ? '#fff' : C.paper} />
        <Lines x={10} y={y + 17} lines={lab} size={10.5} lh={13.5} weight={700} fill={C.mute} anchor="start" />
        <Lines x={lx + (colW - 4) / 2} y={y + 17} lines={ll} size={10.5} lh={13.5} />
        <Lines x={rx + (colW - 4) / 2} y={y + 17} lines={rl} size={10.5} lh={13.5} />
      </g>
    )
    y += h
  })
  if (note) { els.push(<Txt key="n" x={200} y={y + 20} size={10.5} fill={C.mute}>{note}</Txt>); y += 28 }
  return { h: y + 8, body: () => <g>{els}</g> }
}
// Horizontal range bars on a numeric scale. items: [{ label, lo, hi, tone, text }]
function ranges({ unit = '', min, max, ticks, items, title, note }) {
  const X0 = 120, X1 = 384
  const sx = (v) => X0 + ((X1 - X0) * (v - min)) / (max - min)
  const els = []
  let y = title ? 34 : 14
  if (title) els.push(<Txt key="t" x={200} y={20} size={11.5} weight={700} fill={C.mute}>{title}</Txt>)
  const top = y
  items.forEach((it, i) => {
    const col = TONES[it.tone || 'blue']
    const lab = wrap(it.label, 108, 11)
    els.push(
      <g key={i}>
        <Lines x={8} y={y + 15} lines={lab} size={11} lh={13} weight={700} anchor="start" />
        <rect x={X0} y={y + 4} width={X1 - X0} height={16} rx={8} fill={C.paper} stroke={C.line} />
        <rect x={sx(it.lo)} y={y + 4} width={Math.max(6, sx(it.hi) - sx(it.lo))} height={16} rx={8} fill={col[2]} opacity={0.85} />
        <Txt x={(sx(it.lo) + sx(it.hi)) / 2} y={y + 33} size={10} fill={col[2]} weight={700}>{it.text || `${it.lo}–${it.hi}${unit}`}</Txt>
      </g>
    )
    y += Math.max(42, lab.length * 13 + 22)
  })
  ticks.forEach((v) => els.push(<g key={`t${v}`}><line x1={sx(v)} y1={top} x2={sx(v)} y2={y - 4} stroke={C.line} strokeDasharray="2 4" /><Txt x={sx(v)} y={y + 8} size={10} fill={C.mute}>{v}{unit}</Txt></g>))
  y += 16
  if (note) { els.push(<Txt key="n" x={200} y={y + 10} size={10.5} fill={C.mute}>{note}</Txt>); y += 20 }
  return { h: y + 6, body: () => <g>{els}</g> }
}
const mk = (title, tpl) => ({ title, h: tpl.h, body: tpl.body })

// ===================== Gin =====================
D['what-is-gin'] = mk('Gin: a neutral spirit flavoured with juniper', flow([
  { t: 'Neutral spirit', text: 'near-neutral, high purity (~96% ABV)', tone: 'paper' },
  { t: 'Juniper + botanicals', text: 'juniper must dominate · coriander, angelica, orris root, citrus peel, cardamom', tone: 'green' },
  { t: 'Usually redistilled with them', text: 'the botanicals flavour the spirit', tone: 'blue' },
  { t: 'Gin', text: 'no ageing needed: it can be sold straight away', tone: 'amber' },
], { note: 'Genever: malt-based, richer · London Dry: dry, juniper-led' }))

D['london-dry-gin'] = mk('London Dry: a method, not a place', grid([
  { t: 'Style, not location', text: 'it can be made anywhere', tone: 'blue' },
  { t: 'Base spirit ≥ 96% ABV', text: 'redistilled with botanicals', tone: 'blue' },
  { t: 'Botanicals in the still', text: 'all added before or during redistillation: nothing after', tone: 'green' },
  { t: 'Sugar ≤ 0.1 g/L', text: 'effectively none: truly dry', tone: 'green' },
], { footer: { t: 'Classic London Dry drinks', text: 'Gin & Tonic · Dry Martini · Negroni', tone: 'amber' } }))

D['old-tom-gin'] = mk('Old Tom: the bridge between Genever and London Dry', flow([
  { t: 'Dutch Genever', text: 'malt-based, richer, less juniper', tone: 'amber' },
  { t: 'Old Tom', text: 'slightly sweetened, softer, rounder', tone: 'green' },
  { t: 'London Dry', text: 'dry, juniper-led: took over the market', tone: 'blue' },
], { note: 'Old Tom cocktails: Tom Collins · Martinez' }))

D['navy-strength-gin'] = mk('Navy Strength: a strength, not a style', grid([
  { t: 'About 57% ABV or more', text: 'by convention: no legal definition', tone: 'blue' },
  { t: 'Not a style', text: 'the style (e.g. London Dry) is separate', tone: 'paper' },
  { t: 'The naval story', text: 'gunpowder soaked in spirit above ~57% could still ignite (partly legend)', tone: 'amber' },
  { t: 'Behind the bar', text: 'stands up to strong mixers and citrus', tone: 'green' },
]))

D['botanical-families'] = mk('The seven botanical families of gin', grid([
  { t: 'Juniper', text: 'mandatory and dominant', tone: 'green' },
  { t: 'Coriander', text: 'second most common', tone: 'green' },
  { t: 'Roots', text: 'orris root fixes and binds aromas', tone: 'amber' },
  { t: 'Citrus', text: 'citrus peels', tone: 'amber' },
  { t: 'Warm spices', text: 'e.g. cardamom', tone: 'amber' },
  { t: 'Florals', text: 'lead in Contemporary gins', tone: 'blue' },
  { t: 'Local / wild', text: 'regional botanicals', tone: 'blue' },
  { t: 'How they go in', text: 'steeped in the still or in a vapour basket', tone: 'paper' },
]))

// ===================== Popular beer styles =====================
D['pilsner'] = mk('Pilsner at a glance', grid([
  { t: 'Born 1842', text: 'Josef Groll, Plzeň (Bohemia)', tone: 'amber' },
  { t: 'Saaz hops', text: 'from Žatec: the traditional Czech hop', tone: 'green' },
  { t: 'Lager yeast', text: 'bottom-fermenting, cold fermentation', tone: 'blue' },
  { t: '4.2–5.8% ABV', text: 'Czech premium pale lager', tone: 'blue' },
], { footer: { t: 'Serve at 3–7 °C', text: 'tall tapered pilsner glass or Willi Becher', tone: 'paper' } }))

D['ipa'] = mk('Three faces of IPA (India Pale Ale)', grid([
  { t: 'English IPA', text: 'Fuggles and East Kent Goldings hops', tone: 'amber' },
  { t: 'American IPA', text: '5.5–7.5% ABV · citrus, pine, tropical and stone fruit', tone: 'green' },
  { t: 'Hazy IPA', text: 'haze from proteins and hop compounds (oats/wheat, heavy dry-hopping) plus some yeast', tone: 'blue' },
  { t: 'Serve at 7–10 °C', tone: 'paper' },
]))

D['stout'] = mk('Stout: dark, roasted, many strengths', ranges({
  title: 'TYPICAL STRENGTH (ABV)', unit: '%', min: 3, max: 13, ticks: [4, 6, 8, 10, 12],
  items: [
    { label: 'Irish dry stout', lo: 4, hi: 5, tone: 'blue', text: '4–5% · draught ~6 °C' },
    { label: 'Imperial stout', lo: 8, hi: 12, tone: 'amber', text: '8–12% · serve 10–13 °C' },
  ],
  note: 'Roasted barley = black · nitrogen = creamy · lactose = milk stout',
}))

D['wheat-beer'] = mk('German Weissbier vs Belgian Witbier', compare(
  { t: 'Weissbier', sub: 'Germany', tone: 'amber' }, { t: 'Witbier', sub: 'Belgium', tone: 'blue' },
  [
    ['Grain', '≥ 50% wheat malt · 4.3–5.6% ABV', 'wheat · unfiltered'],
    ['Flavour', 'banana and clove from the yeast', 'coriander and dried Curaçao orange peel'],
    ['Story', 'German classic', 'revived in 1966 by Pierre Celis (Hoegaarden)'],
  ], { note: 'Both cloudy (yeast + wheat proteins) · weizen glass · 7–10 °C' }))

D['belgian-beers'] = mk('Belgian beers: yeast-driven styles', grid([
  { t: 'Belgian yeast', text: 'phenols (clove, pepper) + esters (banana, bubblegum)', tone: 'green' },
  { t: 'Witbier', text: 'unfiltered wheat beer with coriander and orange peel', tone: 'blue' },
  { t: 'Dubbel', text: 'dark, malty, fruity · 6–7.6% ABV', tone: 'amber' },
  { t: 'Tripel', text: 'strong, golden · 7.5–9.5% ABV', tone: 'amber' },
  { t: 'Saison', text: 'farmhouse ale for seasonal workers', tone: 'paper' },
  { t: 'Lambic → Gueuze', text: 'spontaneous fermentation · Gueuze blends aged lambics', tone: 'paper' },
], { footer: { t: 'Trappist', text: 'around 10 breweries worldwide hold the label · 5 in Belgium', tone: 'blue' } }))

// ===================== Beer service =====================
D['glassware'] = mk('Which glass for which beer', grid([
  { t: 'Shaker pint', text: 'versatile, durable, stackable', tone: 'paper' },
  { t: 'Pilsner glass', text: 'shows clarity and bubbles of lagers', tone: 'blue' },
  { t: 'Tulip / thistle', text: 'Belgian ales', tone: 'amber' },
  { t: 'Snifter', text: 'imperial stouts, barleywines: concentrates aroma', tone: 'amber' },
], { footer: { t: 'Beer-clean glass', text: 'no oils, detergent or lint · rinse with cold water before pouring · the foam head protects aroma', tone: 'green' } }))

D['serving-temperatures'] = mk('Serving temperatures by style', ranges({
  title: 'IDEAL SERVING TEMPERATURE', unit: ' °C', min: 0, max: 16, ticks: [0, 4, 8, 12, 16],
  items: [
    { label: 'Light lagers & pilsners', lo: 3, hi: 7, tone: 'blue', text: '3–7 °C' },
    { label: 'IPAs & pale ales', lo: 7, hi: 10, tone: 'green', text: '7–10 °C' },
    { label: 'Stouts & barleywines', lo: 10, hi: 13, tone: 'amber', text: '10–13 °C (cellar)' },
  ],
  note: 'Too cold mutes aroma · too warm makes alcohol harsh · no frosted glasses',
}))

D['food-pairing-basics'] = mk('Six principles of beer and food pairing', grid([
  { t: 'Match intensity', text: 'light with delicate, robust with hearty', tone: 'blue' },
  { t: 'Complement', text: 'e.g. stout or porter with chocolate', tone: 'green' },
  { t: 'Contrast', text: 'hop bitterness cuts through fat', tone: 'green' },
  { t: 'Cleanse', text: 'carbonation lifts oils between bites', tone: 'blue' },
  { t: 'Regional traditions', text: 'consider classic local pairings', tone: 'paper' },
  { t: 'Avoid clashes', text: 'high IBU amplifies chilli heat', tone: 'red' },
]))

// ===================== Rum =====================
D['what-is-rum'] = mk('Rum starts with sugarcane', grid([
  { t: 'Fresh cane juice', text: '→ rhum agricole: grassy, vegetal, fresh · AOC Martinique', tone: 'green' },
  { t: 'Molasses', text: '→ most rum: the thick syrup left after sugar is extracted', tone: 'amber' },
], { header: 'TWO ROUTES FROM THE SAME PLANT', footer: { t: 'Not one country', text: 'made in dozens of countries, mostly where sugarcane grows', tone: 'blue' } }))

D['rum-production'] = mk('How rum is made', flow([
  { t: 'Raw material', text: 'molasses, or fresh cane juice for rhum agricole', tone: 'amber' },
  { t: 'Fermentation', text: 'dunder (acidic residue) can drive funky, ester-rich rums', tone: 'blue' },
  { t: 'Distillation', text: 'column = lighter, cleaner · pot = heavier', tone: 'blue' },
  { t: 'Ageing', text: 'tropical heat: up to 10% a year lost to evaporation · solera blending', tone: 'amber' },
  { t: 'Bottling', text: 'EU: up to 20 g/L of sugar allowed', tone: 'green' },
]))

D['white-gold-and-dark-rum'] = mk('White, gold and dark rum', grid([
  { t: 'White', text: 'unaged, or aged then charcoal-filtered', tone: 'paper' },
  { t: 'Gold', text: 'about 1–3 years in oak', tone: 'amber' },
  { t: 'Dark', text: 'longer ageing: molasses, toffee, dried fruit, spice', tone: 'amber' },
], { cols: 3, footer: { t: 'Colour is not a legal category', text: 'caramel colour (E150a) is legal and used to standardise batches', tone: 'blue' } }))

D['rhum-agricole-vs-molasses-rum'] = mk('Rhum agricole vs molasses rum', compare(
  { t: 'Agricole', sub: 'fresh cane juice', tone: 'green' }, { t: 'Molasses rum', sub: 'most Caribbean rum', tone: 'amber' },
  [
    ['Base', 'juice pressed within 24–48 h of harvest', 'molasses: syrup left after sugar crystallises'],
    ['Flavour', 'fresh grass, herbs, olive brine, white pepper', 'toffee, brown sugar, caramel, dried fruit'],
    ['Protection', 'AOC Martinique (1996)', 'rules vary by country'],
    ['Classic serve', 'Ti’ Punch: rhum, lime, cane syrup', 'cocktails and sipping'],
  ]))

D['caribbean-rum-traditions'] = mk('Three Caribbean rum traditions', grid([
  { t: 'English-style', text: 'Jamaica, Barbados · Jamaica: dunder, high-ester rums', tone: 'amber' },
  { t: 'French-style', text: 'Martinique, Guadeloupe · fresh cane juice, grassy · AOC Martinique', tone: 'green' },
  { t: 'Spanish-style', text: 'Cuba, Puerto Rico, Dominican Rep. · molasses, column stills, lighter', tone: 'blue' },
], { cols: 3, footer: { t: 'Tropical ageing', text: 'heat speeds up the reactions between rum and barrel', tone: 'paper' } }))

// ===================== Tequila =====================
D['what-is-tequila'] = mk('Tequila essentials', grid([
  { t: 'Blue Weber agave', text: 'Agave tequilana Weber var. azul · 6–8 years to mature', tone: 'green' },
  { t: 'The piña', text: 'the agave heart: looks like a pineapple', tone: 'amber' },
  { t: '100% agave vs mixto', text: 'mixto: at least 51% agave sugars', tone: 'blue' },
  { t: 'CRT + NOM', text: 'regulator; every bottle shows its distillery NOM number', tone: 'paper' },
], { footer: { t: 'Five states', text: 'Jalisco · Guanajuato · Michoacán · Nayarit · Tamaulipas', tone: 'blue' } }))

D['blue-weber-agave'] = mk('From plant to piña', flow([
  { t: 'Blue Weber agave grows', text: 'a succulent, not a cactus · 6–8 years, up to 12', tone: 'green' },
  { t: 'The jimador harvests', text: 'by hand, with a coa (flat blade on a long pole)', tone: 'amber' },
  { t: 'The piña', text: 'the heart, often tens of kilograms, full of sugars', tone: 'amber' },
  { t: '“100% agave”', text: 'every fermentable sugar from blue Weber agave', tone: 'blue' },
]))

D['blanco-reposado-and-a-ejo'] = mk('How long each tequila rests in oak', ranges({
  title: 'TIME IN OAK (MONTHS)', unit: '', min: 0, max: 36, ticks: [0, 12, 24, 36],
  items: [
    { label: 'Blanco', lo: 0, hi: 2, tone: 'blue', text: 'under 2 months' },
    { label: 'Reposado', lo: 2, hi: 12, tone: 'amber', text: '2–12 months' },
    { label: 'Añejo', lo: 12, hi: 36, tone: 'amber', text: '1–3 years · barrels ≤ 600 L' },
  ],
  note: 'Blanco shows the agave · reposado adds vanilla, caramel, light oak',
}))

D['tequila-production-process'] = mk('How tequila is made', flow([
  { t: 'Harvest', text: 'jimador cuts the piña with a coa', tone: 'green' },
  { t: 'Cook', text: 'stone or brick horno, 24–48 h', tone: 'red' },
  { t: 'Crush', text: 'traditionally with a tahona (volcanic stone wheel) → aguamiel', tone: 'amber' },
  { t: 'Ferment', text: 'yeast turns the agave sugars into alcohol', tone: 'blue' },
  { t: 'Distil twice', text: '1st: ordinario ~20–25% ABV · 2nd: tequila', tone: 'blue' },
], { note: 'All governed by NOM-006-SCFI-2012' }))

D['tequila-vs-mezcal'] = mk('Tequila vs mezcal', compare(
  { t: 'Tequila', sub: 'DO: five states', tone: 'blue' }, { t: 'Mezcal', sub: 'mostly Oaxaca', tone: 'amber' },
  [
    ['Agave', 'blue Weber only (≥ 51%; 100% in premium)', 'over 30 species: Espadín, Tobalá, Tepeztate…'],
    ['Region', 'mainly Jalisco', 'Oaxaca: roughly 80–90%'],
    ['Cooking', 'steam: autoclaves or brick hornos', 'underground pits heated with wood fire'],
    ['Result', 'cleaner agave character', 'smoky'],
    ['Rules', 'CRT · NOM-006-SCFI-2012', 'its own denomination of origin'],
  ]))

// ===================== Vodka =====================
D['what-is-vodka'] = mk('Vodka at a glance', grid([
  { t: 'Many bases', text: 'wheat, rye, corn, potatoes, grapes, sugar beet', tone: 'amber' },
  { t: 'Neutral character', text: 'minimal taste, aroma and colour', tone: 'paper' },
  { t: 'Charcoal filtration', text: 'polishes out remaining impurities', tone: 'blue' },
  { t: 'Minimum strength', text: 'EU 37.5% ABV · US 40% ABV (80 proof)', tone: 'blue' },
], { footer: { t: 'A blank canvas', text: 'lets the other cocktail ingredients shine', tone: 'green' } }))

D['vodka-production'] = mk('How vodka is made', flow([
  { t: 'Ferment the base', text: 'creates a wash of about 8–12% ABV', tone: 'amber' },
  { t: 'Column distillation', text: 'to 95–96% ABV: strips out congeners', tone: 'blue' },
  { t: 'Filtration', text: 'usually activated charcoal', tone: 'paper' },
  { t: 'Dilute with water', text: 'water quality shapes taste and mouthfeel · US ≥ 40% ABV', tone: 'green' },
]))

D['traditional-producing-countries'] = mk('Three vodka traditions', grid([
  { t: 'Poland', text: 'potato (e.g. Podlasie) · slight viscosity and gentle sweetness', tone: 'amber' },
  { t: 'Russia', text: 'purity and neutrality: high-proof distillation and filtration', tone: 'blue' },
  { t: 'Sweden', text: 'winter wheat · continuous distillation', tone: 'green' },
], { cols: 3, footer: { t: 'EU rule', text: 'vodka is distilled to at least 96% ABV', tone: 'paper' } }))

D['types-of-vodka'] = mk('Vodka by base ingredient', grid([
  { t: 'Grain', text: 'wheat, rye, corn · rye adds a peppery spice', tone: 'amber' },
  { t: 'Potato', text: 'traditional in Poland', tone: 'paper' },
  { t: 'Grape / fruit', text: 'e.g. vodka from French wine grapes', tone: 'green' },
], { cols: 3, footer: { t: 'Premium vs standard', text: 'multiple distillations, better filtration, better water', tone: 'blue' } }))

D['common-myths-about-vodka'] = mk('Vodka myths vs facts', compare(
  { t: 'Myth', tone: 'red' }, { t: 'Fact', tone: 'green' },
  [
    ['Taste', 'vodka must be tasteless', 'base materials leave subtle character'],
    ['Distillations', '“7 times” means better', 'one modern column pass can be purer'],
    ['Filters', 'diamonds or gold purify', 'activated charcoal does the work'],
    ['Hangovers', 'premium vodka prevents them', 'they come from alcohol volume and dehydration'],
    ['Sameness', 'all vodkas taste the same', 'base, water and distillation differ'],
  ]))

// ===================== Liqueurs =====================
D['what-are-liqueurs'] = mk('What makes a liqueur', grid([
  { t: 'Maceration', text: 'steep flavourings in spirit', tone: 'amber' },
  { t: 'Distillation', text: 'redistil spirit with the flavourings', tone: 'blue' },
  { t: 'Compounding', text: 'blend spirit with extracts and sugar', tone: 'paper' },
], { cols: 3, header: 'THREE PRODUCTION METHODS', footer: { t: 'EU definition', text: 'at least 15% ABV and at least 100 g/L of sugar', tone: 'green' } }))

D['triple-sec-and-orange-liqueurs'] = mk('The orange liqueur family', grid([
  { t: 'Curaçao', text: 'Laraha orange, a bitter citrus from the island of Curaçao', tone: 'amber' },
  { t: 'Triple sec', text: '“sec” = dry in French · origin of “triple” debated', tone: 'paper' },
  { t: 'Cointreau', text: 'launched 1875 · 40% ABV', tone: 'blue' },
  { t: 'Grand Marnier', text: 'Cognac + bitter orange · 40% ABV', tone: 'blue' },
], { footer: { t: 'Where quality shows', text: 'spirit-forward drinks like the Sidecar and Margarita', tone: 'green' } }))

D['coffee-liqueurs'] = mk('Coffee liqueurs', grid([
  { t: 'Extraction', text: 'maceration (steeping beans) or percolation', tone: 'amber' },
  { t: 'Base spirit', text: 'neutral grain spirit or rum', tone: 'paper' },
  { t: 'Kahlúa', text: 'Mexico, launched 1936', tone: 'blue' },
  { t: 'Tia Maria', text: 'Jamaican Blue Mountain coffee', tone: 'blue' },
], { footer: { t: 'Espresso Martini', text: 'created by Dick Bradsell, 1980s London · an opened bottle keeps its best flavour 12–18 months', tone: 'green' } }))

D['herbal-liqueurs'] = mk('Herbal liqueurs and amari', grid([
  { t: 'Amaro = “bitter”', text: 'bitter-sweet herbal liqueurs, often digestifs', tone: 'amber' },
  { t: 'How they’re made', text: 'macerate or distil botanicals, then sweeten', tone: 'paper' },
  { t: 'Cinchona bark', text: 'the source of quinine', tone: 'green' },
  { t: 'Fernet-Branca', text: '27 herbs and spices', tone: 'blue' },
], { footer: { t: 'Aperitif vs digestif', text: 'before the meal: wakes the appetite · after: aids digestion', tone: 'blue' } }))

D['italian-bitters-and-aperitifs'] = mk('Italian bitters: key dates and numbers', grid([
  { t: '1845 · Fernet-Branca', text: 'Bernardino Branca, Milan', tone: 'amber' },
  { t: '1860 · Campari', text: 'Gaspare Campari, Novara · recipe secret', tone: 'red' },
  { t: 'Aperol', text: '11% ABV · the lighter aperitivo', tone: 'amber' },
  { t: 'Amaro / amari', text: 'Italian for “bitter” / plural', tone: 'paper' },
], { footer: { t: 'Aperitivo vs digestivo', text: 'before meals to stimulate appetite · after meals to aid digestion', tone: 'blue' } }))

// ===================== Cocktail foundations =====================
D['what-is-a-cocktail'] = mk('The 1806 definition: four ingredients', grid([
  { t: 'Spirit', tone: 'amber' }, { t: 'Sugar', tone: 'paper' }, { t: 'Water', tone: 'blue' }, { t: 'Bitters', tone: 'red' },
], { cols: 4, header: 'THE BALANCE AND COLUMBIAN REPOSITORY, 1806', footer: { t: 'Today', text: 'a cocktail is built with intentional, balanced proportions · the IBA list has about 100 official cocktails', tone: 'green' } }))

D['cocktail-families'] = mk('Cocktail families', grid([
  { t: 'Sour', text: 'spirit + citrus + sweetener', tone: 'green' },
  { t: 'Spirit-forward', text: 'mostly spirit, stirred · Martini, Manhattan, Negroni', tone: 'amber' },
  { t: 'Highball', text: 'spirit + a larger mixer, built in the glass', tone: 'blue' },
  { t: 'Flips & Fizzes', text: 'egg, cream or emulsifiers for texture', tone: 'paper' },
  { t: 'Tiki', text: 'many ingredients, often several rums', tone: 'red' },
  { t: 'Embury’s sour', text: '8 : 2 : 1 (spirit : sour : sweet) · modern specs ~2 : 1 : ¾', tone: 'paper' },
]))

D['understanding-balance'] = mk('The four pillars of balance', grid([
  { t: 'Sweet', text: 'sugar, syrups, liqueurs, sweet vermouth', tone: 'amber' },
  { t: 'Sour', text: 'citrus and other acids', tone: 'green' },
  { t: 'Strong', text: 'the base spirit', tone: 'red' },
  { t: 'Weak', text: 'dilution from ice and mixers', tone: 'blue' },
], { footer: { t: 'Two reference points', text: 'Embury’s sour 8 : 2 : 1 · the Negroni in equal parts (gin, Campari, sweet vermouth)', tone: 'paper' } }))

D['essential-bartending-techniques'] = mk('Shake or stir?', compare(
  { t: 'Shake', tone: 'amber' }, { t: 'Stir', tone: 'blue' },
  [
    ['When', 'citrus, cream, egg or other opaque ingredients', 'spirit-forward drinks'],
    ['Why', 'emulsifies and aerates', 'keeps clarity and a silky texture'],
    ['How long', '—', '30–40 seconds in a mixing glass'],
    ['Dilution', 'roughly 25–40%', 'less: large, hard cubes'],
    ['Examples', 'Margarita · Whiskey Sour', 'Martini'],
  ], { note: 'Three pillars of quality: temperature, dilution, texture' }))

D['essential-cocktail-ingredients'] = mk('Five building blocks of a cocktail', grid([
  { t: 'Base spirit', text: 'the foundation and star: never mask it', tone: 'red' },
  { t: 'Modifiers', text: 'vermouth, liqueurs, cream', tone: 'amber' },
  { t: 'Sweeteners', text: 'balance acidity and bitterness, add texture', tone: 'paper' },
  { t: 'Citrus / acids', text: 'freshness and lift', tone: 'green' },
  { t: 'Water / dilution', text: 'from ice when shaking or stirring', tone: 'blue' },
  { t: 'Embury’s formula', text: '8 strong : 2 sour : 1 sweet', tone: 'paper' },
]))

// ===================== Wine =====================
D['what-is-wine'] = mk('What wine is', flow([
  { t: 'Wine grapes', text: 'Vitis vinifera: smaller, sweeter, thicker skins than table grapes', tone: 'green' },
  { t: 'Crush', text: 'releases the sugary juice', tone: 'paper' },
  { t: 'Ferment', text: 'Saccharomyces cerevisiae: sugar → alcohol + CO₂', tone: 'blue' },
  { t: 'Wine', text: 'table wines usually 8–15% ABV', tone: 'amber' },
]))

D['red-wine-basics'] = mk('Red wine basics', grid([
  { t: 'Maceration', text: 'juice ferments with skins and seeds: colour, tannin, flavour', tone: 'red' },
  { t: 'Tannins', text: 'from skins and seeds: the drying feel', tone: 'red' },
  { t: 'Body', text: 'from alcohol, tannin and residual sugar', tone: 'amber' },
  { t: 'Light reds', text: 'Pinot Noir, Gamay · serve 12–15 °C', tone: 'blue' },
], { footer: { t: 'Pairing tip', text: 'high-tannin reds love protein and fat · cool climates give higher acidity', tone: 'green' } }))

D['white-wine-basics'] = mk('What shapes a white wine', grid([
  { t: 'No skin contact', text: 'the key difference from red wine', tone: 'paper' },
  { t: 'Grapes', text: 'Chardonnay (most planted), Sauvignon Blanc, Riesling, Pinot Gris, Chenin', tone: 'green' },
  { t: 'Malolactic', text: 'malic → lactic acid: buttery, creamy', tone: 'amber' },
  { t: 'Lees contact', text: 'resting on dead yeast: creamy, complex', tone: 'amber' },
], { footer: { t: 'Cool climate', text: 'higher acidity, lower alcohol, citrus and green fruit', tone: 'blue' } }))

D['sparkling-wine-basics'] = mk('Sparkling wine essentials', grid([
  { t: 'Traditional method', text: 'second fermentation in the bottle', tone: 'amber' },
  { t: 'Lees', text: 'dead yeast: biscuit and brioche notes', tone: 'amber' },
  { t: 'Champagne grapes', text: 'Chardonnay, Pinot Noir, Pinot Meunier', tone: 'green' },
  { t: 'Prosecco', text: 'made from Glera', tone: 'green' },
  { t: '5–6 atmospheres', text: 'two to three times a car tyre', tone: 'red' },
  { t: 'Brut vs Extra Dry', text: 'Brut 0–12 g/L is drier than Extra Dry 12–17 g/L', tone: 'blue' },
], { footer: { t: 'Serve at 6–10 °C', tone: 'paper' } }))

D['fortified-and-sweet-wines'] = mk('Fortified and sweet wines', grid([
  { t: 'Fortification', text: 'grape spirit added: 15–22% ABV', tone: 'blue' },
  { t: 'Port', text: 'fortified during fermentation: stays sweet · Tawny (nutty) vs Ruby', tone: 'red' },
  { t: 'Sherry', text: 'flor yeast protects Fino and Manzanilla · solera blending', tone: 'amber' },
  { t: 'Botrytis', text: 'noble rot concentrates the sugars', tone: 'green' },
], { footer: { t: 'Ice wine', text: 'grapes frozen on the vine, pressed while frozen', tone: 'paper' } }))

export const DIAGRAM_SLUGS = Object.keys(D)

export default function LessonDiagram({ slug, className = '' }) {
  const d = D[slug]
  if (!d) return null
  return (
    <figure className={`not-prose my-8 rounded-2xl border border-slate-200 bg-white p-4 md:p-6 ${className}`}>
      <svg viewBox={`0 0 400 ${d.h}`} role="img" aria-label={d.title} className="w-full h-auto max-w-[560px] mx-auto block" style={{ fontFamily: 'inherit' }}>
        <Defs />
        {d.body()}
      </svg>
      <figcaption className="mt-3 text-center text-xs text-slate-500">
        <span className="font-medium text-slate-700">{d.title}</span>
        <span className="text-slate-400"> · Diagram: Online Spirits Club</span>
      </figcaption>
    </figure>
  )
}
